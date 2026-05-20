import { providerTools } from '../provider-tools';

describe('providerTools', () => {
	it('builds xAI web search provider tool args', () => {
		expect(
			providerTools.xaiWebSearch({
				allowedDomains: ['docs.n8n.io'],
				excludedDomains: ['reddit.com'],
				enableImageUnderstanding: true,
			}),
		).toEqual({
			name: 'xai.web_search',
			args: {
				allowedDomains: ['docs.n8n.io'],
				excludedDomains: ['reddit.com'],
				enableImageUnderstanding: true,
			},
		});
	});
});
