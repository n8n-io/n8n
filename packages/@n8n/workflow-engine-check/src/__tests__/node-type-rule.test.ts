import type { INode, INodeTypeDescription } from 'n8n-workflow';

import { checkEngineV2Eligibility, type EngineV2Reason } from '../index';
import { NODE_TYPE_DENYLIST } from '../node-type-denylist';

const manualTrigger: INode = {
	id: 'manual-id',
	name: 'When clicking Execute',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

function node(type: string, typeVersion = 1, extra: Partial<INode> = {}): INode {
	return {
		id: 'node-id',
		name: 'Node',
		type,
		typeVersion,
		position: [0, 0],
		parameters: {},
		...extra,
	};
}

const nodeTypes: INodeTypeDescription[] = [];

function check(nodes: INode[]) {
	return checkEngineV2Eligibility(
		{ nodes: [manualTrigger, ...nodes], connections: {}, settings: {} },
		nodeTypes,
	);
}

describe('node type rule', () => {
	it.each<{ case: string; node: INode; reason: Pick<EngineV2Reason, 'code' | 'severity'> }>([
		{
			case: 'an exact type match',
			node: node('n8n-nodes-base.formTrigger', 2.6),
			reason: { code: 'FORM_NODE', severity: 'blocking' },
		},
		{
			case: 'a langchain node through the package prefix',
			node: node('@n8n/n8n-nodes-langchain.agent', 3),
			reason: { code: 'AI_NODE', severity: 'blocking' },
		},
		{
			case: 'a langchain node with its own entry, not the package prefix',
			node: node('@n8n/n8n-nodes-langchain.mcpTrigger', 2),
			reason: { code: 'MCP_SERVER_TRIGGER', severity: 'blocking' },
		},
		{
			case: 'a community node',
			node: node('n8n-nodes-community-example.example'),
			reason: { code: 'COMMUNITY_NODE', severity: 'blocking' },
		},
		{
			case: 'a scoped community node',
			node: node('@acme/n8n-nodes-example.example'),
			reason: { code: 'COMMUNITY_NODE', severity: 'blocking' },
		},
	])('reports $case', ({ node: denied, reason }) => {
		expect(check([denied]).reasons).toEqual([
			{
				...reason,
				nodeId: 'node-id',
				nodeName: 'Node',
				message: expect.stringContaining('"Node"'),
			},
		]);
	});

	it.each<[string, INode]>([
		['a disabled denylisted node', node('n8n-nodes-base.form', 1, { disabled: true })],
		[
			'a disabled community node',
			node('n8n-nodes-community-example.example', 1, { disabled: true }),
		],
		['an allowed core node', node('n8n-nodes-base.set', 3.4)],
	])('does not report %s', (_, allowed) => {
		expect(check([allowed])).toEqual({ eligible: true, reasons: [] });
	});

	it('reports every denylisted node, not only the first', () => {
		const result = check([
			node('n8n-nodes-base.executionData', 1, { id: 'a', name: 'A' }),
			node('n8n-nodes-base.timeSaved', 1, { id: 'b', name: 'B' }),
		]);

		expect(result.eligible).toBe(false);
		expect(result.reasons.map(({ code, nodeName }) => [code, nodeName])).toEqual([
			['EXECUTION_DATA_NODE', 'A'],
			['TIME_SAVED_NODE', 'B'],
		]);
	});

	// Removing an entry lets workflows publish on engine v2. Do it only when the ticket lands.
	it('pins the denylist', () => {
		const entries = NODE_TYPE_DENYLIST.map(
			({ type, code, ticket }) => `${type}: ${code} ${ticket}`,
		);
		expect(entries).toMatchInlineSnapshot(`
			[
			  "n8n-nodes-base.form: FORM_NODE CET-331",
			  "n8n-nodes-base.formTrigger: FORM_NODE CET-331",
			  "@n8n/n8n-nodes-langchain.chat: CHAT_NODE CET-522",
			  "@n8n/n8n-nodes-langchain.chatTrigger: CHAT_NODE CET-291",
			  "@n8n/n8n-nodes-langchain.mcpTrigger: MCP_SERVER_TRIGGER CET-781",
			  "@n8n/n8n-nodes-langchain.microsoftAgent365Trigger: MICROSOFT_AGENT365_TRIGGER CET-787",
			  "n8n-nodes-base.executionData: EXECUTION_DATA_NODE CET-782",
			  "n8n-nodes-base.timeSaved: TIME_SAVED_NODE CET-782",
			  "n8n-nodes-base.messageAnAgent: MESSAGE_AN_AGENT_NODE CET-783",
			  "n8n-nodes-base.evaluation: EVALUATION_NODE CET-784",
			  "n8n-nodes-base.evaluationTrigger: EVALUATION_NODE CET-784",
			  "@n8n/n8n-nodes-langchain.: AI_NODE CET-780",
			]
		`);
	});
});
