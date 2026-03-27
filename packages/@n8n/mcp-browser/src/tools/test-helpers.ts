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
		launch: jest.fn().mockResolvedValue(undefined),
		close: jest.fn().mockResolvedValue(undefined),

		// Tab management
		newPage: jest.fn().mockResolvedValue({ id: 'page2', title: 'New Page', url: 'about:blank' }),
		closePage: jest.fn().mockResolvedValue(undefined),
		focusPage: jest.fn().mockResolvedValue(undefined),
		listPages: jest
			.fn()
			.mockResolvedValue([{ id: 'page1', title: 'Test Page', url: 'http://test.com' }]),
		listTabs: jest
			.fn()
			.mockResolvedValue([{ id: 'page1', title: 'Test Page', url: 'http://test.com' }]),
		listTabSessionIds: jest.fn().mockReturnValue(['page1']),
		listTabIds: jest.fn().mockResolvedValue(['page1']),

		// Navigation
		navigate: jest
			.fn()
			.mockResolvedValue({ title: 'Test Page', url: 'http://test.com', status: 200 }),
		back: jest.fn().mockResolvedValue({ title: 'Previous', url: 'http://test.com/prev' }),
		forward: jest.fn().mockResolvedValue({ title: 'Next', url: 'http://test.com/next' }),
		reload: jest.fn().mockResolvedValue({ title: 'Reloaded', url: 'http://test.com' }),

		// Interaction
		click: jest.fn().mockResolvedValue(undefined),
		type: jest.fn().mockResolvedValue(undefined),
		select: jest.fn().mockResolvedValue(['option1']),
		hover: jest.fn().mockResolvedValue(undefined),
		press: jest.fn().mockResolvedValue(undefined),
		drag: jest.fn().mockResolvedValue(undefined),
		scroll: jest.fn().mockResolvedValue(undefined),
		upload: jest.fn().mockResolvedValue(undefined),
		dialog: jest.fn().mockResolvedValue('alert'),

		// Inspection
		snapshot: jest.fn().mockResolvedValue({ tree: '', refCount: 0 }),
		screenshot: jest.fn().mockResolvedValue('base64imagedata'),
		getContent: jest.fn().mockResolvedValue({
			html: '<html><body><p>Hello world</p></body></html>',
			url: 'http://test.com',
		}),
		evaluate: jest.fn().mockResolvedValue(42),
		getConsole: jest.fn().mockResolvedValue([]),
		pdf: jest.fn().mockResolvedValue({ data: 'base64pdf', pages: 1 }),
		getNetwork: jest.fn().mockResolvedValue([]),
		getText: jest.fn().mockResolvedValue('Hello'),

		// Wait
		wait: jest.fn().mockResolvedValue(100),

		// State
		getCookies: jest.fn().mockResolvedValue([]),
		setCookies: jest.fn().mockResolvedValue(undefined),
		clearCookies: jest.fn().mockResolvedValue(undefined),
		getStorage: jest.fn().mockResolvedValue({}),
		setStorage: jest.fn().mockResolvedValue(undefined),
		clearStorage: jest.fn().mockResolvedValue(undefined),

		// URL lookup
		getPageUrl: jest.fn().mockReturnValue('http://test.com'),

		// Enrichment
		getModalStates: jest.fn().mockReturnValue([]),
		getConsoleSummary: jest.fn().mockReturnValue({ errors: 0, warnings: 0 }),
		waitForCompletion: jest
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
		getConnection: jest.fn().mockReturnValue(state),
		connect: jest.fn().mockResolvedValue({
			browser: 'chrome',
			pages: [{ id: 'page1', title: 'Test Page', url: 'http://test.com' }],
		}),
		disconnect: jest.fn().mockResolvedValue(undefined),
		isConnected: true,
	} as unknown as BrowserConnection;

	return { connection, adapter: mockAdapter, state };
}
