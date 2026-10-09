import { mockInstance } from '@n8n/backend-test-utils';
import type { INode, INodeType } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { NodeTypes } from '@/node-types';

import { toPolicedNodes, withInlineAgentToolNodes } from '../policed-agent-nodes';

const nodeTypes = mockInstance(NodeTypes);

beforeEach(() => {
	// Only Slack has a `…Tool` variant here, so other tools keep their configured type.
	nodeTypes.getByNameAndVersion.mockImplementation((name) => {
		if (name === 'n8n-nodes-base.slackTool') return mock<INodeType>();
		throw new Error(`Unknown node type ${name}`);
	});
});

const dateTimeTool = {
	type: 'node',
	name: 'Current date',
	node: { nodeType: 'n8n-nodes-base.dateTime', nodeTypeVersion: 2, nodeParameters: {} },
};

const slackTool = {
	type: 'node',
	name: 'Post message',
	node: {
		nodeType: 'n8n-nodes-base.slack',
		nodeTypeVersion: 2.3,
		credentials: { slackApi: { id: 'cred-1', name: 'Prod Slack' } },
	},
};

const messageAnAgent = (parameters: INode['parameters']): INode => ({
	id: 'n1',
	name: 'Message an Agent',
	type: 'n8n-nodes-base.messageAnAgent',
	typeVersion: 2,
	position: [0, 0],
	parameters,
});

describe('toPolicedNodes', () => {
	it('turns each node tool into a node with its type, version and credential slots', () => {
		expect(toPolicedNodes([dateTimeTool, slackTool])).toEqual([
			expect.objectContaining({
				name: 'Current date',
				type: 'n8n-nodes-base.dateTime',
				typeVersion: 2,
				credentials: undefined,
			}),
			expect.objectContaining({
				name: 'Post message',
				type: 'n8n-nodes-base.slackTool',
				typeVersion: 2.3,
				credentials: { slackApi: { id: 'cred-1', name: 'Prod Slack' } },
			}),
		]);
	});

	it('keeps a managed credential slot, which has no stored id', () => {
		const managed = {
			...slackTool,
			node: {
				...slackTool.node,
				credentials: { openAiApi: { id: null, name: 'n8n', __aiGatewayManaged: true } },
			},
		};

		expect(toPolicedNodes([managed])[0].credentials).toEqual({
			openAiApi: { id: null, name: 'n8n' },
		});
	});

	it('keeps a type that is already a tool variant', () => {
		const tool = {
			...slackTool,
			node: { ...slackTool.node, nodeType: 'n8n-nodes-base.slackTool' },
		};

		expect(toPolicedNodes([tool])[0].type).toBe('n8n-nodes-base.slackTool');
	});

	it('carries the tool parameters, which a check can read a credential type from', () => {
		const http = {
			type: 'node',
			name: 'Call API',
			node: {
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeTypeVersion: 4.2,
				nodeParameters: {
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'slackApi',
				},
			},
		};

		expect(toPolicedNodes([http])[0].parameters).toEqual({
			authentication: 'predefinedCredentialType',
			nodeCredentialType: 'slackApi',
		});
	});

	it('polices a tool with keys the schema does not know', () => {
		expect(toPolicedNodes([{ ...dateTimeTool, futureField: true }])[0].type).toBe(
			'n8n-nodes-base.dateTime',
		);
	});

	it('still polices a tool that fails the schema by the type and credentials it names', () => {
		const malformed = {
			type: 'node',
			node: {
				nodeType: 'n8n-nodes-base.dateTime',
				credentials: { slackApi: { id: 'cred-1', name: 'Prod Slack' } },
			},
		};

		expect(toPolicedNodes([malformed])).toEqual([
			expect.objectContaining({
				name: 'Tool 1',
				type: 'n8n-nodes-base.dateTime',
				credentials: { slackApi: { id: 'cred-1', name: 'Prod Slack' } },
			}),
		]);
	});

	it('ignores workflow and custom tools, which run through their own gates', () => {
		const tools = [
			{ type: 'workflow', workflow: 'wf-1' },
			{ type: 'custom', id: 'tool-1' },
		];

		expect(toPolicedNodes(tools)).toEqual([]);
	});

	it.each([undefined, null, 'tools', [null, 'x', { type: 'node' }, { type: 'node', node: {} }]])(
		'returns no nodes for malformed input %p',
		(tools) => {
			expect(toPolicedNodes(tools)).toEqual([]);
		},
	);
});

describe('withInlineAgentToolNodes', () => {
	const code: INode = {
		id: 'n0',
		name: 'Code',
		type: 'n8n-nodes-base.code',
		typeVersion: 2,
		position: [0, 0],
		parameters: {},
	};

	it('returns the same array when no inline agent is embedded', () => {
		const nodes = [code, messageAnAgent({ agentSource: 'referenced' })];

		expect(withInlineAgentToolNodes(nodes)).toBe(nodes);
	});

	it('appends the node tools of an inline agent stored as an object', () => {
		const agentNode = messageAnAgent({
			agentSource: 'inline',
			inlineAgent: { config: { tools: [dateTimeTool] } },
		});

		const types = withInlineAgentToolNodes([code, agentNode]).map((node) => node.type);

		expect(types).toEqual([
			'n8n-nodes-base.code',
			'n8n-nodes-base.messageAnAgent',
			'n8n-nodes-base.dateTime',
		]);
	});

	it('appends the tools of inline agents nested inside agent tools, at any depth', () => {
		const askHelper = (tools: unknown[]) => ({
			type: 'node',
			name: 'Ask helper',
			node: {
				nodeType: 'n8n-nodes-base.messageAnAgent',
				nodeTypeVersion: 2,
				nodeParameters: { agentSource: 'inline', inlineAgent: { config: { tools } } },
			},
		});
		const agentNode = messageAnAgent({
			agentSource: 'inline',
			inlineAgent: { config: { tools: [askHelper([dateTimeTool, askHelper([slackTool])])] } },
		} as INode['parameters']);

		expect(withInlineAgentToolNodes([agentNode]).map((node) => [node.id, node.type])).toEqual([
			['n1', 'n8n-nodes-base.messageAnAgent'],
			['n1-tool-0', 'n8n-nodes-base.messageAnAgent'],
			['n1-tool-0-tool-0', 'n8n-nodes-base.dateTime'],
			['n1-tool-0-tool-1', 'n8n-nodes-base.messageAnAgent'],
			['n1-tool-0-tool-1-tool-0', 'n8n-nodes-base.slackTool'],
		]);
	});

	it('appends the node tools of an inline agent attached as an AI Agent tool', () => {
		const agentNode = {
			...messageAnAgent({
				agentSource: 'inline',
				inlineAgent: { config: { tools: [dateTimeTool] } },
			}),
			type: 'n8n-nodes-base.messageAnAgentTool',
		};

		expect(withInlineAgentToolNodes([agentNode]).map((node) => node.type)).toEqual([
			'n8n-nodes-base.messageAnAgentTool',
			'n8n-nodes-base.dateTime',
		]);
	});

	it('appends the node tools of an inline agent stored as a JSON string', () => {
		const agentNode = messageAnAgent({
			agentSource: 'inline',
			inlineAgent: JSON.stringify({ config: { tools: [dateTimeTool] } }),
		});

		expect(withInlineAgentToolNodes([agentNode]).map((node) => node.type)).toContain(
			'n8n-nodes-base.dateTime',
		);
	});

	it('ignores the inline config while the node is set to a saved agent', () => {
		const agentNode = messageAnAgent({
			agentSource: 'referenced',
			inlineAgent: { config: { tools: [dateTimeTool] } },
		});

		expect(withInlineAgentToolNodes([agentNode])).toHaveLength(1);
	});

	it.each(['={{ $json.agent }}', '{not json', ''])(
		'leaves an inline agent it cannot read (%p) to the run-time gate',
		(inlineAgent) => {
			const nodes = [messageAnAgent({ agentSource: 'inline', inlineAgent })];

			expect(withInlineAgentToolNodes(nodes)).toBe(nodes);
		},
	);

	it('does not throw on an imported node with no parameters', () => {
		const bare = { ...messageAnAgent({}), parameters: undefined } as unknown as INode;

		expect(withInlineAgentToolNodes([bare])).toHaveLength(1);
	});
});
