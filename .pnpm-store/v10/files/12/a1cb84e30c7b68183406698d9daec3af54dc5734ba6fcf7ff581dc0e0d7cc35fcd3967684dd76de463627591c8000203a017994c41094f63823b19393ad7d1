import { CustomComparatorsRegistry } from '@vitest/browser';
export { defineBrowserCommand } from '@vitest/browser';
import { Page, Frame, FrameLocator, BrowserContext, CDPSession, Browser, LaunchOptions, ConnectOptions, BrowserContextOptions } from 'playwright';
import { ScreenshotMatcherOptions, ScreenshotComparatorRegistry, Locator } from 'vitest/browser';
import { BrowserProvider, BrowserModuleMocker, TestProject, CDPSession as CDPSession$1, BrowserProviderOption } from 'vitest/node';

declare const playwrightBrowsers: readonly ["firefox", "webkit", "chromium"];
type PlaywrightBrowser = (typeof playwrightBrowsers)[number];
interface PlaywrightProviderOptions {
	/**
	* The options passed down to [`playwright.connect`](https://playwright.dev/docs/api/class-browsertype#browser-type-launch) method.
	* @see {@link https://playwright.dev/docs/api/class-browsertype#browser-type-launch}
	*/
	launchOptions?: Omit<LaunchOptions, "tracesDir">;
	/**
	* The options passed down to [`playwright.connect`](https://playwright.dev/docs/api/class-browsertype#browser-type-connect) method.
	*
	* This is used only if you connect remotely to the playwright instance via a WebSocket connection.
	* @see {@link https://playwright.dev/docs/api/class-browsertype#browser-type-connect}
	*/
	connectOptions?: ConnectOptions & {
		wsEndpoint: string;
	};
	/**
	* The options passed down to [`browser.newContext`](https://playwright.dev/docs/api/class-browser#browser-new-context) method.
	* @see {@link https://playwright.dev/docs/api/class-browser#browser-new-context}
	*/
	contextOptions?: Omit<BrowserContextOptions, "ignoreHTTPSErrors" | "serviceWorkers">;
	/**
	* The maximum time in milliseconds to wait for `userEvent` action to complete.
	* @default 0 (no timeout)
	*/
	actionTimeout?: number;
	/**
	* Use a persistent context instead of a regular browser context.
	* This allows browser state (cookies, localStorage, DevTools settings, etc.) to persist between test runs.
	* When set to `true`, the user data is stored in `./node_modules/.cache/vitest-playwright-user-data`.
	* When set to a string, the value is used as the path to the user data directory.
	*
	* Note: This option is ignored when running tests in parallel (e.g. headless with fileParallelism enabled)
	* because persistent context cannot be shared across parallel sessions.
	* @default false
	* @see {@link https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context}
	*/
	persistentContext?: boolean | string;
}
declare function playwright(options?: PlaywrightProviderOptions): BrowserProviderOption<PlaywrightProviderOptions>;
declare class PlaywrightBrowserProvider implements BrowserProvider {
	private project;
	private options;
	name: "playwright";
	supportsParallelism: boolean;
	browser: Browser | null;
	persistentContext: BrowserContext | null;
	contexts: Map<string, BrowserContext>;
	pages: Map<string, Page>;
	mocker: BrowserModuleMocker;
	browserName: PlaywrightBrowser;
	private browserPromise;
	private closing;
	tracingContexts: Set<string>;
	pendingTraces: Map<string, string>;
	initScripts: string[];
	constructor(project: TestProject, options: PlaywrightProviderOptions);
	private onSIGTERM;
	private openBrowser;
	private createMocker;
	private createContext;
	private getContextOptions;
	getPage(sessionId: string): Page;
	getCommandsContext(sessionId: string): {
		page: Page;
		context: BrowserContext;
		frame: () => Promise<Frame>;
		readonly iframe: FrameLocator;
	};
	private openBrowserPage;
	openPage(sessionId: string, url: string, options: {
		parallel: boolean;
	}): Promise<void>;
	private _throwIfClosing;
	getCDPSession(sessionid: string): Promise<CDPSession$1>;
	close(): Promise<void>;
}
declare module "vitest/node" {
	interface BrowserCommandContext {
		page: Page;
		frame(): Promise<Frame>;
		iframe: FrameLocator;
		context: BrowserContext;
	}
	interface _BrowserNames {
		playwright: PlaywrightBrowser;
	}
	interface ToMatchScreenshotOptions extends Omit<ScreenshotMatcherOptions, "comparatorName" | "comparatorOptions">, CustomComparatorsRegistry {}
	interface ToMatchScreenshotComparators extends ScreenshotComparatorRegistry {}
}
type PWHoverOptions = NonNullable<Parameters<Page["hover"]>[1]>;
type PWClickOptions = NonNullable<Parameters<Page["click"]>[1]>;
type PWDoubleClickOptions = NonNullable<Parameters<Page["dblclick"]>[1]>;
type PWFillOptions = NonNullable<Parameters<Page["fill"]>[2]>;
type PWScreenshotOptions = NonNullable<Parameters<Page["screenshot"]>[0]>;
type PWSelectOptions = NonNullable<Parameters<Page["selectOption"]>[2]>;
type PWDragAndDropOptions = NonNullable<Parameters<Page["dragAndDrop"]>[2]>;
type PWSetInputFiles = NonNullable<Parameters<Page["setInputFiles"]>[2]>;
type PWCDPSession = Pick<CDPSession, "send" | "on" | "off" | "once">;

declare module "vitest/browser" {
	interface UserEventHoverOptions extends PWHoverOptions {}
	interface UserEventClickOptions extends PWClickOptions {}
	interface UserEventDoubleClickOptions extends PWDoubleClickOptions {}
	interface UserEventTripleClickOptions extends PWClickOptions {}
	interface UserEventFillOptions extends PWFillOptions {}
	interface UserEventSelectOptions extends PWSelectOptions {}
	interface UserEventDragAndDropOptions extends PWDragAndDropOptions {}
	interface UserEventUploadOptions extends PWSetInputFiles {}
	interface ScreenshotOptions extends Omit<PWScreenshotOptions, "mask"> {
		mask?: ReadonlyArray<Element | Locator> | undefined;
	}
	interface CDPSession extends PWCDPSession {}
}

export { PlaywrightBrowserProvider, playwright };
export type { PWCDPSession as CDPSession, PlaywrightProviderOptions };
