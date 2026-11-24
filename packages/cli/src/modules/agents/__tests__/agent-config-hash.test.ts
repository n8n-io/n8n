import type { AgentJsonConfig } from '@n8n/api-types';
import { getAgentRuntimeDefinitionHash } from '../utils/agent-config-hash';

const config: AgentJsonConfig = {
	name: 'Reviewer',
	model: 'anthropic/test',
	instructions: 'Review changes',
};

describe('Agent runtime definition hash', () => {
	it('ignores object key order, including in nested tool input bindings', () => {
		const workflow = { type: 'workflow', workflow: 'Send' } as const;
		expect(
			getAgentRuntimeDefinitionHash(
				{
					...config,
					tools: [{ ...workflow, inputs: { target: { mode: 'ai', description: 'To' } } }],
				},
				{ first: 'a', second: 'b' },
			),
		).toBe(
			getAgentRuntimeDefinitionHash(
				{
					instructions: config.instructions,
					model: config.model,
					name: config.name,
					tools: [{ ...workflow, inputs: { target: { description: 'To', mode: 'ai' } } }],
				},
				{ second: 'b', first: 'a' },
			),
		);
	});

	it('still invalidates an approval when tool code changes', () => {
		const hash = getAgentRuntimeDefinitionHash(config);
		expect(getAgentRuntimeDefinitionHash(config, { write: 'changed' })).not.toBe(hash);
	});

	it('ignores unrelated live integrations but invalidates a disconnected approval destination', () => {
		const routedConfig: AgentJsonConfig = {
			...config,
			tools: [
				{
					type: 'workflow',
					workflow: 'Send',
					requireApproval: true,
					approvalRoute: { type: 'configuration', configurationIds: ['review'] },
				},
			],
			hitlConfigurations: [
				{
					id: 'review',
					name: 'Review',
					method: 'channel',
					channel: 'slack',
					credentialId: 'credential',
					recipient: { kind: 'channel', id: 'C1' },
				},
			],
		};
		const connected = { type: 'slack', credentialId: 'credential' } as const;
		const hash = getAgentRuntimeDefinitionHash(routedConfig, {}, [connected]);
		expect(
			getAgentRuntimeDefinitionHash(routedConfig, {}, [
				{ type: 'slack', credentialId: 'unrelated' },
				connected,
			]),
		).toBe(hash);
		expect(getAgentRuntimeDefinitionHash(routedConfig)).not.toBe(hash);
	});
});
