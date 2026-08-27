import { getDefaultDiscovery, getInstallInstructions } from './browser-discovery';
import type { CDPRelayServer } from './cdp-relay';
import {
	AlreadyConnectedError,
	BrowserNotAvailableError,
	ConnectionLostError,
	ExtensionConflictError,
	ExtensionNotConnectedError,
	NotConnectedError,
	type ConnectionLostReason,
} from './errors';
import { createLogger } from './logger';
import type {
	Adapter,
	BrowserName,
	Config,
	ConnectConfig,
	ConnectResult,
	ConnectionState,
	ResolvedBrowserInfo,
	ResolvedConfig,
} from './types';
import { configSchema } from './types';

const log = createLogger('connection');

export interface BrowserConnectionOptions {
	/**
	 * Externally managed relay (remote mode). The connection does not own its
	 * lifecycle - the embedder is responsible for stopping it.
	 */
	relay?: CDPRelayServer;
	/** Explicit CDP endpoint for remote mode; overrides `relay.cdpEndpoint()`. */
	cdpEndpoint?: string;
	/** Headers sent when connecting to {@link cdpEndpoint} (e.g. an auth token). */
	cdpConnectHeaders?: Record<string, string>;
}

export class BrowserConnection {
	private state: ConnectionState | null = null;
	private disconnectReason: ConnectionLostReason | undefined;
	private sessionBlockedBy: string[] = [];
	/** Block seen since the current tool call began; consumed when it fails. */
	private blockedDuringCall: string[] | undefined;
	private readonly config: ResolvedConfig;
	private readonly externalRelay?: CDPRelayServer;
	private readonly externalCdpEndpoint?: string;
	private readonly cdpConnectHeaders?: Record<string, string>;
	/** Adapter kept alive after an extension-connect timeout so its relay URL remains valid. */
	private pendingAdapter: Adapter | null = null;

	constructor(userConfig?: Partial<Config>, options?: BrowserConnectionOptions) {
		const parsed = configSchema.parse(userConfig ?? {});
		this.externalRelay = options?.relay;
		this.externalCdpEndpoint = options?.cdpEndpoint;
		this.cdpConnectHeaders = options?.cdpConnectHeaders;

		// Merge auto-discovery with programmatic overrides
		const discovery = getDefaultDiscovery().discover();
		const browsers = new Map<BrowserName, ResolvedBrowserInfo>();

		// Populate from discovery
		for (const [name, info] of Object.entries(discovery)) {
			if (info && typeof info === 'object' && 'executablePath' in info) {
				const browserInfo = info as { executablePath: string; profilePath?: string };
				browsers.set(name as BrowserName, { ...browserInfo, available: true });
			}
		}

		// Apply programmatic overrides
		for (const [name, override] of Object.entries(parsed.browsers)) {
			const existing = browsers.get(name as BrowserName);
			if (existing) {
				if (override.executablePath) existing.executablePath = override.executablePath;
				if (override.profilePath) existing.profilePath = override.profilePath;
			} else if (override.executablePath) {
				browsers.set(name as BrowserName, {
					executablePath: override.executablePath,
					profilePath: override.profilePath,
					available: true,
				});
			}
		}

		this.config = {
			defaultBrowser: parsed.defaultBrowser,
			browsers,
			adapter: parsed.adapter,
			mode: parsed.mode,
		};
	}

	// -------------------------------------------------------------------------
	// Public API
	// -------------------------------------------------------------------------

	async connect(overrideBrowser?: BrowserName): Promise<ConnectResult> {
		if (this.state) {
			throw new AlreadyConnectedError();
		}

		const browser = overrideBrowser ?? this.config.defaultBrowser;
		if (this.config.mode !== 'remote') {
			this.requireBrowserAvailable(browser);
		}

		// A reconnect must not inherit the block it was told to escape.
		this.disconnectReason = undefined;
		this.sessionBlockedBy = [];
		this.blockedDuringCall = undefined;

		const connectConfig: ConnectConfig = {
			browser,
		};

		// Reuse a pending adapter (relay kept alive from a prior timeout) if available.
		const adapter = this.pendingAdapter ?? (await this.createAdapter());
		this.pendingAdapter = null;

		this.installAdapterHandlers(adapter);

		try {
			await adapter.launch(connectConfig);
		} catch (error) {
			if (error instanceof ExtensionNotConnectedError) {
				// Keep the adapter alive so its relay URL stays valid for the next retry.
				this.pendingAdapter = adapter;
			} else {
				await adapter.close().catch(() => {});
			}
			throw error;
		}

		// Two-tier model: listTabs() returns metadata from the relay (no
		// debugger attachment). Playwright page objects are created lazily
		// when a tool first interacts with a specific tab.
		const pages = await adapter.listTabs();
		const pageMap = new Map(pages.map((p) => [p.id, p]));

		this.state = {
			adapter,
			pages: pageMap,
			activePageId: pages[0]?.id ?? '',
		};

		return { browser, pages };
	}

	private installAdapterHandlers(adapter: Adapter): void {
		// Listen for unexpected disconnections so we can invalidate state immediately
		adapter.onDisconnect = (reason, details) => {
			if (!this.state) return; // already disconnected
			log.debug('unexpected disconnect, reason:', reason);
			this.disconnectReason = reason;
			this.sessionBlockedBy = details?.blockingExtensionIds ?? [];
			this.state = null;
		};

		// Not keyed by tab: the relay reports a CDP target id, which does not match
		// the id an agent-created tab is tracked under.
		adapter.onBlocked = ({ blockingExtensionIds }) => {
			this.blockedDuringCall = blockingExtensionIds;
		};
	}

	async disconnect(): Promise<void> {
		const pending = this.pendingAdapter;
		this.pendingAdapter = null;

		if (pending) await pending.close().catch(() => {});

		if (!this.state) return; // already disconnected — idempotent

		const { adapter } = this.state;
		this.state = null;
		this.disconnectReason = undefined;
		this.sessionBlockedBy = [];
		this.blockedDuringCall = undefined;

		try {
			await adapter.close();
		} catch {
			// Browser may already be dead — that's fine
		}
	}

	getConnection(): ConnectionState {
		if (!this.state) {
			if (this.disconnectReason === 'blocked_by_extension') {
				// No state left, so browser_connect is the only way back.
				throw ExtensionConflictError.sessionLost(this.sessionBlockedBy);
			}
			if (this.disconnectReason) {
				throw new ConnectionLostError(this.disconnectReason);
			}
			throw new NotConnectedError();
		}
		return this.state;
	}

	/** Drops any earlier block, so only one arriving during this call explains its failure. */
	beginToolCall(): void {
		this.blockedDuringCall = undefined;
	}

	/** A blocked tab fails as an adapter timeout, which says nothing — so a block wins. */
	explainFailure(error: unknown): unknown {
		const blockingExtensionIds = this.blockedDuringCall;
		this.blockedDuringCall = undefined;
		if (blockingExtensionIds) {
			// The only remaining trace of the real failure if this attribution is wrong.
			log.debug('replacing failure with extension conflict, original:', error);
			// The block can take the session down inside the very call it interrupts,
			// so the two hints must not be chosen before checking.
			return this.state
				? ExtensionConflictError.tabLost(blockingExtensionIds)
				: ExtensionConflictError.sessionLost(blockingExtensionIds);
		}

		if (error instanceof Error && error.name === 'TargetClosedError') {
			return new ConnectionLostError('browser_closed');
		}
		return error;
	}

	get isConnected(): boolean {
		return this.state !== null;
	}

	async shutdown(): Promise<void> {
		await this.disconnect();
	}

	getResolvedConfig(): ResolvedConfig {
		return this.config;
	}

	// -------------------------------------------------------------------------
	// Private
	// -------------------------------------------------------------------------

	getAvailableBrowsers(): BrowserName[] {
		return [...this.config.browsers.entries()]
			.filter(([_, v]) => v.available)
			.map(([name]) => name);
	}

	private requireBrowserAvailable(browser: BrowserName): void {
		const info = this.config.browsers.get(browser);
		if (!info?.available) {
			const available = this.getAvailableBrowsers();
			const instructions = getInstallInstructions(browser);
			throw new BrowserNotAvailableError(browser, available, instructions);
		}
	}

	private async createAdapter(): Promise<Adapter> {
		if (this.config.mode === 'remote') {
			// Remote mode is only supported by the Playwright adapter
			const { PlaywrightAdapter } = await import('./adapters/playwright.js');
			return new PlaywrightAdapter(this.config, {
				relay: this.externalRelay,
				cdpEndpoint: this.externalCdpEndpoint,
				cdpConnectHeaders: this.cdpConnectHeaders,
			});
		}
		if (this.config.adapter === 'agent-browser') {
			const { AgentBrowserAdapter } = await import('./adapters/agent-browser.js');
			return new AgentBrowserAdapter(this.config);
		}
		const { PlaywrightAdapter } = await import('./adapters/playwright.js');
		return new PlaywrightAdapter(this.config);
	}
}
