import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import type { ConnectionLostReason } from './errors';

// ---------------------------------------------------------------------------
// Browser names
// ---------------------------------------------------------------------------

const chromiumBrowsers = ['chromium', 'chrome', 'brave', 'edge'] as const;

export type BrowserName = (typeof chromiumBrowsers)[number];

export const browserNameSchema = z.enum(chromiumBrowsers);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const browserOverrideSchema = z.object({
	executablePath: z.string().optional(),
	profilePath: z.string().optional(),
});

export const configSchema = z.object({
	defaultBrowser: browserNameSchema.default('chrome'),
	browsers: z.record(browserNameSchema, browserOverrideSchema).default({}),
});

export type Config = z.input<typeof configSchema>;

export interface ResolvedBrowserInfo {
	executablePath: string;
	profilePath?: string;
	available: boolean;
}

export interface ResolvedConfig {
	defaultBrowser: BrowserName;
	browsers: Map<BrowserName, ResolvedBrowserInfo>;
}

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

export interface ConnectConfig {
	browser: BrowserName;
}

export interface PageInfo {
	id: string;
	title: string;
	url: string;
}

export interface ConnectionState {
	adapter: BrowserAdapter;
	pages: Map<string, PageInfo>;
	activePageId: string;
}

export interface ConnectResult {
	browser: string;
	pages: PageInfo[];
}

// ---------------------------------------------------------------------------
// Element targeting
// ---------------------------------------------------------------------------

export type ElementTarget = { ref: string } | { selector: string };

// ---------------------------------------------------------------------------
// Modal state (dialog / file-chooser)
// ---------------------------------------------------------------------------

export interface ModalState {
	type: 'dialog' | 'filechooser';
	description: string;
	clearedBy: string;
	dialogType?: 'alert' | 'confirm' | 'prompt' | 'beforeunload';
	message?: string;
}

// ---------------------------------------------------------------------------
// Adapter result types
// ---------------------------------------------------------------------------

export interface NavigateResult {
	title: string;
	url: string;
	status: number;
}

export interface SnapshotResult {
	tree: string;
	refCount: number;
}

export interface ConsoleEntry {
	level: string;
	text: string;
	timestamp: number;
}

export interface ErrorEntry {
	message: string;
	stack?: string;
	timestamp: number;
}

export interface NetworkEntry {
	url: string;
	method: string;
	status: number;
	contentType?: string;
	timestamp: number;
}

export interface Cookie {
	name: string;
	value: string;
	domain?: string;
	path?: string;
	expires?: number;
	httpOnly?: boolean;
	secure?: boolean;
	sameSite?: 'Strict' | 'Lax' | 'None';
}

// ---------------------------------------------------------------------------
// Adapter option types
// ---------------------------------------------------------------------------

export interface ClickOptions {
	button?: 'left' | 'right' | 'middle';
	clickCount?: number;
	modifiers?: string[];
}

export interface TypeOptions {
	clear?: boolean;
	submit?: boolean;
	delay?: number;
}

export interface ScrollOptions {
	direction?: 'up' | 'down';
	amount?: number;
}

export interface ScreenshotOptions {
	fullPage?: boolean;
	/** Overlay numbered labels that map to @eN refs (agent-browser: screenshot --annotate) */
	annotate?: boolean;
	format?: 'png' | 'jpeg';
	quality?: number;
	screenshotDir?: string;
	/** Pixel diff vs baseline image (`diff screenshot`) */
	diffBaselinePath?: string;
	diffOutputPath?: string;
	diffThreshold?: number;
	/** Scope screenshot to element */
	element?: ElementTarget;
}

/** Options for accessibility snapshots (`snapshot`, `diff snapshot`) */
export interface SnapshotOptions {
	/** Map to `snapshot -i` — only interactive elements (smaller) */
	interactive?: boolean;
	/** Map to `snapshot -c` */
	compact?: boolean;
	/** Map to `snapshot -d` */
	maxDepth?: number;
	/** Map to `snapshot -u` */
	includeLinkUrls?: boolean;
	/** Use `diff snapshot` instead of full tree */
	diffMode?: 'none' | 'since_last' | 'baseline';
	/** For diffMode `baseline` — file path for `--baseline` */
	baselineFilePath?: string;
	/** Sub-differ options (forwarded to `diff snapshot`) */
	diffCompact?: boolean;
	diffMaxDepth?: number;
	maxOutputChars?: number;
	contentBoundaries?: boolean;
	/** When true, use a token-minimal snapshot for post-action envelope (e.g. `-i -c`) */
	forEnrichment?: boolean;
}

export interface WaitOptions {
	selector?: string;
	url?: string;
	loadState?: 'load' | 'domcontentloaded' | 'networkidle';
	predicate?: string;
	text?: string;
	timeoutMs?: number;
	/** Wait for a download to finish (optional save path) */
	downloadPath?: string;
}

// ---------------------------------------------------------------------------
// Tool system types (re-exported from MCP SDK)
// ---------------------------------------------------------------------------

export type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface ToolContext {
	/** Base filesystem directory (used by filesystem tools) */
	dir: string;
}

export interface ToolDefinition<TSchema extends z.ZodType = z.ZodType> {
	name: string;
	description: string;
	inputSchema: TSchema;
	outputSchema?: z.ZodObject<z.ZodRawShape>;
	execute(args: z.infer<TSchema>, context: ToolContext): CallToolResult | Promise<CallToolResult>;
	getAffectedResources(
		args: z.infer<TSchema>,
		context: ToolContext,
	): AffectedResource[] | Promise<AffectedResource[]>;
}

export interface AffectedResource {
	toolGroup: 'browser';
	resource: string;
	description: string;
}

export interface BrowserToolkit {
	tools: ToolDefinition[];
	connection: BrowserConnection;
}

/** Implemented by `AgentBrowserAdapter` — all browser MCP tools call through this surface */
export interface BrowserAdapter {
	readonly name: string;
	onDisconnect?: (reason: ConnectionLostReason) => void;

	launch(config: ConnectConfig): Promise<void>;
	close(): Promise<void>;

	newPage(url?: string, label?: string): Promise<PageInfo>;
	closePage(pageId: string): Promise<void>;
	focusPage(pageId: string): Promise<void>;
	listPages(): Promise<PageInfo[]>;
	listTabs(): Promise<PageInfo[]>;
	listTabSessionIds(): string[];
	listTabIds(): Promise<string[]>;

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

	click(pageId: string, target: ElementTarget, options?: ClickOptions): Promise<void>;
	type(pageId: string, target: ElementTarget, text: string, options?: TypeOptions): Promise<void>;
	select(pageId: string, target: ElementTarget, values: string[]): Promise<string[]>;
	hover(pageId: string, target: ElementTarget): Promise<void>;
	press(pageId: string, keys: string): Promise<void>;
	drag(pageId: string, from: ElementTarget, to: ElementTarget): Promise<void>;
	scroll(pageId: string, target?: ElementTarget, options?: ScrollOptions): Promise<void>;
	upload(pageId: string, target: ElementTarget | undefined, files: string[]): Promise<void>;
	dialog(pageId: string, action: 'accept' | 'dismiss', text?: string): Promise<string>;

	screenshot(pageId: string, target?: ElementTarget, options?: ScreenshotOptions): Promise<string>;
	snapshot(
		pageId: string,
		target?: ElementTarget,
		options?: SnapshotOptions,
	): Promise<SnapshotResult>;
	getText(pageId: string, target?: ElementTarget): Promise<string>;
	evaluate(pageId: string, script: string): Promise<unknown>;
	getConsole(pageId: string, level?: string, clear?: boolean): Promise<ConsoleEntry[]>;
	getConsoleSummary(pageId: string): { errors: number; warnings: number };
	pdf(
		pageId: string,
		options?: { format?: string; landscape?: boolean },
	): Promise<{ data: string; pages: number }>;
	getNetwork(pageId: string, filter?: string, clear?: boolean): Promise<NetworkEntry[]>;

	wait(pageId: string, options: WaitOptions): Promise<number>;

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

	waitForCompletion<T>(pageId: string, action: () => Promise<T>): Promise<T>;
	getModalStates(pageId: string): ModalState[];
	getContent(pageId: string, selector?: string): Promise<{ html: string; url: string }>;
	getPageUrl(pageId: string): string | undefined;

	/** Cross-URL snapshot (and optional screenshot) diff */
	diffUrls(
		urlA: string,
		urlB: string,
		options?: {
			includeScreenshot?: boolean;
			fullPage?: boolean;
			waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
			scope?: string;
			compact?: boolean;
			maxDepth?: number;
		},
	): Promise<{ snapshotDiff: string; screenshotDiff?: string }>;

	/** Switch iframe context (`frame main` or `frame <selector|@ref>`) */
	setFrameContext(pageId: string, target: ElementTarget | 'main'): Promise<void>;

	/** Highlight an element (debug aid) */
	highlight(pageId: string, target: ElementTarget): Promise<void>;
}

// Forward declarations — imported at runtime to avoid circular deps
import type { BrowserConnection as BrowserConnectionType } from './connection';
type BrowserConnection = BrowserConnectionType;

// ---------------------------------------------------------------------------
// Discovery types
// ---------------------------------------------------------------------------

export interface BrowserInfo {
	executablePath: string;
	profilePath?: string;
}

export interface DiscoveredBrowsers {
	chrome?: BrowserInfo;
	brave?: BrowserInfo;
	edge?: BrowserInfo;
	chromium?: BrowserInfo;
}

export interface DiscoveryReport {
	platform: string;
	found: DiscoveredBrowsers;
	searchedPaths: Partial<Record<BrowserName, string[]>>;
}
