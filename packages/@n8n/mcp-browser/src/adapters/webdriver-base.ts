import type { Actions, IWebDriverCookie, WebDriver, WebElement } from 'selenium-webdriver';
import { By, Key } from 'selenium-webdriver';

import { PageNotFoundError, StaleRefError, UnsupportedOperationError } from '../errors';
import type {
	ClickOptions,
	ConsoleEntry,
	Cookie,
	DeviceDescriptor,
	ElementTarget,
	ErrorEntry,
	NavigateResult,
	NetworkEntry,
	PageInfo,
	ScreenshotOptions,
	ScrollOptions,
	SessionConfig,
	SnapshotResult,
	TypeOptions,
	WaitOptions,
} from '../types';
import { generateId } from '../utils';
import type { BrowserAdapter } from './adapter';
import { mapPlaywrightKeyToWebDriver, toWebDriverLocator } from './selector-utils';
import { SNAPSHOT_SCRIPT, parseSnapshotResult } from './snapshot-script';

// ---------------------------------------------------------------------------
// Per-page state
// ---------------------------------------------------------------------------

interface PageState {
	handle: string; // WebDriver window handle
	info: PageInfo;
}

// ---------------------------------------------------------------------------
// Abstract base
// ---------------------------------------------------------------------------

/**
 * Shared WebDriver adapter logic for both WebDriver BiDi (Firefox) and
 * classic WebDriver (Safari). Subclasses implement `createDriver()` and
 * may override methods for protocol-specific features.
 */
export abstract class WebDriverBaseAdapter implements BrowserAdapter {
	abstract readonly name: string;

	protected driver?: WebDriver;
	protected pageStates = new Map<string, PageState>();

	// Subclass must implement how to create the driver
	protected abstract createDriver(config: SessionConfig): Promise<WebDriver>;

	// =========================================================================
	// Lifecycle
	// =========================================================================

	async launch(config: SessionConfig): Promise<void> {
		this.driver = await this.createDriver(config);

		// Track the initial window/tab
		const handles = await this.driver.getAllWindowHandles();
		if (handles.length > 0) {
			await this.trackHandle(handles[0]);
		}
	}

	async close(): Promise<void> {
		try {
			if (this.driver) await this.driver.quit();
		} catch {
			// driver may already be dead
		}
		this.pageStates.clear();
	}

	// =========================================================================
	// Pages
	// =========================================================================

	async newPage(url?: string): Promise<PageInfo> {
		const driver = this.requireDriver();

		// Open a new tab via script (WebDriver standard)
		await driver.executeScript('window.open("about:blank", "_blank")');
		const handles = await driver.getAllWindowHandles();
		const newHandle = handles[handles.length - 1];
		await driver.switchTo().window(newHandle);

		const state = await this.trackHandle(newHandle);

		if (url) {
			await driver.navigate().to(url);
			state.info.title = await driver.getTitle();
			state.info.url = await driver.getCurrentUrl();
		}

		return { ...state.info };
	}

	async closePage(pageId: string): Promise<void> {
		const state = this.requirePage(pageId);
		const driver = this.requireDriver();

		await driver.switchTo().window(state.handle);
		await driver.close();
		this.pageStates.delete(pageId);

		// Switch to another open page if available
		const remaining = Array.from(this.pageStates.values());
		if (remaining.length > 0) {
			await driver.switchTo().window(remaining[0].handle);
		}
	}

	async listPages(): Promise<PageInfo[]> {
		const driver = this.requireDriver();
		const result: PageInfo[] = [];

		for (const state of this.pageStates.values()) {
			try {
				await driver.switchTo().window(state.handle);
				state.info.title = await driver.getTitle();
				state.info.url = await driver.getCurrentUrl();
			} catch {
				// window may have been closed externally
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
		_waitUntil?: 'load' | 'domcontentloaded' | 'networkidle',
	): Promise<NavigateResult> {
		const driver = await this.switchToPage(pageId);
		await driver.navigate().to(url);
		// WebDriver waits for page load by default
		return {
			title: await driver.getTitle(),
			url: await driver.getCurrentUrl(),
			status: 200, // WebDriver doesn't expose response status
		};
	}

	async back(pageId: string): Promise<NavigateResult> {
		const driver = await this.switchToPage(pageId);
		await driver.navigate().back();
		return {
			title: await driver.getTitle(),
			url: await driver.getCurrentUrl(),
			status: 0,
		};
	}

	async forward(pageId: string): Promise<NavigateResult> {
		const driver = await this.switchToPage(pageId);
		await driver.navigate().forward();
		return {
			title: await driver.getTitle(),
			url: await driver.getCurrentUrl(),
			status: 0,
		};
	}

	async reload(
		pageId: string,
		_waitUntil?: 'load' | 'domcontentloaded' | 'networkidle',
	): Promise<NavigateResult> {
		const driver = await this.switchToPage(pageId);
		await driver.navigate().refresh();
		return {
			title: await driver.getTitle(),
			url: await driver.getCurrentUrl(),
			status: 0,
		};
	}

	// =========================================================================
	// Interaction
	// =========================================================================

	async click(pageId: string, target: ElementTarget, options?: ClickOptions): Promise<void> {
		const driver = await this.switchToPage(pageId);
		const element = await this.resolveElement(driver, target);

		const actions = driver.actions({ bridge: false });

		if (options?.modifiers?.length) {
			this.applyModifiers(actions, options.modifiers, 'down');
		}

		const button = options?.button === 'right' ? 2 : options?.button === 'middle' ? 1 : 0;
		const clickCount = options?.clickCount ?? 1;

		actions.move({ origin: element });

		for (let i = 0; i < clickCount; i++) {
			actions.press(button).release(button);
		}

		if (options?.modifiers?.length) {
			this.applyModifiers(actions, options.modifiers, 'up');
		}

		await actions.perform();
	}

	async type(
		pageId: string,
		target: ElementTarget,
		text: string,
		options?: TypeOptions,
	): Promise<void> {
		const driver = await this.switchToPage(pageId);
		const element = await this.resolveElement(driver, target);

		if (options?.clear) {
			await element.clear();
		}

		if (options?.delay) {
			// Type character by character with delay
			for (const char of text) {
				await element.sendKeys(char);
				await driver.sleep(options.delay);
			}
		} else {
			await element.sendKeys(text);
		}

		if (options?.submit) {
			await element.sendKeys(Key.ENTER);
		}
	}

	async select(pageId: string, target: ElementTarget, values: string[]): Promise<string[]> {
		const driver = await this.switchToPage(pageId);
		const element = await this.resolveElement(driver, target);

		// Use JavaScript to set select values since WebDriver doesn't have native select API
		const selected = await driver.executeScript<string[]>(
			`
			var select = arguments[0];
			var values = arguments[1];
			var selected = [];
			for (var i = 0; i < select.options.length; i++) {
				var opt = select.options[i];
				if (values.indexOf(opt.value) !== -1 || values.indexOf(opt.text) !== -1) {
					opt.selected = true;
					selected.push(opt.value);
				}
			}
			select.dispatchEvent(new Event('change', { bubbles: true }));
			return selected;
			`,
			element,
			values,
		);

		return selected;
	}

	async hover(pageId: string, target: ElementTarget): Promise<void> {
		const driver = await this.switchToPage(pageId);
		const element = await this.resolveElement(driver, target);
		await driver.actions({ bridge: false }).move({ origin: element }).perform();
	}

	async press(pageId: string, keys: string): Promise<void> {
		const driver = await this.switchToPage(pageId);
		const webdriverKeys = mapPlaywrightKeyToWebDriver(keys);

		const actions = driver.actions({ bridge: false });

		if (webdriverKeys.length === 1) {
			actions.sendKeys(webdriverKeys[0]);
		} else {
			// Combo: hold down all except last, press last, then release
			for (let i = 0; i < webdriverKeys.length - 1; i++) {
				actions.keyDown(webdriverKeys[i]);
			}
			actions.sendKeys(webdriverKeys[webdriverKeys.length - 1]);
			for (let i = webdriverKeys.length - 2; i >= 0; i--) {
				actions.keyUp(webdriverKeys[i]);
			}
		}

		await actions.perform();
	}

	async drag(pageId: string, from: ElementTarget, to: ElementTarget): Promise<void> {
		const driver = await this.switchToPage(pageId);
		const fromEl = await this.resolveElement(driver, from);
		const toEl = await this.resolveElement(driver, to);
		await driver.actions({ bridge: false }).dragAndDrop(fromEl, toEl).perform();
	}

	async scroll(pageId: string, target?: ElementTarget, options?: ScrollOptions): Promise<void> {
		const driver = await this.switchToPage(pageId);

		if (target) {
			const element = await this.resolveElement(driver, target);
			await driver.executeScript(
				'arguments[0].scrollIntoView({ behavior: "smooth", block: "center" })',
				element,
			);
		} else {
			const amount = options?.amount ?? 500;
			const delta = options?.direction === 'up' ? -amount : amount;
			await driver.executeScript(`window.scrollBy(0, ${delta})`);
		}
	}

	async upload(pageId: string, target: ElementTarget, files: string[]): Promise<void> {
		const driver = await this.switchToPage(pageId);
		const element = await this.resolveElement(driver, target);
		// sendKeys on a file input sets the file path
		await element.sendKeys(files.join('\n'));
	}

	async dialog(pageId: string, action: 'accept' | 'dismiss', text?: string): Promise<string> {
		const driver = await this.switchToPage(pageId);

		try {
			const alert = await driver.switchTo().alert();
			const alertText = await alert.getText();

			if (text !== undefined) {
				await alert.sendKeys(text);
			}

			if (action === 'accept') {
				await alert.accept();
			} else {
				await alert.dismiss();
			}

			return alertText ? 'prompt' : 'alert';
		} catch {
			throw new Error('No dialog present');
		}
	}

	// =========================================================================
	// Inspection
	// =========================================================================

	async screenshot(
		pageId: string,
		target?: ElementTarget,
		_options?: ScreenshotOptions,
	): Promise<string> {
		const driver = await this.switchToPage(pageId);

		if (target) {
			const element = await this.resolveElement(driver, target);
			// Scroll into view first
			await driver.executeScript('arguments[0].scrollIntoView({ block: "center" })', element);
		}

		// WebDriver screenshot is always full viewport
		return await driver.takeScreenshot();
	}

	async snapshot(pageId: string, _target?: ElementTarget): Promise<SnapshotResult> {
		const driver = await this.switchToPage(pageId);

		// Scoped snapshots are not yet supported for WebDriver adapters —
		// always snapshot the full page. The target parameter is accepted
		// for interface compatibility.
		const result = await driver.executeScript<string>(SNAPSHOT_SCRIPT);
		const parsed = parseSnapshotResult(result);
		return { tree: parsed.yaml, refCount: parsed.refCount };
	}

	async getText(pageId: string, target?: ElementTarget): Promise<string> {
		const driver = await this.switchToPage(pageId);

		if (target) {
			const element = await this.resolveElement(driver, target);
			return await element.getText();
		}

		return await driver.executeScript<string>('return document.body.innerText');
	}

	async evaluate(pageId: string, script: string): Promise<unknown> {
		const driver = await this.switchToPage(pageId);
		return await driver.executeScript(script);
	}

	async pdf(
		pageId: string,
		options?: { format?: string; landscape?: boolean },
	): Promise<{ data: string; pages: number }> {
		const driver = await this.switchToPage(pageId);
		const data = await driver.printPage({
			orientation: options?.landscape ? 'landscape' : 'portrait',
		});
		return { data, pages: 1 };
	}

	// =========================================================================
	// Inspection — console/errors/network (default: unsupported)
	// Subclasses with BiDi support can override these.
	// =========================================================================

	// eslint-disable-next-line @typescript-eslint/require-await
	async getConsole(_pageId: string, _level?: string, _clear?: boolean): Promise<ConsoleEntry[]> {
		throw new UnsupportedOperationError('getConsole', this.name);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getErrors(_pageId: string, _clear?: boolean): Promise<ErrorEntry[]> {
		throw new UnsupportedOperationError('getErrors', this.name);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getNetwork(_pageId: string, _filter?: string, _clear?: boolean): Promise<NetworkEntry[]> {
		throw new UnsupportedOperationError('getNetwork', this.name);
	}

	// =========================================================================
	// Wait
	// =========================================================================

	async wait(pageId: string, options: WaitOptions): Promise<number> {
		const driver = await this.switchToPage(pageId);
		const start = Date.now();
		const timeout = options.timeoutMs ?? 30_000;

		const promises: Array<Promise<unknown>> = [];

		if (options.selector) {
			promises.push(
				driver.wait(async () => {
					const els = await driver.findElements(toWebDriverLocator(options.selector!));
					return els.length > 0;
				}, timeout),
			);
		}

		if (options.url) {
			const targetUrl = options.url;
			promises.push(
				driver.wait(async () => {
					const currentUrl = await driver.getCurrentUrl();
					return currentUrl.includes(targetUrl);
				}, timeout),
			);
		}

		if (options.predicate) {
			const predicate = options.predicate;
			promises.push(
				driver.wait(async () => {
					return await driver.executeScript<boolean>(`return Boolean(${predicate})`);
				}, timeout),
			);
		}

		if (options.text) {
			const text = options.text;
			promises.push(
				driver.wait(async () => {
					const bodyText = await driver.executeScript<string>('return document.body.innerText');
					return bodyText.includes(text);
				}, timeout),
			);
		}

		if (options.loadState) {
			const state = options.loadState === 'domcontentloaded' ? 'interactive' : 'complete';
			promises.push(
				driver.wait(async () => {
					const readyState = await driver.executeScript<string>('return document.readyState');
					return readyState === state || readyState === 'complete';
				}, timeout),
			);
		}

		if (promises.length === 0) {
			await driver.sleep(100);
		} else {
			await Promise.all(promises);
		}

		return Date.now() - start;
	}

	// =========================================================================
	// State
	// =========================================================================

	async getCookies(pageId: string, _url?: string): Promise<Cookie[]> {
		await this.switchToPage(pageId);
		const driver = this.requireDriver();
		const cookies = await driver.manage().getCookies();
		return cookies.map((c: IWebDriverCookie) => ({
			name: c.name,
			value: c.value,
			domain: c.domain,
			path: c.path,
			expires: c.expiry,
			httpOnly: c.httpOnly,
			secure: c.secure,
			sameSite: c.sameSite,
		}));
	}

	async setCookies(pageId: string, cookies: Cookie[]): Promise<void> {
		await this.switchToPage(pageId);
		const driver = this.requireDriver();
		for (const c of cookies) {
			await driver.manage().addCookie({
				name: c.name,
				value: c.value,
				domain: c.domain,
				path: c.path ?? '/',
				expiry: c.expires,
				httpOnly: c.httpOnly,
				secure: c.secure,
				sameSite: c.sameSite,
			});
		}
	}

	async clearCookies(pageId: string): Promise<void> {
		await this.switchToPage(pageId);
		const driver = this.requireDriver();
		await driver.manage().deleteAllCookies();
	}

	async getStorage(pageId: string, kind: 'local' | 'session'): Promise<Record<string, string>> {
		const driver = await this.switchToPage(pageId);
		const storageObj = kind === 'local' ? 'localStorage' : 'sessionStorage';
		return await driver.executeScript<Record<string, string>>(
			`
			var storage = ${storageObj};
			var result = {};
			for (var i = 0; i < storage.length; i++) {
				var key = storage.key(i);
				if (key !== null) result[key] = storage.getItem(key) || '';
			}
			return result;
			`,
		);
	}

	async setStorage(
		pageId: string,
		kind: 'local' | 'session',
		data: Record<string, string>,
	): Promise<void> {
		const driver = await this.switchToPage(pageId);
		const storageObj = kind === 'local' ? 'localStorage' : 'sessionStorage';
		await driver.executeScript(
			`
			var storage = ${storageObj};
			var data = arguments[0];
			for (var key in data) {
				if (data.hasOwnProperty(key)) storage.setItem(key, data[key]);
			}
			`,
			data,
		);
	}

	async clearStorage(pageId: string, kind: 'local' | 'session'): Promise<void> {
		const driver = await this.switchToPage(pageId);
		const storageObj = kind === 'local' ? 'localStorage' : 'sessionStorage';
		await driver.executeScript(`${storageObj}.clear()`);
	}

	// State methods that require browser-specific support — default to unsupported
	// eslint-disable-next-line @typescript-eslint/require-await
	async setOffline(_pageId: string, _offline: boolean): Promise<void> {
		throw new UnsupportedOperationError('setOffline', this.name);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setHeaders(_pageId: string, _headers: Record<string, string>): Promise<void> {
		throw new UnsupportedOperationError('setHeaders', this.name);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setGeolocation(
		_pageId: string,
		_geo: { latitude: number; longitude: number; accuracy?: number } | null,
	): Promise<void> {
		throw new UnsupportedOperationError('setGeolocation', this.name);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setTimezone(_pageId: string, _timezone: string): Promise<void> {
		throw new UnsupportedOperationError('setTimezone', this.name);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setLocale(_pageId: string, _locale: string): Promise<void> {
		throw new UnsupportedOperationError('setLocale', this.name);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setDevice(_pageId: string, _device: DeviceDescriptor): Promise<void> {
		throw new UnsupportedOperationError('setDevice', this.name);
	}

	// =========================================================================
	// Ref resolution
	// =========================================================================

	async resolveRef(pageId: string, ref: string): Promise<unknown> {
		const driver = await this.switchToPage(pageId);

		try {
			const element = await driver.findElement(By.css(`[data-n8n-ref="${ref}"]`));
			// Verify it's still in the DOM
			await element.isDisplayed();
			return element;
		} catch {
			throw new StaleRefError(ref);
		}
	}

	// =========================================================================
	// Protected helpers
	// =========================================================================

	protected requireDriver(): WebDriver {
		if (!this.driver) throw new Error('WebDriver not initialized');
		return this.driver;
	}

	protected requirePage(pageId: string): PageState {
		const state = this.pageStates.get(pageId);
		if (!state) throw new PageNotFoundError(pageId, '');
		return state;
	}

	protected async switchToPage(pageId: string): Promise<WebDriver> {
		const state = this.requirePage(pageId);
		const driver = this.requireDriver();
		await driver.switchTo().window(state.handle);
		return driver;
	}

	protected async trackHandle(handle: string): Promise<PageState> {
		const driver = this.requireDriver();
		await driver.switchTo().window(handle);

		const id = generateId('page');
		let title = '';
		let url = '';
		try {
			title = await driver.getTitle();
			url = await driver.getCurrentUrl();
		} catch {
			// New tab may not have loaded yet
		}

		const state: PageState = {
			handle,
			info: { id, title, url },
		};

		this.pageStates.set(id, state);
		return state;
	}

	protected async resolveElement(driver: WebDriver, target: ElementTarget): Promise<WebElement> {
		if ('ref' in target) {
			return (await this.resolveRef(
				this.findPageIdForCurrentHandle(driver),
				target.ref,
			)) as WebElement;
		}
		return await driver.findElement(toWebDriverLocator(target.selector));
	}

	private findPageIdForCurrentHandle(_driver: WebDriver): string {
		// Find the page ID for whichever handle we're currently on
		// Since we always switchToPage before resolveElement, the last switched page is current
		for (const [id] of this.pageStates) {
			return id; // We trust that switchToPage was called before this
		}
		throw new Error('No pages tracked');
	}

	private applyModifiers(actions: Actions, modifiers: string[], direction: 'down' | 'up'): void {
		for (const mod of modifiers) {
			const key = this.modifierToKey(mod);
			if (key) {
				if (direction === 'down') actions.keyDown(key);
				else actions.keyUp(key);
			}
		}
	}

	private modifierToKey(modifier: string): string | undefined {
		/* eslint-disable @typescript-eslint/naming-convention -- keys match Playwright modifier names */
		const map: Record<string, string> = {
			Alt: Key.ALT,
			Control: Key.CONTROL,
			Meta: Key.META,
			Shift: Key.SHIFT,
		};
		/* eslint-enable @typescript-eslint/naming-convention */
		return map[modifier];
	}
}
