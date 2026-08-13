import { systemPrompt } from './prompts';

describe('systemPrompt', () => {
	it('keeps plumbing operations in the workflow while omitting them from Story', () => {
		const prompt = systemPrompt('story');

		expect(prompt).toContain('Never invent workflow operations');
		expect(prompt).toContain('remain unchanged in the workflow');
		expect(prompt).toContain('omitted only from the Story representation');
	});
});
