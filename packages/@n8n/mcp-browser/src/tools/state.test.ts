/* eslint-disable @typescript-eslint/no-unsafe-return */
import { createStateTools } from './state';
import { createMockConnection, findTool, structuredOf, TOOL_CONTEXT } from './test-helpers';

describe('createStateTools', () => {
	let mockConnection: ReturnType<typeof createMockConnection>;
	let tools: ReturnType<typeof createStateTools>;

	beforeEach(() => {
		mockConnection = createMockConnection();
		tools = createStateTools(mockConnection.connection);
	});

	it('provides only the storage tool', () => {
		expect(tools.map((tool) => tool.name)).toEqual(['browser_storage']);
	});

	// -----------------------------------------------------------------------
	// browser_storage
	// -----------------------------------------------------------------------

	describe('browser_storage', () => {
		const getTool = () => findTool(tools, 'browser_storage');

		describe('metadata', () => {
			it('has the correct name', () => {
				expect(getTool().name).toBe('browser_storage');
			});
		});

		describe('inputSchema validation', () => {
			it('accepts get with local kind', () => {
				expect(() => getTool().inputSchema.parse({ kind: 'local', action: 'get' })).not.toThrow();
			});

			it('accepts get with session kind', () => {
				expect(() => getTool().inputSchema.parse({ kind: 'session', action: 'get' })).not.toThrow();
			});

			it('accepts set with data', () => {
				expect(() =>
					getTool().inputSchema.parse({
						kind: 'local',
						action: 'set',
						data: { key: 'value' },
					}),
				).not.toThrow();
			});

			it('accepts clear', () => {
				expect(() =>
					getTool().inputSchema.parse({ kind: 'session', action: 'clear' }),
				).not.toThrow();
			});

			it('rejects invalid kind', () => {
				expect(() => getTool().inputSchema.parse({ kind: 'cookie', action: 'get' })).toThrow();
			});

			it('rejects set without data', () => {
				expect(() => getTool().inputSchema.parse({ kind: 'local', action: 'set' })).toThrow();
			});
		});

		describe('execute', () => {
			it('gets local storage', async () => {
				mockConnection.adapter.getStorage.mockResolvedValue({ theme: 'dark' });

				const result = await getTool().execute({ kind: 'local', action: 'get' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.getStorage).toHaveBeenCalledWith('page1', 'local');
				expect(data.data).toEqual({ theme: 'dark' });
			});

			it('sets session storage', async () => {
				const result = await getTool().execute(
					{ kind: 'session', action: 'set', data: { token: 'abc' } },
					TOOL_CONTEXT,
				);
				const data = structuredOf(result);

				expect(mockConnection.adapter.setStorage).toHaveBeenCalledWith('page1', 'session', {
					token: 'abc',
				});
				expect(data.set).toBe(true);
			});

			it('clears storage', async () => {
				const result = await getTool().execute({ kind: 'local', action: 'clear' }, TOOL_CONTEXT);
				const data = structuredOf(result);

				expect(mockConnection.adapter.clearStorage).toHaveBeenCalledWith('page1', 'local');
				expect(data.cleared).toBe(true);
			});
		});
	});
});
