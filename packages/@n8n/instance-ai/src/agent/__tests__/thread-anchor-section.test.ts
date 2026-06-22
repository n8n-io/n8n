import { getSystemPrompt, getThreadAnchorSection } from '../system-prompt';

describe('getThreadAnchorSection', () => {
	it('returns empty string when there is no anchor', () => {
		expect(getThreadAnchorSection(undefined)).toBe('');
		expect(getThreadAnchorSection({})).toBe('');
		expect(getThreadAnchorSection({ builtWorkflows: [] })).toBe('');
	});

	it('renders the original goal and instructs the agent not to claim a fresh start', () => {
		const section = getThreadAnchorSection({ originalGoal: 'Send an SMS on missed calls' });
		expect(section).toContain('Original request:** Send an SMS on missed calls');
		expect(section).toContain('start of the conversation');
	});

	it('renders built workflows with names when available', () => {
		const section = getThreadAnchorSection({
			builtWorkflows: [{ id: 'wf-1', name: 'Zameen Engine' }, { id: 'wf-2' }],
		});
		expect(section).toContain('Zameen Engine (wf-1)');
		expect(section).toContain('wf-2');
	});
});

describe('getSystemPrompt thread anchor injection', () => {
	it('includes the anchor section when an anchor is provided', () => {
		const prompt = getSystemPrompt({ threadAnchor: { originalGoal: 'My goal' } });
		expect(prompt).toContain('Thread context (persistent — always honor)');
		expect(prompt).toContain('My goal');
	});

	it('omits the anchor section when no anchor is provided', () => {
		const prompt = getSystemPrompt({});
		expect(prompt).not.toContain('Thread context (persistent');
	});
});
