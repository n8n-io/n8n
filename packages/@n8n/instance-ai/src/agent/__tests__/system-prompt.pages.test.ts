import { getSystemPrompt } from '../system-prompt';

describe('system prompt: writing pages', () => {
	it('tells the model when to call create_page and how to answer', () => {
		const prompt = getSystemPrompt({ pageWritingEnabled: true });
		expect(prompt).toContain('## Writing Pages');
		expect(prompt).toContain('`create_page`');
		expect(prompt).toContain('document a workflow');
		expect(prompt).toContain('a runbook or notes');
		expect(prompt).toContain('a link to the page');
	});

	it('says nothing about writing pages when the feature is off', () => {
		const prompt = getSystemPrompt({ pageWritingEnabled: false });
		expect(prompt).not.toContain('## Writing Pages');
		expect(prompt).not.toContain('create_page');
	});

	it('lists the page link format with the other resource links', () => {
		expect(getSystemPrompt()).toContain('(/page/<pageId>)');
	});

	it('renders the same text on every call', () => {
		expect(getSystemPrompt({ pageWritingEnabled: true })).toBe(
			getSystemPrompt({ pageWritingEnabled: true }),
		);
	});
});
