import { toolCallAccuracy } from '../tool-call-accuracy';

describe('toolCallAccuracy', () => {
	const evalFn = toolCallAccuracy();

	describe('all expected tools called', () => {
		it('returns pass: true when a single expected tool was called', async () => {
			const result = await evalFn.run({
				input: '',
				output: '',
				expected: 'search',
				toolCalls: [{ tool: 'search', input: {}, output: {} }],
			});
			expect(result.pass).toBe(true);
			expect(result.reasoning).toBe('All 1 expected tools were called');
		});

		it('returns pass: true when all expected tools were called', async () => {
			const result = await evalFn.run({
				input: '',
				output: '',
				expected: 'search, calculator',
				toolCalls: [
					{ tool: 'search', input: {}, output: {} },
					{ tool: 'calculator', input: {}, output: {} },
				],
			});
			expect(result.pass).toBe(true);
			expect(result.reasoning).toBe('All 2 expected tools were called');
		});

		it('is case-insensitive for tool names', async () => {
			const result = await evalFn.run({
				input: '',
				output: '',
				expected: 'Search, CALCULATOR',
				toolCalls: [
					{ tool: 'search', input: {}, output: {} },
					{ tool: 'calculator', input: {}, output: {} },
				],
			});
			expect(result.pass).toBe(true);
		});

		it('ignores extra tool calls beyond the expected ones', async () => {
			const result = await evalFn.run({
				input: '',
				output: '',
				expected: 'search',
				toolCalls: [
					{ tool: 'search', input: {}, output: {} },
					{ tool: 'calculator', input: {}, output: {} },
				],
			});
			expect(result.pass).toBe(true);
		});
	});

	describe('missing expected tools', () => {
		it('returns pass: false when some expected tools are missing', async () => {
			const result = await evalFn.run({
				input: '',
				output: '',
				expected: 'search, calculator',
				toolCalls: [{ tool: 'search', input: {}, output: {} }],
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toContain('Missing tools');
			expect(result.reasoning).toContain('calculator');
		});

		it('returns pass: false when no tools were called', async () => {
			const result = await evalFn.run({
				input: '',
				output: '',
				expected: 'search',
				toolCalls: [],
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toContain('Missing tools');
			expect(result.reasoning).toContain('search');
		});
	});

	describe('edge cases', () => {
		it('returns pass: false when expected is undefined', async () => {
			const result = await evalFn.run({
				input: '',
				output: '',
				toolCalls: [{ tool: 'search', input: {}, output: {} }],
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toBe('No expected tool names provided');
		});

		it('returns pass: false when expected is an empty string', async () => {
			const result = await evalFn.run({
				input: '',
				output: '',
				expected: '',
				toolCalls: [{ tool: 'search', input: {}, output: {} }],
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toBe('No expected tool names provided');
		});

		it('returns pass: false when expected contains only whitespace', async () => {
			const result = await evalFn.run({
				input: '',
				output: '',
				expected: '   ,  ,  ',
				toolCalls: [{ tool: 'search', input: {}, output: {} }],
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toBe('No expected tools to check');
		});

		it('handles toolCalls being undefined', async () => {
			const result = await evalFn.run({
				input: '',
				output: '',
				expected: 'search',
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toContain('Missing tools');
		});

		it('trims whitespace around expected tool names', async () => {
			const result = await evalFn.run({
				input: '',
				output: '',
				expected: '  search  ,  calculator  ',
				toolCalls: [
					{ tool: 'search', input: {}, output: {} },
					{ tool: 'calculator', input: {}, output: {} },
				],
			});
			expect(result.pass).toBe(true);
		});
	});
});
