import { createLlmCheck } from '../create-llm-check';

describe('createLlmCheck', () => {
	it('returns pass: true with "Skipped" comment when no LLM provided', async () => {
		const check = createLlmCheck({
			name: 'test_check',
			systemPrompt: 'test',
			humanTemplate: 'test {userPrompt} {generatedWorkflow} {referenceSection}',
		});

		expect(check.name).toBe('test_check');
		expect(check.kind).toBe('llm');

		const result = await check.run(
			{ name: 'test', nodes: [], connections: {} },
			{ prompt: 'test', nodeTypes: [] },
		);
		expect(result.pass).toBe(true);
		expect(result.comment).toBe('Skipped: no LLM');
	});
});
