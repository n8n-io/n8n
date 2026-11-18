import type { JSONSchema7 } from 'json-schema';
import { jsonParse } from 'n8n-workflow';

import {
	buildAgentDevDispatcherWorkflow,
	buildAgentDevExampleIntakeWorkflow,
	DISPATCHER_NODE_NAMES,
	type TemplateWorkflow,
} from '../templates/agent-dev';

const input = { boardId: 'board-1', boardName: 'Dev board' };

const text = (value: unknown) => (typeof value === 'string' ? value : '');

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
		expect(agentOutputs[0]?.[0]?.node).toBe(DISPATCHER_NODE_NAMES.recordUsage);
		expect(agentOutputs[1]?.[0]?.node).toBe(DISPATCHER_NODE_NAMES.errorComment);
	});

	describe('dispatcher steps after the agent run', () => {
		const names = DISPATCHER_NODE_NAMES;
		const workflow = buildAgentDevDispatcherWorkflow(input);
		const actor = "={{ $('Task Board Trigger').item.json.assignee.id }}";
		const asAgent = { actAs: 'agent', actorAgentId: actor };
		const output = "$('Message an Agent').item.json.structuredOutput";

		const find = (name: string) => {
			const found = workflow.nodes.find((n) => n.name === name);
			if (!found) throw new Error(`No node named ${name}`);
			return found;
		};
		/** The names of the nodes on each output of a node. */
		const targets = (name: string) =>
			(workflow.connections[name]?.main ?? []).map((outputs) => (outputs ?? []).map((c) => c.node));
		/** The expression of the single condition of an If node. */
		const condition = (name: string) =>
			JSON.stringify(find(name).parameters.conditions).match(/"leftValue":"(=[^"]*)"/)?.[1];

		it('offers a hand-off in the agent message only when the task has a team', () => {
			const message = text(find(names.agent).parameters.message);

			expect(message).toContain("{{ $('Task Board Trigger').item.json.teamText ? ");
			expect(message).toContain("+ $('Task Board Trigger').item.json.teamText + ");
			expect(message).toContain(": '' }}");
			// The hand-off text is inside the expression only, so an empty team removes all of it.
			const [staticText] = message.split('{{');
			expect(staticText).not.toMatch(/hand|teammate/i);
		});

		it('lets the agent return a hand-off, a severity and tags', () => {
			const schema = jsonParse<JSONSchema7 & { properties: Record<string, JSONSchema7> }>(
				text(find(names.agent).parameters.outputSchema),
			);

			expect(schema.properties.outcome.enum).toEqual(['needs_input', 'done', 'handoff']);
			expect(schema.properties.handoffTo.description).toContain('Required when outcome is handoff');
			expect(schema.properties.severity.enum).toEqual(['low', 'medium', 'high', 'critical']);
			expect(schema.properties.tags).toMatchObject({ type: 'array', items: { type: 'string' } });
			expect(schema.required).toEqual(['comment', 'outcome']);
		});

		it('records the usage of the acting agent and tolerates a run without usage', () => {
			expect(find(names.recordUsage).parameters).toEqual({
				resource: 'task',
				operation: 'recordUsage',
				taskId: "={{ $('Task Board Trigger').item.json.taskId }}",
				usageAgentId: actor,
				promptTokens: '={{ $json.usage?.promptTokens ?? 0 }}',
				completionTokens: '={{ $json.usage?.completionTokens ?? 0 }}',
				totalTokens: '={{ $json.usage?.totalTokens ?? 0 }}',
				options: { cost: '={{ $json.usage?.cost ?? null }}' },
			});
			expect(targets(names.recordUsage)).toEqual([[names.reply]]);
		});

		it('posts the reply, then writes the severity and tags as the agent when it returned them', () => {
			expect(find(names.reply).parameters).toMatchObject({ operation: 'addComment', ...asAgent });
			expect(targets(names.reply)).toEqual([[names.hasFields]]);
			expect(condition(names.hasFields)).toBe(
				`={{ !!(${output}.severity || ${output}.tags?.length) }}`,
			);
			expect(targets(names.hasFields)).toEqual([[names.updateFields], [names.isHandoff]]);
			expect(find(names.updateFields).parameters).toMatchObject({
				operation: 'update',
				updateFields: {
					severity: `={{ ${output}.severity ?? undefined }}`,
					tags: `={{ ${output}.tags?.length ? ${output}.tags : undefined }}`,
				},
				...asAgent,
			});
			expect(targets(names.updateFields)).toEqual([[names.isHandoff]]);
		});

		it('moves the task by the outcome when the agent needs input or is done', () => {
			expect(condition(names.isHandoff)).toBe(`={{ ${output}.outcome === 'handoff' }}`);
			expect(targets(names.isHandoff)[1]).toEqual([names.finish]);
			expect(find(names.finish).parameters).toMatchObject({
				operation: 'move',
				moveTo: 'role',
				columnRoleTarget: `={{ ${output}.outcome }}`,
				...asAgent,
			});
			expect(targets(names.finish)).toEqual([]);
		});

		it('hands the task off as the workflow, so the new assignee starts', () => {
			expect(targets(names.isHandoff)[0]).toEqual([names.handoff]);
			const handoff = find(names.handoff);
			expect(handoff.parameters).toEqual({
				resource: 'task',
				operation: 'handoff',
				taskId: "={{ $('Task Board Trigger').item.json.taskId }}",
				handoffTo: `={{ ${output}.handoffTo }}`,
				actAs: 'workflow',
			});
			expect(handoff.onError).toBe('continueErrorOutput');
			expect(targets(names.handoff)).toEqual([[names.limitReached], [names.errorComment]]);
		});

		it('reports a reached hand-off limit as the agent and does not move the task', () => {
			expect(condition(names.limitReached)).toBe('={{ $json.handedOff === false }}');
			expect(targets(names.limitReached)).toEqual([[names.limitComment]]);
			expect(find(names.limitComment).parameters).toMatchObject({
				operation: 'addComment',
				...asAgent,
			});
			expect(text(find(names.limitComment).parameters.body)).toContain('hand-off limit');
			expect(targets(names.limitComment)).toEqual([]);
		});

		it('keeps the error branch of the agent', () => {
			expect(targets(names.errorComment)).toEqual([[names.errorMove]]);
			expect(find(names.errorMove).parameters).toMatchObject({
				operation: 'move',
				columnRoleTarget: 'needs_input',
				...asAgent,
			});
		});

		it('builds a message expression that evaluates with and without a team', () => {
			const message = text(find(names.agent).parameters.message).slice(1);
			const $ = (teamText: string) => () => ({
				item: { json: { teamText, threadText: 'THREAD' } },
			});
			const render = (teamText: string) =>
				message.replace(/\{\{(.*?)\}\}/gs, (_match, code: string) => {
					// eslint-disable-next-line @typescript-eslint/no-implied-eval
					const evaluate = new Function('$', `return (${code});`);
					return String(evaluate($(teamText)));
				});

			const withTeam = render('- Research Agent (id: agent-2): finds facts');
			expect(withTeam).toContain(
				'Your teammates:\n- Research Agent (id: agent-2): finds facts\n\n---',
			);
			expect(withTeam).toContain('set outcome to "handoff"');

			const alone = render('');
			expect(alone).not.toMatch(/hand|teammate/i);
			expect(alone).toContain('---\n\nTHREAD');
		});
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
