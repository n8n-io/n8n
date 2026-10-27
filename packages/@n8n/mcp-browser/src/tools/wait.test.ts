/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createMockConnection, findTool, structuredOf, TOOL_CONTEXT } from './test-helpers';
import { createWaitTools } from './wait';

describe('createWaitTools', () => {
	let mockConnection: ReturnType<typeof createMockConnection>;
	let tools: ReturnType<typeof createWaitTools>;

	beforeEach(() => {
		mockConnection = createMockConnection();
		tools = createWaitTools(mockConnection.connection);
	});

	describe('browser_wait', () => {
		const getTool = () => findTool(tools, 'browser_wait');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_wait');
			});

			it('has a non-empty description', () => {
				expect(getTool().description.length).toBeGreaterThan(0);
			});
		});

		describe('inputSchema validation', () => {
			it('accepts empty object (all fields optional)', () => {
				expect(() => getTool().inputSchema.parse({})).not.toThrow();
			});

			it('accepts selector', () => {
				expect(() => getTool().inputSchema.parse({ selector: '#loading' })).not.toThrow();
			});

			it('accepts url pattern', () => {
				expect(() => getTool().inputSchema.parse({ url: '**/dashboard' })).not.toThrow();
			});

			it('accepts loadState', () => {
				expect(() => getTool().inputSchema.parse({ loadState: 'networkidle' })).not.toThrow();
			});

			it('accepts all loadState values', () => {
				for (const value of ['load', 'domcontentloaded', 'networkidle']) {
					expect(() => getTool().inputSchema.parse({ loadState: value })).not.toThrow();
				}
			});

			it('rejects invalid loadState', () => {
				expect(() => getTool().inputSchema.parse({ loadState: 'complete' })).toThrow();
			});

			it('accepts predicate', () => {
				expect(() =>
					getTool().inputSchema.parse({ predicate: 'document.title === "Ready"' }),
				).not.toThrow();
			});

			it('accepts text', () => {
				expect(() => getTool().inputSchema.parse({ text: 'Welcome' })).not.toThrow();
			});

			it('accepts timeoutMs', () => {
				expect(() => getTool().inputSchema.parse({ timeoutMs: 5000 })).not.toThrow();
			});

			it('rejects non-number timeoutMs', () => {
				expect(() => getTool().inputSchema.parse({ timeoutMs: 'fast' })).toThrow();
			});

			it('accepts multiple conditions combined', () => {
				expect(() =>
					getTool().inputSchema.parse({
						selector: '#content',
						url: '**/page',
						loadState: 'load',
						text: 'Loaded',
						timeoutMs: 10000,
					}),
				).not.toThrow();
			});
		});

		describe('execute', () => {
			it('calls adapter.wait with all options', async () => {
				const input = {
					selector: '#content',
					url: '**/page',
					loadState: 'networkidle' as const,
					predicate: 'true',
					text: 'Ready',
					timeoutMs: 5000,
				};

				const result = await getTool().execute(input, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.wait).toHaveBeenCalledWith('page1', {
					selector: '#content',
					url: '**/page',
					loadState: 'networkidle',
					predicate: 'true',
					text: 'Ready',
					timeoutMs: 5000,
				});
				expect(data.waited).toBe(true);
				expect(data.elapsedMs).toBe(100);
			});

			it('passes undefined for omitted options', async () => {
				await getTool().execute({}, TOOL_CONTEXT);

				expect(mockConnection.adapter.wait).toHaveBeenCalledWith('page1', {
					selector: undefined,
					url: undefined,
					loadState: undefined,
					predicate: undefined,
					text: undefined,
					timeoutMs: undefined,
				});
			});

			it('uses specified pageId', async () => {
				await getTool().execute({ pageId: 'page5' }, TOOL_CONTEXT);

				expect(mockConnection.adapter.wait).toHaveBeenCalledWith('page5', expect.any(Object));
			});
		});
	});
});
