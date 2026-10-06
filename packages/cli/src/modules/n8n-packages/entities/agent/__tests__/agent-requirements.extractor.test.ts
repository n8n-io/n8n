import {
	AI_GATEWAY_MANAGED_TAG,
	MANAGED_CREDENTIAL_TOKEN,
	type AgentJsonConfig,
	type AgentJsonNodeToolConfig,
} from '@n8n/api-types';

import { looseAgentsFixture } from '../../../__tests__/fixtures/agent-package-fixtures';
import { serializedAgentSchema } from '../../../spec/serialized/agent.schema';
import type { PreparedAgentExport } from '../agent-export.types';
import { AgentRequirementsExtractor } from '../agent-requirements.extractor';
import { AgentSerializer } from '../agent.serializer';

const extractor = new AgentRequirementsExtractor();

function prepare(config: AgentJsonConfig | null): PreparedAgentExport {
	const source = serializedAgentSchema.parse(
		looseAgentsFixture().files['agents/support/agent.json'],
	);
	return {
		projectId: 'source-project',
		content: new AgentSerializer().serialize(
			source,
			{
				schema: config,
				skills: source.skills,
				tools: source.tools,
				tasks: new Map(Object.entries(source.tasks)),
			},
			config?.integrations ?? [],
		),
		metadata: { versionId: null, publishedVersionId: null },
	};
}

describe('AgentRequirementsExtractor', () => {
	it('attributes references, deduplicates credentials, and keeps unresolved tool definitions', () => {
		const nodeTool: AgentJsonNodeToolConfig = {
			type: 'node',
			name: 'Fetch',
			enabled: false,
			node: {
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeTypeVersion: 4,
				nodeParameters: {
					credentialId: 'opaque-node-input',
					workflowId: 'opaque-workflow',
					expression: '={{ $vars.TEST }}',
				},
				credentials: {
					httpHeaderAuth: { id: 'shared-credential', name: 'Header account' },
					httpBasicAuth: { id: 'typed-credential', name: '' },
				},
			},
		};
		const workflowTools: NonNullable<AgentJsonConfig['tools']> = [
			{ type: 'workflow', workflow: 'Lookup', workflowId: 'lookup-id', enabled: false },
			{
				type: 'workflow',
				workflow: 'Resolve by name',
				inputs: { data: { mode: 'fixed', value: { credential: 'opaque-workflow-input' } } },
			},
		];
		const snapshot = prepare({
			name: 'Support',
			model: 'openai/gpt-4o',
			credential: 'model-credential',
			instructions: '',
			integrations: [{ type: 'slack', credentialId: 'shared-credential' }],
			tools: [...workflowTools, nodeTool, { ...nodeTool, name: 'Fetch again' }],
			subAgents: { agents: [{ agentId: 'child', enabled: false }, { agentId: 'child' }] },
			providerTools: { search: { credentialId: 'opaque-provider-input' } },
		});
		const before = structuredClone(snapshot);

		expect(extractor.extract(snapshot)).toEqual({
			agentId: 'support_source',
			projectId: 'source-project',
			credentials: [
				{ credentialId: 'model-credential' },
				{
					credentialId: 'shared-credential',
					credentialName: 'Header account',
					credentialType: 'httpHeaderAuth',
				},
				{ credentialId: 'typed-credential', credentialType: 'httpBasicAuth' },
			],
			workflowTools,
			agentIds: ['child'],
			nodeTools: [nodeTool, { ...nodeTool, name: 'Fetch again' }],
		});
		expect(snapshot).toEqual(before);
	});

	it.each([AI_GATEWAY_MANAGED_TAG, MANAGED_CREDENTIAL_TOKEN, ''])(
		'preserves marker %j in the package and excludes it from credential requirements',
		(credential) => {
			const snapshot = prepare({
				name: 'Managed model',
				model: 'openai/gpt-4o',
				credential,
				instructions: '',
				tools: [
					{
						type: 'node',
						name: 'Model',
						node: {
							nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							nodeTypeVersion: 1,
							nodeParameters: {},
							credentials: { openAiApi: { id: null, name: '', __aiGatewayManaged: true } },
						},
					},
				],
			});
			expect(extractor.extract(snapshot).credentials).toEqual([]);
			expect(snapshot.content.config).toMatchObject({
				credential,
				tools: [
					{
						node: { credentials: { openAiApi: { id: null, name: '', __aiGatewayManaged: true } } },
					},
				],
			});
		},
	);

	it('returns no references for a null configuration', () => {
		expect(extractor.extract(prepare(null))).toEqual({
			agentId: 'support_source',
			projectId: 'source-project',
			credentials: [],
			workflowTools: [],
			agentIds: [],
			nodeTools: [],
		});
	});
});
