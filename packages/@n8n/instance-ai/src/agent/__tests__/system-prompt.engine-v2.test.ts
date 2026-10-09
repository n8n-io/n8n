import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — engine v2', () => {
	it('omits the section when engine v2 is not enabled', () => {
		expect(getSystemPrompt({})).not.toContain('## Execution Engine');
		expect(getSystemPrompt({ engineV2Enabled: false })).not.toContain('## Execution Engine');
	});

	it('includes the section with the unsupported features when engine v2 is enabled', () => {
		const prompt = getSystemPrompt({ engineV2Enabled: true });

		expect(prompt).toContain('## Execution Engine');
		expect(prompt).toContain('engine v2');
		expect(prompt).toContain('Code node');
		expect(prompt).toContain('Execute Workflow');
		expect(prompt).toContain('Split In Batches');
	});
});
