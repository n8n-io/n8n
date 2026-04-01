import { getSystemPrompt } from '../system-prompt';

describe('getSystemPrompt', () => {
	it('includes chooser guidance for template inspiration mode', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).toContain('search-workflow-templates');
		expect(prompt).toContain('choose-workflow-template');
		expect(prompt).toContain(
			'your very next action MUST be a `choose-workflow-template` tool call',
		);
		expect(prompt).toContain(
			'you must not enumerate, describe, or discuss individual templates in text',
		);
		expect(prompt).toContain(
			'Do not call `search-workflow-templates` again in the same turn once you have any matches',
		);
		expect(prompt).not.toContain('The UI will render matching templates as cards.');
	});

	it('requires clarification and plan review before adapting a template', () => {
		const prompt = getSystemPrompt({});

		expect(prompt).toContain(
			'the chooser already includes a built-in `What would you like to change?` step',
		);
		expect(prompt).toContain(
			'If the requested changes are ambiguous, ask follow-up `ask-user` questions',
		);
		expect(prompt).toContain(
			'Treat `Nothing` as an explicit request to adapt the template mostly as-is',
		);
		expect(prompt).toContain(
			'Before any workflow build starts, call `plan` even for a single workflow adaptation',
		);
		expect(prompt).toContain(
			'Direct `build-workflow-with-agent` calls for template adaptation are rejected until the user has gone through plan review',
		);
	});

	describe('license hints', () => {
		it('includes License Limitations section when hints are provided', () => {
			const prompt = getSystemPrompt({
				licenseHints: ['**Feature A** — requires Pro plan.'],
			});

			expect(prompt).toContain('## License Limitations');
			expect(prompt).toContain('**Feature A** — requires Pro plan.');
			expect(prompt).toContain('require a license upgrade');
		});

		it('renders multiple hints as a list', () => {
			const prompt = getSystemPrompt({
				licenseHints: [
					'**Feature A** — requires Pro plan.',
					'**Feature B** — requires Enterprise plan.',
				],
			});

			expect(prompt).toContain('- **Feature A** — requires Pro plan.');
			expect(prompt).toContain('- **Feature B** — requires Enterprise plan.');
		});

		it('omits License Limitations section when hints array is empty', () => {
			const prompt = getSystemPrompt({ licenseHints: [] });

			expect(prompt).not.toContain('License Limitations');
		});

		it('omits License Limitations section when hints are not provided', () => {
			const prompt = getSystemPrompt({});

			expect(prompt).not.toContain('License Limitations');
		});
	});
});
