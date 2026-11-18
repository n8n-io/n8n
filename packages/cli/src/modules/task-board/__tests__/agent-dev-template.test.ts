import {
	buildAgentDevDispatcherWorkflow,
	buildAgentDevExampleIntakeWorkflow,
	DISPATCHER_NODE_NAMES,
	type TemplateWorkflow,
} from '../templates/agent-dev';

const input = { boardId: 'board-1', boardName: 'Dev board' };

function connectionTargets(workflow: TemplateWorkflow) {
	return Object.values(workflow.connections).flatMap((byType) =>
		byType.main.flatMap((outputs) => (outputs ?? []).map((c) => c.node)),
	);
}

describe('agent-dev template workflows', () => {
	it('connects every dispatcher node by name', () => {
		const workflow = buildAgentDevDispatcherWorkflow(input);
		const names = new Set(workflow.nodes.map((n) => n.name));

		expect(names.size).toBe(workflow.nodes.length);
		for (const name of Object.values(DISPATCHER_NODE_NAMES)) expect(names).toContain(name);
		for (const source of Object.keys(workflow.connections)) expect(names).toContain(source);
		for (const target of connectionTargets(workflow)) expect(names).toContain(target);

		const agentOutputs = workflow.connections[DISPATCHER_NODE_NAMES.agent].main;
		expect(agentOutputs[0]?.[0]?.node).toBe(DISPATCHER_NODE_NAMES.reply);
		expect(agentOutputs[1]?.[0]?.node).toBe(DISPATCHER_NODE_NAMES.errorComment);
	});

	it('runs the assignee agent, or the fallback agent when one is given', () => {
		const agentNode = (agentId?: string) =>
			buildAgentDevDispatcherWorkflow({ ...input, agentId }).nodes.find(
				(n) => n.name === DISPATCHER_NODE_NAMES.agent,
			);

		expect(agentNode()?.parameters.agentId).toEqual({
			__rl: true,
			mode: 'id',
			value: "={{ $('Task Board Trigger').item.json.assignee.id }}",
		});
		expect(JSON.stringify(agentNode('agent-1')?.parameters.agentId)).toContain("'agent-1'");
	});

	it('creates the example task on the board for the given agent', () => {
		const workflow = buildAgentDevExampleIntakeWorkflow({ ...input, agentId: 'agent-1' });
		const create = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.taskBoard');

		expect(create?.parameters).toMatchObject({
			operation: 'create',
			boardId: 'board-1',
			assigneeType: 'agent',
			assigneeId: 'agent-1',
		});
		expect(connectionTargets(workflow)).toEqual([create?.name]);
	});
});
