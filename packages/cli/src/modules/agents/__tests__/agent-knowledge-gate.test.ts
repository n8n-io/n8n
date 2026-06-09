import { isAgentKnowledgeBaseEnabled } from '../agent-knowledge-gate';

describe('isAgentKnowledgeBaseEnabled', () => {
	it('requires Daytona sandbox config and a volume id', () => {
		expect(
			isAgentKnowledgeBaseEnabled({
				sandboxEnabled: true,
				sandboxProvider: 'daytona',
				daytonaVolumeId: 'volume-1',
			}),
		).toBe(true);

		expect(
			isAgentKnowledgeBaseEnabled({
				sandboxEnabled: false,
				sandboxProvider: 'daytona',
				daytonaVolumeId: 'volume-1',
			}),
		).toBe(false);
		expect(
			isAgentKnowledgeBaseEnabled({
				sandboxEnabled: true,
				sandboxProvider: 'n8n-sandbox',
				daytonaVolumeId: 'volume-1',
			}),
		).toBe(false);
		expect(
			isAgentKnowledgeBaseEnabled({
				sandboxEnabled: true,
				sandboxProvider: 'daytona',
				daytonaVolumeId: '  ',
			}),
		).toBe(false);
	});
});
