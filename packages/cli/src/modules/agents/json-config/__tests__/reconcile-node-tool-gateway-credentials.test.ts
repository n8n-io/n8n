import type { AgentJsonToolConfig, AiGatewayConfigDto } from '@n8n/api-types';
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';

import { reconcileNodeToolGatewayCredentials } from '../reconcile-node-tool-gateway-credentials';

const GATEWAY_CONFIG = {
	nodes: ['n8n-nodes-base.slack'],
	credentialTypes: ['slackApi'],
	providerConfig: {},
} as unknown as AiGatewayConfigDto;

const SERVICE_GATEWAY_CONFIG = {
	nodes: ['n8n-nodes-base.service'],
	credentialTypes: ['serviceApiKey'],
	providerConfig: {},
} as unknown as AiGatewayConfigDto;

const SENTINEL = { id: null, name: 'n8n credits', __aiGatewayManaged: true } as const;

function nodeTypesWithDescription(description: INodeTypeDescription): NodeTypes {
	const nodeTypes = mock<NodeTypes>();
	nodeTypes.getByNameAndVersion.mockReturnValue({ description } as INodeType);
	return nodeTypes;
}

function nodeTypesWithCredentials(credentialNames: string[]): NodeTypes {
	return nodeTypesWithDescription({
		displayName: 'x',
		name: 'x',
		group: [],
		version: 1,
		description: '',
		defaults: {},
		inputs: [],
		outputs: [],
		properties: [],
		credentials: credentialNames.map((name) => ({ name })),
	} as INodeTypeDescription);
}

const multiAuthNodeDescription = {
	displayName: 'Service',
	name: 'n8n-nodes-base.service',
	group: [],
	version: 1,
	description: '',
	defaults: {},
	inputs: [],
	outputs: [],
	credentials: [
		{ name: 'serviceOAuth2Api', displayOptions: { show: { authentication: ['oAuth2'] } } },
		{ name: 'serviceApiKey', displayOptions: { show: { authentication: ['apiKey'] } } },
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{ name: 'OAuth2', value: 'oAuth2' },
				{ name: 'API Key', value: 'apiKey' },
			],
			default: 'oAuth2',
		},
	],
} as INodeTypeDescription;

function nodeTool(
	nodeType: string,
	credentials?: Extract<AgentJsonToolConfig, { type: 'node' }>['node']['credentials'],
): Extract<AgentJsonToolConfig, { type: 'node' }> {
	return {
		type: 'node',
		name: 'Tool',
		node: { nodeType, nodeTypeVersion: 1, nodeParameters: {}, credentials },
	};
}

describe('reconcileNodeToolGatewayCredentials', () => {
	it('auto-assigns the managed credential to a covered, empty, required slot', () => {
		const tools = [nodeTool('n8n-nodes-base.slackTool')];
		reconcileNodeToolGatewayCredentials(
			tools,
			nodeTypesWithCredentials(['slackApi']),
			GATEWAY_CONFIG,
		);
		expect(tools[0].node.credentials).toEqual({ slackApi: SENTINEL });
	});

	it('leaves a real credential untouched (BYOK wins)', () => {
		const tools = [
			nodeTool('n8n-nodes-base.slackTool', { slackApi: { id: 'c1', name: 'My Slack' } }),
		];
		reconcileNodeToolGatewayCredentials(
			tools,
			nodeTypesWithCredentials(['slackApi']),
			GATEWAY_CONFIG,
		);
		expect(tools[0].node.credentials).toEqual({ slackApi: { id: 'c1', name: 'My Slack' } });
	});

	it('does not assign for a service the gateway does not cover', () => {
		const tools = [nodeTool('n8n-nodes-base.notionTool')];
		reconcileNodeToolGatewayCredentials(
			tools,
			nodeTypesWithCredentials(['notionApi']),
			GATEWAY_CONFIG,
		);
		expect(tools[0].node.credentials).toBeUndefined();
	});

	it('switches auth to a supported sibling credential type when the displayed type is unsupported', () => {
		const tools = [nodeTool('n8n-nodes-base.serviceTool')];

		reconcileNodeToolGatewayCredentials(
			tools,
			nodeTypesWithDescription(multiAuthNodeDescription),
			SERVICE_GATEWAY_CONFIG,
		);

		expect(tools[0].node.credentials).toEqual({ serviceApiKey: SENTINEL });
		expect(tools[0].node.nodeParameters).toEqual({ authentication: 'apiKey' });
	});

	it('switches auth while preserving unrelated parameters when the auth selector relies on its default', () => {
		const tools = [nodeTool('n8n-nodes-base.serviceTool')];
		tools[0].node.nodeParameters = { operation: 'split' };

		reconcileNodeToolGatewayCredentials(
			tools,
			nodeTypesWithDescription({
				...multiAuthNodeDescription,
				properties: [
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [{ name: 'Split', value: 'split' }],
						default: 'split',
					},
					...multiAuthNodeDescription.properties,
				],
			}),
			SERVICE_GATEWAY_CONFIG,
		);

		expect(tools[0].node.credentials).toEqual({ serviceApiKey: SENTINEL });
		expect(tools[0].node.nodeParameters).toEqual({
			operation: 'split',
			authentication: 'apiKey',
		});
	});

	it('does not rewrite an auth parameter that already activates the supported credential', () => {
		const tools = [nodeTool('n8n-nodes-base.serviceTool')];
		tools[0].node.nodeParameters = { authentication: 'apiKeyLegacy' };

		reconcileNodeToolGatewayCredentials(
			tools,
			nodeTypesWithDescription({
				...multiAuthNodeDescription,
				credentials: [
					{
						name: 'serviceApiKey',
						displayOptions: { show: { authentication: ['apiKey', 'apiKeyLegacy'] } },
					},
				],
			}),
			SERVICE_GATEWAY_CONFIG,
		);

		expect(tools[0].node.credentials).toEqual({ serviceApiKey: SENTINEL });
		expect(tools[0].node.nodeParameters).toEqual({ authentication: 'apiKeyLegacy' });
	});

	it('deletes an inbound managed marker on an uncovered slot (trust gate)', () => {
		const tools = [nodeTool('n8n-nodes-base.notionTool', { notionApi: { ...SENTINEL } })];
		reconcileNodeToolGatewayCredentials(
			tools,
			nodeTypesWithCredentials(['notionApi']),
			GATEWAY_CONFIG,
		);
		expect(tools[0].node.credentials).toEqual({});
	});

	it('canonicalizes an eligible managed marker, dropping smuggled fields', () => {
		const tools = [
			nodeTool('n8n-nodes-base.slackTool', {
				slackApi: { id: null, name: 'hacked', __aiGatewayManaged: true },
			}),
		];
		reconcileNodeToolGatewayCredentials(
			tools,
			nodeTypesWithCredentials(['slackApi']),
			GATEWAY_CONFIG,
		);
		expect(tools[0].node.credentials).toEqual({ slackApi: SENTINEL });
	});

	it('drops all managed markers when no gateway config is available', () => {
		const tools = [nodeTool('n8n-nodes-base.slackTool', { slackApi: { ...SENTINEL } })];
		reconcileNodeToolGatewayCredentials(tools, nodeTypesWithCredentials(['slackApi']), undefined);
		expect(tools[0].node.credentials).toEqual({});
	});

	it('drops managed markers when the node type cannot be resolved', () => {
		const nodeTypes = mock<NodeTypes>();
		nodeTypes.getByNameAndVersion.mockImplementation(() => {
			throw new Error('unknown node type');
		});
		const tools = [nodeTool('n8n-nodes-base.slackTool', { slackApi: { ...SENTINEL } })];
		reconcileNodeToolGatewayCredentials(tools, nodeTypes, GATEWAY_CONFIG);
		expect(tools[0].node.credentials).toEqual({});
	});
});
