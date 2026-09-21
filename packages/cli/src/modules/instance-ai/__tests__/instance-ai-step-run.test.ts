import { TOOL_EXECUTOR_NODE_NAME } from '@n8n/constants';
import { DirectedGraph, findStartNodes, findSubgraph, rewireGraph } from 'n8n-core';
import type { IConnections, INode, IRunData, ITaskData, NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	buildMockedStepRunData,
	buildToolAgentRequest,
	collectAncestorNames,
	declaredToolArguments,
	isToolkitNode,
	pinDataForStepRun,
	planStepRun,
	resolveStepRunRoots,
	toExecutionItems,
} from '../instance-ai-step-run';

function node(name: string, options: { disabled?: boolean; type?: string } = {}): INode {
	return {
		id: name,
		name,
		type: options.type ?? 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...(options.disabled ? { disabled: true } : {}),
	};
}

/** `from -> to` edges, optionally on a named output: `'IF:1'`. */
function connect(...edges: Array<[string, string]>): IConnections {
	const connections: IConnections = {};

	for (const [source, target] of edges) {
		const [sourceName, rawOutput] = source.split(':');
		const outputIndex = rawOutput ? Number(rawOutput) : 0;

		connections[sourceName] ??= { [NodeConnectionTypes.Main]: [] };
		const outputs = connections[sourceName][NodeConnectionTypes.Main];
		while (outputs.length <= outputIndex) outputs.push([]);
		outputs[outputIndex]?.push({
			node: target,
			type: NodeConnectionTypes.Main,
			index: 0,
		});
	}

	return connections;
}

/** Adds a sub-node connection: `from` feeds `to` on a non-main type. */
function connectSubNode(
	connections: IConnections,
	from: string,
	to: string,
	type: NodeConnectionType = NodeConnectionTypes.AiTool,
): IConnections {
	connections[from] ??= {};
	connections[from][type] = [[{ node: to, type, index: 0 }]];
	return connections;
}

function itemsOn(runData: IRunData, nodeName: string, outputIndex = 0) {
	return runData[nodeName]?.[0]?.data?.[NodeConnectionTypes.Main]?.[outputIndex];
}

/** Task data with one entry for each output, for a branching node. */
function taskDataOnOutputs(outputs: Array<Array<{ json: Record<string, never> }>>): ITaskData {
	return {
		startTime: 0,
		executionTime: 0,
		executionIndex: 0,
		source: [],
		data: { [NodeConnectionTypes.Main]: outputs },
	};
}

function taskData(items: Array<{ json: Record<string, never> }>): ITaskData {
	return {
		startTime: 0,
		executionTime: 0,
		executionIndex: 0,
		source: [],
		data: { [NodeConnectionTypes.Main]: [items] },
	};
}

describe('buildMockedStepRunData', () => {
	it('gives the direct parent the mock items and every node above it a placeholder', () => {
		const nodes = [node('Trigger'), node('Fetch'), node('Transform'), node('Target')];
		const connections = connect(
			['Trigger', 'Fetch'],
			['Fetch', 'Transform'],
			['Transform', 'Target'],
		);

		const { runData, mockedNodeNames } = buildMockedStepRunData({
			nodes,
			connections,
			targetName: 'Target',
			mockItems: toExecutionItems([{ id: 7 }]),
		});

		expect(itemsOn(runData, 'Transform')).toEqual([{ json: { id: 7 } }]);
		expect(itemsOn(runData, 'Fetch')).toEqual([{ json: {} }]);
		expect(itemsOn(runData, 'Trigger')).toEqual([{ json: {} }]);
		// The target itself stays without run data, which is what makes the
		// engine treat it as dirty and re-run it.
		expect(runData.Target).toBeUndefined();
		expect(mockedNodeNames.sort()).toEqual(['Fetch', 'Transform', 'Trigger']);
	});

	it('places the placeholder on the output that leads to the target', () => {
		const nodes = [node('Trigger'), node('IF'), node('Target')];
		// The target hangs off the IF's second output (the false branch).
		const connections = connect(['Trigger', 'IF'], ['IF:1', 'Target']);

		const { runData } = buildMockedStepRunData({
			nodes,
			connections,
			targetName: 'Target',
			mockItems: toExecutionItems([{ ok: true }]),
		});

		expect(itemsOn(runData, 'IF', 0)).toEqual([]);
		expect(itemsOn(runData, 'IF', 1)).toEqual([{ json: { ok: true } }]);
	});

	it('walks through a disabled parent to the node behind it', () => {
		const nodes = [node('Trigger'), node('Skipped', { disabled: true }), node('Target')];
		const connections = connect(['Trigger', 'Skipped'], ['Skipped', 'Target']);

		const { runData, mockedNodeNames } = buildMockedStepRunData({
			nodes,
			connections,
			targetName: 'Target',
			mockItems: toExecutionItems([{ a: 1 }]),
		});

		// The disabled node is removed from the engine's graph, so writing run
		// data for it would never be read.
		expect(runData.Skipped).toBeUndefined();
		expect(itemsOn(runData, 'Trigger')).toEqual([{ json: { a: 1 } }]);
		expect(mockedNodeNames).toEqual(['Trigger']);
	});

	it('feeds every direct input of a multi-input node', () => {
		const nodes = [node('A'), node('B'), node('Merge')];
		const connections: IConnections = {
			A: {
				[NodeConnectionTypes.Main]: [[{ node: 'Merge', type: NodeConnectionTypes.Main, index: 0 }]],
			},
			B: {
				[NodeConnectionTypes.Main]: [[{ node: 'Merge', type: NodeConnectionTypes.Main, index: 1 }]],
			},
		};

		const { runData } = buildMockedStepRunData({
			nodes,
			connections,
			targetName: 'Merge',
			mockItems: toExecutionItems([{ v: 1 }]),
		});

		expect(itemsOn(runData, 'A')).toEqual([{ json: { v: 1 } }]);
		expect(itemsOn(runData, 'B')).toEqual([{ json: { v: 1 } }]);
	});

	it('terminates on a cycle', () => {
		const nodes = [node('Loop'), node('Work')];
		const connections = connect(['Loop', 'Work'], ['Work', 'Loop']);

		const { mockedNodeNames } = buildMockedStepRunData({
			nodes,
			connections,
			targetName: 'Work',
			mockItems: toExecutionItems([{}]),
		});

		expect(mockedNodeNames).toEqual(['Loop']);
	});

	it('produces nothing for a node with no parents', () => {
		const { runData, mockedNodeNames } = buildMockedStepRunData({
			nodes: [node('Alone')],
			connections: {},
			targetName: 'Alone',
			mockItems: toExecutionItems([{ a: 1 }]),
		});

		expect(runData).toEqual({});
		expect(mockedNodeNames).toEqual([]);
	});
});

describe('collectAncestorNames', () => {
	it('returns every node that can reach the target, and nothing downstream', () => {
		const nodes = [node('Trigger'), node('A'), node('Target'), node('After')];
		const connections = connect(['Trigger', 'A'], ['A', 'Target'], ['Target', 'After']);

		expect(collectAncestorNames(nodes, connections, 'Target').sort()).toEqual(['A', 'Trigger']);
	});
});

describe('planStepRun', () => {
	const nodes = [node('Trigger'), node('Fetch'), node('Target')];
	const connections = connect(['Trigger', 'Fetch'], ['Fetch', 'Target']);

	it('runs the chain when given no input', () => {
		const plan = planStepRun({ nodes, connections, targetName: 'Target' });

		expect(plan.inputMode).toBe('chain');
		// `runManually` routes on `runData === undefined`, so leaving it unset is
		// what selects the full-chain path.
		expect(plan.runData).toBeUndefined();
		expect(plan.mockedNodeNames).toEqual([]);
	});

	it('mocks the path when given items', () => {
		const plan = planStepRun({
			nodes,
			connections,
			targetName: 'Target',
			mockItems: toExecutionItems([{ id: 1 }]),
		});

		expect(plan.inputMode).toBe('mocked');
		expect(plan.dirtyNodeNames).toEqual(['Target']);
		expect(plan.mockedNodeNames.sort()).toEqual(['Fetch', 'Trigger']);
	});

	it('falls back to a chain run when the target has nothing above it to mock', () => {
		const plan = planStepRun({
			nodes: [node('Alone')],
			connections: {},
			targetName: 'Alone',
			mockItems: toExecutionItems([{ id: 1 }]),
		});

		expect(plan.inputMode).toBe('chain');
		expect(plan.runData).toBeUndefined();
	});

	it('replays prior run data and marks the target dirty', () => {
		const priorRunData: IRunData = {
			Trigger: [taskData([{ json: {} }])],
			Fetch: [taskData([{ json: {} }])],
		};

		const plan = planStepRun({ nodes, connections, targetName: 'Target', priorRunData });

		expect(plan.inputMode).toBe('reused-execution');
		expect(plan.runData).toBe(priorRunData);
		// Without this the engine would walk past a target that already has run
		// data instead of running it again.
		expect(plan.dirtyNodeNames).toEqual(['Target']);
		expect(plan.reusedNodeNames.sort()).toEqual(['Fetch', 'Trigger']);
		expect(plan.mockedNodeNames).toEqual([]);
	});

	it('refuses the run when the prior run never reached an ancestor', () => {
		// The prior run only covers a node on an unrelated branch. Falling back to
		// a chain run would execute Trigger and Fetch for real, which is what the
		// caller asked to avoid.
		const priorRunData: IRunData = { Elsewhere: [taskData([{ json: {} }])] };

		const plan = planStepRun({ nodes, connections, targetName: 'Target', priorRunData });

		expect(plan.inputMode).toBe('chain');
		expect(plan.runData).toBeUndefined();
		expect(plan.unhonoredInput?.requested).toBe('reused-execution');
		expect(plan.unhonoredInput?.upstreamNodeNames.sort()).toEqual(['Fetch', 'Trigger']);
	});

	// Run data for *some* ancestor is not enough. The engine walks down from the
	// trigger and re-runs the first node that has none, plus everything after
	// it, so a gap anywhere on the path is a node that runs for real.
	describe('partial coverage of the path', () => {
		it('refuses a replay that stops above the target', () => {
			const priorRunData: IRunData = { Trigger: [taskData([{ json: {} }])] };

			const plan = planStepRun({ nodes, connections, targetName: 'Target', priorRunData });

			expect(plan.inputMode).toBe('chain');
			expect(plan.unhonoredInput?.requested).toBe('reused-execution');
			// Only Fetch is missing. Trigger is covered, so it stays out of the message.
			expect(plan.unhonoredInput?.upstreamNodeNames).toEqual(['Fetch']);
		});

		it('refuses a replay that misses the trigger, which restarts the whole chain', () => {
			const priorRunData: IRunData = { Fetch: [taskData([{ json: {} }])] };

			const plan = planStepRun({ nodes, connections, targetName: 'Target', priorRunData });

			expect(plan.inputMode).toBe('chain');
			expect(plan.unhonoredInput?.upstreamNodeNames.sort()).toEqual(['Fetch', 'Trigger']);
		});

		it('accepts a replay that skips a branch the earlier run never took', () => {
			// Kept and Discarded both reach the target. The earlier run sent every
			// item down output 0, so the engine never walks into Discarded.
			const branching = [
				node('Trigger'),
				node('IF'),
				node('Kept'),
				node('Discarded'),
				node('Target'),
			];
			const branchConnections = connect(
				['Trigger', 'IF'],
				['IF:0', 'Kept'],
				['IF:1', 'Discarded'],
				['Kept', 'Target'],
				['Discarded', 'Target'],
			);
			const priorRunData: IRunData = {
				Trigger: [taskData([{ json: {} }])],
				IF: [taskDataOnOutputs([[{ json: {} }], []])],
				Kept: [taskData([{ json: {} }])],
			};

			const plan = planStepRun({
				nodes: branching,
				connections: branchConnections,
				targetName: 'Target',
				priorRunData,
			});

			expect(plan.inputMode).toBe('reused-execution');
		});

		it('accepts a replay that skips a trigger which never fired', () => {
			// The engine prefers the trigger that has run data, so the other one is
			// not part of the run.
			const twoTriggers = [node('Trigger'), node('Schedule'), node('Fetch'), node('Target')];
			const triggerConnections = connect(
				['Trigger', 'Fetch'],
				['Schedule', 'Fetch'],
				['Fetch', 'Target'],
			);
			const priorRunData: IRunData = {
				Trigger: [taskData([{ json: {} }])],
				Fetch: [taskData([{ json: {} }])],
			};

			const plan = planStepRun({
				nodes: twoTriggers,
				connections: triggerConnections,
				targetName: 'Target',
				priorRunData,
			});

			expect(plan.inputMode).toBe('reused-execution');
		});

		it('counts a pinned node as covered, because it never executes', () => {
			const priorRunData: IRunData = { Fetch: [taskData([{ json: {} }])] };

			const plan = planStepRun({
				nodes,
				connections,
				targetName: 'Target',
				priorRunData,
				pinnedNodeNames: ['Trigger'],
			});

			expect(plan.inputMode).toBe('reused-execution');
		});
	});

	it('refuses the run when the reused execution stored no run data at all', () => {
		const plan = planStepRun({ nodes, connections, targetName: 'Target', priorRunData: {} });

		expect(plan.inputMode).toBe('chain');
		expect(plan.unhonoredInput?.requested).toBe('reused-execution');
	});

	it('runs the chain without complaint when there is nothing above the target', () => {
		const plan = planStepRun({
			nodes: [node('Alone')],
			connections: {},
			targetName: 'Alone',
			priorRunData: { Elsewhere: [taskData([{ json: {} }])] },
		});

		expect(plan.inputMode).toBe('chain');
		expect(plan.unhonoredInput).toBeUndefined();
	});

	it('prefers mocked input over prior run data', () => {
		const priorRunData: IRunData = { Fetch: [taskData([{ json: {} }])] };

		const plan = planStepRun({
			nodes,
			connections,
			targetName: 'Target',
			mockItems: toExecutionItems([{ id: 2 }]),
			priorRunData,
		});

		expect(plan.inputMode).toBe('mocked');
	});
});

describe('pinDataForStepRun', () => {
	const pins = {
		Trigger: [{ json: { a: 1 } }],
		Fetch: [{ json: { b: 2 } }],
		Target: [{ json: { c: 3 } }],
	};

	it("drops the target's own pin, which would stop it from ever running", () => {
		const result = pinDataForStepRun(pins, { targetName: 'Target', mockedNodeNames: [] });

		expect(result).toEqual({ Trigger: pins.Trigger, Fetch: pins.Fetch });
	});

	it('drops a pin on a node whose output the plan mocked', () => {
		const result = pinDataForStepRun(pins, {
			targetName: 'Target',
			mockedNodeNames: ['Fetch'],
		});

		// Otherwise `recreateNodeExecutionStack` would feed the target the pin
		// instead of the caller's mock input.
		expect(result).toEqual({ Trigger: pins.Trigger });
	});

	it('keeps the same object when nothing needs dropping', () => {
		const result = pinDataForStepRun(pins, { targetName: 'Elsewhere', mockedNodeNames: [] });

		expect(result).toBe(pins);
	});

	it('passes an absent pin set through', () => {
		expect(
			pinDataForStepRun(undefined, { targetName: 'Target', mockedNodeNames: [] }),
		).toBeUndefined();
	});
});

describe('sub-node targets', () => {
	// Trigger -> Create Ticket -> Agent, with a tool hanging off the Agent.
	const nodes = [node('Trigger'), node('Create Ticket'), node('Agent'), node('Calculator')];
	const connections = connectSubNode(
		connect(['Trigger', 'Create Ticket'], ['Create Ticket', 'Agent']),
		'Calculator',
		'Agent',
	);

	it('resolves a tool to the node that runs it', () => {
		expect(resolveStepRunRoots(nodes, connections, 'Calculator')).toEqual(['Agent']);
	});

	it('resolves a node in the main graph to itself', () => {
		expect(resolveStepRunRoots(nodes, connections, 'Agent')).toEqual(['Agent']);
		expect(resolveStepRunRoots(nodes, connections, 'Trigger')).toEqual(['Trigger']);
	});

	it('follows a chain of sub-nodes up to the root', () => {
		// Embeddings -> Vector Store -> Agent, all through non-main connections.
		const chained = [node('Trigger'), node('Agent'), node('Vector Store'), node('Embeddings')];
		const chainedConnections = connectSubNode(
			connectSubNode(connect(['Trigger', 'Agent']), 'Vector Store', 'Agent'),
			'Embeddings',
			'Vector Store',
			NodeConnectionTypes.AiEmbedding,
		);

		expect(resolveStepRunRoots(chained, chainedConnections, 'Embeddings')).toEqual(['Agent']);
	});

	it('returns every root a shared tool hangs off', () => {
		const shared = [node('Trigger'), node('Agent A'), node('Agent B'), node('Calculator')];
		const sharedConnections = connect(['Trigger', 'Agent A'], ['Agent A', 'Agent B']);
		sharedConnections.Calculator = {
			[NodeConnectionTypes.AiTool]: [
				[
					{ node: 'Agent A', type: NodeConnectionTypes.AiTool, index: 0 },
					{ node: 'Agent B', type: NodeConnectionTypes.AiTool, index: 0 },
				],
			],
		};

		expect(resolveStepRunRoots(shared, sharedConnections, 'Calculator').sort()).toEqual([
			'Agent A',
			'Agent B',
		]);
	});

	it('mocks the path above the Agent when the target is its tool', () => {
		const plan = planStepRun({
			nodes,
			connections,
			targetName: 'Calculator',
			mockItems: toExecutionItems([{ id: 1 }]),
		});

		// Without this the plan finds no main parent of the tool, degrades to a
		// chain run, and "Create Ticket" writes again.
		expect(plan.inputMode).toBe('mocked');
		expect(plan.mockedNodeNames.sort()).toEqual(['Create Ticket', 'Trigger']);
		expect(plan.rootNodeNames).toEqual(['Agent']);
		expect(itemsOn(plan.runData!, 'Create Ticket')).toEqual([{ json: { id: 1 } }]);
		// The Agent is replaced by the engine's Tool Executor, so it gets no run
		// data of its own.
		expect(plan.runData?.Agent).toBeUndefined();
		expect(plan.dirtyNodeNames).toEqual(['Calculator']);
	});

	it('replays the Agent path when the target is its tool', () => {
		const priorRunData: IRunData = {
			Trigger: [taskData([{ json: {} }])],
			'Create Ticket': [taskData([{ json: {} }])],
			Agent: [taskData([{ json: {} }])],
		};

		const plan = planStepRun({ nodes, connections, targetName: 'Calculator', priorRunData });

		expect(plan.inputMode).toBe('reused-execution');
		expect(plan.reusedNodeNames.sort()).toEqual(['Create Ticket', 'Trigger']);
		expect(plan.rootNodeNames).toEqual(['Agent']);
		expect(plan.dirtyNodeNames).toEqual(['Calculator']);
	});

	it('runs the chain for a tool with no node to run it', () => {
		const orphan = [node('Trigger'), node('Calculator')];

		const plan = planStepRun({
			nodes: orphan,
			connections: {},
			targetName: 'Calculator',
			mockItems: toExecutionItems([{ id: 1 }]),
		});

		// Nothing above it to keep from running, so the engine's own "connect it
		// to an Agent" error is the right outcome.
		expect(plan.inputMode).toBe('chain');
		expect(plan.unhonoredInput).toBeUndefined();
	});
});

/**
 * The engine's own graph rules, run on the plan. The planner exists to satisfy
 * `findStartNodes`, so a unit test of the plan alone cannot prove it works.
 */
describe('the plan against the engine rules', () => {
	const trigger = node('Trigger');
	const createTicket = node('Create Ticket');
	const agent = node('Agent');
	const calculator = node('Calculator');
	const nodes = [trigger, createTicket, agent, calculator];
	const connections = connectSubNode(
		connect(['Trigger', 'Create Ticket'], ['Create Ticket', 'Agent']),
		'Calculator',
		'Agent',
	);

	/** What `runPartialWorkflow2` does to a tool destination, then who starts. */
	function startNodesFor(runData: IRunData) {
		const graph = new DirectedGraph()
			.addNodes(...nodes)
			.addConnections(
				{ from: trigger, to: createTicket },
				{ from: createTicket, to: agent },
				{ from: calculator, to: agent, type: NodeConnectionTypes.AiTool },
			);
		const rewired = rewireGraph(calculator, graph);
		const destination = rewired.getNodes().get(TOOL_EXECUTOR_NODE_NAME);
		expect(destination).toBeDefined();

		const subgraph = findSubgraph({ graph: rewired, destination: destination!, trigger });
		return [
			...findStartNodes({
				graph: subgraph,
				trigger,
				destination: destination!,
				runData,
				pinData: {},
			}),
		].map((startNode) => startNode.name);
	}

	it('starts at the Tool Executor, so no node above the Agent runs again', () => {
		const plan = planStepRun({
			nodes,
			connections,
			targetName: 'Calculator',
			mockItems: toExecutionItems([{ id: 1 }]),
		});

		expect(startNodesFor(plan.runData!)).toEqual([TOOL_EXECUTOR_NODE_NAME]);
	});

	it('starts at the trigger without run data, which is the chain run to avoid', () => {
		expect(startNodesFor({})).toEqual(['Trigger']);
	});

	// Proof that refusing a partly covered replay is not over-caution: fed to the
	// engine, that run data starts at a real node, and "Create Ticket" writes.
	it('refuses a replay whose gap would run a real node', () => {
		const priorRunData: IRunData = { Trigger: [taskData([{ json: {} }])] };

		const plan = planStepRun({
			nodes,
			connections,
			targetName: 'Calculator',
			priorRunData,
		});

		expect(plan.inputMode).toBe('chain');
		expect(plan.unhonoredInput?.upstreamNodeNames).toEqual(['Create Ticket']);
		expect(startNodesFor(priorRunData)).toEqual(['Create Ticket']);
	});

	// The Agent is rarely the last node. `rewireGraph` used to walk every
	// descendant of the tool and stand in for the *farthest* one, so a node below
	// the Agent supplied the Tool Executor's main parents and the Agent — plus
	// everything between it and that node — ran again.
	it('starts at the Tool Executor when the Agent has nodes below it', () => {
		const notify = node('Notify');
		const summarize = node('Summarize');
		const withDownstream = [...nodes, notify, summarize];
		const connectionsWithDownstream = connectSubNode(
			connect(
				['Trigger', 'Create Ticket'],
				['Create Ticket', 'Agent'],
				['Agent', 'Notify'],
				['Notify', 'Summarize'],
			),
			'Calculator',
			'Agent',
		);

		const plan = planStepRun({
			nodes: withDownstream,
			connections: connectionsWithDownstream,
			targetName: 'Calculator',
			mockItems: toExecutionItems([{ id: 1 }]),
		});

		const graph = new DirectedGraph()
			.addNodes(...withDownstream)
			.addConnections(
				{ from: trigger, to: createTicket },
				{ from: createTicket, to: agent },
				{ from: agent, to: notify },
				{ from: notify, to: summarize },
				{ from: calculator, to: agent, type: NodeConnectionTypes.AiTool },
			);
		const rewired = rewireGraph(calculator, graph);
		const destination = rewired.getNodes().get(TOOL_EXECUTOR_NODE_NAME);
		expect(destination).toBeDefined();

		const subgraph = findSubgraph({ graph: rewired, destination: destination!, trigger });
		const startNodes = [
			...findStartNodes({
				graph: subgraph,
				trigger,
				destination: destination!,
				runData: plan.runData!,
				pinData: {},
			}),
		].map((startNode) => startNode.name);

		expect(startNodes).toEqual([TOOL_EXECUTOR_NODE_NAME]);
		// Neither node below the Agent is even part of the run.
		expect([...subgraph.getNodes().keys()]).not.toContain('Notify');
		expect([...subgraph.getNodes().keys()]).not.toContain('Summarize');
	});
});

describe('tool arguments', () => {
	describe('declaredToolArguments', () => {
		it('collects the $fromAI keys a tool expects the agent to fill', () => {
			const target: INode = {
				...node('Create Ticket'),
				parameters: {
					url: "={{ $fromAI('url', 'the endpoint') }}",
					body: {
						title: "={{ $fromAI('title') }}",
						assignee: "={{ $fromAI('assignee', '', 'string') }}",
					},
				},
			};

			expect(declaredToolArguments(target).sort()).toEqual(['assignee', 'title', 'url']);
		});

		it('returns nothing for a tool whose parameters are all static', () => {
			expect(declaredToolArguments(node('Calculator'))).toEqual([]);
		});
	});

	describe('isToolkitNode', () => {
		it('is true for the MCP Client Tool, which holds several tools', () => {
			expect(
				isToolkitNode(node('MCP Client', { type: '@n8n/n8n-nodes-langchain.mcpClientTool' })),
			).toBe(true);
		});

		// A registry server is saved as `@n8n/mcp-registry.<slug>`. The runtime
		// class behind every one of them is hidden and never appears as a node
		// type, so matching that class name matches nothing a user can build.
		it('is true for a node the MCP registry added, whatever the server slug', () => {
			expect(isToolkitNode(node('Linear', { type: '@n8n/mcp-registry.linear' }))).toBe(true);
			expect(isToolkitNode(node('Notion', { type: '@n8n/mcp-registry.notionMcp' }))).toBe(true);
		});

		it('is false for a type that only starts like the registry package', () => {
			expect(isToolkitNode(node('Decoy', { type: '@n8n/mcp-registryish.thing' }))).toBe(false);
		});

		it('is false for a node that supplies one tool', () => {
			expect(
				isToolkitNode(node('Calculator', { type: '@n8n/n8n-nodes-langchain.toolCalculator' })),
			).toBe(false);
		});
	});

	describe('buildToolAgentRequest', () => {
		it('names no tool, so the runtime name cannot stop the tool from running', () => {
			// An empty name makes the Tool Executor run the only tool the rewired
			// graph connects to it. Naming one risks a miss: older tool versions read
			// the runtime name from a parameter, and Think 1 hardcodes its own.
			expect(buildToolAgentRequest({ target: node('Calculator') }).tool).toEqual({ name: '' });
		});

		it('keys the arguments by every name the tool can have', () => {
			expect(
				buildToolAgentRequest({
					target: node('Create Ticket'),
					toolArguments: { title: 'Broken login' },
				}).query,
			).toEqual({
				// `nodeNameToToolName` of the node, which current versions use...
				Create_Ticket: { title: 'Broken login' },
				// ...and the node name itself, which the lookup falls back to.
				'Create Ticket': { title: 'Broken login' },
			});
		});

		it("adds a legacy version's configured name", () => {
			// Code Tool <= 1.1, Vector Store Tool <= 1 and Workflow Tool <= 2.1 read
			// the tool name from `name`.
			const target = node('Search Tickets');
			target.parameters = { name: 'search_tickets' };

			expect(buildToolAgentRequest({ target, toolArguments: { q: 'login' } }).query).toEqual({
				Search_Tickets: { q: 'login' },
				'Search Tickets': { q: 'login' },
				search_tickets: { q: 'login' },
			});
		});

		it("adds a retrieve-as-tool vector store's configured name", () => {
			const target = node('Docs');
			target.parameters = { toolName: 'company_docs' };

			expect(buildToolAgentRequest({ target }).query).toEqual({ Docs: {}, company_docs: {} });
		});

		it('passes a bare string through for a tool with one free-text input', () => {
			expect(
				buildToolAgentRequest({ target: node('Wikipedia'), toolArguments: 'Napoleon' }).query,
			).toEqual({ Wikipedia: 'Napoleon' });
		});

		it('sends an empty argument set when the caller supplies none', () => {
			expect(buildToolAgentRequest({ target: node('Calculator') }).query).toEqual({
				Calculator: {},
			});
		});
	});
});
