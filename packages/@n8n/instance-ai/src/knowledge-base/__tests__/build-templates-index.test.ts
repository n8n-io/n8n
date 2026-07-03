import { buildTemplatesIndexFromArchive, slimTemplateDescription } from '../build-templates-index';

describe('slimTemplateDescription', () => {
	it('keeps only the template title from CDN catalog descriptions', () => {
		const description =
			'Build Your First AI Agent | n8n-nodes-base.stickyNote,n8n-nodes-base.rssFeedReadTool,@n8n/n8n-nodes-langchain.agent | trigger:chatTrigger,ai,integration:langchain | https://n8n.io/workflows/6270';

		expect(slimTemplateDescription(description)).toBe('Build Your First AI Agent');
	});

	it('leaves short descriptions unchanged', () => {
		expect(slimTemplateDescription('Daily Slack summary')).toBe('Daily Slack summary');
	});
});

describe('buildTemplatesIndexFromArchive', () => {
	it('uses index.json when present', () => {
		const extracted = new Map([
			[
				'index.json',
				JSON.stringify({
					entries: [
						{
							id: 'slack-daily-summary',
							description: 'Daily Slack summary',
							file: 'templates/slack-daily-summary.ts',
							techniques: ['notification'],
						},
					],
				}),
			],
			['slack-daily-summary.ts', 'export default {};'],
		]);

		expect(buildTemplatesIndexFromArchive(extracted)).toEqual({
			entries: [
				{
					id: 'slack-daily-summary',
					description: 'Daily Slack summary',
					file: 'templates/slack-daily-summary.ts',
					techniques: ['notification'],
				},
			],
		});
	});

	it('slims verbose CDN index.json descriptions when building entries', () => {
		const extracted = new Map([
			[
				'index.json',
				JSON.stringify({
					entries: [
						{
							id: 'build-your-first-ai-agent-6270',
							description:
								'Build Your First AI Agent | n8n-nodes-base.stickyNote,@n8n/n8n-nodes-langchain.agent | trigger:chatTrigger,ai | https://n8n.io/workflows/6270',
							file: 'templates/build-your-first-ai-agent-6270.ts',
						},
					],
				}),
			],
			['build-your-first-ai-agent-6270.ts', 'export default {};'],
		]);

		expect(buildTemplatesIndexFromArchive(extracted)).toEqual({
			entries: [
				{
					id: 'build-your-first-ai-agent-6270',
					description: 'Build Your First AI Agent',
					file: 'templates/build-your-first-ai-agent-6270.ts',
				},
			],
		});
	});

	it('converts CDN index.txt into structured entries', () => {
		const extracted = new Map([
			['index.txt', 'example.ts | Example template'],
			['example.ts', 'export default {};'],
		]);

		expect(buildTemplatesIndexFromArchive(extracted)).toEqual({
			entries: [
				{
					id: 'example',
					description: 'Example template',
					file: 'templates/example.ts',
				},
			],
		});
	});

	it('derives entries from template files when no catalog is present', () => {
		const extracted = new Map([
			['alpha.ts', 'export default {};'],
			['beta.ts', 'export default {};'],
		]);

		expect(buildTemplatesIndexFromArchive(extracted)).toEqual({
			entries: [
				{ id: 'alpha', description: 'alpha', file: 'templates/alpha.ts' },
				{ id: 'beta', description: 'beta', file: 'templates/beta.ts' },
			],
		});
	});
});
