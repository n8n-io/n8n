import type { AgentJsonConfig } from '@n8n/api-types';

import { agentConfigToSourceCore, generateSourceFromAgentConfig } from '../agent-source-generation';

describe('agent source generation', () => {
	it('serializes only source-owned fields and applies editable draft defaults', () => {
		const config: AgentJsonConfig = {
			name: 'Draft agent',
			model: '',
			instructions: '',
			integrations: [{ type: 'slack', credentialId: 'slack-cred' }],
			tasks: [{ type: 'task', id: 'task-1', enabled: true }],
			personalisation: {
				icon: 'bot',
				gradient: {
					from: '#111111',
					to: '#222222',
					angle: 135,
					fromStop: 0,
					toStop: 100,
				},
			},
		};

		expect(agentConfigToSourceCore(config)).toEqual({
			name: 'Draft agent',
			model: '',
			credential: '',
			instructions: '',
			memory: { enabled: false, storage: 'n8n' },
			subAgents: { agents: [] },
			tools: [],
			skills: [],
			providerTools: {},
			mcpServers: [],
			vectorStores: [],
			config: {},
		});
		expect(generateSourceFromAgentConfig(config)).not.toContain('slack');
		expect(generateSourceFromAgentConfig(config)).not.toContain('task-1');
	});

	it('normalizes legacy empty workflow names and duplicate sub-agent refs', () => {
		const config: AgentJsonConfig = {
			name: 'Legacy agent',
			model: '',
			instructions: '',
			tools: [{ type: 'workflow', workflow: 'workflow-1', name: '' }],
			subAgents: {
				agents: [
					{ agentId: 'agent-2', useWhen: 'First declaration' },
					{ agentId: 'agent-2', useWhen: 'Duplicate declaration' },
				],
			},
		};

		expect(agentConfigToSourceCore(config)).toMatchObject({
			tools: [{ type: 'workflow', workflow: 'workflow-1' }],
			subAgents: { agents: [{ agentId: 'agent-2', useWhen: 'First declaration' }] },
		});
		expect(generateSourceFromAgentConfig(config)).toContain('.tool(workflowTool("workflow-1"))');
	});

	it('round-trips first-class Episodic Memory into source', () => {
		const memory = {
			enabled: true,
			storage: 'n8n' as const,
			observationalMemory: { enabled: true },
			episodicMemory: { enabled: true as const, credential: 'managed', topK: 8 },
		};
		const config: AgentJsonConfig = {
			name: 'Memory agent',
			model: '',
			instructions: '',
			memory,
		};

		expect(agentConfigToSourceCore(config).memory).toEqual(memory);
		const source = generateSourceFromAgentConfig(config);
		expect(source).toContain('.memory({');
		expect(source).toContain('"episodicMemory"');
		expect(source).toContain('"credential": "managed"');
	});
});
