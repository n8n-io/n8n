import { execFile } from 'node:child_process';
import type {
	Browser,
	BrowserContext,
	Dialog,
	FileChooser,
	Locator,
	Page,
	Request,
	Response,
} from 'playwright-core';
import { chromium } from 'playwright-core';

import { CDPRelayServer } from '../cdp-relay';
import {
	BrowserExecutableNotFoundError,
	PageNotFoundError,
	StaleRefError,
	type ConnectionLostReason,
} from '../errors';
import { createLogger } from '../logger';
import type {
	ClickOptions,
	ConnectConfig,
	ConsoleEntry,
	Cookie,
	ElementTarget,
	ErrorEntry,
	ModalState,
	NavigateResult,
	NetworkEntry,
	PageInfo,
	ResolvedConfig,
	ScreenshotOptions,
	ScrollOptions,
	SnapshotResult,
	TypeOptions,
	WaitOptions,
} from '../types';
import { generateId, toError } from '../utils';

const log = createLogger('playwright');

// ---------------------------------------------------------------------------
// Type augmentation for Playwright's private _snapshotForAI API.
// This is used internally by Playwright MCP (playwright/lib/mcp/browser/tab.js)
// and returns a YAML accessibility tree with aria-ref= annotations.
// ---------------------------------------------------------------------------

interface SnapshotForAIResult {
	/** Complete YAML accessibility tree with [ref=eN] annotations */
	full: string;
	/** Incremental diff (only changed elements), undefined on first call */
	incremental?: string;
}

interface PlaywrightPagePrivate extends Page {
	_snapshotForAI(options?: {
		timeout?: number;
		track?: string;
	}): Promise<SnapshotForAIResult>;
}

// ---------------------------------------------------------------------------
// Per-page state tracked by the adapter
// ---------------------------------------------------------------------------

interface PageState {
	page: Page;
	info: PageInfo;
	consoleBuffer: ConsoleEntry[];
	errorBuffer: ErrorEntry[];
	networkBuffer: NetworkEntry[];
	pendingDialog?: Dialog;
	pendingFileChooser?: FileChooser;
}

// ---------------------------------------------------------------------------
// Stable extension ID derived from the "key" field in mcp-browser-extension/manifest.json.
// This ensures the same ID whether loaded unpacked or installed from the Chrome Web Store.
// ---------------------------------------------------------------------------

const BROWSER_USE_EXTENSION_ID = 'cegmdpndekdfpnafgacidejijecomlhh';

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class PlaywrightAdapter {
	readonly name = 'playwright';

	private resolvedConfig: ResolvedConfig;
	private browser?: Browser;
	private context?: BrowserContext;
	private pageStates = new Map<string, PageState>();
	private relay?: CDPRelayServer;
	/** Pending activation: set by ensurePage(), consumed by context.on('page'). */
	private pendingActivation?: { id: string; resolve: (page: Page) => void };

	/** Called when the browser connection is unexpectedly lost. */
	onDisconnect?: (reason: ConnectionLostReason) => void;

	constructor(config: ResolvedConfig) {
		this.resolvedConfig = config;
	}

	// =========================================================================
	// Lifecycle
	// =========================================================================

	async launch(config: ConnectConfig): Promise<void> {
		log.debug('launch: browser =', config.browser);
		// Local mode — connect to the user's running Chrome via extension bridge.
		// The CDPRelayServer bridges Playwright ↔ Chrome extension (chrome.debugger).
		this.relay = new CDPRelayServer();
		const port = await this.relay.listen();
		const extensionEndpoint = this.relay.extensionEndpoint(port);

		// Open the extension's connect page with the relay URL so it auto-connects.
		const connectUrl =
			`chrome-extension://${BROWSER_USE_EXTENSION_ID}/connect.html` +
			`?mcpRelayUrl=${encodeURIComponent(extensionEndpoint)}`;
		const browserInfo = this.resolvedConfig.browsers.get(config.browser);
		const chromePath = browserInfo?.executablePath;
		if (!chromePath) {
			throw new BrowserExecutableNotFoundError(config.browser);
		}

		log.debug('launching browser:', chromePath);
		log.debug('connect URL:', connectUrl);

		// Launch the browser and detect early spawn failures (ENOENT, EACCES, etc.)
		await new Promise<void>((resolve, reject) => {
			const child = execFile(chromePath, [connectUrl]);
			const earlyFailTimer = setTimeout(() => resolve(), 2_000);
			child.on('error', (spawnError: Error) => {
				clearTimeout(earlyFailTimer);
				log.error('browser spawn error:', spawnError.message);
				reject(new BrowserExecutableNotFoundError(`${config.browser} (${spawnError.message})`));
			});
		});

		// Wait for the extension to connect and attach to tabs
		log.debug('waiting for extension...');
		await this.relay.waitForExtension({ browserWasLaunched: true });

		// Connect Playwright over CDP through the relay
		const cdpEndpoint = this.relay.cdpEndpoint(port);
		log.debug('connecting Playwright over CDP:', cdpEndpoint);
		this.browser = await chromium.connectOverCDP(cdpEndpoint);
		const contexts = this.browser.contexts();
		log.debug('browser contexts:', contexts.length);
		this.context = contexts[0] ?? (await this.browser.newContext());

		// Two-tier model: pages are created lazily via ensurePage().
		// When ensurePage() triggers activateTab(), it sets pendingActivation
		// so we know which ID to assign to the incoming Page object.
		this.context.on('page', (page: Page) => {
			if (this.pendingActivation) {
				const { id, resolve } = this.pendingActivation;
				this.pendingActivation = undefined;
				log.debug('page event: consumed pendingActivation, id =', id);
				if (!this.pageStates.has(id)) {
					this.trackPage(page, id);
				}
				resolve(page);
				return;
			}
			// Fallback: page appeared without a pending activation (e.g. popup)
			log.debug('page event: no pendingActivation, assigning random id');
			if (!this.findPageState(page)) {
				this.trackPage(page);
			}
		});

		// Detect unexpected disconnection from the browser (process crash, etc.)
		this.browser.on('disconnected', () => {
			log.debug('browser disconnected event');
			this.onDisconnect?.('browser_closed');
		});

		// Detect extension disconnection via the relay (already a typed reason)
		this.relay.onExtensionDisconnect = (reason) => {
			log.debug('relay: extension disconnected, reason:', reason);
			this.onDisconnect?.(reason);
		};

		log.debug('launch complete, context ready for lazy activation');
	}

	async close(): Promise<void> {
		try {
			if (this.context) await this.context.close();
		} catch {
			// context may already be closed
		}
		try {
			if (this.browser) await this.browser.close();
		} catch {
			// browser may already be closed
		}
		if (this.relay) {
			this.relay.stop();
			this.relay = undefined;
		}
		this.pageStates.clear();
	}

	// =========================================================================
	// Pages
	// =========================================================================

	async newPage(url?: string): Promise<PageInfo> {
		log.debug('newPage: creating page, url =', url ?? '(none)');
		const page = await this.requireContext().newPage();
		// The relay assigned an ID during Target.createTarget → createTab()
		const tabId = this.relay?.getLastCreatedTabId();
		log.debug('newPage: relay tabId =', tabId);
		const state = this.findPageState(page) ?? this.trackPage(page, tabId);

		if (url) {
			await page.goto(url, { waitUntil: 'load' });
			state.info.title = await page.title();
			state.info.url = page.url();
		}

		return { ...state.info };
	}

	async closePage(pageId: string): Promise<void> {
		// Clean up local Playwright state if tracked (may not be if never activated)
		this.pageStates.delete(pageId);

		// Close via relay → extension → chrome.tabs.remove.
		// The relay sends Target.detachedFromTarget to Playwright, which internally
		// cleans up the Page object and fires the 'close' event.
		if (this.relay) {
			await this.relay.closeTab(pageId);
		}
	}

	async focusPage(pageId: string): Promise<void> {
		const state = await this.ensurePage(pageId);
		await state.page.bringToFront();
	}

	async listPages(): Promise<PageInfo[]> {
		const result: PageInfo[] = [];
		for (const state of this.pageStates.values()) {
			// Refresh title/url
			try {
				state.info.title = await state.page.title();
				state.info.url = state.page.url();
			} catch {
				// page may have been closed externally
			}
			result.push({ ...state.info });
		}
		return result;
	}

	/**
	 * Two-tier model: listTabs() returns metadata from the relay cache (no debugger
	 * attachment). Falls back to listPages() when no relay is available.
	 */
	async listTabs(): Promise<PageInfo[]> {
		if (this.relay) {
			const tabs = (await this.relay.listTabs()).map((t) => ({
				id: t.id,
				title: t.title,
				url: t.url,
			}));
			log.debug('listTabs: relay returned', tabs.length, 'tabs');
			return tabs;
		}
		const pages = await this.listPages();
		log.debug('listTabs: fallback to listPages, returned', pages.length, 'pages');
		return pages;
	}

	/** Return the session IDs of all currently tracked pages. */
	listTabSessionIds(): string[] {
		return Array.from(this.pageStates.keys());
	}

	/** Return IDs of all known tabs (relay cache + local pages). */
	async listTabIds(): Promise<string[]> {
		if (this.relay) {
			const tabs = await this.relay.listTabs();
			log.debug(`listTabIds: relay returned ${tabs.length} tab(s)`);
			return tabs.map((t) => t.id);
		}
		const ids = this.listTabSessionIds();
		log.debug(`listTabIds: fallback to pageStates, ${ids.length} page(s)`);
		return ids;
	}

	// =========================================================================
	// Navigation
	// =========================================================================

	async navigate(
		pageId: string,
		url: string,
		waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'load',
	): Promise<NavigateResult> {
		const { page } = await this.ensurePage(pageId);
		const response = await page.goto(url, { waitUntil });
		return {
			title: await page.title(),
			url: page.url(),
			status: response?.status() ?? 0,
		};
	}

	async back(pageId: string): Promise<NavigateResult> {
		const { page } = await this.ensurePage(pageId);
		await page.goBack({ waitUntil: 'load' });
		return { title: await page.title(), url: page.url(), status: 0 };
	}

	async forward(pageId: string): Promise<NavigateResult> {
		const { page } = await this.ensurePage(pageId);
		await page.goForward({ waitUntil: 'load' });
		return { title: await page.title(), url: page.url(), status: 0 };
	}

	async reload(
		pageId: string,
		waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'load',
	): Promise<NavigateResult> {
		const { page } = await this.ensurePage(pageId);
		const response = await page.reload({ waitUntil });
		return {
			title: await page.title(),
			url: page.url(),
			status: response?.status() ?? 0,
		};
	}

	// =========================================================================
	// Interaction
	// =========================================================================

	async click(pageId: string, target: ElementTarget, options?: ClickOptions): Promise<void> {
		await this.ensurePage(pageId);
		const locator = await this.resolveLocator(pageId, target);
		await locator.click({
			button: options?.button,
			clickCount: options?.clickCount,
			modifiers: options?.modifiers as Array<'Alt' | 'Control' | 'Meta' | 'Shift'>,
		});
	}

	async type(
		pageId: string,
		target: ElementTarget,
		text: string,
		options?: TypeOptions,
	): Promise<void> {
		await this.ensurePage(pageId);
		const locator = await this.resolveLocator(pageId, target);

		if (options?.clear) {
			await locator.clear();
		}

		await locator.pressSequentially(text, { delay: options?.delay });

		if (options?.submit) {
			await locator.press('Enter');
		}
	}

	async select(pageId: string, target: ElementTarget, values: string[]): Promise<string[]> {
		await this.ensurePage(pageId);
		const locator = await this.resolveLocator(pageId, target);
		return await locator.selectOption(values);
	}

	async hover(pageId: string, target: ElementTarget): Promise<void> {
		await this.ensurePage(pageId);
		const locator = await this.resolveLocator(pageId, target);
		await locator.hover();
	}

	async press(pageId: string, keys: string): Promise<void> {
		const { page } = await this.ensurePage(pageId);
		await page.keyboard.press(keys);
	}

	async drag(pageId: string, from: ElementTarget, to: ElementTarget): Promise<void> {
		await this.ensurePage(pageId);
		const fromLocator = await this.resolveLocator(pageId, from);
		const toLocator = await this.resolveLocator(pageId, to);
		await fromLocator.dragTo(toLocator);
	}

	async scroll(pageId: string, target?: ElementTarget, options?: ScrollOptions): Promise<void> {
		const { page } = await this.ensurePage(pageId);

		if (target) {
			const locator = await this.resolveLocator(pageId, target);
			await locator.scrollIntoViewIfNeeded();
		} else {
			const amount = options?.amount ?? 500;
			const delta = options?.direction === 'up' ? -amount : amount;
			await page.mouse.wheel(0, delta);
		}
	}

	async upload(pageId: string, target: ElementTarget | undefined, files: string[]): Promise<void> {
		const state = await this.ensurePage(pageId);

		// If a file chooser dialog is pending, use it directly
		if (state.pendingFileChooser) {
			await state.pendingFileChooser.setFiles(files);
			state.pendingFileChooser = undefined;
			return;
		}

		// Otherwise, set files on the input element
		if (!target) {
			throw new Error('No file chooser pending and no element target provided');
		}
		const locator = await this.resolveLocator(pageId, target);
		await locator.setInputFiles(files);
	}

	async dialog(pageId: string, action: 'accept' | 'dismiss', text?: string): Promise<string> {
		const state = await this.ensurePage(pageId);

		// If a dialog is already pending, handle it immediately
		if (state.pendingDialog) {
			const dialogType = state.pendingDialog.type();
			if (action === 'accept') {
				await state.pendingDialog.accept(text);
			} else {
				await state.pendingDialog.dismiss();
			}
			state.pendingDialog = undefined;
			return dialogType;
		}

		// Otherwise, arm a one-shot handler and wait
		return await new Promise<string>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error('No dialog appeared within 10 seconds'));
			}, 10_000);

			state.page.once('dialog', async (dlg: Dialog) => {
				clearTimeout(timeout);
				try {
					const dialogType = dlg.type();
					if (action === 'accept') {
						await dlg.accept(text);
					} else {
						await dlg.dismiss();
					}
					resolve(dialogType);
				} catch (error) {
					reject(toError(error));
				}
			});
		});
	}

	// =========================================================================
	// Inspection
	// =========================================================================

	async screenshot(
		pageId: string,
		target?: ElementTarget,
		options?: ScreenshotOptions,
	): Promise<string> {
		const { page } = await this.ensurePage(pageId);

		let buffer: Buffer;
		if (target) {
			const locator = await this.resolveLocator(pageId, target);
			buffer = await locator.screenshot({ type: 'png' });
		} else {
			buffer = await page.screenshot({
				type: 'png',
				fullPage: options?.fullPage,
			});
		}

		return buffer.toString('base64');
	}

	async snapshot(pageId: string, target?: ElementTarget): Promise<SnapshotResult> {
		const { page } = await this.ensurePage(pageId);

		// Use Playwright's internal _snapshotForAI API which returns a YAML
		// accessibility tree with [ref=eN] annotations on interactive elements.
		// This is the same API used by Playwright MCP's Tab.captureSnapshot().
		let yaml: string;
		if (target) {
			const locator = await this.resolveLocator(pageId, target);
			// Scoped snapshots use the public ariaSnapshot() on the locator
			yaml = await locator.ariaSnapshot();
		} else {
			const privatePage = page as PlaywrightPagePrivate;
			const result = await privatePage._snapshotForAI({ track: 'response' });
			yaml = result.full;
		}

		if (!yaml) {
			return { tree: '(empty page)', refCount: 0 };
		}

		// Count refs in the output (format: [ref=eN])
		const refMatches = yaml.match(/\[ref=e\d+\]/g);
		const refCount = refMatches?.length ?? 0;

		return { tree: yaml, refCount };
	}

	async getText(pageId: string, target?: ElementTarget): Promise<string> {
		const { page } = await this.ensurePage(pageId);

		if (target) {
			const locator = await this.resolveLocator(pageId, target);
			return await locator.innerText();
		}

		return await page.innerText('body');
	}

	async evaluate(pageId: string, script: string): Promise<unknown> {
		const { page } = await this.ensurePage(pageId);
		return await page.evaluate(script);
	}

	async getConsole(pageId: string, level?: string, clear?: boolean): Promise<ConsoleEntry[]> {
		const state = await this.ensurePage(pageId);

		// Merge page errors into console entries as level: 'error'
		let entries: ConsoleEntry[] = [
			...state.consoleBuffer,
			...state.errorBuffer.map((e) => ({
				level: 'error',
				text: e.stack ? `${e.message}\n${e.stack}` : e.message,
				timestamp: e.timestamp,
			})),
		];

		// Sort by timestamp so console messages and page errors are interleaved correctly
		entries.sort((a, b) => a.timestamp - b.timestamp);

		if (level) {
			entries = entries.filter((e) => e.level === level);
		}

		if (clear) {
			state.consoleBuffer = [];
			state.errorBuffer = [];
		}

		return entries;
	}

	getConsoleSummary(pageId: string): { errors: number; warnings: number } {
		// Sync — only works for already-activated pages. Returns zeros for unactivated tabs.
		const state = this.pageStates.get(pageId);
		if (!state) return { errors: 0, warnings: 0 };
		const consoleErrors = state.consoleBuffer.filter((e) => e.level === 'error').length;
		const pageErrors = state.errorBuffer.length;
		const warnings = state.consoleBuffer.filter((e) => e.level === 'warning').length;
		return { errors: consoleErrors + pageErrors, warnings };
	}

	async pdf(
		pageId: string,
		options?: { format?: string; landscape?: boolean },
	): Promise<{ data: string; pages: number }> {
		const { page } = await this.ensurePage(pageId);
		const buffer = await page.pdf({
			format: (options?.format as 'A4' | 'Letter' | 'Legal') ?? 'A4',
			landscape: options?.landscape,
		});
		// Rough page count estimation (PDF doesn't easily expose page count)
		const data = buffer.toString('base64');
		return { data, pages: 1 };
	}

	async getNetwork(pageId: string, filter?: string, clear?: boolean): Promise<NetworkEntry[]> {
		const state = await this.ensurePage(pageId);
		let entries = [...state.networkBuffer];

		if (filter) {
			const pattern = this.globToRegex(filter);
			entries = entries.filter((e) => pattern.test(e.url));
		}

		if (clear) {
			state.networkBuffer = [];
		}

		return entries;
	}

	// =========================================================================
	// Wait
	// =========================================================================

	async wait(pageId: string, options: WaitOptions): Promise<number> {
		const { page } = await this.ensurePage(pageId);
		const start = Date.now();
		const timeout = options.timeoutMs ?? 30_000;

		const promises: Array<Promise<unknown>> = [];

		if (options.selector) {
			promises.push(page.waitForSelector(options.selector, { timeout }));
		}
		if (options.url) {
			promises.push(page.waitForURL(options.url, { timeout }));
		}
		if (options.loadState) {
			promises.push(page.waitForLoadState(options.loadState, { timeout }));
		}
		if (options.predicate) {
			promises.push(page.waitForFunction(options.predicate, undefined, { timeout }));
		}
		if (options.text) {
			promises.push(page.waitForSelector(`text=${options.text}`, { timeout }));
		}

		if (promises.length === 0) {
			// No conditions — just wait a beat
			await page.waitForTimeout(100);
		} else {
			await Promise.all(promises);
		}

		return Date.now() - start;
	}

	// =========================================================================
	// State
	// =========================================================================

	async getCookies(pageId: string, url?: string): Promise<Cookie[]> {
		await this.ensurePage(pageId);
		const context = this.requireContext();
		const cookies = url ? await context.cookies(url) : await context.cookies();

		return cookies.map((c) => ({
			name: c.name,
			value: c.value,
			domain: c.domain,
			path: c.path,
			expires: c.expires,
			httpOnly: c.httpOnly,
			secure: c.secure,
			sameSite: c.sameSite as Cookie['sameSite'],
		}));
	}

	async setCookies(pageId: string, cookies: Cookie[]): Promise<void> {
		await this.ensurePage(pageId);
		const context = this.requireContext();
		await context.addCookies(
			cookies.map((c) => ({
				name: c.name,
				value: c.value,
				domain: c.domain,
				path: c.path ?? '/',
				expires: c.expires,
				httpOnly: c.httpOnly,
				secure: c.secure,
				sameSite: c.sameSite,
			})),
		);
	}

	async clearCookies(pageId: string): Promise<void> {
		await this.ensurePage(pageId);
		await this.requireContext().clearCookies();
	}

	async getStorage(pageId: string, kind: 'local' | 'session'): Promise<Record<string, string>> {
		const { page } = await this.ensurePage(pageId);
		const storageObj = kind === 'local' ? 'localStorage' : 'sessionStorage';
		return await page.evaluate((s) => {
			const storage = s === 'localStorage' ? localStorage : sessionStorage;
			const result: Record<string, string> = {};
			for (let i = 0; i < storage.length; i++) {
				const key = storage.key(i);
				if (key !== null) result[key] = storage.getItem(key) ?? '';
			}
			return result;
		}, storageObj);
	}

	async setStorage(
		pageId: string,
		kind: 'local' | 'session',
		data: Record<string, string>,
	): Promise<void> {
		const { page } = await this.ensurePage(pageId);
		await page.evaluate(
			({ kind: k, data: d }) => {
				const storage = k === 'local' ? localStorage : sessionStorage;
				for (const [key, value] of Object.entries(d)) {
					storage.setItem(key, value);
				}
			},
			{ kind, data },
		);
	}

	async clearStorage(pageId: string, kind: 'local' | 'session'): Promise<void> {
		const { page } = await this.ensurePage(pageId);
		await page.evaluate((k) => {
			const storage = k === 'local' ? localStorage : sessionStorage;
			storage.clear();
		}, kind);
	}

	// =========================================================================
	// Post-action settling — waits for network/navigation to complete
	// Matches Playwright MCP's waitForCompletion() behavior.
	// =========================================================================

	async waitForCompletion<T>(pageId: string, action: () => Promise<T>): Promise<T> {
		// Guard: if the page doesn't exist yet (e.g. tab_open before creation),
		// just run the action without waiting for completion.
		if (!this.pageStates.has(pageId) && !this.relay?.hasTab(pageId)) {
			log.debug('waitForCompletion: page not found, running action directly:', pageId);
			return await action();
		}
		const { page } = await this.ensurePage(pageId);
		const requests: Request[] = [];

		const requestListener = (request: Request) => requests.push(request);
		page.on('request', requestListener);

		let result: T;
		try {
			result = await action();
			await page.waitForTimeout(500);
		} finally {
			page.off('request', requestListener);
		}

		// If any navigation request was made, wait for load state
		if (requests.some((r) => r.isNavigationRequest())) {
			await page
				.mainFrame()
				.waitForLoadState('load', { timeout: 10_000 })
				.catch(() => {});
			return result;
		}

		// Wait for resource requests to finish
		const resourceTypes = new Set(['document', 'stylesheet', 'script', 'xhr', 'fetch']);
		const promises = requests.map(async (r) => {
			if (resourceTypes.has(r.resourceType())) {
				const resp = await r.response().catch(() => undefined);
				await resp?.finished().catch(() => {});
				return;
			}
			await r.response().catch(() => {});
		});

		await Promise.race([
			Promise.all(promises),
			new Promise((resolve) => setTimeout(resolve, 5_000)),
		]);

		if (requests.length > 0) {
			await page.waitForTimeout(500);
		}

		return result;
	}

	// =========================================================================
	// Modal state — surfaces pending dialogs and file choosers
	// =========================================================================

	getModalStates(pageId: string): ModalState[] {
		// Sync — only works for already-activated pages. Returns empty for unactivated tabs.
		const state = this.pageStates.get(pageId);
		if (!state) return [];
		const modals: ModalState[] = [];

		if (state.pendingDialog) {
			modals.push({
				type: 'dialog',
				description: `JavaScript ${state.pendingDialog.type()} dialog: "${state.pendingDialog.message()}"`,
				clearedBy: 'browser_dialog',
				dialogType: state.pendingDialog.type() as ModalState['dialogType'],
				message: state.pendingDialog.message(),
			});
		}

		if (state.pendingFileChooser) {
			modals.push({
				type: 'filechooser',
				description: 'File chooser is open, waiting for file selection.',
				clearedBy: 'browser_upload',
			});
		}

		return modals;
	}

	// =========================================================================
	// Content extraction — raw HTML + URL for markdown conversion
	// =========================================================================

	async getContent(pageId: string, selector?: string): Promise<{ html: string; url: string }> {
		const { page } = await this.ensurePage(pageId);

		if (selector) {
			const locator = page.locator(selector);
			const html = await locator.evaluate((el) => el.outerHTML);
			return { html, url: page.url() };
		}

		return { html: await page.content(), url: page.url() };
	}

	// =========================================================================
	// Ref resolution — uses Playwright's built-in aria-ref selector engine
	// =========================================================================

	async resolveRef(pageId: string, ref: string): Promise<unknown> {
		const { page } = await this.ensurePage(pageId);
		const locator = page.locator(`aria-ref=${ref}`);

		// Verify the element exists
		try {
			const count = await locator.count();
			if (count === 0) throw new StaleRefError(ref);
		} catch (error) {
			if (error instanceof StaleRefError) throw error;
			throw new StaleRefError(ref);
		}

		return locator;
	}

	// =========================================================================
	// Private helpers
	// =========================================================================

	private requireContext(): BrowserContext {
		if (!this.context) throw new Error('Browser context not initialized');
		return this.context;
	}

	private requirePage(pageId: string): PageState {
		const state = this.pageStates.get(pageId);
		if (!state) throw new PageNotFoundError(pageId);
		return state;
	}

	/**
	 * Lazy page activation: return the page if already tracked, otherwise
	 * tell the relay to activate the tab (attach debugger + emit
	 * Target.attachedToTarget) and wait for Playwright to create the Page.
	 */
	private async ensurePage(pageId: string): Promise<PageState> {
		const existing = this.pageStates.get(pageId);
		if (existing) {
			log.debug('ensurePage: page already tracked:', pageId);
			return existing;
		}

		if (!this.relay || !this.context) throw new PageNotFoundError(pageId);

		// Guard: don't attempt lazy activation for unknown/empty tab IDs
		if (!pageId || !this.relay.hasTab(pageId)) {
			throw new PageNotFoundError(pageId);
		}

		log.debug('ensurePage: activating tab', pageId, 'current pages:', [...this.pageStates.keys()]);

		const pagePromise = new Promise<Page>((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingActivation = undefined;
				log.error('ensurePage: timed out waiting for page event after activateTab:', pageId);
				reject(new Error(`Timed out waiting for page after activateTab (${pageId})`));
			}, 10_000);
			this.pendingActivation = {
				id: pageId,
				resolve: (page) => {
					clearTimeout(timeout);
					log.debug('ensurePage: page event received for', pageId);
					resolve(page);
				},
			};
		});

		log.debug('ensurePage: calling activateTab for', pageId);
		await this.relay.activateTab(pageId);
		log.debug('ensurePage: activateTab completed for', pageId, '— waiting for page event');

		const page = await pagePromise;

		// Wait for page to be ready
		log.debug('ensurePage: waiting for domcontentloaded on', pageId);
		await page.waitForLoadState('domcontentloaded', { timeout: 5_000 }).catch(() => {
			log.debug('ensurePage: domcontentloaded timeout (non-fatal) for', pageId);
		});

		log.debug('ensurePage: page ready:', pageId);
		// The context.on('page') listener should have tracked it with the right ID
		return this.pageStates.get(pageId) ?? this.trackPage(page, pageId);
	}

	private findPageState(page: Page): PageState | undefined {
		for (const state of this.pageStates.values()) {
			if (state.page === page) return state;
		}
		return undefined;
	}

	private trackPage(page: Page, explicitId?: string): PageState {
		const id = explicitId ?? generateId('page');
		log.debug('trackPage: id =', id, 'url =', page.url());
		const state: PageState = {
			page,
			info: { id, title: '', url: page.url() },
			consoleBuffer: [],
			errorBuffer: [],
			networkBuffer: [],
		};

		// Console listener
		page.on('console', (msg) => {
			state.consoleBuffer.push({
				level: msg.type(),
				text: msg.text(),
				timestamp: Date.now(),
			});
		});

		// Error listener
		page.on('pageerror', (error) => {
			state.errorBuffer.push({
				message: error.message,
				stack: error.stack,
				timestamp: Date.now(),
			});
		});

		// Network listeners
		page.on('response', (response: Response) => {
			state.networkBuffer.push({
				url: response.url(),
				method: response.request().method(),
				status: response.status(),
				contentType: response.headers()['content-type'],
				timestamp: Date.now(),
			});
		});

		// Dialog listener — capture pending dialogs
		page.on('dialog', (dlg: Dialog) => {
			state.pendingDialog = dlg;
		});

		// File chooser listener — capture pending file choosers
		page.on('filechooser', (chooser: FileChooser) => {
			state.pendingFileChooser = chooser;
		});

		// Clean up on page close — also clear relay activation so re-activation works
		page.on('close', () => {
			log.debug('page closed:', id);
			this.pageStates.delete(id);
			this.relay?.deactivateTab(id);
		});

		this.pageStates.set(id, state);
		return state;
	}

	/** Get the live URL for a tracked page (synchronous, from Playwright's page.url()). */
	getPageUrl(pageId: string): string | undefined {
		const state = this.pageStates.get(pageId);
		if (!state) return undefined;
		try {
			return state.page.url();
		} catch {
			return undefined;
		}
	}

	private async resolveLocator(pageId: string, target: ElementTarget): Promise<Locator> {
		if ('ref' in target) {
			return (await this.resolveRef(pageId, target.ref)) as Locator;
		}
		const { page } = this.requirePage(pageId);
		return page.locator(target.selector);
	}

	private globToRegex(pattern: string): RegExp {
		const escaped = pattern
			.replace(/[.+^${}()|[\]\\]/g, '\\$&')
			.replace(/\*\*/g, '.*')
			.replace(/\*/g, '[^/]*')
			.replace(/\?/g, '.');
		return new RegExp(`^${escaped}$`);
	}
}
