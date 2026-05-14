import {
	EXECUTION_CALLER_METADATA_KEYS,
	ExecutionCallerSchema,
	extractExecutionCaller,
} from '../executions.schema';

describe('executions.schema', () => {
	describe('ExecutionCallerSchema', () => {
		it('accepts a valid mcp caller with clientId', () => {
			const parsed = ExecutionCallerSchema.parse({
				kind: 'mcp',
				name: 'mcp-server',
				clientId: 'abc',
			});
			expect(parsed).toEqual({ kind: 'mcp', name: 'mcp-server', clientId: 'abc' });
		});

		it('accepts an Instance AI caller', () => {
			const parsed = ExecutionCallerSchema.parse({
				kind: 'instance-ai',
				name: 'Instance AI',
				clientId: 'thread-1',
			});
			expect(parsed).toEqual({
				kind: 'instance-ai',
				name: 'Instance AI',
				clientId: 'thread-1',
			});
		});

		it('accepts a caller without clientId', () => {
			const parsed = ExecutionCallerSchema.parse({ kind: 'cli', name: 'n8n-cli@host' });
			expect(parsed).toEqual({ kind: 'cli', name: 'n8n-cli@host' });
		});

		it('rejects an unknown kind', () => {
			expect(() => ExecutionCallerSchema.parse({ kind: 'browser', name: 'x' })).toThrow();
		});

		it('rejects a caller missing the name', () => {
			expect(() => ExecutionCallerSchema.parse({ kind: 'sdk' })).toThrow();
		});

		it('accepts a caller with sessionId', () => {
			const parsed = ExecutionCallerSchema.parse({
				kind: 'mcp',
				name: 'mcp-server',
				sessionId: 'a3f24c-session',
			});
			expect(parsed).toEqual({ kind: 'mcp', name: 'mcp-server', sessionId: 'a3f24c-session' });
		});

		it('rejects an empty sessionId', () => {
			expect(() =>
				ExecutionCallerSchema.parse({ kind: 'cli', name: 'n8n-cli', sessionId: '' }),
			).toThrow();
		});

		it('rejects a sessionId longer than 512 chars', () => {
			expect(() =>
				ExecutionCallerSchema.parse({ kind: 'cli', name: 'n8n-cli', sessionId: 'x'.repeat(513) }),
			).toThrow();
		});
	});

	describe('extractExecutionCaller', () => {
		it('returns undefined when metadata is undefined', () => {
			expect(extractExecutionCaller(undefined)).toBeUndefined();
		});

		it('returns undefined when caller.kind is missing', () => {
			expect(
				extractExecutionCaller({
					[EXECUTION_CALLER_METADATA_KEYS.name]: 'no-kind',
				}),
			).toBeUndefined();
		});

		it('returns undefined when caller.name is missing', () => {
			expect(
				extractExecutionCaller({
					[EXECUTION_CALLER_METADATA_KEYS.kind]: 'cli',
				}),
			).toBeUndefined();
		});

		it('returns undefined when caller.kind is invalid', () => {
			expect(
				extractExecutionCaller({
					[EXECUTION_CALLER_METADATA_KEYS.kind]: 'browser',
					[EXECUTION_CALLER_METADATA_KEYS.name]: 'x',
				}),
			).toBeUndefined();
		});

		it('omits clientId when absent', () => {
			expect(
				extractExecutionCaller({
					[EXECUTION_CALLER_METADATA_KEYS.kind]: 'cli',
					[EXECUTION_CALLER_METADATA_KEYS.name]: 'n8n-cli@host',
				}),
			).toEqual({ kind: 'cli', name: 'n8n-cli@host' });
		});

		it('includes clientId when present', () => {
			expect(
				extractExecutionCaller({
					[EXECUTION_CALLER_METADATA_KEYS.kind]: 'mcp',
					[EXECUTION_CALLER_METADATA_KEYS.name]: 'mcp-server',
					[EXECUTION_CALLER_METADATA_KEYS.clientId]: 'client-123',
				}),
			).toEqual({ kind: 'mcp', name: 'mcp-server', clientId: 'client-123' });
		});

		it('includes sessionId when present', () => {
			expect(
				extractExecutionCaller({
					[EXECUTION_CALLER_METADATA_KEYS.kind]: 'mcp',
					[EXECUTION_CALLER_METADATA_KEYS.name]: 'mcp-server',
					[EXECUTION_CALLER_METADATA_KEYS.sessionId]: 'a3f24c-session',
				}),
			).toEqual({ kind: 'mcp', name: 'mcp-server', sessionId: 'a3f24c-session' });
		});

		it('omits sessionId when absent', () => {
			expect(
				extractExecutionCaller({
					[EXECUTION_CALLER_METADATA_KEYS.kind]: 'cli',
					[EXECUTION_CALLER_METADATA_KEYS.name]: 'n8n-cli@host',
				}),
			).toEqual({ kind: 'cli', name: 'n8n-cli@host' });
		});
	});
});
