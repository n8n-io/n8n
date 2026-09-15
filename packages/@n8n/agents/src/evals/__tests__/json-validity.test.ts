import { jsonValidity } from '../json-validity';

describe('jsonValidity', () => {
	const evalFn = jsonValidity();

	describe('valid JSON', () => {
		it('accepts a JSON object', async () => {
			const result = await evalFn.run({
				input: '',
				output: '{"name": "test", "value": 42}',
			});
			expect(result.pass).toBe(true);
			expect(result.reasoning).toBe('Valid JSON');
		});

		it('accepts a JSON array', async () => {
			const result = await evalFn.run({
				input: '',
				output: '[1, 2, 3]',
			});
			expect(result.pass).toBe(true);
		});

		it('accepts a JSON string', async () => {
			const result = await evalFn.run({
				input: '',
				output: '"hello"',
			});
			expect(result.pass).toBe(true);
		});

		it('accepts a JSON number', async () => {
			const result = await evalFn.run({
				input: '',
				output: '42',
			});
			expect(result.pass).toBe(true);
		});

		it('accepts a JSON boolean', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'true',
			});
			expect(result.pass).toBe(true);
		});

		it('accepts JSON null', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'null',
			});
			expect(result.pass).toBe(true);
		});

		it('accepts nested JSON', async () => {
			const result = await evalFn.run({
				input: '',
				output: '{"level1": {"level2": [1, 2, {"key": "val"}]}}',
			});
			expect(result.pass).toBe(true);
		});
	});

	describe('invalid JSON', () => {
		it('rejects plain text', async () => {
			const result = await evalFn.run({
				input: '',
				output: 'hello world',
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toMatch(/invalid json/i);
		});

		it('rejects JSON with trailing comma', async () => {
			const result = await evalFn.run({
				input: '',
				output: '{"a": 1,}',
			});
			expect(result.pass).toBe(false);
		});

		it('rejects single quotes instead of double quotes', async () => {
			const result = await evalFn.run({
				input: '',
				output: "{'a': 1}",
			});
			expect(result.pass).toBe(false);
		});

		it('rejects an empty string', async () => {
			const result = await evalFn.run({
				input: '',
				output: '',
			});
			expect(result.pass).toBe(false);
		});

		it('rejects whitespace-only string', async () => {
			const result = await evalFn.run({
				input: '',
				output: '   ',
			});
			expect(result.pass).toBe(false);
		});

		it('rejects undefined as a value', async () => {
			const result = await evalFn.run({
				input: '',
				output: '{"a": undefined}',
			});
			expect(result.pass).toBe(false);
		});
	});
});
