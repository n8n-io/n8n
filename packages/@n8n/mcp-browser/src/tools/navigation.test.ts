/* eslint-disable @typescript-eslint/no-unsafe-return */
import { NotConnectedError } from '../errors';
import { createNavigationTools } from './navigation';
import { createMockConnection, findTool, structuredOf, TOOL_CONTEXT } from './test-helpers';

describe('createNavigationTools', () => {
	let mockConnection: ReturnType<typeof createMockConnection>;
	let tools: ReturnType<typeof createNavigationTools>;

	beforeEach(() => {
		mockConnection = createMockConnection();
		tools = createNavigationTools(mockConnection.connection);
	});

	describe('browser_navigate', () => {
		const getTool = () => findTool(tools, 'browser_navigate');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_navigate');
			});

			it('has a non-empty description', () => {
				expect(getTool().description.length).toBeGreaterThan(0);
			});
		});

		describe('inputSchema validation', () => {
			it('accepts valid url', () => {
				expect(() => getTool().inputSchema.parse({ url: 'http://example.com' })).not.toThrow();
			});

			it('accepts url with waitUntil', () => {
				expect(() =>
					getTool().inputSchema.parse({ url: 'http://example.com', waitUntil: 'networkidle' }),
				).not.toThrow();
			});

			it('accepts all waitUntil values', () => {
				for (const value of ['load', 'domcontentloaded', 'networkidle']) {
					expect(() =>
						getTool().inputSchema.parse({ url: 'http://a.com', waitUntil: value }),
					).not.toThrow();
				}
			});

			it('rejects missing url', () => {
				expect(() => getTool().inputSchema.parse({})).toThrow();
			});

			it('rejects non-string url', () => {
				expect(() => getTool().inputSchema.parse({ url: 123 })).toThrow();
			});

			it('rejects invalid waitUntil', () => {
				expect(() =>
					getTool().inputSchema.parse({ url: 'http://a.com', waitUntil: 'complete' }),
				).toThrow();
			});

			it('accepts optional pageId', () => {
				expect(() =>
					getTool().inputSchema.parse({ url: 'http://a.com', pageId: 'p1' }),
				).not.toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.navigate with correct args', async () => {
				const result = await getTool().execute(
					{ url: 'http://example.com', waitUntil: 'networkidle' },
					TOOL_CONTEXT,
				);
				const data = structuredOf(result);

				expect(mockConnection.adapter.navigate).toHaveBeenCalledWith(
					'page1',
					'http://example.com',
					'networkidle',
				);
				expect(data.title).toBe('Test Page');
				expect(data.url).toBe('http://test.com');
				expect(data.status).toBe(200);
			});

			it('uses waitForCompletion wrapper', async () => {
				await getTool().execute({ url: 'http://example.com' }, TOOL_CONTEXT);

				expect(mockConnection.adapter.waitForCompletion).toHaveBeenCalledWith(
					'page1',
					expect.any(Function),
				);
			});

			it('returns error when not connected', async () => {
				(mockConnection.connection.getConnection as jest.Mock).mockImplementation(() => {
					throw new NotConnectedError();
				});

				const result = await getTool().execute({ url: 'http://example.com' }, TOOL_CONTEXT);

				expect(result.isError).toBe(true);
			});
		});
	});

	describe('browser_back', () => {
		const getTool = () => findTool(tools, 'browser_back');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_back');
			});
		});

		describe('inputSchema validation', () => {
			it('accepts empty object', () => {
				expect(() => getTool().inputSchema.parse({})).not.toThrow();
			});

			it('accepts optional pageId', () => {
				expect(() => getTool().inputSchema.parse({ pageId: 'p1' })).not.toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.back and returns title and url', async () => {
				const result = await getTool().execute({}, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.back).toHaveBeenCalledWith('page1');
				expect(data.title).toBe('Previous');
				expect(data.url).toBe('http://test.com/prev');
			});
		});
	});

	describe('browser_forward', () => {
		const getTool = () => findTool(tools, 'browser_forward');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_forward');
			});
		});

		describe('inputSchema validation', () => {
			it('accepts empty object', () => {
				expect(() => getTool().inputSchema.parse({})).not.toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.forward and returns title and url', async () => {
				const result = await getTool().execute({}, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.forward).toHaveBeenCalledWith('page1');
				expect(data.title).toBe('Next');
				expect(data.url).toBe('http://test.com/next');
			});
		});
	});

	describe('browser_reload', () => {
		const getTool = () => findTool(tools, 'browser_reload');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_reload');
			});
		});

		describe('inputSchema validation', () => {
			it('accepts empty object', () => {
				expect(() => getTool().inputSchema.parse({})).not.toThrow();
			});

			it('accepts waitUntil', () => {
				expect(() => getTool().inputSchema.parse({ waitUntil: 'domcontentloaded' })).not.toThrow();
			});

			it('rejects invalid waitUntil', () => {
				expect(() => getTool().inputSchema.parse({ waitUntil: 'complete' })).toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.reload with waitUntil', async () => {
				const result = await getTool().execute({ waitUntil: 'networkidle' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.reload).toHaveBeenCalledWith('page1', 'networkidle');
				expect(data.title).toBe('Reloaded');
				expect(data.url).toBe('http://test.com');
			});
		});
	});

	describe('response enrichment', () => {
		it('injects snapshot when adapter returns it', async () => {
			mockConnection.adapter.snapshot.mockResolvedValue({ tree: '- heading "Test"', refCount: 1 });

			const tool = findTool(tools, 'browser_navigate');
			const result = await tool.execute({ url: 'http://example.com' }, TOOL_CONTEXT);
			const data = structuredOf(result);

			expect(data.snapshot).toBe('- heading "Test"');
		});

		it('injects modalStates when present', async () => {
			mockConnection.adapter.getModalStates.mockReturnValue([
				{
					type: 'dialog',
					description: 'Alert dialog',
					clearedBy: 'browser_dialog',
					dialogType: 'alert',
				},
			]);

			const tool = findTool(tools, 'browser_navigate');
			const result = await tool.execute({ url: 'http://example.com' }, TOOL_CONTEXT);
			const data = structuredOf(result);

			expect(data.modalStates).toHaveLength(1);
		});

		it('injects consoleSummary when there are errors', async () => {
			mockConnection.adapter.getConsoleSummary.mockReturnValue({ errors: 2, warnings: 1 });

			const tool = findTool(tools, 'browser_navigate');
			const result = await tool.execute({ url: 'http://example.com' }, TOOL_CONTEXT);
			const data = structuredOf(result);

			expect(data.consoleSummary).toEqual({ errors: 2, warnings: 1 });
		});

		it('does not inject consoleSummary when counts are zero', async () => {
			mockConnection.adapter.getConsoleSummary.mockReturnValue({ errors: 0, warnings: 0 });

			const tool = findTool(tools, 'browser_navigate');
			const result = await tool.execute({ url: 'http://example.com' }, TOOL_CONTEXT);
			const data = structuredOf(result);

			expect(data.consoleSummary).toBeUndefined();
		});
	});
});
