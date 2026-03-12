/**
 * Ambient type declarations for selenium-webdriver v4.39.0.
 * Only the subset used by @n8n/mcp-browser is typed here.
 */

// ---------------------------------------------------------------------------
// Main module: selenium-webdriver
// ---------------------------------------------------------------------------

declare module 'selenium-webdriver' {
	export class Builder {
		forBrowser(name: string): this;
		setFirefoxOptions(options: unknown): this;
		setSafariOptions(options: unknown): this;
		setChromeOptions(options: unknown): this;
		setFirefoxService(service: unknown): this;
		setSafariService(service: unknown): this;
		build(): Promise<WebDriver>;
	}

	export class WebDriver {
		get(url: string): Promise<void>;
		getCurrentUrl(): Promise<string>;
		getTitle(): Promise<string>;
		getPageSource(): Promise<string>;
		quit(): Promise<void>;
		close(): Promise<void>;
		getWindowHandle(): Promise<string>;
		getAllWindowHandles(): Promise<string[]>;
		findElement(locator: By): WebElementPromise;
		findElements(locator: By): Promise<WebElement[]>;
		executeScript<T = unknown>(
			script: string | ((...args: unknown[]) => T),
			...args: unknown[]
		): Promise<T>;
		executeAsyncScript<T = unknown>(
			script: string | ((...args: unknown[]) => T),
			...args: unknown[]
		): Promise<T>;
		takeScreenshot(): Promise<string>;
		printPage(options?: PrintPageOptions): Promise<string>;
		manage(): Options;
		navigate(): Navigation;
		switchTo(): TargetLocator;
		actions(options?: { bridge?: boolean }): Actions;
		wait<T>(
			condition: Condition<T> | PromiseLike<T> | ((driver: WebDriver) => T | PromiseLike<T>),
			timeout?: number,
			message?: string,
		): Promise<T>;
		sleep(ms: number): Promise<void>;
		getSession(): Promise<Session>;
	}

	export class WebElement {
		click(): Promise<void>;
		sendKeys(...keys: Array<string | number>): Promise<void>;
		getText(): Promise<string>;
		getAttribute(name: string): Promise<string | null>;
		getCssValue(propertyName: string): Promise<string>;
		getTagName(): Promise<string>;
		getRect(): Promise<{ x: number; y: number; width: number; height: number }>;
		isDisplayed(): Promise<boolean>;
		isEnabled(): Promise<boolean>;
		isSelected(): Promise<boolean>;
		clear(): Promise<void>;
		findElement(locator: By): WebElementPromise;
		findElements(locator: By): Promise<WebElement[]>;
		getId(): Promise<string>;
	}

	export class WebElementPromise extends WebElement implements PromiseLike<WebElement> {
		then<TResult1 = WebElement, TResult2 = never>(
			onfulfilled?: ((value: WebElement) => TResult1 | PromiseLike<TResult1>) | null,
			onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
		): Promise<TResult1 | TResult2>;
	}

	export class Session {
		getId(): string;
		getCapabilities(): Capabilities;
	}

	export class Capabilities {
		get(key: string): unknown;
		set(key: string, value: unknown): this;
	}

	export class By {
		static css(selector: string): By;
		static xpath(expression: string): By;
		static id(id: string): By;
		static name(name: string): By;
		static className(className: string): By;
		static linkText(text: string): By;
		static partialLinkText(text: string): By;
		static tagName(tagName: string): By;
		static js(script: string | ((...args: unknown[]) => unknown), ...args: unknown[]): By;
	}

	export class Actions {
		clear(): this;
		click(element?: WebElement): this;
		contextClick(element?: WebElement): this;
		doubleClick(element?: WebElement): this;
		move(options: {
			origin?: WebElement | 'viewport' | 'pointer';
			x?: number;
			y?: number;
			duration?: number;
		}): this;
		press(button?: number): this;
		release(button?: number): this;
		dragAndDrop(from: WebElement, to: WebElement | { x: number; y: number }): this;
		keyDown(key: string): this;
		keyUp(key: string): this;
		sendKeys(...keys: Array<string | number>): this;
		scroll(
			x: number,
			y: number,
			deltaX: number,
			deltaY: number,
			origin?: WebElement | 'viewport',
			duration?: number,
		): this;
		pause(duration: number): this;
		perform(): Promise<void>;
	}

	export interface Options {
		getCookies(): Promise<IWebDriverCookie[]>;
		getCookie(name: string): Promise<IWebDriverCookie | null>;
		addCookie(cookie: IWebDriverCookie): Promise<void>;
		deleteAllCookies(): Promise<void>;
		deleteCookie(name: string): Promise<void>;
		window(): WindowManager;
		setTimeouts(timeouts: { implicit?: number; pageLoad?: number; script?: number }): Promise<void>;
	}

	export interface WindowManager {
		maximize(): Promise<void>;
		minimize(): Promise<void>;
		fullscreen(): Promise<void>;
		setRect(rect: { x?: number; y?: number; width?: number; height?: number }): Promise<void>;
		getRect(): Promise<{ x: number; y: number; width: number; height: number }>;
	}

	export interface Navigation {
		to(url: string): Promise<void>;
		back(): Promise<void>;
		forward(): Promise<void>;
		refresh(): Promise<void>;
	}

	export interface TargetLocator {
		window(nameOrHandle: string): Promise<void>;
		defaultContent(): Promise<void>;
		frame(id: number | string | WebElement | null): Promise<void>;
		alert(): AlertPromise;
	}

	export interface Alert {
		getText(): Promise<string>;
		accept(): Promise<void>;
		dismiss(): Promise<void>;
		sendKeys(text: string): Promise<void>;
	}

	export class AlertPromise implements PromiseLike<Alert> {
		getText(): Promise<string>;
		accept(): Promise<void>;
		dismiss(): Promise<void>;
		sendKeys(text: string): Promise<void>;
		then<TResult1 = Alert, TResult2 = never>(
			onfulfilled?: ((value: Alert) => TResult1 | PromiseLike<TResult1>) | null,
			onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
		): Promise<TResult1 | TResult2>;
	}

	export interface IWebDriverCookie {
		name: string;
		value: string;
		path?: string;
		domain?: string;
		secure?: boolean;
		httpOnly?: boolean;
		expiry?: number;
		sameSite?: 'Strict' | 'Lax' | 'None';
	}

	export interface PrintPageOptions {
		orientation?: 'portrait' | 'landscape';
		scale?: number;
		background?: boolean;
		width?: number;
		height?: number;
		top?: number;
		bottom?: number;
		left?: number;
		right?: number;
		shrinkToFit?: boolean;
		pageRanges?: string[];
	}

	export class Condition<T> {
		constructor(message: string, fn: (driver: WebDriver) => T | PromiseLike<T>);
		description(): string;
	}

	export const Key: {
		NULL: string;
		CANCEL: string;
		HELP: string;
		BACK_SPACE: string;
		TAB: string;
		CLEAR: string;
		RETURN: string;
		ENTER: string;
		SHIFT: string;
		CONTROL: string;
		ALT: string;
		PAUSE: string;
		ESCAPE: string;
		SPACE: string;
		PAGE_UP: string;
		PAGE_DOWN: string;
		END: string;
		HOME: string;
		ARROW_LEFT: string;
		ARROW_UP: string;
		ARROW_RIGHT: string;
		ARROW_DOWN: string;
		INSERT: string;
		DELETE: string;
		SEMICOLON: string;
		EQUALS: string;
		NUMPAD0: string;
		NUMPAD1: string;
		NUMPAD2: string;
		NUMPAD3: string;
		NUMPAD4: string;
		NUMPAD5: string;
		NUMPAD6: string;
		NUMPAD7: string;
		NUMPAD8: string;
		NUMPAD9: string;
		MULTIPLY: string;
		ADD: string;
		SEPARATOR: string;
		SUBTRACT: string;
		DECIMAL: string;
		DIVIDE: string;
		F1: string;
		F2: string;
		F3: string;
		F4: string;
		F5: string;
		F6: string;
		F7: string;
		F8: string;
		F9: string;
		F10: string;
		F11: string;
		F12: string;
		META: string;
	};

	export const Button: {
		LEFT: number;
		MIDDLE: number;
		RIGHT: number;
	};

	export namespace until {
		function titleIs(title: string): Condition<boolean>;
		function titleContains(substr: string): Condition<boolean>;
		function titleMatches(regex: RegExp): Condition<boolean>;
		function urlIs(url: string): Condition<boolean>;
		function urlContains(substr: string): Condition<boolean>;
		function urlMatches(regex: RegExp): Condition<boolean>;
		function elementLocated(locator: By): Condition<WebElement>;
		function elementsLocated(locator: By): Condition<WebElement[]>;
		function alertIsPresent(): Condition<Alert>;
	}

	export namespace error {
		class WebDriverError extends Error {}
		class NoSuchElementError extends WebDriverError {}
		class StaleElementReferenceError extends WebDriverError {}
		class NoSuchWindowError extends WebDriverError {}
		class NoSuchAlertError extends WebDriverError {}
		class TimeoutError extends WebDriverError {}
		class InvalidArgumentError extends WebDriverError {}
		class UnexpectedAlertOpenError extends WebDriverError {}
	}
}

// ---------------------------------------------------------------------------
// Firefox module: selenium-webdriver/firefox
// ---------------------------------------------------------------------------

declare module 'selenium-webdriver/firefox' {
	import { Capabilities, WebDriver } from 'selenium-webdriver';

	export class Options extends Capabilities {
		setBinary(binary: string): this;
		setProfile(profile: string): this;
		addArguments(...args: string[]): this;
		addExtensions(...paths: string[]): this;
		setPreference(name: string, value: string | number | boolean): this;
		enableBidi(): this;
		windowSize(size: { width: number; height: number }): this;
		headless(): this;
	}

	export class ServiceBuilder {
		constructor(exe?: string);
		setPort(port: number): this;
		enableVerboseLogging(enabled?: boolean): this;
		build(): unknown;
	}

	export class Driver extends WebDriver {
		static createSession(options?: Options): Promise<Driver>;
		setContext(context: 'content' | 'chrome'): Promise<void>;
		getContext(): Promise<string>;
		installAddon(path: string, temporary?: boolean): Promise<string>;
		uninstallAddon(id: string): Promise<void>;
	}
}

// ---------------------------------------------------------------------------
// Safari module: selenium-webdriver/safari
// ---------------------------------------------------------------------------

declare module 'selenium-webdriver/safari' {
	import { Capabilities, WebDriver } from 'selenium-webdriver';

	export class Options extends Capabilities {
		setTechnologyPreview(useTechnologyPreview: boolean): this;
	}

	export class ServiceBuilder {
		constructor(exe?: string);
		setPort(port: number): this;
		build(): unknown;
	}

	export class Driver extends WebDriver {
		static createSession(options?: Options): Promise<Driver>;
	}
}

// ---------------------------------------------------------------------------
// BiDi modules: selenium-webdriver/bidi/*
// ---------------------------------------------------------------------------

declare module 'selenium-webdriver/bidi/logInspector' {
	import { WebDriver } from 'selenium-webdriver';

	interface LogEntry {
		level: string;
		text: string;
		timestamp: number;
		type: string;
		method?: string;
		realm?: string;
		args?: unknown[];
		stackTrace?: {
			callFrames: Array<{
				functionName: string;
				url: string;
				lineNumber: number;
				columnNumber: number;
			}>;
		};
	}

	class LogInspector {
		constructor(driver: WebDriver);
		init(): Promise<void>;
		onConsoleEntry(callback: (entry: LogEntry) => void): Promise<void>;
		onJavascriptLog(callback: (entry: LogEntry) => void): Promise<void>;
		onJavascriptException(callback: (entry: LogEntry) => void): Promise<void>;
		onLog(callback: (entry: LogEntry) => void): Promise<void>;
		close(): Promise<void>;
	}

	export = LogInspector;
}

declare module 'selenium-webdriver/bidi/browsingContext' {
	import { WebDriver, WebElement } from 'selenium-webdriver';

	interface NavigateResult {
		url: string;
		navigationId: string | null;
	}

	interface CaptureScreenshotResult {
		data: string;
	}

	class BrowsingContext {
		constructor(driver: WebDriver);
		init(options?: {
			browsingContextId?: string;
			type?: 'window' | 'tab';
			referenceContext?: string;
		}): Promise<void>;
		readonly id: string;
		navigate(
			url: string,
			readinessState?: 'none' | 'interactive' | 'complete',
		): Promise<NavigateResult>;
		getTree(depth?: number): Promise<unknown>;
		close(): Promise<void>;
		captureScreenshot(options?: unknown): Promise<CaptureScreenshotResult>;
		handleUserPrompt(accept?: boolean, userText?: string): Promise<void>;
		print(options?: unknown): Promise<string>;
	}

	export = BrowsingContext;
}

declare module 'selenium-webdriver/bidi/scriptManager' {
	import { WebDriver } from 'selenium-webdriver';

	interface EvaluateResult {
		result: {
			type: string;
			value?: unknown;
		};
		exceptionDetails?: {
			text: string;
			columnNumber: number;
			lineNumber: number;
			exception: {
				type: string;
				value?: unknown;
			};
			stackTrace?: unknown;
		};
	}

	class ScriptManager {
		constructor(driver: WebDriver);
		init(browsingContextId: string): Promise<void>;
		evaluateFunction(
			functionDeclaration: string,
			awaitPromise: boolean,
			options?: {
				arguments?: unknown[];
				thisObject?: unknown;
				resultOwnership?: 'root' | 'none';
			},
		): Promise<EvaluateResult>;
		callFunction(
			functionDeclaration: string,
			awaitPromise: boolean,
			options?: {
				arguments?: unknown[];
				thisObject?: unknown;
				resultOwnership?: 'root' | 'none';
			},
		): Promise<EvaluateResult>;
		close(): Promise<void>;
	}

	export = ScriptManager;
}

declare module 'selenium-webdriver/bidi/network' {
	import { WebDriver } from 'selenium-webdriver';

	interface BeforeRequestSentEvent {
		request: {
			url: string;
			method: string;
			headers: Array<{ name: string; value: { type: string; value: string } }>;
		};
		navigation: string | null;
		redirectCount: number;
		timestamp: number;
	}

	interface ResponseCompletedEvent {
		request: {
			url: string;
			method: string;
		};
		response: {
			url: string;
			status: number;
			headers: Array<{ name: string; value: { type: string; value: string } }>;
			mimeType: string;
		};
		navigation: string | null;
		timestamp: number;
	}

	class Network {
		constructor(driver: WebDriver);
		init(): Promise<void>;
		addIntercept(
			phase: 'beforeRequestSent' | 'responseStarted' | 'authRequired',
			options?: { urlPatterns?: Array<{ type: string; pattern: string }> },
		): Promise<string>;
		removeIntercept(interceptId: string): Promise<void>;
		continueRequest(options: {
			request: string;
			url?: string;
			method?: string;
			headers?: Array<{ name: string; value: { type: string; value: string } }>;
		}): Promise<void>;
		beforeRequestSent(callback: (event: BeforeRequestSentEvent) => void): Promise<void>;
		responseCompleted(callback: (event: ResponseCompletedEvent) => void): Promise<void>;
		close(): Promise<void>;
	}

	export = Network;
}

declare module 'selenium-webdriver/bidi/storage' {
	import { WebDriver } from 'selenium-webdriver';

	interface CookieFilter {
		name?: string;
		value?: { type: string; value: string };
		domain?: string;
		path?: string;
		httpOnly?: boolean;
		secure?: boolean;
		sameSite?: string;
	}

	interface PartitionDescriptor {
		type: 'context' | 'storageKey';
		context?: string;
		userContext?: string;
		sourceOrigin?: string;
	}

	class Storage {
		constructor(driver: WebDriver);
		init(): Promise<void>;
		getCookies(
			filter?: CookieFilter,
			partition?: PartitionDescriptor,
		): Promise<{ cookies: unknown[]; partitionKey: unknown }>;
		setCookie(
			cookie: {
				name: string;
				value: { type: string; value: string };
				domain: string;
				path?: string;
				httpOnly?: boolean;
				secure?: boolean;
				sameSite?: string;
				expiry?: number;
			},
			partition?: PartitionDescriptor,
		): Promise<void>;
		deleteCookies(filter?: CookieFilter, partition?: PartitionDescriptor): Promise<void>;
		close(): Promise<void>;
	}

	export = Storage;
}
