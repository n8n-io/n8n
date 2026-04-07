/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createInspectionTools } from './inspection';
import { createMockConnection, findTool, structuredOf, TOOL_CONTEXT } from './test-helpers';

describe('createInspectionTools', () => {
	let mockConnection: ReturnType<typeof createMockConnection>;
	let tools: ReturnType<typeof createInspectionTools>;

	beforeEach(() => {
		mockConnection = createMockConnection();
		tools = createInspectionTools(mockConnection.connection);
	});

	// -----------------------------------------------------------------------
	// browser_snapshot
	// -----------------------------------------------------------------------

	describe('browser_snapshot', () => {
		const getTool = () => findTool(tools, 'browser_snapshot');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_snapshot');
			});

			it('has a non-empty description', () => {
				expect(getTool().description.length).toBeGreaterThan(0);
			});
		});

		describe('inputSchema validation', () => {
			it('accepts empty object', () => {
				expect(() => getTool().inputSchema.parse({})).not.toThrow();
			});

			it('accepts scope with ref', () => {
				expect(() => getTool().inputSchema.parse({ scope: { ref: 'e1' } })).not.toThrow();
			});

			it('accepts scope with selector', () => {
				expect(() => getTool().inputSchema.parse({ scope: { selector: '#main' } })).not.toThrow();
			});

			it('accepts pageId', () => {
				expect(() => getTool().inputSchema.parse({ pageId: 'p1' })).not.toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.snapshot and returns tree', async () => {
				mockConnection.adapter.snapshot.mockResolvedValue({
					tree: '- heading "Test" [ref=e1]\n- button "Click" [ref=e2]',
					refCount: 2,
				});

				const result = await getTool().execute({}, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.snapshot).toHaveBeenCalledWith('page1', undefined);
				expect(data.snapshot).toBe('- heading "Test" [ref=e1]\n- button "Click" [ref=e2]');
			});

			it('passes scope to adapter', async () => {
				await getTool().execute({ scope: { ref: 'e3' } }, TOOL_CONTEXT);

				expect(mockConnection.adapter.snapshot).toHaveBeenCalledWith('page1', { ref: 'e3' });
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_screenshot
	// -----------------------------------------------------------------------

	describe('browser_screenshot', () => {
		const getTool = () => findTool(tools, 'browser_screenshot');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_screenshot');
			});
		});

		describe('inputSchema validation', () => {
			it('accepts empty object', () => {
				expect(() => getTool().inputSchema.parse({})).not.toThrow();
			});

			it('accepts element target', () => {
				expect(() => getTool().inputSchema.parse({ element: { ref: 'e1' } })).not.toThrow();
			});

			it('accepts fullPage', () => {
				expect(() => getTool().inputSchema.parse({ fullPage: true })).not.toThrow();
			});
		});

		describe('execute', () => {
			it('returns image content', async () => {
				const result = await getTool().execute({}, TOOL_CONTEXT);

				expect(result.content[0].type).toBe('image');
				expect((result.content[0] as { data: string }).data).toBe('base64imagedata');
				expect((result.content[0] as { mimeType: string }).mimeType).toBe('image/png');
			});

			it('passes element and fullPage to adapter', async () => {
				await getTool().execute({ element: { selector: '#chart' }, fullPage: true }, TOOL_CONTEXT);

				expect(mockConnection.adapter.screenshot).toHaveBeenCalledWith(
					'page1',
					{ selector: '#chart' },
					{ fullPage: true },
				);
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_content
	// -----------------------------------------------------------------------

	describe('browser_content', () => {
		const getTool = () => findTool(tools, 'browser_content');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_content');
			});
		});

		describe('inputSchema validation', () => {
			it('accepts empty object', () => {
				expect(() => getTool().inputSchema.parse({})).not.toThrow();
			});

			it('accepts selector', () => {
				expect(() => getTool().inputSchema.parse({ selector: '#article' })).not.toThrow();
			});
		});

		describe('execute', () => {
			it('extracts content as markdown', async () => {
				mockConnection.adapter.getContent.mockResolvedValue({
					html: '<html><head><title>Test Title</title></head><body><article><h1>Hello</h1><p>World paragraph content here for readability.</p><p>Another paragraph with enough text for extraction.</p></article></body></html>',
					url: 'http://test.com/article',
				});

				const result = await getTool().execute({}, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.getContent).toHaveBeenCalledWith('page1', undefined);
				expect(data.url).toBe('http://test.com/article');
				expect(typeof data.title).toBe('string');
				expect(typeof data.content).toBe('string');
			});

			it('passes selector to adapter', async () => {
				await getTool().execute({ selector: '#main' }, TOOL_CONTEXT);

				expect(mockConnection.adapter.getContent).toHaveBeenCalledWith('page1', '#main');
			});

			it('handles empty HTML gracefully', async () => {
				mockConnection.adapter.getContent.mockResolvedValue({
					html: '<html><body></body></html>',
					url: 'http://test.com',
				});

				const result = await getTool().execute({}, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(data.content).toBe('');
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_evaluate
	// -----------------------------------------------------------------------

	describe('browser_evaluate', () => {
		const getTool = () => findTool(tools, 'browser_evaluate');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_evaluate');
			});
		});

		describe('inputSchema validation', () => {
			it('requires script', () => {
				expect(() => getTool().inputSchema.parse({ script: 'document.title' })).not.toThrow();
			});

			it('rejects missing script', () => {
				expect(() => getTool().inputSchema.parse({})).toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.evaluate and returns result', async () => {
				mockConnection.adapter.evaluate.mockResolvedValue({ count: 5 });

				const result = await getTool().execute(
					{ script: 'document.querySelectorAll("a").length' },
					TOOL_CONTEXT,
				);
				const data = structuredOf(result);

				expect(mockConnection.adapter.evaluate).toHaveBeenCalledWith(
					'page1',
					'document.querySelectorAll("a").length',
				);
				expect(data.result).toEqual({ count: 5 });
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_console
	// -----------------------------------------------------------------------

	describe('browser_console', () => {
		const getTool = () => findTool(tools, 'browser_console');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_console');
			});
		});

		describe('inputSchema validation', () => {
			it('accepts empty object', () => {
				expect(() => getTool().inputSchema.parse({})).not.toThrow();
			});

			it('accepts valid level values', () => {
				for (const level of ['log', 'warn', 'error', 'info', 'debug']) {
					expect(() => getTool().inputSchema.parse({ level })).not.toThrow();
				}
			});

			it('rejects invalid level', () => {
				expect(() => getTool().inputSchema.parse({ level: 'verbose' })).toThrow();
			});

			it('accepts clear', () => {
				expect(() => getTool().inputSchema.parse({ clear: true })).not.toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.getConsole and returns entries', async () => {
				const entries = [
					{ level: 'error', text: 'Uncaught TypeError', timestamp: 1000 },
					{ level: 'warn', text: 'Deprecated API', timestamp: 1001 },
				];
				mockConnection.adapter.getConsole.mockResolvedValue(entries);

				const result = await getTool().execute({ level: 'warn', clear: true }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.getConsole).toHaveBeenCalledWith('page1', 'warn', true);
				expect(data.entries).toEqual(entries);
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_pdf
	// -----------------------------------------------------------------------

	describe('browser_pdf', () => {
		const getTool = () => findTool(tools, 'browser_pdf');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_pdf');
			});
		});

		describe('inputSchema validation', () => {
			it('accepts empty object', () => {
				expect(() => getTool().inputSchema.parse({})).not.toThrow();
			});

			it('accepts valid format values', () => {
				for (const format of ['A4', 'Letter', 'Legal']) {
					expect(() => getTool().inputSchema.parse({ format })).not.toThrow();
				}
			});

			it('rejects invalid format', () => {
				expect(() => getTool().inputSchema.parse({ format: 'A3' })).toThrow();
			});

			it('accepts landscape', () => {
				expect(() => getTool().inputSchema.parse({ landscape: true })).not.toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.pdf and returns base64 data', async () => {
				mockConnection.adapter.pdf.mockResolvedValue({ data: 'pdfbase64', pages: 3 });

				const result = await getTool().execute({ format: 'Letter', landscape: true }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.pdf).toHaveBeenCalledWith('page1', {
					format: 'Letter',
					landscape: true,
				});
				expect(data.pdf).toBe('pdfbase64');
				expect(data.pages).toBe(3);
			});
		});
	});

	// -----------------------------------------------------------------------
	// browser_network
	// -----------------------------------------------------------------------

	describe('browser_network', () => {
		const getTool = () => findTool(tools, 'browser_network');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_network');
			});
		});

		describe('inputSchema validation', () => {
			it('accepts empty object', () => {
				expect(() => getTool().inputSchema.parse({})).not.toThrow();
			});

			it('accepts filter', () => {
				expect(() => getTool().inputSchema.parse({ filter: '**/*.json' })).not.toThrow();
			});

			it('accepts clear', () => {
				expect(() => getTool().inputSchema.parse({ clear: true })).not.toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.getNetwork and returns requests', async () => {
				const requests = [
					{
						url: 'http://api.com/data',
						method: 'GET',
						status: 200,
						contentType: 'application/json',
						timestamp: 1000,
					},
				];
				mockConnection.adapter.getNetwork.mockResolvedValue(requests);

				const result = await getTool().execute({ filter: '**/*.json', clear: true }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.getNetwork).toHaveBeenCalledWith('page1', '**/*.json', true);
				expect(data.requests).toEqual(requests);
			});
		});
	});
});
