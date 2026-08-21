import type { AgentJsonConfig, ExportedAgentJsonConfig } from '@n8n/api-types';

import { getAgentConfigHash } from '../agent-config-hash';

const bareConfig: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
	tasks: [{ type: 'task', id: 'weekly_review', enabled: true }],
	skills: [{ type: 'skill', id: 'summarize_thread' }],
	tools: [{ type: 'custom', id: 'my_tool', requireApproval: true }],
};

describe('getAgentConfigHash', () => {
	it('returns null for a null config', () => {
		expect(getAgentConfigHash(null)).toBeNull();
	});

	// Exported configs inline task/skill/custom-tool definition bodies on their
	// refs; the persisted schema keeps only bare refs. Both shapes describe the
	// same agent, so they must hash identically — MCP mutations compare hashes
	// taken from both sources to detect stale configs.
	it('hashes a config with inlined definition bodies the same as its bare-ref form', () => {
		const hydratedConfig: ExportedAgentJsonConfig = {
			...bareConfig,
			tasks: [
				{
					type: 'task',
					id: 'weekly_review',
					enabled: true,
					name: 'Weekly review',
					objective: 'Summarise the week',
					cronExpression: '0 9 * * 1',
				},
			],
			skills: [
				{
					type: 'skill',
					id: 'summarize_thread',
					name: 'Summarize thread',
					description: 'Summarise long threads',
					instructions: 'Read the thread and summarise it.',
				},
			],
			tools: [
				{
					type: 'custom',
					id: 'my_tool',
					requireApproval: true,
					code: 'export default new Tool("my_tool")',
				},
			],
		};

		expect(getAgentConfigHash(hydratedConfig)).toBe(getAgentConfigHash(bareConfig));
	});

	it('changes when a ref itself changes', () => {
		const changed: AgentJsonConfig = {
			...bareConfig,
			tasks: [{ type: 'task', id: 'weekly_review', enabled: false }],
		};

		expect(getAgentConfigHash(changed)).not.toBe(getAgentConfigHash(bareConfig));
	});
});
