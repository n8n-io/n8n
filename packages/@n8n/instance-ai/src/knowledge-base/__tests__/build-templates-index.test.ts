import { buildTemplatesIndexFromArchive } from '../build-templates-index';

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
