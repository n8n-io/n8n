/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createTabTools } from './tabs';
import { createMockConnection, findTool, structuredOf, TOOL_CONTEXT } from './test-helpers';

describe('createTabTools', () => {
	let mockConnection: ReturnType<typeof createMockConnection>;
	let tools: ReturnType<typeof createTabTools>;

	beforeEach(() => {
		mockConnection = createMockConnection();
		tools = createTabTools(mockConnection.connection);
	});

	describe('browser_tab_open', () => {
		const getTool = () => findTool(tools, 'browser_tab_open');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_tab_open');
			});

			it('has a non-empty description', () => {
				expect(getTool().description.length).toBeGreaterThan(0);
			});
		});

		describe('inputSchema validation', () => {
			it('accepts empty object', () => {
				expect(() => getTool().inputSchema.parse({})).not.toThrow();
			});

			it('accepts optional url', () => {
				expect(() => getTool().inputSchema.parse({ url: 'http://example.com' })).not.toThrow();
			});

			it('rejects non-string url', () => {
				expect(() => getTool().inputSchema.parse({ url: 123 })).toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.newPage and returns page info', async () => {
				const result = await getTool().execute({ url: 'http://example.com' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.newPage).toHaveBeenCalledWith('http://example.com');
				expect(data.pageId).toBe('page2');
				expect(data.title).toBe('New Page');
				expect(data.url).toBe('about:blank');
			});

			it('updates state.pages and activePageId', async () => {
				await getTool().execute({}, TOOL_CONTEXT);

				expect(mockConnection.state.pages.has('page2')).toBe(true);
				expect(mockConnection.state.activePageId).toBe('page2');
			});

			it('includes snapshot of the new page in response envelope', async () => {
				mockConnection.adapter.snapshot.mockResolvedValue({ tree: '<snapshot-tree>', refCount: 5 });

				const result = await getTool().execute({ url: 'http://example.com' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(data.snapshot).toBe('<snapshot-tree>');
				expect(mockConnection.adapter.snapshot).toHaveBeenCalledWith('page2');
			});
		});
	});

	describe('browser_tab_list', () => {
		const getTool = () => findTool(tools, 'browser_tab_list');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_tab_list');
			});
		});

		describe('inputSchema validation', () => {
			it('accepts empty object', () => {
				expect(() => getTool().inputSchema.parse({})).not.toThrow();
			});
		});

		describe('execute', () => {
			it('returns pages with active flag', async () => {
				const result = await getTool().execute({}, TOOL_CONTEXT);
				const data = structuredOf(result);
				const pages = data.pages as Array<{ id: string; active: boolean }>;

				expect(pages).toHaveLength(1);
				expect(pages[0].id).toBe('page1');
				expect(pages[0].active).toBe(true);
			});

			it('marks non-active pages correctly', async () => {
				mockConnection.adapter.listTabs.mockResolvedValue([
					{ id: 'page1', title: 'A', url: 'http://a.com' },
					{ id: 'page2', title: 'B', url: 'http://b.com' },
				]);
				// activePageId is 'page1'

				const result = await getTool().execute({}, TOOL_CONTEXT);
				const data = structuredOf(result);
				const pages = data.pages as Array<{ id: string; active: boolean }>;

				expect(pages.find((p) => p.id === 'page1')?.active).toBe(true);
				expect(pages.find((p) => p.id === 'page2')?.active).toBe(false);
			});
		});
	});

	describe('browser_tab_focus', () => {
		const getTool = () => findTool(tools, 'browser_tab_focus');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_tab_focus');
			});
		});

		describe('inputSchema validation', () => {
			it('requires pageId', () => {
				expect(() => getTool().inputSchema.parse({})).toThrow();
			});

			it('accepts valid pageId', () => {
				expect(() => getTool().inputSchema.parse({ pageId: 'page1' })).not.toThrow();
			});

			it('rejects non-string pageId', () => {
				expect(() => getTool().inputSchema.parse({ pageId: 123 })).toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.focusPage and updates activePageId', async () => {
				mockConnection.adapter.listTabs.mockResolvedValue([
					{ id: 'page1', title: 'A', url: 'http://a.com' },
					{ id: 'page2', title: 'B', url: 'http://b.com' },
				]);

				const result = await getTool().execute({ pageId: 'page2' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.focusPage).toHaveBeenCalledWith('page2');
				expect(data.activePageId).toBe('page2');
				expect(mockConnection.state.activePageId).toBe('page2');
			});

			it('returns error when page not found', async () => {
				mockConnection.adapter.listTabs.mockResolvedValue([
					{ id: 'page1', title: 'A', url: 'http://a.com' },
				]);

				const result = await getTool().execute({ pageId: 'nonexistent' }, TOOL_CONTEXT);

				expect(result.isError).toBe(true);
			});
		});
	});

	describe('browser_tab_close', () => {
		const getTool = () => findTool(tools, 'browser_tab_close');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_tab_close');
			});
		});

		describe('inputSchema validation', () => {
			it('requires pageId', () => {
				expect(() => getTool().inputSchema.parse({})).toThrow();
			});

			it('accepts valid pageId', () => {
				expect(() => getTool().inputSchema.parse({ pageId: 'page1' })).not.toThrow();
			});
		});

		describe('execute', () => {
			it('closes page and returns result', async () => {
				mockConnection.adapter.listTabs.mockResolvedValue([
					{ id: 'page2', title: 'B', url: 'http://b.com' },
				]);

				const result = await getTool().execute({ pageId: 'page1' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.closePage).toHaveBeenCalledWith('page1');
				expect(data.closed).toBe(true);
				expect(data.pageId).toBe('page1');
			});

			it('does not disconnect when closing last tab', async () => {
				mockConnection.adapter.listTabs.mockResolvedValue([]);

				await getTool().execute({ pageId: 'page1' }, TOOL_CONTEXT);

				expect(mockConnection.connection.disconnect).not.toHaveBeenCalled();
			});

			it('switches activePageId when closing the active tab', async () => {
				mockConnection.adapter.listTabs.mockResolvedValue([
					{ id: 'page2', title: 'B', url: 'http://b.com' },
					{ id: 'page3', title: 'C', url: 'http://c.com' },
				]);

				await getTool().execute({ pageId: 'page1' }, TOOL_CONTEXT);

				expect(mockConnection.state.activePageId).toBe('page3');
			});
		});
	});
});
