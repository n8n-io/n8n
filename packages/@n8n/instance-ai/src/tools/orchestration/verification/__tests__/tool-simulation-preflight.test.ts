import {
	agentToolNode,
	agentToolWorkflow,
	mcpToolWorkflow,
} from '../../../../__tests__/agent-tool-workflow';
import type { NodeSimulationVerdict } from '../../../../workflow-loop/workflow-loop-state';
import { checkToolSimulationSupport } from '../tool-simulation-preflight';

function verdict(nodeName: string, simulate = false): NodeSimulationVerdict {
	return {
		nodeName,
		verdict: simulate ? 'simulate' : 'execute',
		reason: 'Test classification',
		confidence: 'high',
		source: 'deterministic',
	};
}

function check(
	workflow = agentToolWorkflow(),
	options: {
		pins?: Record<string, unknown[]>;
		plan?: NodeSimulationVerdict[];
		triggerNodeName?: string;
	} = {},
) {
	return checkToolSimulationSupport({
		workflow,
		plan: options.plan ?? [verdict('Agent'), verdict('Nested'), verdict('Write', true)],
		prepared: {
			verificationPinData: options.pins ?? { Write: [{}] },
			simulatedNodes: [],
			haltedGateNames: [],
		},
		triggerNodeName: options.triggerNodeName,
	});
}

describe('tool simulation preflight', () => {
	it.each(['v0', undefined] as const)(
		'blocks tool simulation with execution order %s',
		(executionOrder) => {
			const workflow = agentToolWorkflow();
			workflow.settings = { executionOrder };
			expect(check(workflow)?.guidance).toContain(
				'Write (called by Agent; legacy execution order)',
			);
			expect(check(workflow, { pins: { Agent: [{}] } })).toBeUndefined();
		},
	);

	it.each([3, 3.1, 4])('allows main Agent %s to simulate tools', (version) => {
		expect(check(agentToolWorkflow(version))).toBeUndefined();
		expect(check(agentToolWorkflow(version, 3))).toBeUndefined();
	});

	it.each([3, 3.1, 4])('allows Agent Tool %s to simulate children', (version) => {
		expect(check(agentToolWorkflow(3.1, version))).toBeUndefined();
	});

	it.each([2, 2.3])('blocks a simulated tool called by Agent %s', (version) => {
		expect(check(agentToolWorkflow(version))).toMatchObject({
			reason: 'unsupported_tool_simulation',
			guidance: expect.stringContaining('Write (called by Agent)'),
		});
	});

	it.each([2, 2.2])('blocks children of Agent Tool %s', (version) => {
		expect(check(agentToolWorkflow(3.1, version))?.guidance).toContain('Write (called by Nested)');
	});

	it.each([undefined, 'MCP Server'])(
		'checks MCP tools without main connections with trigger %s',
		(triggerNodeName) => {
			const workflow = mcpToolWorkflow();
			expect(check(workflow, { triggerNodeName })).toMatchObject({
				reason: 'unsupported_tool_simulation',
				nodesNotReached: expect.arrayContaining(['MCP Server', 'Write']),
			});
			expect(check(workflow, { triggerNodeName, plan: [] })?.reason).toBe(
				'incomplete_tool_simulation_plan',
			);
		},
	);

	it('checks a shared MCP tool only when its trigger is in scope', () => {
		const workflow = agentToolWorkflow();
		workflow.nodes.push(agentToolNode('MCP Server', '@n8n/n8n-nodes-langchain.mcpTrigger'));
		workflow.connections.Write = {
			ai_tool: [
				[
					{ node: 'Agent', type: 'ai_tool', index: 0 },
					{ node: 'MCP Server', type: 'ai_tool', index: 0 },
				],
			],
		};
		expect(check(workflow)?.guidance).toContain('Write (called by MCP Server)');
		expect(check(workflow, { triggerNodeName: 'Trigger' })).toBeUndefined();
		expect(check(workflow, { triggerNodeName: 'MCP Server' })?.guidance).toContain(
			'Write (called by MCP Server)',
		);
	});

	it('blocks tools attached to an unknown caller', () => {
		const workflow = agentToolWorkflow();
		workflow.nodes[1].type = 'community.customAgent';
		expect(check(workflow)?.reason).toBe('unsupported_tool_simulation');
	});

	it('allows reads on an older caller when no simulation is needed', () => {
		expect(check(agentToolWorkflow(2), { plan: [verdict('Write')], pins: {} })).toBeUndefined();
	});

	it('checks effective saved pins as well as planned simulation', () => {
		const workflow = agentToolWorkflow(2);
		workflow.pinData = { Write: [{ result: 'saved' }] };
		expect(check(workflow, { plan: [verdict('Write')], pins: {} })?.reason).toBe(
			'unsupported_tool_simulation',
		);
	});

	it.each([{ items: [] }, { items: [{ output: 'Fixture' }] }])(
		'stops at an engine-scheduled parent pin with %j',
		({ items }) => {
			expect(check(agentToolWorkflow(2), { pins: { Agent: items } })).toBeUndefined();
			const workflow = agentToolWorkflow(2);
			workflow.pinData = { Agent: items };
			expect(check(workflow)).toBeUndefined();
		},
	);

	it('allows a pin on an engine-scheduled nested parent', () => {
		expect(check(agentToolWorkflow(3.1, 2), { pins: { Nested: [{}] } })).toBeUndefined();
	});

	it('does not trust a pin on an inline nested parent', () => {
		const workflow = agentToolWorkflow(2, 3);
		workflow.pinData = { Nested: [{ output: 'Saved fixture' }] };
		const blocked = check(workflow, { pins: { Nested: [{}], Write: [{}] } });
		expect(blocked?.guidance).toContain('Nested (called by Agent)');
		expect(blocked?.guidance).toContain('Write (called by Nested)');
	});

	it('requires missing classifications even when a parent is pinned', () => {
		expect(
			check(agentToolWorkflow(), { plan: [verdict('Agent')], pins: { Agent: [{}] } })?.reason,
		).toBe('incomplete_tool_simulation_plan');
	});

	it('checks each caller of a shared tool and respects trigger scope', () => {
		const workflow = agentToolWorkflow();
		workflow.nodes.push(
			agentToolNode('Other Trigger', 'n8n-nodes-base.manualTrigger'),
			agentToolNode('Older', '@n8n/n8n-nodes-langchain.agent', { typeVersion: 2 }),
		);
		workflow.connections['Other Trigger'] = { main: [[{ node: 'Older', type: 'main', index: 0 }]] };
		workflow.connections.Write = {
			ai_tool: [
				[
					{ node: 'Agent', type: 'ai_tool', index: 0 },
					{ node: 'Older', type: 'ai_tool', index: 0 },
				],
			],
		};
		expect(check(workflow)?.guidance).toContain('Write (called by Older)');
		expect(check(workflow, { triggerNodeName: 'Trigger' })).toBeUndefined();
		expect(check(workflow, { pins: { Agent: [{}], Write: [{}] } })?.reason).toBe(
			'unsupported_tool_simulation',
		);
		expect(check(workflow, { pins: { Older: [{}], Write: [{}] } })).toBeUndefined();
	});

	it('handles cycles without losing an unsupported caller', () => {
		const workflow = agentToolWorkflow(3.1, 3);
		workflow.connections.Agent = { ai_tool: [[{ node: 'Nested', type: 'ai_tool', index: 0 }]] };
		expect(check(workflow)?.reason).toBe('unsupported_tool_simulation');
	});
});
