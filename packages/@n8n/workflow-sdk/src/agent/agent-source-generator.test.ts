import type { AgentSourceCoreConfig } from './agent-source-artifact';
import { generateAgentSource } from './agent-source-generator';

const DRAFT_CORE: AgentSourceCoreConfig = {
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
};

describe('generateAgentSource', () => {
	it('keeps draft source minimal and editable', () => {
		const source = generateAgentSource(DRAFT_CORE);

		expect(source).toBe(
			"import { agent } from '@n8n/workflow-sdk/agent';\n\n" +
				'export default agent("Draft agent");\n',
		);
		expect(source).not.toContain('.model(');
		expect(source).not.toContain('.instructions(');
	});

	it('emits every source-owned declaration with stable object ordering', () => {
		const source = generateAgentSource({
			...DRAFT_CORE,
			name: 'Support agent',
			model: 'openai/gpt-5.2',
			credential: 'model-credential',
			instructions: 'Triage support requests.',
			memory: { storage: 'n8n', enabled: true },
			subAgents: {
				maxChildren: 3,
				agents: [{ agentId: 'agent-2', useWhen: 'Billing escalation' }],
				modelsByDifficulty: {
					high: { model: 'openai/gpt-5.2', credential: 'model-credential' },
				},
			},
			tools: [
				{
					type: 'node',
					name: 'create_issue',
					description: 'Create an issue',
					node: {
						nodeType: 'n8n-nodes-base.linearTool',
						nodeTypeVersion: 1,
						nodeParameters: { operation: 'create', resource: 'issue' },
						credentials: {
							linearOAuth2Api: { id: 'linear-cred', name: 'Linear account' },
						},
					},
				},
				{ type: 'workflow', workflow: 'workflow-1', name: 'notify_on_call' },
				{ type: 'custom', id: 'lookup_contract' },
			],
			skills: [{ type: 'skill', id: 'support-policy' }],
			providerTools: { 'openai.web_search': { maxUses: 5 } },
			mcpServers: [{ url: 'https://mcp.example.test', name: 'github' }],
			vectorStores: [{ name: 'support_docs', provider: 'pinecone' }],
			config: { maxIterations: 20 },
		});

		expect(source).toContain("import { tool } from '@n8n/workflow-sdk';");
		expect(source).toContain('agent("Support agent")');
		expect(source).toContain(
			'.model({\n    "credential": "model-credential",\n    "id": "openai/gpt-5.2"\n  })',
		);
		expect(source).toContain('"version": 1');
		expect(source).toContain('.tool(workflowTool("workflow-1"');
		expect(source).toContain('.tool(customTool("lookup_contract"))');
		expect(source).toContain('.skill(skillRef("support-policy"))');
		expect(source).toContain('.subAgentSettings(');
		expect(source).toContain('.providerTool("openai.web_search"');
		expect(source).toContain('.mcpServer(');
		expect(source).toContain('.vectorStore(');
		expect(generateAgentSource({ ...DRAFT_CORE, name: 'Support agent' })).toBe(
			generateAgentSource({ ...DRAFT_CORE, name: 'Support agent' }),
		);
	});

	it('preserves an own __proto__ property while canonicalizing objects', () => {
		const source = generateAgentSource({
			...DRAFT_CORE,
			config: Object.fromEntries([['__proto__', 'preserved']]),
		});

		expect(source).toContain('"__proto__": "preserved"');
	});
});
