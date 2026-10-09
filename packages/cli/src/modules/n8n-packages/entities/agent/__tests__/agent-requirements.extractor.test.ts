import {
	AI_GATEWAY_MANAGED_TAG,
	MANAGED_CREDENTIAL_TOKEN,
	type AgentJsonConfig,
	type AgentJsonNodeToolConfig,
} from '@n8n/api-types';

import { looseAgentsFixture } from '../../../__tests__/fixtures/agent-package-fixtures';
import { serializedAgentSchema } from '../../../spec/serialized/agent.schema';
import { CredentialRequirementsExtractor } from '../../credential/credential-requirements.extractor';
import type { PreparedAgentExport } from '../agent-export.types';
import { AgentRequirementsExtractor } from '../agent-requirements.extractor';
import { AgentSerializer } from '../agent.serializer';
import { collectNodeTypeUsage } from '../../workflow/node-type-usage';
import { DataTableRequirementsExtractor } from '../../data-table/data-table-requirements.extractor';
import { VariableRequirementsExtractor } from '../../variable/variable-requirements.extractor';

const extractor = new AgentRequirementsExtractor(
	new CredentialRequirementsExtractor(),
	new DataTableRequirementsExtractor(),
	new VariableRequirementsExtractor(),
);
const source = { agentId: 'support_source', projectId: 'source-project' };

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
	it('attributes authored and supported node references without scanning opaque inputs', () => {
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
				workflow: 'Display name',
				workflowId: 'other-id',
				inputs: {
					data: {
						mode: 'fixed',
						value: { credential: 'opaque-workflow-input', text: '$vars.OPAQUE' },
					},
				},
			},
		];
		const snapshot = prepare({
			name: 'Support',
			model: 'openai/gpt-4o',
			credential: 'model-credential',
			instructions: '',
			integrations: [{ type: 'slack', credentialId: 'shared-credential' }],
			tools: [
				...workflowTools,
				nodeTool,
				{ ...nodeTool, name: 'Fetch again' },
				{
					type: 'node',
					name: 'Table',
					enabled: false,
					node: {
						nodeType: 'n8n-nodes-base.dataTable',
						nodeTypeVersion: 1,
						nodeParameters: { dataTableId: { __rl: true, mode: 'list', value: 'customers' } },
					},
				},
				{
					type: 'node',
					name: 'Workflow',
					enabled: false,
					node: {
						nodeType: 'n8n-nodes-base.executeWorkflow',
						nodeTypeVersion: 1,
						nodeParameters: { workflowId: { __rl: true, mode: 'list', value: 'lookup-id' } },
					},
				},
			],
			subAgents: { agents: [{ agentId: 'child', enabled: false }, { agentId: 'child' }] },
			providerTools: { search: { credentialId: 'opaque-provider-input' } },
		});
		const before = structuredClone(snapshot);

		const result = extractor.extract(snapshot);
		expect(result).toMatchObject({
			credentials: [
				{ ...source, credentialId: 'model-credential' },
				{
					...source,
					credentialId: 'shared-credential',
					credentialName: 'Header account',
					credentialType: 'httpHeaderAuth',
				},
				{ ...source, credentialId: 'typed-credential', credentialType: 'httpBasicAuth' },
			],
			dataTables: [{ ...source, dataTableId: 'customers' }],
			variables: [{ ...source, variableName: 'TEST' }],
			workflows: [
				{ ...source, referencedWorkflowId: 'lookup-id', origin: 'top-level' },
				{ ...source, referencedWorkflowId: 'other-id', origin: 'top-level' },
			],
			tags: [],
			nodeTypes: [
				{
					...source,
					nodes: [
						{ type: 'n8n-nodes-base.httpRequest', typeVersion: 4 },
						{ type: 'n8n-nodes-base.httpRequest', typeVersion: 4 },
						{ type: 'n8n-nodes-base.dataTable', typeVersion: 1 },
						{ type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1 },
					],
				},
			],
			agentIds: ['child'],
		});
		expect(
			collectNodeTypeUsage([
				...result.nodeTypes,
				{
					workflowId: source.agentId,
					nodes: [{ type: 'n8n-nodes-base.httpRequest', typeVersion: 4 }],
				},
			]),
		).toEqual([
			{
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				usedBy: [
					{ kind: 'workflow', id: source.agentId },
					{ kind: 'agent', id: source.agentId },
				],
			},
			{
				type: 'n8n-nodes-base.dataTable',
				typeVersion: 1,
				usedBy: [{ kind: 'agent', id: source.agentId }],
			},
			{
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1,
				usedBy: [{ kind: 'agent', id: source.agentId }],
			},
		]);
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

	it('rejects a workflow tool without an ID', () => {
		const snapshot = prepare({
			name: 'Draft',
			model: '',
			credential: '',
			instructions: '',
			tools: [{ type: 'workflow', workflow: 'Lookup' }],
		});
		expect(() => extractor.extract(snapshot)).toThrow(
			'Agent "support_source" workflow tool "Lookup" has no workflow ID',
		);
	});

	it('returns no references for a null configuration', () => {
		expect(extractor.extract(prepare(null))).toEqual({
			credentials: [],
			workflows: [],
			dataTables: [],
			variables: [],
			tags: [],
			nodeTypes: [],
			agentIds: [],
		});
	});
});
