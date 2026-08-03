import type { AgentJsonToolConfig, AiGatewayConfigDto } from '@n8n/api-types';
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { NodeTypes } from '@/node-types';

import { reconcileNodeToolGatewayCredentials } from '../reconcile-node-tool-gateway-credentials';

const GATEWAY_CONFIG = {
	nodes: ['n8n-nodes-base.slack'],
	credentialTypes: ['slackApi'],
	providerConfig: {},
} as unknown as AiGatewayConfigDto;

const SENTINEL = { id: null, name: 'n8n credits', __aiGatewayManaged: true };

function nodeTypesWithCredentials(credentialNames: string[]): NodeTypes {
	const nodeTypes = mock<NodeTypes>();
	nodeTypes.getByNameAndVersion.mockReturnValue({
		description: {
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
		} as INodeTypeDescription,
	} as INodeType);
	return nodeTypes;
}

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
