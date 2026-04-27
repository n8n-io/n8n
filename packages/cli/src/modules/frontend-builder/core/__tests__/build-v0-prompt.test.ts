import { buildV0Prompt } from '../build-v0-prompt';

describe('buildV0Prompt', () => {
	it('renders all endpoints with method, URL, and node name', () => {
		const prompt = buildV0Prompt({
			userPrompt: 'show a table',
			endpoints: [
				{ nodeName: 'List', method: 'GET', url: 'https://x/webhook/list' },
				{ nodeName: 'Add', method: 'POST', url: 'https://x/webhook/add' },
			],
		});

		expect(prompt).toContain('GET https://x/webhook/list  (node: "List")');
		expect(prompt).toContain('POST https://x/webhook/add  (node: "Add")');
	});

	it('includes request example when present, omits otherwise', () => {
		const withExample = buildV0Prompt({
			userPrompt: 'p',
			endpoints: [{ nodeName: 'Add', method: 'POST', url: 'u', requestExample: { name: 'a' } }],
		});
		expect(withExample).toContain('Example request body: {"name":"a"}');

		const without = buildV0Prompt({
			userPrompt: 'p',
			endpoints: [{ nodeName: 'Add', method: 'POST', url: 'u' }],
		});
		expect(without).not.toContain('Example request body');
	});

	it('includes response example when present, omits otherwise', () => {
		const withExample = buildV0Prompt({
			userPrompt: 'p',
			endpoints: [{ nodeName: 'List', method: 'GET', url: 'u', responseExample: [{ id: 1 }] }],
		});
		expect(withExample).toContain('Example response: [{"id":1}]');

		const without = buildV0Prompt({
			userPrompt: 'p',
			endpoints: [{ nodeName: 'List', method: 'GET', url: 'u' }],
		});
		expect(without).not.toContain('Example response');
	});

	it('includes the user prompt verbatim', () => {
		const prompt = buildV0Prompt({
			userPrompt: 'render a table for each crm user with email and name',
			endpoints: [{ nodeName: 'List', method: 'GET', url: 'u' }],
		});
		expect(prompt).toContain('User request: render a table for each crm user with email and name');
	});

	it('always emits the standard constraints block', () => {
		const prompt = buildV0Prompt({
			userPrompt: 'p',
			endpoints: [{ nodeName: 'X', method: 'POST', url: 'u' }],
		});
		expect(prompt).toContain('Constraints:');
		expect(prompt).toContain('Use fetch() directly');
		expect(prompt).toContain('Handle network errors gracefully');
	});

	it('renders both examples for one endpoint when both are provided', () => {
		const prompt = buildV0Prompt({
			userPrompt: 'p',
			endpoints: [
				{
					nodeName: 'Echo',
					method: 'POST',
					url: 'u',
					requestExample: { ping: true },
					responseExample: { pong: true },
				},
			],
		});
		expect(prompt).toContain('Example request body: {"ping":true}');
		expect(prompt).toContain('Example response: {"pong":true}');
	});
});
