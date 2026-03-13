import { z } from 'zod';

// ---------------------------------------------------------------------------
// Browser names
// ---------------------------------------------------------------------------

const chromiumBrowsers = ['chromium', 'chrome', 'brave', 'edge'] as const;
const allBrowsers = [...chromiumBrowsers, 'firefox', 'safari', 'webkit'] as const;

export type ChromiumBrowser = (typeof chromiumBrowsers)[number];
export type BrowserName = (typeof allBrowsers)[number];
export type SessionMode = 'ephemeral' | 'persistent' | 'local';

export const browserNameSchema = z.enum(allBrowsers);
export const sessionModeSchema = z.enum(['ephemeral', 'persistent', 'local']);

export function isChromiumBased(browser: BrowserName): browser is ChromiumBrowser {
	return (chromiumBrowsers as readonly string[]).includes(browser);
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const viewportSchema = z.object({
	width: z.number().int().positive(),
	height: z.number().int().positive(),
});

export type Viewport = z.infer<typeof viewportSchema>;

const browserOverrideSchema = z.object({
	executablePath: z.string().optional(),
	profilePath: z.string().optional(),
});

export const configSchema = z.object({
	defaultBrowser: browserNameSchema.default('chromium'),
	defaultMode: sessionModeSchema.default('ephemeral'),
	headless: z.boolean().default(false),
	viewport: viewportSchema.default({ width: 1280, height: 720 }),
	sessionTtlMs: z.number().positive().default(1_800_000),
	maxConcurrentSessions: z.number().positive().default(5),
	profilesDir: z.string().default('~/.n8n-browser/profiles'),
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
	defaultMode: SessionMode;
	headless: boolean;
	viewport: Viewport;
	sessionTtlMs: number;
	maxConcurrentSessions: number;
	profilesDir: string;
	browsers: Map<BrowserName, ResolvedBrowserInfo>;
	geckodriverPath?: string;
	safaridriverPath?: string;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface SessionConfig {
	mode: SessionMode;
	browser: BrowserName;
	headless: boolean;
	viewport: Viewport;
	profileName?: string;
	ttlMs: number;
}

export interface PageInfo {
	id: string;
	title: string;
	url: string;
}

export interface BrowserSession {
	id: string;
	adapter: import('./adapters/adapter').BrowserAdapter;
	config: SessionConfig;
	pages: Map<string, PageInfo>;
	activePageId: string;
	createdAt: Date;
	lastAccessedAt: Date;
}

export const openSessionSchema = z.object({
	mode: sessionModeSchema.optional(),
	browser: browserNameSchema.optional(),
	headless: z.boolean().optional(),
	viewport: viewportSchema.optional(),
	profileName: z.string().optional(),
	ttlMs: z.number().positive().optional(),
});

export type OpenSessionOptions = z.infer<typeof openSessionSchema>;

export interface SessionOpenResult {
	sessionId: string;
	browser: BrowserName;
	mode: SessionMode;
	pages: PageInfo[];
}

// ---------------------------------------------------------------------------
// Element targeting
// ---------------------------------------------------------------------------

export type ElementTarget = { ref: string; selector?: never } | { selector: string; ref?: never };

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

export interface DeviceDescriptor {
	name: string;
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
}

export interface WaitOptions {
	selector?: string;
	url?: string;
	loadState?: 'load' | 'domcontentloaded' | 'networkidle';
	predicate?: string;
	text?: string;
	timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Tool system types
// ---------------------------------------------------------------------------

export type McpTextContent = { type: 'text'; text: string };

export type McpImageContent = {
	type: 'media';
	data: string;
	mediaType: string;
};

export interface ToolResponse {
	content: Array<McpTextContent | McpImageContent>;
	isError?: boolean;
}

export interface ToolContext {
	/** Base filesystem directory (used by filesystem tools) */
	dir: string;
}

export interface ToolDefinition<
	TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> {
	name: string;
	description: string;
	inputSchema: TSchema;
	execute(args: z.infer<TSchema>, context: ToolContext): ToolResponse | Promise<ToolResponse>;
}

export interface BrowserToolkit {
	tools: ToolDefinition[];
	sessionManager: import('./session-manager').SessionManager;
}

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
	firefox?: BrowserInfo;
	safari?: BrowserInfo;
	geckodriverPath?: string;
	safaridriverPath?: string;
}
