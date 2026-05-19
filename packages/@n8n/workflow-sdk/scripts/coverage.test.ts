import { extractKeywords, matchPrompt } from './coverage';

describe('coverage helpers', () => {
	describe('extractKeywords', () => {
		it('lowercases, splits on whitespace, drops stopwords and short tokens', () => {
			const out = extractKeywords('Create a workflow that posts to Slack');
			expect(out).toContain('posts');
			expect(out).toContain('slack');
			expect(out).not.toContain('the');
			expect(out).not.toContain('a');
			expect(out).not.toContain('to');
		});

		it('mixes in tag tokens', () => {
			const out = extractKeywords('handle webhook submissions', ['google-sheets', 'multi-action']);
			expect(out).toContain('webhook');
			expect(out).toContain('google');
			expect(out).toContain('sheets');
			expect(out).toContain('multi');
			expect(out).toContain('action');
		});

		it('dedupes repeated tokens', () => {
			const out = extractKeywords('slack slack slack notify slack');
			expect(out.filter((t) => t === 'slack').length).toBe(1);
		});

		it('removes punctuation', () => {
			const out = extractKeywords('Notify the team in #general about it!');
			expect(out).toContain('notify');
			expect(out).toContain('team');
			expect(out).toContain('general');
		});
	});

	describe('matchPrompt', () => {
		const wf = {
			id: 1,
			slug: 'gmail-to-slack',
			name: 'Gmail to Slack notifier',
			description: 'Forwards new Gmail messages to a Slack channel',
			nodes: ['n8n-nodes-base.gmailTrigger', 'n8n-nodes-base.slack'],
			tags: ['trigger:gmail', 'integration:slack'],
			triggerType: 'gmail',
			hasAI: false,
		};

		it('counts substring matches across name + description + nodes + tags', () => {
			const result = matchPrompt(['gmail', 'slack', 'notify'], wf);
			expect(result.matches).toBe(2); // gmail, slack
			expect(result.matchedKeywords).toEqual(expect.arrayContaining(['gmail', 'slack']));
		});

		it('returns 0 matches when no keywords overlap', () => {
			const result = matchPrompt(['airtable', 'discord'], wf);
			expect(result.matches).toBe(0);
		});

		it('matches case-insensitively', () => {
			const result = matchPrompt(['GMAIL', 'SLACK'], wf);
			expect(result.matches).toBe(2);
		});
	});
});
