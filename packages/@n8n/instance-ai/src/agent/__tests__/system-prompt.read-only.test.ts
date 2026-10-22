import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — read-only instance', () => {
	it('omits the section when the instance is writable', () => {
		expect(getSystemPrompt({})).not.toContain('## Read-Only Instance');
		expect(getSystemPrompt({ branchReadOnly: false })).not.toContain('## Read-Only Instance');
	});

	it('allows data table row writes and blocks data table structure changes', () => {
		const prompt = getSystemPrompt({ branchReadOnly: true });
		const section = prompt.slice(prompt.indexOf('## Read-Only Instance'));

		expect(section).toContain('Still allowed:');
		expect(section).toContain('editing data table rows');
		expect(section).not.toMatch(/Still allowed:[^.]*creating data tables/);
		expect(section).toContain('For anything else, explain the instance is read-only');
	});
});
