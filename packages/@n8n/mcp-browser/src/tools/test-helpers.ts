import type { BrowserConnection } from '../connection';
import type {
	CallToolResult,
	ConnectionState,
	PageInfo,
	ToolContext,
	ToolDefinition,
} from '../types';

/** Extract text from the first content block, throwing if it isn't a text block. */
export function textOf(result: CallToolResult): string {
	const item = result.content[0];
	if (item.type !== 'text') throw new Error(`Expected text content, got ${item.type}`);
	return item.text;
}

/** Extract structuredContent from a result, throwing if it isn't present. */
export function structuredOf(result: CallToolResult): Record<string, unknown> {
	if (!result.structuredContent) throw new Error('Expected structuredContent');
	return result.structuredContent as Record<string, unknown>;
}

/** Find a tool by name from an array, throwing if not found. */
export function findTool(tools: ToolDefinition[], name: string): ToolDefinition {
	const tool = tools.find((t) => t.name === name);
	if (!tool)
		throw new Error(`Tool "${name}" not found. Available: ${tools.map((t) => t.name).join(', ')}`);
	return tool;
}

/** Default ToolContext for tests. */
export const TOOL_CONTEXT: ToolContext = { dir: '/test' };

/** Create a mock PlaywrightAdapter with all methods stubbed. */
export function createMockAdapter() {
	return {
		// Session
		launch: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),

		// Tab management
		newPage: vi.fn().mockResolvedValue({ id: 'page2', title: 'New Page', url: 'about:blank' }),
		closePage: vi.fn().mockResolvedValue(undefined),
		focusPage: vi.fn().mockResolvedValue(undefined),
		listPages: vi
			.fn()
			.mockResolvedValue([{ id: 'page1', title: 'Test Page', url: 'http://test.com' }]),
		listTabs: vi
			.fn()
			.mockResolvedValue([{ id: 'page1', title: 'Test Page', url: 'http://test.com' }]),
		listTabSessionIds: vi.fn().mockReturnValue(['page1']),
		listTabIds: vi.fn().mockResolvedValue(['page1']),

		// Navigation
		navigate: vi
			.fn()
			.mockResolvedValue({ title: 'Test Page', url: 'http://test.com', status: 200 }),
		back: vi.fn().mockResolvedValue({ title: 'Previous', url: 'http://test.com/prev' }),
		forward: vi.fn().mockResolvedValue({ title: 'Next', url: 'http://test.com/next' }),
		reload: vi.fn().mockResolvedValue({ title: 'Reloaded', url: 'http://test.com' }),

		// Interaction
		click: vi.fn().mockResolvedValue(undefined),
		type: vi.fn().mockResolvedValue(undefined),
		select: vi.fn().mockResolvedValue(['option1']),
		hover: vi.fn().mockResolvedValue(undefined),
		press: vi.fn().mockResolvedValue(undefined),
		drag: vi.fn().mockResolvedValue(undefined),
		scroll: vi.fn().mockResolvedValue(undefined),
		upload: vi.fn().mockResolvedValue(undefined),
		dialog: vi.fn().mockResolvedValue('alert'),

		// Inspection
		snapshot: vi.fn().mockResolvedValue({ tree: '', refCount: 0 }),
		probePageHtml: vi.fn().mockResolvedValue({
			ok: true,
			root: {
				kind: 'document',
				html: '<html><body><p>Hello world</p></body></html>',
				url: 'http://test.com',
				children: [],
				errors: [],
			},
		}),
		screenshot: vi.fn().mockResolvedValue('base64imagedata'),
		getContent: vi.fn().mockResolvedValue({
			html: '<html><body><p>Hello world</p></body></html>',
			url: 'http://test.com',
		}),
		evaluate: vi.fn().mockResolvedValue(42),
		getConsole: vi.fn().mockResolvedValue([]),
		pdf: vi.fn().mockResolvedValue({ data: 'base64pdf', pages: 1 }),
		getNetwork: vi.fn().mockResolvedValue([]),
		getText: vi.fn().mockResolvedValue('Hello'),

		// Wait
		wait: vi.fn().mockResolvedValue(100),

		// State
		getCookies: vi.fn().mockResolvedValue([]),
		setCookies: vi.fn().mockResolvedValue(undefined),
		clearCookies: vi.fn().mockResolvedValue(undefined),
		getStorage: vi.fn().mockResolvedValue({}),
		setStorage: vi.fn().mockResolvedValue(undefined),
		clearStorage: vi.fn().mockResolvedValue(undefined),

		// Credential helpers
		getElementValue: vi.fn().mockResolvedValue(''),

		// URL lookup
		getPageUrl: vi.fn().mockReturnValue('http://test.com'),

		// Enrichment
		getModalStates: vi.fn().mockReturnValue([]),
		getConsoleSummary: vi.fn().mockReturnValue({ errors: 0, warnings: 0 }),
		waitForCompletion: vi
			.fn()
			.mockImplementation(async (_pageId: string, fn: () => Promise<unknown>) => await fn()),
	};
}

export type MockAdapter = ReturnType<typeof createMockAdapter>;

/** Create a mock BrowserConnection with a pre-connected state. */
export function createMockConnection(adapter?: MockAdapter) {
	const mockAdapter = adapter ?? createMockAdapter();
	const pages = new Map<string, PageInfo>([
		['page1', { id: 'page1', title: 'Test Page', url: 'http://test.com' }],
	]);

	const state: ConnectionState = {
		adapter: mockAdapter as unknown as ConnectionState['adapter'],
		pages,
		activePageId: 'page1',
	};

	const connection = {
		getConnection: vi.fn().mockReturnValue(state),
		connect: vi.fn().mockResolvedValue({
			browser: 'chrome',
			pages: [{ id: 'page1', title: 'Test Page', url: 'http://test.com' }],
		}),
		disconnect: vi.fn().mockResolvedValue(undefined),
		isConnected: true,
	} as unknown as BrowserConnection;

	return { connection, adapter: mockAdapter, state };
}
