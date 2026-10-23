import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt — read-only instance', () => {
	it('omits the section when the instance is writable', () => {
		expect(getSystemPrompt({})).not.toContain('## Read-Only Instance');
		expect(getSystemPrompt({ branchReadOnly: false })).not.toContain('## Read-Only Instance');
	});

	it('allows data table row writes and blocks data table structure changes', () => {
		const prompt = getSystemPrompt({ branchReadOnly: true });
		const [blocked, available] = prompt
			.slice(prompt.indexOf('## Read-Only Instance'))
			.split('The following operations remain available:');

		expect(blocked).toContain(
			'Creating, renaming, or deleting data tables, and adding, renaming, or deleting their columns',
		);
		expect(blocked).not.toContain('rows');
		expect(available).toContain('Inserting, updating, and deleting data table rows');
	});
});
