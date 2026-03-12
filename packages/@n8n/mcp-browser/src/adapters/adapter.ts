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

/**
 * Uniform browser automation API regardless of underlying protocol.
 *
 * Adapters that do not support a method throw `UnsupportedOperationError`.
 */
export interface BrowserAdapter {
	readonly name: string;

	// -- Lifecycle ------------------------------------------------------------

	launch(config: SessionConfig): Promise<void>;
	close(): Promise<void>;

	// -- Pages ----------------------------------------------------------------

	newPage(url?: string): Promise<PageInfo>;
	closePage(pageId: string): Promise<void>;
	listPages(): Promise<PageInfo[]>;

	// -- Navigation -----------------------------------------------------------

	navigate(
		pageId: string,
		url: string,
		waitUntil?: 'load' | 'domcontentloaded' | 'networkidle',
	): Promise<NavigateResult>;
	back(pageId: string): Promise<NavigateResult>;
	forward(pageId: string): Promise<NavigateResult>;
	reload(
		pageId: string,
		waitUntil?: 'load' | 'domcontentloaded' | 'networkidle',
	): Promise<NavigateResult>;

	// -- Interaction ----------------------------------------------------------

	click(pageId: string, target: ElementTarget, options?: ClickOptions): Promise<void>;
	type(pageId: string, target: ElementTarget, text: string, options?: TypeOptions): Promise<void>;
	select(pageId: string, target: ElementTarget, values: string[]): Promise<string[]>;
	hover(pageId: string, target: ElementTarget): Promise<void>;
	press(pageId: string, keys: string): Promise<void>;
	drag(pageId: string, from: ElementTarget, to: ElementTarget): Promise<void>;
	scroll(pageId: string, target?: ElementTarget, options?: ScrollOptions): Promise<void>;
	upload(pageId: string, target: ElementTarget, files: string[]): Promise<void>;
	dialog(pageId: string, action: 'accept' | 'dismiss', text?: string): Promise<string>;

	// -- Inspection -----------------------------------------------------------

	screenshot(pageId: string, target?: ElementTarget, options?: ScreenshotOptions): Promise<string>;
	snapshot(pageId: string, target?: ElementTarget): Promise<SnapshotResult>;
	getText(pageId: string, target?: ElementTarget): Promise<string>;
	evaluate(pageId: string, script: string): Promise<unknown>;
	getConsole(pageId: string, level?: string, clear?: boolean): Promise<ConsoleEntry[]>;
	getErrors(pageId: string, clear?: boolean): Promise<ErrorEntry[]>;
	pdf(
		pageId: string,
		options?: { format?: string; landscape?: boolean },
	): Promise<{ data: string; pages: number }>;
	getNetwork(pageId: string, filter?: string, clear?: boolean): Promise<NetworkEntry[]>;

	// -- Wait -----------------------------------------------------------------

	wait(pageId: string, options: WaitOptions): Promise<number>;

	// -- State ----------------------------------------------------------------

	getCookies(pageId: string, url?: string): Promise<Cookie[]>;
	setCookies(pageId: string, cookies: Cookie[]): Promise<void>;
	clearCookies(pageId: string): Promise<void>;
	getStorage(pageId: string, kind: 'local' | 'session'): Promise<Record<string, string>>;
	setStorage(
		pageId: string,
		kind: 'local' | 'session',
		data: Record<string, string>,
	): Promise<void>;
	clearStorage(pageId: string, kind: 'local' | 'session'): Promise<void>;
	setOffline(pageId: string, offline: boolean): Promise<void>;
	setHeaders(pageId: string, headers: Record<string, string>): Promise<void>;
	setGeolocation(
		pageId: string,
		geo: { latitude: number; longitude: number; accuracy?: number } | null,
	): Promise<void>;
	setTimezone(pageId: string, timezone: string): Promise<void>;
	setLocale(pageId: string, locale: string): Promise<void>;
	setDevice(pageId: string, device: DeviceDescriptor): Promise<void>;

	// -- Ref resolution -------------------------------------------------------

	resolveRef(pageId: string, ref: string): Promise<unknown>;
}
