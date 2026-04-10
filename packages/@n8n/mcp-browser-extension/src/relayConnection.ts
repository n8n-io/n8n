/**
 * Manages the WebSocket connection from the Chrome extension to the CDP relay server.
 *
 * The extension is the single source of truth for tab state. It generates stable
 * session IDs (`n8n-tab-{nanoid}`) for each controlled tab, decoupling Playwright's
 * page identity from Chrome's internal CDP Target.targetId strings.
 * The extension resolves real CDP targetIds via `chrome.debugger.getTargets()` and
 * only attaches the debugger lazily on first interaction with a tab.
 */

import { nanoid } from 'nanoid';
import type { Protocol } from 'devtools-protocol';

import { buildSnapshot, computeSnapshotDiff, type TreeNode } from './ariaSnapshot';
import { createLogger } from './logger';
import type { TabManagementSettings } from './types';

interface ProtocolCommand {
	id: number;
	method: string;
	params?: Record<string, unknown>;
}

interface ProtocolResponse {
	id?: number;
	method?: string;
	params?: Record<string, unknown>;
	result?: unknown;
	error?: string;
}

const DEFAULT_SETTINGS: TabManagementSettings = {
	allowTabCreation: true,
	allowTabClosing: false,
};

const log = createLogger('relay');

/** URL prefixes to exclude from auto-attach */
const EXCLUDED_PREFIXES = ['chrome://', 'chrome-extension://', 'about:'];

export function isEligibleTab(tab: chrome.tabs.Tab): boolean {
	return (
		tab.id !== undefined &&
		tab.url !== undefined &&
		!EXCLUDED_PREFIXES.some((prefix) => tab.url!.startsWith(prefix))
	);
}

// ---------------------------------------------------------------------------
// Tab entry — the single source of truth for each controlled tab
// ---------------------------------------------------------------------------

interface TabEntry {
	chromeTabId: number;
	attached: boolean;
	/** Real CDP Target.targetId — needed for Target.getTargetInfo and crash cleanup. */
	targetId: string;
}

const CDP_COMMAND_TIMEOUT_MS = 30_000;
const ATTACH_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// RelayConnection
// ---------------------------------------------------------------------------

/** URL prefixes that indicate restricted child targets (extensions, internal pages). */
function isRestrictedUrl(url: string | undefined): boolean {
	if (!url) return false;
	if (url.startsWith('chrome-extension://')) return true;
	const restrictedPrefixes = ['chrome://', 'devtools://', 'edge://'];
	return restrictedPrefixes.some((prefix) => url.startsWith(prefix));
}

export class RelayConnection {
	/** Primary map: stable sessionId → Chrome tab state */
	private readonly tabs = new Map<string, TabEntry>();
	/** Reverse lookup: chromeTabId → stable sessionId (for debugger events) */
	private readonly chromeTabIdToSessionId = new Map<number, string>();
	/** In-flight attach promises to deduplicate concurrent attaches */
	private readonly pendingAttaches = new Map<string, Promise<void>>();
	/** Set of chrome tab IDs created by the AI agent */
	private readonly agentCreatedChromeTabIds = new Set<number>();
	/** The primary session ID (first registered), used as default target */
	private primaryId: string | undefined;
	/** Snapshot cache per tab: sessionId → { nodes, refs } — no rendered text stored */
	private readonly tabSnapshotCache = new Map<
		string,
		{ nodes: TreeNode[]; refs: Map<string, string> }
	>();
	/** Cached Target.setAutoAttach params — reapplied to newly attached tabs for iframe support. */
	private autoAttachParams: object | null = null;

	private readonly ws: WebSocket;
	private readonly eventListener: (
		source: chrome.debugger.Debuggee,
		method: string,
		params?: object,
	) => void;
	private readonly detachListener: (source: chrome.debugger.Debuggee, reason: string) => void;
	private closed = false;
	private settings: TabManagementSettings = DEFAULT_SETTINGS;

	onclose?: () => void;
	ontabcreated?: () => void;

	constructor(ws: WebSocket) {
		this.ws = ws;
		this.ws.onmessage = (event) => this.onMessage(event);
		this.ws.onclose = () => this.handleClose();

		this.eventListener = this.onDebuggerEvent.bind(this);
		this.detachListener = this.onDebuggerDetach.bind(this);
		chrome.debugger.onEvent.addListener(this.eventListener);
		chrome.debugger.onDetach.addListener(this.detachListener);
	}

	// =========================================================================
	// Public API — called by background.ts
	// =========================================================================

	/** Generate a stable, human-readable session ID for a new tab. */
	private generateSessionId(): string {
		return `n8n-tab-${nanoid(12)}`;
	}

	/**
	 * Register user-selected tabs without attaching the debugger (lazy attach).
	 * Resolves real CDP targetIds via chrome.debugger.getTargets().
	 */
	async registerSelectedTabs(chromeTabIds: number[]): Promise<void> {
		const targetMap = await this.resolveTargetIds(chromeTabIds);

		for (const chromeTabId of chromeTabIds) {
			if (this.chromeTabIdToSessionId.has(chromeTabId)) continue;

			const targetId = targetMap.get(chromeTabId);
			if (!targetId) {
				log.debug(`registerTab: no CDP target found for chromeTabId=${chromeTabId}`);
				continue;
			}

			const sessionId = this.generateSessionId();
			this.tabs.set(sessionId, { chromeTabId, attached: false, targetId });
			this.chromeTabIdToSessionId.set(chromeTabId, sessionId);
			this.primaryId ??= sessionId;
			log.debug(
				`registerTab: sessionId=${sessionId} targetId=${targetId} chromeTabId=${chromeTabId} (lazy)`,
			);
		}
	}

	/** Add a newly opened tab and notify the relay. Resolves targetId without attaching. */
	async addTab(chromeTabId: number, title: string, url: string): Promise<void> {
		if (this.chromeTabIdToSessionId.has(chromeTabId)) return;

		const targetMap = await this.resolveTargetIds([chromeTabId]);
		const targetId = targetMap.get(chromeTabId);
		if (!targetId) {
			log.debug(`addTab: no CDP target found for chromeTabId=${chromeTabId}`);
			return;
		}

		const sessionId = this.generateSessionId();
		this.tabs.set(sessionId, { chromeTabId, attached: false, targetId });
		this.chromeTabIdToSessionId.set(chromeTabId, sessionId);
		this.primaryId ??= sessionId;

		log.debug(
			`addTab: sessionId=${sessionId} targetId=${targetId} chromeTabId=${chromeTabId} url=${url} (lazy)`,
		);
		this.sendMessage({ method: 'tabOpened', params: { id: sessionId, title, url } });
	}

	/** Remove a closed tab and notify the relay. */
	removeTab(chromeTabId: number): void {
		const sessionId = this.chromeTabIdToSessionId.get(chromeTabId);
		if (!sessionId) return;

		const entry = this.tabs.get(sessionId);

		// Detach debugger only if actually attached
		if (entry?.attached) {
			chrome.debugger.detach({ tabId: chromeTabId }).catch(() => {});
		}

		this.tabs.delete(sessionId);
		this.chromeTabIdToSessionId.delete(chromeTabId);
		this.agentCreatedChromeTabIds.delete(chromeTabId);
		this.tabSnapshotCache.delete(sessionId);

		// Update primary
		if (sessionId === this.primaryId) {
			const remaining = [...this.tabs.keys()];
			this.primaryId = remaining.length > 0 ? remaining[0] : undefined;
		}

		log.debug(`removeTab: ${sessionId} (chromeTabId=${chromeTabId})`);
		this.sendMessage({ method: 'tabClosed', params: { id: sessionId } });

		if (this.tabs.size === 0) {
			this.close('extension_disconnected');
		}
	}

	setSettings(settings: TabManagementSettings): void {
		this.settings = settings;
	}

	/** Return controlled tab identifiers (sessionId and Chrome tab ID). */
	getControlledIds(): Array<{ targetId: string; chromeTabId: number }> {
		return [...this.tabs.entries()].map(([sessionId, entry]) => ({
			targetId: sessionId,
			chromeTabId: entry.chromeTabId,
		}));
	}

	/** Check whether a chrome tab ID is controlled by this relay. */
	isControlledTab(chromeTabId: number): boolean {
		return this.chromeTabIdToSessionId.has(chromeTabId);
	}

	isTabCreationAllowed(): boolean {
		return this.settings.allowTabCreation;
	}

	isAgentCreatedTab(chromeTabId: number): boolean {
		return this.agentCreatedChromeTabIds.has(chromeTabId);
	}

	markAsAgentCreated(chromeTabId: number): void {
		this.agentCreatedChromeTabIds.add(chromeTabId);
	}

	close(message: string): void {
		this.ws.close(1000, message);
		this.handleClose();
	}

	// =========================================================================
	// Internal — connection lifecycle
	// =========================================================================

	private handleClose(): void {
		if (this.closed) return;
		this.closed = true;

		chrome.debugger.onEvent.removeListener(this.eventListener);
		chrome.debugger.onDetach.removeListener(this.detachListener);

		// Detach only attached debuggers
		for (const [id, entry] of this.tabs) {
			if (entry.attached) {
				log.debug(`close: detaching ${id} (chromeTabId=${entry.chromeTabId})`);
				chrome.debugger.detach({ tabId: entry.chromeTabId }).catch(() => {});
			}
		}

		this.tabs.clear();
		this.chromeTabIdToSessionId.clear();
		this.pendingAttaches.clear();
		this.agentCreatedChromeTabIds.clear();
		this.tabSnapshotCache.clear();
		this.primaryId = undefined;
		this.onclose?.();
	}

	// =========================================================================
	// Internal — targetId resolution & debugger attachment
	// =========================================================================

	/**
	 * Resolve CDP targetIds for a set of chrome tab IDs using chrome.debugger.getTargets().
	 * This does NOT attach the debugger — it only reads available targets.
	 */
	private async resolveTargetIds(chromeTabIds: number[]): Promise<Map<number, string>> {
		const targets = await chrome.debugger.getTargets();
		const result = new Map<number, string>();
		const tabIdSet = new Set(chromeTabIds);

		for (const target of targets) {
			if (target.tabId !== undefined && tabIdSet.has(target.tabId)) {
				result.set(target.tabId, target.id);
			}
		}

		log.debug(`resolveTargetIds: resolved ${result.size}/${chromeTabIds.length} tabs`);
		return result;
	}

	/**
	 * Attach debugger to a Chrome tab and resolve its CDP Target.targetId.
	 * Used for agent-created tabs where we need immediate attachment.
	 */
	private async attachAndResolveTargetId(chromeTabId: number): Promise<string> {
		log.debug(`attaching debugger to chromeTabId=${chromeTabId}`);

		await Promise.race([
			chrome.debugger.attach({ tabId: chromeTabId }, '1.3'),
			new Promise<never>((_resolve, reject) => {
				setTimeout(
					() => reject(new Error(`Debugger attach timed out after ${ATTACH_TIMEOUT_MS}ms`)),
					ATTACH_TIMEOUT_MS,
				);
			}),
		]);

		const result = (await chrome.debugger.sendCommand(
			{ tabId: chromeTabId },
			'Target.getTargetInfo',
		)) as { targetInfo: { targetId: string } };

		const targetId = result.targetInfo.targetId;
		log.debug(`attached: chromeTabId=${chromeTabId} → targetId=${targetId}`);
		return targetId;
	}

	/** Lazily attach debugger to a tab. Deduplicates concurrent calls. */
	private async ensureAttached(id: string): Promise<void> {
		const entry = this.tabs.get(id);
		if (!entry) throw new Error(`Tab ${id} is not registered`);
		if (entry.attached) return;

		// Deduplicate concurrent attach attempts
		const pending = this.pendingAttaches.get(id);
		if (pending) {
			await pending;
			return;
		}

		log.debug(`ensureAttached: attaching ${id} (chromeTabId=${entry.chromeTabId})`);

		const promise = (async () => {
			await Promise.race([
				chrome.debugger.attach({ tabId: entry.chromeTabId }, '1.3'),
				new Promise<never>((_resolve, reject) => {
					setTimeout(
						() => reject(new Error(`Debugger attach timed out after ${ATTACH_TIMEOUT_MS}ms`)),
						ATTACH_TIMEOUT_MS,
					);
				}),
			]);
			entry.attached = true;
			log.debug(`ensureAttached: attached ${id}`);

			// Reapply cached auto-attach so new tabs report iframes immediately
			if (this.autoAttachParams) {
				try {
					await chrome.debugger.sendCommand(
						{ tabId: entry.chromeTabId },
						'Target.setAutoAttach',
						this.autoAttachParams,
					);
				} catch (e) {
					log.debug('Failed to apply auto-attach after attach:', e);
				}
			}
		})();

		this.pendingAttaches.set(id, promise);
		try {
			await promise;
		} finally {
			this.pendingAttaches.delete(id);
		}
	}

	// =========================================================================
	// Internal — debugger events (chrome → relay)
	// =========================================================================

	private onDebuggerEvent(source: chrome.debugger.Debuggee, method: string, params?: object): void {
		if (!source.tabId) return;
		const sessionId = this.chromeTabIdToSessionId.get(source.tabId);
		if (!sessionId) return;

		// Filter restricted child targets from auto-attach (extension pages, chrome://, etc.).
		// Without this, Chrome's debugger API throws "Cannot access a chrome-extension:// URL
		// of a different extension" when the relay tries to send commands to these targets.
		if (method === 'Target.attachedToTarget') {
			const targetParams = params as
				| { sessionId?: string; targetInfo?: { url?: string } }
				| undefined;
			if (isRestrictedUrl(targetParams?.targetInfo?.url)) {
				log.debug('filtering restricted child target:', targetParams?.targetInfo?.url);
				// Detach from the restricted child — sent on the parent tab session, not the child
				if (targetParams?.sessionId) {
					chrome.debugger
						.sendCommand({ tabId: source.tabId }, 'Target.detachFromTarget', {
							sessionId: targetParams.sessionId,
						})
						.catch((e) => log.debug('failed to detach restricted target:', e));
				}
				return;
			}
		}

		this.sendMessage({
			method: 'forwardCDPEvent',
			params: { method, params, id: sessionId },
		});
	}

	private onDebuggerDetach(source: chrome.debugger.Debuggee, reason: string): void {
		if (!source.tabId) return;
		const sessionId = this.chromeTabIdToSessionId.get(source.tabId);
		if (!sessionId) return;

		const entry = this.tabs.get(sessionId);
		if (entry) entry.attached = false;

		this.tabs.delete(sessionId);
		this.chromeTabIdToSessionId.delete(source.tabId);
		this.agentCreatedChromeTabIds.delete(source.tabId);

		if (sessionId === this.primaryId) {
			const remaining = [...this.tabs.keys()];
			this.primaryId = remaining.length > 0 ? remaining[0] : undefined;
		}

		log.debug(`debuggerDetach: ${sessionId} reason=${reason}`);
		this.sendMessage({ method: 'tabClosed', params: { id: sessionId } });

		if (this.tabs.size === 0) {
			this.close('debugger_detached');
		}
	}

	// =========================================================================
	// Internal — message handling (relay → extension)
	// =========================================================================

	private onMessage(event: MessageEvent): void {
		void this.onMessageAsync(event).catch((e) => log.error('Error handling message:', e));
	}

	private async onMessageAsync(event: MessageEvent): Promise<void> {
		let message: ProtocolCommand;
		try {
			message = JSON.parse(event.data as string) as ProtocolCommand;
		} catch {
			this.sendError(-32700, 'Error parsing message');
			return;
		}

		// Application-level ping — respond immediately to keep service worker alive
		if (message.method === 'ping') {
			this.sendMessage({ method: 'pong' });
			return;
		}

		log.debug(`← relay: id=${message.id} method=${message.method}`);

		const response: ProtocolResponse = { id: message.id };
		try {
			response.result = await this.handleCommand(message);
		} catch (error) {
			response.error = error instanceof Error ? error.message : String(error);
			log.error(`command error: ${message.method}:`, response.error);
		}

		log.debug(`→ relay: id=${message.id} ${response.error ? 'ERROR' : 'OK'}`);
		this.sendMessage(response);
	}

	private async handleCommand(message: ProtocolCommand): Promise<unknown> {
		switch (message.method) {
			case 'forwardCDPCommand':
				return await this.handleForwardCDPCommand(message.params ?? {});
			case 'createTab':
				return await this.handleCreateTab(message.params ?? {});
			case 'closeTab':
				return await this.handleCloseTab(message.params ?? {});
			case 'attachTab':
				return await this.handleAttachTab(message.params ?? {});
			case 'listTabs':
			case 'listRegisteredTabs':
				return await this.handleListTabs();
			case 'getSnapshot':
				return await this.handleGetSnapshot(message.params ?? {});
			case 'resolveRef':
				return this.handleResolveRef(message.params ?? {});
			default:
				log.debug(`unknown command: ${message.method}`);
				return undefined;
		}
	}

	// =========================================================================
	// Internal — tab ID resolution
	// =========================================================================

	/** Resolve a session ID to the tab entry, falling back to primary. */
	private resolveTab(id?: string): { id: string; entry: TabEntry } {
		if (id) {
			const entry = this.tabs.get(id);
			if (entry) return { id, entry };
			throw new Error(`Tab ${id} is not registered`);
		}
		if (this.primaryId) {
			const entry = this.tabs.get(this.primaryId);
			if (entry) return { id: this.primaryId, entry };
		}
		throw new Error('No tab is connected');
	}

	// =========================================================================
	// Command handlers
	// =========================================================================

	private async handleForwardCDPCommand(params: Record<string, unknown>): Promise<unknown> {
		const { method, params: cmdParams, id: rawId } = params;

		// Root-level Target.setAutoAttach: cache params and apply to ALL attached tabs.
		// This ensures Chrome emits Target.attachedToTarget for cross-origin iframes.
		if (method === 'Target.setAutoAttach' && !rawId) {
			this.autoAttachParams = (cmdParams as object) ?? null;
			const promises: Array<Promise<void>> = [];
			for (const [, entry] of this.tabs) {
				if (!entry.attached) continue;
				promises.push(
					chrome.debugger
						.sendCommand({ tabId: entry.chromeTabId }, 'Target.setAutoAttach', cmdParams as object)
						.then(() => {})
						.catch((e) => log.debug('setAutoAttach failed:', e)),
				);
			}
			await Promise.all(promises);
			return {};
		}

		const { id, entry } = this.resolveTab(rawId as string | undefined);

		log.debug(`CDP: ${method as string} → sessionId=${id} (chromeTabId=${entry.chromeTabId})`);

		// Lazy attach on first CDP command
		await this.ensureAttached(id);

		const debuggee = { tabId: entry.chromeTabId };

		// Wait for the main-frame execution context before returning from Runtime.enable.
		// Without this, Playwright may reference execution contexts that don't exist yet,
		// causing "Cannot find context" errors.
		// Mirrors Playwriter's approach (playwriter/src/cdp-relay.ts Runtime.enable case):
		// wait for Runtime.executionContextCreated with auxData.isDefault === true rather
		// than using a fixed delay. auxData.isDefault identifies the top-level frame context
		// (the page's window object) as opposed to iframes, workers, or injected worlds.
		if (method === 'Runtime.enable') {
			const contextReady = new Promise<void>((resolve) => {
				const timeout = setTimeout(() => {
					log.debug('Runtime.enable: timed out waiting for executionContextCreated, proceeding');
					chrome.debugger.onEvent.removeListener(handler);
					resolve();
				}, 3_000);
				function handler(src: chrome.debugger.Debuggee, evt: string, evtParams?: object): void {
					if (src.tabId !== entry.chromeTabId) return;
					if (evt !== 'Runtime.executionContextCreated') return;
					const auxData = (
						evtParams as { context?: { auxData?: { isDefault?: boolean } } } | undefined
					)?.context?.auxData;
					if (auxData?.isDefault !== true) return;
					clearTimeout(timeout);
					chrome.debugger.onEvent.removeListener(handler);
					resolve();
				}
				chrome.debugger.onEvent.addListener(handler);
			});

			const result = await chrome.debugger.sendCommand(
				debuggee,
				method as string,
				cmdParams as object | undefined,
			);
			await contextReady;
			return result;
		}

		const result = await Promise.race([
			chrome.debugger.sendCommand(debuggee, method as string, cmdParams as object | undefined),
			new Promise<never>((_resolve, reject) => {
				setTimeout(() => {
					reject(
						new Error(
							`CDP command '${method as string}' timed out after ${CDP_COMMAND_TIMEOUT_MS}ms (${id})`,
						),
					);
				}, CDP_COMMAND_TIMEOUT_MS);
			}),
		]);

		log.debug(`CDP response: ${method as string} → ${id} OK`);
		return result;
	}

	private async handleCreateTab(params: Record<string, unknown>): Promise<unknown> {
		if (!this.settings.allowTabCreation) {
			throw new Error(
				'Tab creation is disabled. Enable it in the n8n Browser Bridge extension settings.',
			);
		}

		const url = (params.url as string) ?? undefined;
		log.debug(`createTab: url=${url ?? '(none)'}`);

		const tab = await chrome.tabs.create({ url, active: false });
		if (!tab.id) throw new Error('Failed to create tab');

		this.agentCreatedChromeTabIds.add(tab.id);

		// Agent-created tabs are eagerly attached for immediate use
		const targetId = await this.attachAndResolveTargetId(tab.id);
		const sessionId = this.generateSessionId();
		this.tabs.set(sessionId, { chromeTabId: tab.id, attached: true, targetId });
		this.chromeTabIdToSessionId.set(tab.id, sessionId);

		// Apply cached auto-attach params so the new tab reports iframes immediately.
		// ensureAttached() does this for lazily-attached tabs; we must do it here too
		// for eagerly-attached agent-created tabs.
		if (this.autoAttachParams) {
			try {
				await chrome.debugger.sendCommand(
					{ tabId: tab.id },
					'Target.setAutoAttach',
					this.autoAttachParams,
				);
			} catch (e) {
				log.debug('Failed to apply auto-attach after eager attach:', e);
			}
		}

		log.debug(
			`createTab: sessionId=${sessionId} targetId=${targetId} chromeTabId=${tab.id} url=${tab.url ?? url ?? ''}`,
		);

		this.ontabcreated?.();

		return {
			id: sessionId,
			title: tab.title ?? '',
			url: tab.url ?? url ?? '',
		};
	}

	private async handleCloseTab(params: Record<string, unknown>): Promise<unknown> {
		if (!this.settings.allowTabClosing) {
			throw new Error(
				'Tab closing is disabled. Enable it in the n8n Browser Bridge extension settings.',
			);
		}

		const sessionId = params.id as string;
		if (!sessionId) throw new Error('id is required');

		const entry = this.tabs.get(sessionId);
		if (!entry) throw new Error(`Tab ${sessionId} is not registered`);

		log.debug(`closeTab: ${sessionId} (chromeTabId=${entry.chromeTabId})`);

		// Detach debugger if attached
		if (entry.attached) {
			await chrome.debugger.detach({ tabId: entry.chromeTabId }).catch(() => {});
		}

		// Clean up maps
		this.tabs.delete(sessionId);
		this.chromeTabIdToSessionId.delete(entry.chromeTabId);
		this.agentCreatedChromeTabIds.delete(entry.chromeTabId);

		// Close the tab
		await chrome.tabs.remove(entry.chromeTabId);

		// Update primary
		if (sessionId === this.primaryId) {
			const remaining = [...this.tabs.keys()];
			this.primaryId = remaining.length > 0 ? remaining[0] : undefined;
		}

		if (this.tabs.size === 0) {
			this.close('extension_disconnected');
		}

		return { closed: true, id: sessionId };
	}

	private async handleAttachTab(params: Record<string, unknown>): Promise<unknown> {
		const id = params.id as string;
		if (!id) throw new Error('id is required');

		log.debug(`attachTab: ${id}`);
		await this.ensureAttached(id);
		log.debug(`attachTab: ${id} done`);
		return { attached: true, id };
	}

	private async handleGetSnapshot(params: Record<string, unknown>): Promise<unknown> {
		const {
			id: rawId,
			type = 'interactive',
			depth,
			scopeSelector,
			scopeMarker,
		} = params as {
			id?: string;
			type?: 'interactive' | 'full';
			depth?: number;
			scopeSelector?: string;
			scopeMarker?: string;
		};
		const { id, entry } = this.resolveTab(rawId);
		await this.ensureAttached(id);
		const debuggee = { tabId: entry.chromeTabId };

		// Enable protocols (idempotent)
		await Promise.all([
			chrome.debugger.sendCommand(debuggee, 'DOM.enable'),
			chrome.debugger.sendCommand(debuggee, 'Accessibility.enable'),
		]);

		// Fetch full AX tree (one round-trip)
		const { nodes: axNodes } = (await chrome.debugger.sendCommand(
			debuggee,
			'Accessibility.getFullAXTree',
			{},
		)) as Protocol.Accessibility.GetFullAXTreeResponse;

		// Ensure DOM document is loaded — required for DOM.pushNodesByBackendIdsToFrontend
		// and DOM.getAttributes used by fetchAttributes below
		const { root } = (await chrome.debugger.sendCommand(debuggee, 'DOM.getDocument', {
			depth: 0,
		})) as Protocol.DOM.GetDocumentResponse;

		// Resolve scope node if scopeMarker or scopeSelector given
		let scopeNodeId: string | undefined;
		const cssScopeSelector = scopeMarker ? `[data-n8n-scope="${scopeMarker}"]` : scopeSelector;
		if (cssScopeSelector) {
			const { nodeId } = (await chrome.debugger.sendCommand(debuggee, 'DOM.querySelector', {
				nodeId: root.nodeId,
				selector: cssScopeSelector,
			})) as Protocol.DOM.QuerySelectorResponse;
			if (!nodeId) {
				throw new Error(
					scopeMarker
						? 'Scope element no longer exists. Take a new snapshot.'
						: `scopeSelector "${scopeSelector}" did not match any element`,
				);
			}
			const { node } = (await chrome.debugger.sendCommand(debuggee, 'DOM.describeNode', {
				nodeId,
			})) as Protocol.DOM.DescribeNodeResponse;
			scopeNodeId = axNodes.find((n) => n.backendDOMNodeId === node.backendNodeId)?.nodeId;
			if (!scopeNodeId) {
				throw new Error(
					scopeMarker
						? 'Scope element has no accessibility node'
						: `scopeSelector "${scopeSelector}" matched a DOM element with no accessibility node`,
				);
			}
			// Clean up marker attribute
			if (scopeMarker) {
				chrome.debugger
					.sendCommand(debuggee, 'DOM.removeAttribute', {
						nodeId,
						name: 'data-n8n-scope',
					})
					.catch(() => {}); // fire-and-forget cleanup
			}
		}

		// Build snapshot — fetchAttributes drives lazy CDP calls per node
		const { nodes, refs } = await buildSnapshot({
			axNodes,
			fetchAttributes: async (backendNodeId) => {
				const { nodeIds } = (await chrome.debugger.sendCommand(
					debuggee,
					'DOM.pushNodesByBackendIdsToFrontend',
					{ backendNodeIds: [backendNodeId] },
				)) as Protocol.DOM.PushNodesByBackendIdsToFrontendResponse;
				if (!nodeIds[0]) return [];
				const { attributes } = (await chrome.debugger.sendCommand(debuggee, 'DOM.getAttributes', {
					nodeId: nodeIds[0],
				})) as Protocol.DOM.GetAttributesResponse;
				return attributes;
			},
			type,
			maxDepth: depth,
			scopeNodeId,
		});

		// Structural diff against cached previous tree
		const previous = this.tabSnapshotCache.get(id)?.nodes ?? [];
		this.tabSnapshotCache.set(id, { nodes, refs });
		const { diffType, content } = computeSnapshotDiff(previous, nodes);

		log.debug(
			`getSnapshot: sessionId=${id} diffType=${diffType} len=${content.length}\n${content}`,
		);
		return { snapshot: content, diffType };
	}

	private handleResolveRef(params: Record<string, unknown>): unknown {
		const { id: rawId, ref } = params as { id?: string; ref: string };
		if (!ref) throw new Error('ref is required');
		const { id } = this.resolveTab(rawId);
		const selector = this.tabSnapshotCache.get(id)?.refs.get(ref);
		if (!selector) throw new Error(`Stale ref: ${ref}`);
		return { selector };
	}

	private async handleListTabs(): Promise<unknown> {
		const tabs = await Promise.all(
			[...this.tabs.entries()].map(async ([sessionId, entry]) => {
				try {
					const tab = await chrome.tabs.get(entry.chromeTabId);
					return { id: sessionId, title: tab.title ?? '', url: tab.url ?? '' };
				} catch {
					return { id: sessionId, title: '', url: '' };
				}
			}),
		);

		log.debug(`listTabs: ${tabs.length} tabs [${tabs.map((t) => t.id).join(', ')}]`);
		return { tabs };
	}

	// =========================================================================
	// Wire helpers
	// =========================================================================

	private sendError(code: number, message: string): void {
		this.sendMessage({ error: JSON.stringify({ code, message }) });
	}

	private sendMessage(message: ProtocolResponse): void {
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		}
	}
}
