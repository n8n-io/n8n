import { getSystemPrompt } from '../system-prompt';

describe('explicit resource reference prompt', () => {
	it('requires canonical workflow and node targeting', () => {
		const prompt = getSystemPrompt();

		expect(prompt).toContain('Use each supplied id directly');
		expect(prompt).toContain('Do not search by its display name');
		expect(prompt).toContain('workflows(action="get-as-code", workflowId)');
		expect(prompt).toContain('Keep the supplied node or group ids as the requested edit scope');
	});
});
