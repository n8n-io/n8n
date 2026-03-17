import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { Browser, BrowserContext, Dialog, Locator, Page, Response } from 'playwright-core';
import { chromium, firefox, webkit, devices } from 'playwright-core';

import { CDPRelayServer } from '../cdp-relay';
import { PageNotFoundError, StaleRefError, UnsupportedOperationError } from '../errors';
import type {
	BrowserName,
	ClickOptions,
	ConsoleEntry,
	Cookie,
	DeviceDescriptor,
	ElementTarget,
	ErrorEntry,
	NavigateResult,
	NetworkEntry,
	PageInfo,
	ResolvedConfig,
	ScreenshotOptions,
	ScrollOptions,
	SessionConfig,
	SnapshotResult,
	TypeOptions,
	WaitOptions,
} from '../types';
import { isChromiumBased } from '../types';
import { generateId, toError } from '../utils';
import type { BrowserAdapter } from './adapter';

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
}

// ---------------------------------------------------------------------------
// Stable extension ID derived from the "key" field in mcp-browser-extension/manifest.json.
// This ensures the same ID whether loaded unpacked or installed from the Chrome Web Store.
// ---------------------------------------------------------------------------

const BROWSER_BRIDGE_EXTENSION_ID = 'agklaocphkdbepcjccjpnbcglmpebhpo';

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class PlaywrightAdapter implements BrowserAdapter {
	readonly name = 'playwright';

	private resolvedConfig: ResolvedConfig;
	private browser?: Browser;
	private context?: BrowserContext;
	private pageStates = new Map<string, PageState>();
	private relay?: CDPRelayServer;

	constructor(config: ResolvedConfig) {
		this.resolvedConfig = config;
	}

	// =========================================================================
	// Lifecycle
	// =========================================================================

	async launch(config: SessionConfig): Promise<void> {
		const browserType = this.getBrowserType(config.browser);
		const launchOptions = { headless: config.headless };

		if (config.mode === 'ephemeral') {
			this.browser = await browserType.launch(launchOptions);
			this.context = await this.browser.newContext({ viewport: config.viewport });
		} else if (config.mode === 'persistent') {
			const profileDir = path.join(
				this.resolvedConfig.profilesDir,
				config.profileName ?? 'default',
			);
			fs.mkdirSync(profileDir, { recursive: true });
			this.context = await browserType.launchPersistentContext(profileDir, {
				...launchOptions,
				viewport: config.viewport,
			});
		} else {
			// local mode — connect to the user's running Chrome via extension bridge.
			// The CDPRelayServer bridges Playwright ↔ Chrome extension (chrome.debugger).
			this.relay = new CDPRelayServer();
			const port = await this.relay.listen();
			const extensionEndpoint = this.relay.extensionEndpoint(port);

			// Open the extension's connect page with the relay URL so the user can pick a tab.
			const connectUrl =
				`chrome-extension://${BROWSER_BRIDGE_EXTENSION_ID}/dist/connect.html` +
				`?mcpRelayUrl=${encodeURIComponent(extensionEndpoint)}`;
			const browserInfo = this.resolvedConfig.browsers.get(config.browser);
			const chromePath = browserInfo?.executablePath;
			if (chromePath) {
				execFile(chromePath, [connectUrl]);
			}

			// Wait for the extension to connect and attach to a tab
			await this.relay.waitForExtension();

			// Connect Playwright over CDP through the relay
			const cdpEndpoint = this.relay.cdpEndpoint(port);
			this.browser = await chromium.connectOverCDP(cdpEndpoint);
			const contexts = this.browser.contexts();
			this.context = contexts[0] ?? (await this.browser.newContext({ viewport: config.viewport }));
		}

		// Set up the initial page
		const pages = this.context.pages();
		if (pages.length > 0) {
			this.trackPage(pages[0]);
		} else {
			const page = await this.context.newPage();
			this.trackPage(page);
		}

		// Listen for new pages opened by the browser
		this.context.on('page', (page: Page) => {
			if (!this.findPageState(page)) {
				this.trackPage(page);
			}
		});
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
		const page = await this.requireContext().newPage();
		const state = this.trackPage(page);

		if (url) {
			await page.goto(url, { waitUntil: 'load' });
			state.info.title = await page.title();
			state.info.url = page.url();
		}

		return { ...state.info };
	}

	async closePage(pageId: string): Promise<void> {
		const state = this.requirePage(pageId);
		this.pageStates.delete(pageId);
		await state.page.close();
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

	// =========================================================================
	// Navigation
	// =========================================================================

	async navigate(
		pageId: string,
		url: string,
		waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'load',
	): Promise<NavigateResult> {
		const { page } = this.requirePage(pageId);
		const response = await page.goto(url, { waitUntil });
		return {
			title: await page.title(),
			url: page.url(),
			status: response?.status() ?? 0,
		};
	}

	async back(pageId: string): Promise<NavigateResult> {
		const { page } = this.requirePage(pageId);
		await page.goBack({ waitUntil: 'load' });
		return { title: await page.title(), url: page.url(), status: 0 };
	}

	async forward(pageId: string): Promise<NavigateResult> {
		const { page } = this.requirePage(pageId);
		await page.goForward({ waitUntil: 'load' });
		return { title: await page.title(), url: page.url(), status: 0 };
	}

	async reload(
		pageId: string,
		waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'load',
	): Promise<NavigateResult> {
		const { page } = this.requirePage(pageId);
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
		const locator = await this.resolveLocator(pageId, target);
		return await locator.selectOption(values);
	}

	async hover(pageId: string, target: ElementTarget): Promise<void> {
		const locator = await this.resolveLocator(pageId, target);
		await locator.hover();
	}

	async press(pageId: string, keys: string): Promise<void> {
		const { page } = this.requirePage(pageId);
		await page.keyboard.press(keys);
	}

	async drag(pageId: string, from: ElementTarget, to: ElementTarget): Promise<void> {
		const fromLocator = await this.resolveLocator(pageId, from);
		const toLocator = await this.resolveLocator(pageId, to);
		await fromLocator.dragTo(toLocator);
	}

	async scroll(pageId: string, target?: ElementTarget, options?: ScrollOptions): Promise<void> {
		const { page } = this.requirePage(pageId);

		if (target) {
			const locator = await this.resolveLocator(pageId, target);
			await locator.scrollIntoViewIfNeeded();
		} else {
			const amount = options?.amount ?? 500;
			const delta = options?.direction === 'up' ? -amount : amount;
			await page.mouse.wheel(0, delta);
		}
	}

	async upload(pageId: string, target: ElementTarget, files: string[]): Promise<void> {
		const locator = await this.resolveLocator(pageId, target);
		await locator.setInputFiles(files);
	}

	async dialog(pageId: string, action: 'accept' | 'dismiss', text?: string): Promise<string> {
		const state = this.requirePage(pageId);

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
		const { page } = this.requirePage(pageId);

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
		const { page } = this.requirePage(pageId);

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
		const { page } = this.requirePage(pageId);

		if (target) {
			const locator = await this.resolveLocator(pageId, target);
			return await locator.innerText();
		}

		return await page.innerText('body');
	}

	async evaluate(pageId: string, script: string): Promise<unknown> {
		const { page } = this.requirePage(pageId);
		return await page.evaluate(script);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getConsole(pageId: string, level?: string, clear?: boolean): Promise<ConsoleEntry[]> {
		const state = this.requirePage(pageId);
		let entries = [...state.consoleBuffer];

		if (level) {
			entries = entries.filter((e) => e.level === level);
		}

		if (clear) {
			state.consoleBuffer = [];
		}

		return entries;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getErrors(pageId: string, clear?: boolean): Promise<ErrorEntry[]> {
		const state = this.requirePage(pageId);
		const entries = [...state.errorBuffer];

		if (clear) {
			state.errorBuffer = [];
		}

		return entries;
	}

	async pdf(
		pageId: string,
		options?: { format?: string; landscape?: boolean },
	): Promise<{ data: string; pages: number }> {
		const { page } = this.requirePage(pageId);
		const buffer = await page.pdf({
			format: (options?.format as 'A4' | 'Letter' | 'Legal') ?? 'A4',
			landscape: options?.landscape,
		});
		// Rough page count estimation (PDF doesn't easily expose page count)
		const data = buffer.toString('base64');
		return { data, pages: 1 };
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getNetwork(pageId: string, filter?: string, clear?: boolean): Promise<NetworkEntry[]> {
		const state = this.requirePage(pageId);
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
		const { page } = this.requirePage(pageId);
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
		this.requirePage(pageId);
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
		this.requirePage(pageId);
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
		this.requirePage(pageId);
		await this.requireContext().clearCookies();
	}

	async getStorage(pageId: string, kind: 'local' | 'session'): Promise<Record<string, string>> {
		const { page } = this.requirePage(pageId);
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
		const { page } = this.requirePage(pageId);
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
		const { page } = this.requirePage(pageId);
		await page.evaluate((k) => {
			const storage = k === 'local' ? localStorage : sessionStorage;
			storage.clear();
		}, kind);
	}

	async setOffline(pageId: string, offline: boolean): Promise<void> {
		this.requirePage(pageId);
		await this.requireContext().setOffline(offline);
	}

	async setHeaders(pageId: string, headers: Record<string, string>): Promise<void> {
		this.requirePage(pageId);
		await this.requireContext().setExtraHTTPHeaders(headers);
	}

	async setGeolocation(
		pageId: string,
		geo: { latitude: number; longitude: number; accuracy?: number } | null,
	): Promise<void> {
		this.requirePage(pageId);
		const context = this.requireContext();
		if (geo) {
			await context.grantPermissions(['geolocation']);
			await context.setGeolocation(geo);
		} else {
			await context.setGeolocation(null as unknown as { latitude: number; longitude: number });
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setTimezone(pageId: string, _timezone: string): Promise<void> {
		this.requirePage(pageId);
		// Timezone can only be set at context creation time in Playwright.
		// For existing contexts, we throw unsupported.
		throw new UnsupportedOperationError('setTimezone (must be set at session creation)', this.name);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setLocale(pageId: string, _locale: string): Promise<void> {
		this.requirePage(pageId);
		throw new UnsupportedOperationError('setLocale (must be set at session creation)', this.name);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setDevice(pageId: string, device: DeviceDescriptor): Promise<void> {
		this.requirePage(pageId);
		const descriptor = devices[device.name];
		if (!descriptor) {
			throw new Error(
				`Unknown device: ${device.name}. Use a Playwright device name like "iPhone 14" or "Pixel 7".`,
			);
		}
		// Device emulation can only be set at context creation in Playwright.
		throw new UnsupportedOperationError('setDevice (must be set at session creation)', this.name);
	}

	// =========================================================================
	// Ref resolution — uses Playwright's built-in aria-ref selector engine
	// =========================================================================

	async resolveRef(pageId: string, ref: string): Promise<unknown> {
		const { page } = this.requirePage(pageId);
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

	private getBrowserType(browser: BrowserName) {
		if (isChromiumBased(browser)) return chromium;
		if (browser === 'firefox') return firefox;
		if (browser === 'webkit' || browser === 'safari') return webkit;
		return chromium;
	}

	private requireContext(): BrowserContext {
		if (!this.context) throw new Error('Browser context not initialized');
		return this.context;
	}

	private requirePage(pageId: string): PageState {
		const state = this.pageStates.get(pageId);
		if (!state) throw new PageNotFoundError(pageId, '');
		return state;
	}

	private findPageState(page: Page): PageState | undefined {
		for (const state of this.pageStates.values()) {
			if (state.page === page) return state;
		}
		return undefined;
	}

	private trackPage(page: Page): PageState {
		const id = generateId('page');
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

		// Clean up on page close
		page.on('close', () => {
			this.pageStates.delete(id);
		});

		this.pageStates.set(id, state);
		return state;
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
