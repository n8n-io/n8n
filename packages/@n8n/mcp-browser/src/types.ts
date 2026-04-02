import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

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
	adapter: PlaywrightAdapter;
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

// Forward declarations — imported at runtime to avoid circular deps
import type { PlaywrightAdapter as PlaywrightAdapterType } from './adapters/playwright';
import type { BrowserConnection as BrowserConnectionType } from './connection';
type BrowserConnection = BrowserConnectionType;
type PlaywrightAdapter = PlaywrightAdapterType;

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
