import { fromAi, node, tool } from '../index';
import {
	AgentSourceArtifactV1Schema,
	agent,
	customTool,
	skillRef,
	workflowTool,
	type AgentMemoryConfig,
} from './index';

describe('AgentDefinitionBuilder', () => {
	it('converts the source declarations into a versioned artifact', () => {
		const memory: AgentMemoryConfig = {
			enabled: true,
			storage: 'n8n',
			observationalMemory: { enabled: true },
			episodicMemory: {
				enabled: true,
				credential: 'managed',
				topK: 12,
				maxEntriesPerRun: 4,
			},
		};
		const createIssue = tool({
			type: 'n8n-nodes-base.linearTool',
			version: 1,
			config: {
				parameters: {
					resource: 'issue',
					operation: 'create',
					title: fromAi('title', 'A concise issue title'),
				},
				credentials: {
					linearOAuth2Api: { id: 'credential-id', name: 'Linear account' },
				},
			},
		});

		const artifact = agent('Support triage')
			.model({ id: 'openai/gpt-5.2', credential: 'model-credential-id' })
			.instructions('Triage support requests.')
			.tool(createIssue, {
				name: 'create_linear_issue',
				description: 'Create a Linear issue',
				requireApproval: true,
			})
			.tool(workflowTool('workflow-id', { name: 'notify_on_call', allOutputs: true }))
			.tool(customTool('lookup_contract', { requireApproval: true }))
			.skill(skillRef('support-policy'))
			.subAgent({ agentId: 'published-agent-id', useWhen: 'Escalation is needed' })
			.memory(memory)
			.providerTool('openai.web_search', { maxUses: 4 })
			.mcpServer({ name: 'github', url: 'https://mcp.example.test' })
			.vectorStore({
				provider: 'pinecone',
				name: 'support_docs',
				credential: 'pinecone-credential',
				useWhen: 'The answer may be in support docs',
				embedding: { model: 'openai/text-embedding-3-small', credential: 'embedding-cred' },
				indexName: 'support',
			})
			.configuration({ maxIterations: 20 })
			.toAgentSource();

		expect(AgentSourceArtifactV1Schema.parse(artifact)).toEqual(artifact);
		expect(artifact).toMatchObject({
			kind: 'n8n-agent-source',
			version: 1,
			warnings: [],
			core: {
				name: 'Support triage',
				model: 'openai/gpt-5.2',
				credential: 'model-credential-id',
				instructions: 'Triage support requests.',
				tools: [
					{
						type: 'node',
						name: 'create_linear_issue',
						description: 'Create a Linear issue',
						requireApproval: true,
						node: {
							nodeType: 'n8n-nodes-base.linearTool',
							nodeTypeVersion: 1,
							credentials: {
								linearOAuth2Api: { id: 'credential-id', name: 'Linear account' },
							},
						},
					},
					{ type: 'workflow', workflow: 'workflow-id', name: 'notify_on_call' },
					{ type: 'custom', id: 'lookup_contract', requireApproval: true },
				],
				skills: [{ type: 'skill', id: 'support-policy' }],
				subAgents: {
					agents: [{ agentId: 'published-agent-id', useWhen: 'Escalation is needed' }],
				},
				providerTools: { 'openai.web_search': { maxUses: 4 } },
				memory,
				config: { maxIterations: 20 },
			},
		});
	});

	it('emits explicit empty source-owned fields for a draft', () => {
		expect(agent('Draft agent').toAgentSource().core).toEqual({
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
	});

	it('rejects a regular node instance', () => {
		const regularNode = node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: { parameters: {} },
		});

		expect(() => agent('Invalid').tool(regularNode as never, { name: 'set_values' })).toThrow(
			'must be created with the workflow SDK tool() factory',
		);
	});

	it('rejects workflow-only node configuration fields', () => {
		const configuredTool = tool({
			type: 'n8n-nodes-base.linearTool',
			version: 1,
			config: { parameters: {}, retryOnFail: true },
		});

		expect(() => agent('Invalid').tool(configuredTool, { name: 'linear' })).toThrow(
			'workflow-only config fields: retryOnFail',
		);
	});

	it('rejects unresolved workflow SDK credential values', () => {
		const configuredTool = tool({
			type: 'n8n-nodes-base.linearTool',
			version: 1,
			config: { parameters: {}, credentials: { linearOAuth2Api: 'credential-id' } },
		});

		expect(() => agent('Invalid').tool(configuredTool, { name: 'linear' })).toThrow(
			'credential "linearOAuth2Api" must use an explicit { id, name } reference',
		);
	});

	it('rejects duplicate provider-facing tool names', () => {
		expect(() =>
			agent('Invalid')
				.tool(customTool('search_support_docs'))
				.vectorStore({ name: 'support_docs' }),
		).toThrow('Duplicate Agent tool name: "search_support_docs"');
	});

	it('rejects workflow names that collide after runtime sanitization', () => {
		expect(() =>
			agent('Invalid')
				.tool(workflowTool('workflow-1', { name: 'D&D Invite' }))
				.tool(workflowTool('workflow-2', { name: 'd-d-invite' })),
		).toThrow('Duplicate Agent tool name: "d-d-invite"');
	});

	it('allows the same workflow to be exposed with distinct tool names', () => {
		const artifact = agent('Workflow aliases')
			.tool(workflowTool('workflow-id', { name: 'notify_primary' }))
			.tool(workflowTool('workflow-id', { name: 'notify_backup' }))
			.toAgentSource();

		expect(artifact.core.tools).toHaveLength(2);
	});

	it('rejects executable values at the artifact boundary', () => {
		const artifact = agent('Invalid').toAgentSource();

		expect(
			AgentSourceArtifactV1Schema.safeParse({
				...artifact,
				core: { ...artifact.core, config: { callback: () => 'not serializable' } },
			}).success,
		).toBe(false);
	});
});
