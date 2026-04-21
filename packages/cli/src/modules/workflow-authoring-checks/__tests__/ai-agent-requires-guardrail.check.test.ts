import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	AGENT_TOOL_LANGCHAIN_NODE_TYPE,
	GUARDRAILS_NODE_TYPE,
	mapConnectionsByDestination,
	type IConnections,
	type INode,
} from 'n8n-workflow';

import { AiAgentRequiresGuardrailCheck } from '../checks/ai-agent-requires-guardrail.check';
import type { WorkflowCheckContext } from '../workflow-authoring-checks.types';

const makeNode = (
	name: string,
	type: string,
	overrides: { disabled?: boolean; id?: string } = {},
): INode => ({
	id: overrides.id ?? name,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...(overrides.disabled ? { disabled: true } : {}),
});

const makeContext = (nodes: INode[], connections: IConnections): WorkflowCheckContext => ({
	workflowId: 'wf-1',
	nodes,
	connections,
	connectionsByDestination: mapConnectionsByDestination(connections),
	settings: undefined,
	logger: mock<Logger>(),
});

const mainLink = (source: string, target: string): IConnections => ({
	[source]: {
		main: [[{ node: target, type: 'main', index: 0 }]],
	},
});

describe('AiAgentRequiresGuardrailCheck', () => {
	const check = new AiAgentRequiresGuardrailCheck();

	it('passes when a Guardrails node is the direct main-input parent of the Agent', async () => {
		const guardrail = makeNode('Guardrails', GUARDRAILS_NODE_TYPE);
		const agent = makeNode('Agent', AGENT_LANGCHAIN_NODE_TYPE);

		const violations = await check.evaluate(
			makeContext([guardrail, agent], mainLink('Guardrails', 'Agent')),
		);

		expect(violations).toHaveLength(0);
	});

	it('flags an Agent with no main-input parent', async () => {
		const agent = makeNode('Agent', AGENT_LANGCHAIN_NODE_TYPE);

		const violations = await check.evaluate(makeContext([agent], {}));

		expect(violations).toHaveLength(1);
		expect(violations[0].nodeIds).toEqual([agent.id]);
	});

	it('flags an Agent whose direct parent is not a Guardrails node', async () => {
		const setNode = makeNode('Set', 'n8n-nodes-base.set');
		const agent = makeNode('Agent', AGENT_LANGCHAIN_NODE_TYPE);

		const violations = await check.evaluate(
			makeContext([setNode, agent], mainLink('Set', 'Agent')),
		);

		expect(violations).toHaveLength(1);
	});

	it('flags an Agent when a Guardrails node is a grandparent (non-guardrail direct parent)', async () => {
		const guardrail = makeNode('Guardrails', GUARDRAILS_NODE_TYPE);
		const setNode = makeNode('Set', 'n8n-nodes-base.set');
		const agent = makeNode('Agent', AGENT_LANGCHAIN_NODE_TYPE);
		const connections: IConnections = {
			Guardrails: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
			Set: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
		};

		const violations = await check.evaluate(makeContext([guardrail, setNode, agent], connections));

		expect(violations).toHaveLength(1);
	});

	it('flags an Agent whose only Guardrails sibling is on an ai_tool port instead of main', async () => {
		const guardrail = makeNode('Guardrails', GUARDRAILS_NODE_TYPE);
		const agent = makeNode('Agent', AGENT_LANGCHAIN_NODE_TYPE);
		const connections: IConnections = {
			Guardrails: {
				ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]],
			},
		};

		const violations = await check.evaluate(makeContext([guardrail, agent], connections));

		expect(violations).toHaveLength(1);
	});

	it('flags an Agent whose direct-parent Guardrails node is disabled', async () => {
		const guardrail = makeNode('Guardrails', GUARDRAILS_NODE_TYPE, { disabled: true });
		const agent = makeNode('Agent', AGENT_LANGCHAIN_NODE_TYPE);

		const violations = await check.evaluate(
			makeContext([guardrail, agent], mainLink('Guardrails', 'Agent')),
		);

		expect(violations).toHaveLength(1);
	});

	it('ignores disabled AI Agent nodes', async () => {
		const agent = makeNode('Agent', AGENT_LANGCHAIN_NODE_TYPE, { disabled: true });

		const violations = await check.evaluate(makeContext([agent], {}));

		expect(violations).toHaveLength(0);
	});

	it('returns no violations for workflows with no AI Agent nodes', async () => {
		const setNode = makeNode('Set', 'n8n-nodes-base.set');

		const violations = await check.evaluate(makeContext([setNode], {}));

		expect(violations).toHaveLength(0);
	});

	it('does not apply to AI Agent Tool (agentTool) nodes', async () => {
		const agentTool = makeNode('AgentTool', AGENT_TOOL_LANGCHAIN_NODE_TYPE);

		const violations = await check.evaluate(makeContext([agentTool], {}));

		expect(violations).toHaveLength(0);
	});

	it('emits one violation per offending Agent when multiple Agents exist', async () => {
		const guardrail = makeNode('Guardrails', GUARDRAILS_NODE_TYPE);
		const goodAgent = makeNode('GoodAgent', AGENT_LANGCHAIN_NODE_TYPE);
		const badAgent1 = makeNode('BadAgent1', AGENT_LANGCHAIN_NODE_TYPE);
		const badAgent2 = makeNode('BadAgent2', AGENT_LANGCHAIN_NODE_TYPE);
		const connections: IConnections = {
			Guardrails: { main: [[{ node: 'GoodAgent', type: 'main', index: 0 }]] },
		};

		const violations = await check.evaluate(
			makeContext([guardrail, goodAgent, badAgent1, badAgent2], connections),
		);

		expect(violations).toHaveLength(2);
		expect(violations.map((v) => v.nodeIds?.[0]).sort()).toEqual(
			[badAgent1.id, badAgent2.id].sort(),
		);
	});
});
