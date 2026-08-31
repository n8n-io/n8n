import type { AgentJsonNodeToolConfig, AgentJsonToolConfig } from '@n8n/api-types';
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';

import { reconcileNodeToolMocks } from '../reconcile-node-tool-mocks';

function nodeTypesWithDescription(description: INodeTypeDescription): NodeTypes {
	const nodeTypes = mock<NodeTypes>();
	nodeTypes.getByNameAndVersion.mockReturnValue({ description } as INodeType);
	return nodeTypes;
}

const oneRequiredCredentialDescription: INodeTypeDescription = {
	displayName: 'Slack Tool',
	name: 'n8n-nodes-base.slackTool',
	group: [],
	version: 1,
	description: '',
	defaults: {},
	inputs: [],
	outputs: [],
	properties: [],
	credentials: [{ name: 'slackApi' }],
};

const twoRequiredCredentialsDescription: INodeTypeDescription = {
	...oneRequiredCredentialDescription,
	credentials: [{ name: 'slackApi' }, { name: 'slackAppApi' }],
};

const noCredentialsDescription: INodeTypeDescription = {
	...oneRequiredCredentialDescription,
	credentials: [],
};

function nodeTool(
	name: string,
	overrides: Partial<AgentJsonNodeToolConfig['node']> = {},
	mock_?: AgentJsonNodeToolConfig['mock'],
): AgentJsonNodeToolConfig {
	return {
		type: 'node',
		name,
		node: {
			nodeType: 'n8n-nodes-base.slackTool',
			nodeTypeVersion: 1,
			nodeParameters: {},
			...overrides,
		},
		...(mock_ ? { mock: mock_ } : {}),
	};
}

const mockConfig = (
	overrides: Partial<NonNullable<AgentJsonNodeToolConfig['mock']>> = {},
): NonNullable<AgentJsonNodeToolConfig['mock']> => ({
	enabled: true,
	items: [{ ok: true }],
	...overrides,
});

describe('reconcileNodeToolMocks', () => {
	it('unmocks on the empty -> filled transition (no previous tool = empty)', () => {
		const tools: AgentJsonToolConfig[] = [
			nodeTool('Slack', { credentials: { slackApi: { id: 'c1', name: 'Slack' } } }, mockConfig()),
		];

		reconcileNodeToolMocks(
			tools,
			undefined,
			nodeTypesWithDescription(oneRequiredCredentialDescription),
		);

		expect((tools[0] as AgentJsonNodeToolConfig).mock).toEqual({
			enabled: false,
			items: [{ ok: true }],
		});
	});

	it('unmocks when the previous config had the same tool with an empty slot', () => {
		const previousTools: AgentJsonToolConfig[] = [nodeTool('Slack', {}, mockConfig())];
		const tools: AgentJsonToolConfig[] = [
			nodeTool('Slack', { credentials: { slackApi: { id: 'c1', name: 'Slack' } } }, mockConfig()),
		];

		reconcileNodeToolMocks(
			tools,
			previousTools,
			nodeTypesWithDescription(oneRequiredCredentialDescription),
		);

		expect((tools[0] as AgentJsonNodeToolConfig).mock?.enabled).toBe(false);
	});

	it('is a no-op when the tool was already fully configured before this write', () => {
		const previousTools: AgentJsonToolConfig[] = [
			nodeTool('Slack', { credentials: { slackApi: { id: 'c1', name: 'Slack' } } }, mockConfig()),
		];
		const tools: AgentJsonToolConfig[] = [
			nodeTool(
				'Slack',
				{ credentials: { slackApi: { id: 'c1', name: 'Slack' } } },
				mockConfig({ enabled: true }),
			),
		];

		reconcileNodeToolMocks(
			tools,
			previousTools,
			nodeTypesWithDescription(oneRequiredCredentialDescription),
		);

		// Still filled before and after -> not a transition, so a manual
		// re-enable after the first auto-unmock is respected on later writes.
		expect((tools[0] as AgentJsonNodeToolConfig).mock?.enabled).toBe(true);
	});

	it('does not unmock a tool whose mock is already disabled', () => {
		const tools: AgentJsonToolConfig[] = [
			nodeTool(
				'Slack',
				{ credentials: { slackApi: { id: 'c1', name: 'Slack' } } },
				mockConfig({ enabled: false }),
			),
		];

		reconcileNodeToolMocks(
			tools,
			undefined,
			nodeTypesWithDescription(oneRequiredCredentialDescription),
		);

		expect((tools[0] as AgentJsonNodeToolConfig).mock?.enabled).toBe(false);
	});

	it('does not unmock when the required slot is still empty', () => {
		const tools: AgentJsonToolConfig[] = [nodeTool('Slack', {}, mockConfig())];

		reconcileNodeToolMocks(
			tools,
			undefined,
			nodeTypesWithDescription(oneRequiredCredentialDescription),
		);

		expect((tools[0] as AgentJsonNodeToolConfig).mock?.enabled).toBe(true);
	});

	it('does not unmock when only some of several required slots are filled (partial fill)', () => {
		const tools: AgentJsonToolConfig[] = [
			nodeTool('Slack', { credentials: { slackApi: { id: 'c1', name: 'Slack' } } }, mockConfig()),
		];

		reconcileNodeToolMocks(
			tools,
			undefined,
			nodeTypesWithDescription(twoRequiredCredentialsDescription),
		);

		expect((tools[0] as AgentJsonNodeToolConfig).mock?.enabled).toBe(true);
	});

	it('unmocks once every required slot is filled', () => {
		const tools: AgentJsonToolConfig[] = [
			nodeTool(
				'Slack',
				{
					credentials: {
						slackApi: { id: 'c1', name: 'Slack' },
						slackAppApi: { id: 'c2', name: 'Slack App' },
					},
				},
				mockConfig(),
			),
		];

		reconcileNodeToolMocks(
			tools,
			undefined,
			nodeTypesWithDescription(twoRequiredCredentialsDescription),
		);

		expect((tools[0] as AgentJsonNodeToolConfig).mock?.enabled).toBe(false);
	});

	it('does not treat a Gateway-credits managed marker as a real credential', () => {
		const tools: AgentJsonToolConfig[] = [
			nodeTool(
				'Slack',
				{
					credentials: {
						slackApi: { id: null, name: 'Gateway credits', __aiGatewayManaged: true },
					},
				},
				mockConfig(),
			),
		];

		reconcileNodeToolMocks(
			tools,
			undefined,
			nodeTypesWithDescription(oneRequiredCredentialDescription),
		);

		expect((tools[0] as AgentJsonNodeToolConfig).mock?.enabled).toBe(true);
	});

	it('is a no-op for a node type with no required credential slots', () => {
		const tools: AgentJsonToolConfig[] = [nodeTool('Slack', {}, mockConfig())];

		reconcileNodeToolMocks(tools, undefined, nodeTypesWithDescription(noCredentialsDescription));

		expect((tools[0] as AgentJsonNodeToolConfig).mock?.enabled).toBe(true);
	});

	it('is a no-op when the node type cannot be resolved', () => {
		const nodeTypes = mock<NodeTypes>();
		nodeTypes.getByNameAndVersion.mockImplementation(() => {
			throw new Error('unknown node type');
		});
		const tools: AgentJsonToolConfig[] = [
			nodeTool('Slack', { credentials: { slackApi: { id: 'c1', name: 'Slack' } } }, mockConfig()),
		];

		reconcileNodeToolMocks(tools, undefined, nodeTypes);

		expect((tools[0] as AgentJsonNodeToolConfig).mock?.enabled).toBe(true);
	});

	it('ignores non-node tools and a missing tools array', () => {
		const customTool: AgentJsonToolConfig = { type: 'custom', id: 'my_tool' };
		const nodeTypes = nodeTypesWithDescription(oneRequiredCredentialDescription);

		expect(() => reconcileNodeToolMocks([customTool], undefined, nodeTypes)).not.toThrow();
		expect(() => reconcileNodeToolMocks(undefined, undefined, nodeTypes)).not.toThrow();
	});
});
