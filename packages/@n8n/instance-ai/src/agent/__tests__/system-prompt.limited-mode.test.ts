import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — limited mode', () => {
	it('omits the section when parameter values are visible', () => {
		expect(getSystemPrompt({})).not.toContain('## Limited Mode');
		expect(getSystemPrompt({ parameterValuesHidden: false })).not.toContain('## Limited Mode');
	});

	it('includes the section when parameter values are hidden', () => {
		const prompt = getSystemPrompt({ parameterValuesHidden: true });

		expect(prompt).toContain('## Limited Mode');
		expect(prompt).toContain('Send actual data values');
	});
});
