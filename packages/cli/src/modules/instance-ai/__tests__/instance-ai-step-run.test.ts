import { TOOL_EXECUTOR_NODE_NAME } from '@n8n/constants';
import {
	cleanRunData,
	DirectedGraph,
	findStartNodes,
	findSubgraph,
	handleCycles,
	rewireGraph,
} from 'n8n-core';
import type { IConnections, INode, IRunData, ITaskData, NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	buildMockedStepRunData,
	buildToolAgentRequest,
	collectAncestorNames,
	declaredToolArguments,
	findRootsAboveOtherRoots,
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
	it('does not count the target as its own ancestor', () => {
		const selfLooping = [node('Target')];
		const connections = connect(['Target', 'Target']);

		expect(collectAncestorNames(selfLooping, connections, 'Target')).toEqual([]);
	});

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

		/**
		 * Where the engine starts a run to `Target`: the steps `runPartialWorkflow2`
		 * takes, from the subgraph to the cycle handling.
		 */
		function engineStartNodes(
			graphNodes: INode[],
			graphConnections: IConnections,
			runData: IRunData,
		) {
			const graph = DirectedGraph.fromNodesAndConnections(graphNodes, graphConnections);
			const byName = graph.getNodes();
			const trigger = byName.get('Trigger')!;
			const destination = byName.get('Target')!;

			const subgraph = findSubgraph({ graph, destination, trigger });
			const cleaned = cleanRunData(runData, subgraph, new Set([destination]));
			const startNodes = findStartNodes({
				graph: subgraph,
				trigger,
				destination,
				runData: cleaned,
				pinData: {},
			});
			return [...handleCycles(subgraph, startNodes, trigger)].map((startNode) => startNode.name);
		}

		const failedTask = (): ITaskData => ({
			...taskData([{ json: {} }]),
			error: new Error('timed out') as ITaskData['error'],
		});

		it('refuses a replay whose node failed, because the engine retries it', () => {
			const priorRunData: IRunData = {
				Trigger: [taskData([{ json: {} }])],
				Fetch: [failedTask()],
			};

			const plan = planStepRun({ nodes, connections, targetName: 'Target', priorRunData });

			expect(plan.inputMode).toBe('chain');
			expect(plan.unhonoredInput?.upstreamNodeNames).toEqual(['Fetch']);
			expect(engineStartNodes(nodes, connections, priorRunData)).toEqual(['Fetch']);
		});

		it('refuses a replay whose pinned node failed, because the error outranks the pin', () => {
			const priorRunData: IRunData = {
				Trigger: [taskData([{ json: {} }])],
				Fetch: [failedTask()],
			};

			const plan = planStepRun({
				nodes,
				connections,
				targetName: 'Target',
				priorRunData,
				pinnedNodeNames: ['Fetch'],
			});

			expect(plan.unhonoredInput?.upstreamNodeNames).toEqual(['Fetch']);
		});

		describe('a Loop Over Items node above the target', () => {
			const loopNodes = [
				node('Trigger'),
				node('Loop', { type: 'n8n-nodes-base.splitInBatches' }),
				node('Body'),
				node('Target'),
			];
			const loopRunning = taskDataOnOutputs([[], [{ json: {} }]]);
			const loopDone = taskDataOnOutputs([[{ json: {} }], []]);
			const runOf = (...loopRuns: ITaskData[]): IRunData => ({
				Trigger: [taskData([{ json: {} }])],
				Loop: loopRuns,
				Body: [taskData([{ json: {} }])],
			});
			const plan = (connections: IConnections, input: Partial<Parameters<typeof planStepRun>[0]>) =>
				planStepRun({ nodes: loopNodes, connections, targetName: 'Target', ...input });
			const mockItems = toExecutionItems([{ id: 1 }]);

			it('refuses a replay that starts at an unfinished loop with no input', () => {
				// Loop "loop" -> Target, and nothing feeds the Loop node. With no
				// trigger, the engine starts its walk at the Loop node and still
				// applies the loop rule to it.
				const sourceLoop = connect(['Loop:1', 'Target']);
				const priorRunData: IRunData = { Loop: [loopDone] };

				expect(plan(sourceLoop, { priorRunData }).unhonoredInput?.upstreamNodeNames).toEqual([
					'Loop',
				]);

				const graph = DirectedGraph.fromNodesAndConnections(loopNodes, sourceLoop);
				const loop = graph.getNodes().get('Loop')!;
				const target = graph.getNodes().get('Target')!;
				const subgraph = findSubgraph({ graph, destination: target, trigger: loop });
				const startNodes = findStartNodes({
					graph: subgraph,
					trigger: loop,
					destination: target,
					runData: priorRunData,
					pinData: {},
				});
				expect([...startNodes].map((startNode) => startNode.name)).toEqual(['Loop']);
			});

			describe('with the target after the done output', () => {
				// Trigger -> Loop; Loop "loop" -> Body -> Loop; Loop "done" -> Target.
				const afterDone = connect(
					['Trigger', 'Loop'],
					['Loop:1', 'Body'],
					['Body', 'Loop'],
					['Loop:0', 'Target'],
				);

				it('refuses a replay of a loop that stopped before its done output', () => {
					const priorRunData = runOf(loopRunning);

					expect(plan(afterDone, { priorRunData }).unhonoredInput?.upstreamNodeNames).toEqual([
						'Loop',
					]);
					expect(engineStartNodes(loopNodes, afterDone, priorRunData)).toEqual(['Loop']);
				});

				it('accepts a replay of a loop that finished', () => {
					const priorRunData = runOf(loopRunning, loopDone);

					expect(plan(afterDone, { priorRunData }).inputMode).toBe('reused-execution');
					expect(engineStartNodes(loopNodes, afterDone, priorRunData)).toEqual(['Target']);
				});

				it('mocks the path, because the mock fills the done output', () => {
					const mocked = plan(afterDone, { mockItems });

					expect(mocked.inputMode).toBe('mocked');
					expect(engineStartNodes(loopNodes, afterDone, mocked.runData!)).toEqual(['Target']);
				});
			});

			describe('with the target on the cycle', () => {
				// Trigger -> Loop; Loop "loop" -> Body -> Target -> Loop.
				// `findSubgraph` drops a cycle through the destination, so the engine
				// treats the Loop node as a plain node.
				const onCycle = connect(
					['Trigger', 'Loop'],
					['Loop:1', 'Body'],
					['Body', 'Target'],
					['Target', 'Loop'],
				);

				it('refuses a replay of a finished loop, which the engine restarts', () => {
					const priorRunData = runOf(loopRunning, loopDone);

					expect(plan(onCycle, { priorRunData }).unhonoredInput?.upstreamNodeNames).toEqual([
						'Loop',
					]);
					expect(engineStartNodes(loopNodes, onCycle, priorRunData)).toEqual(['Loop']);
				});

				it('mocks the path', () => {
					const mocked = plan(onCycle, { mockItems });

					expect(mocked.inputMode).toBe('mocked');
					expect(engineStartNodes(loopNodes, onCycle, mocked.runData!)).toEqual(['Target']);
				});
			});

			describe('with the target off the loop body', () => {
				// Trigger -> Loop; Loop "loop" -> Body -> Loop, and Body -> Target.
				const offBody = connect(
					['Trigger', 'Loop'],
					['Loop:1', 'Body'],
					['Body', 'Loop'],
					['Body', 'Target'],
				);

				it('refuses mocked input, which leaves the done output empty', () => {
					const refused = plan(offBody, { mockItems });

					expect(refused.inputMode).toBe('chain');
					expect(refused.unhonoredInput).toEqual({
						requested: 'mocked',
						upstreamNodeNames: ['Loop'],
					});

					// Fed to the engine, the mock restarts the loop, and "Body" runs.
					const { runData } = buildMockedStepRunData({
						nodes: loopNodes,
						connections: offBody,
						targetName: 'Target',
						mockItems,
					});
					expect(engineStartNodes(loopNodes, offBody, runData)).toEqual(['Loop']);
				});

				it('accepts a replay of a loop that finished', () => {
					const priorRunData = runOf(loopRunning, loopDone);

					expect(plan(offBody, { priorRunData }).inputMode).toBe('reused-execution');
					expect(engineStartNodes(loopNodes, offBody, priorRunData)).toEqual(['Target']);
				});
			});
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

// Mocking walks the same edges from the same roots as the ancestor walk, so a
// target with a node above it always has something to mock, and a mocked
// request never has to be refused. A self loop broke that: the mock skipped the
// target, the ancestor walk counted it, and the plan reported the target as a
// node above itself.
describe('a mocked request without a loop never goes unhonoured', () => {
	const shapes: Array<[string, INode[], IConnections]> = [
		['a chain above the target', [node('Trigger'), node('Target')], connect(['Trigger', 'Target'])],
		['nothing above the target', [node('Target')], {}],
		['a self loop', [node('Target')], connect(['Target', 'Target'])],
		[
			'a two-node cycle',
			[node('Target'), node('Other')],
			connect(['Target', 'Other'], ['Other', 'Target']),
		],
		[
			'a self loop below a trigger',
			[node('Trigger'), node('Target')],
			connect(['Trigger', 'Target'], ['Target', 'Target']),
		],
	];

	it.each(shapes)('%s', (_label, nodes, connections) => {
		const plan = planStepRun({
			nodes,
			connections,
			targetName: 'Target',
			mockItems: toExecutionItems([{ id: 1 }]),
		});

		expect(plan.unhonoredInput).toBeUndefined();
		// Either the plan mocked the path, or there was no path to mock.
		const ancestors = collectAncestorNames(nodes, connections, 'Target');
		expect(plan.mockedNodeNames.length > 0 || ancestors.length === 0).toBe(true);
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

	describe('findRootsAboveOtherRoots', () => {
		const stacked = [node('Trigger'), node('Agent A'), node('POST'), node('Agent B')];

		it('names the root that runs above another root', () => {
			const stackedConnections = connect(
				['Trigger', 'Agent A'],
				['Agent A', 'POST'],
				['POST', 'Agent B'],
			);

			expect(findRootsAboveOtherRoots(stacked, stackedConnections, ['Agent B', 'Agent A'])).toEqual(
				['Agent A'],
			);
		});

		it('names nothing for roots on parallel branches', () => {
			const parallelConnections = connect(
				['Trigger', 'Agent A'],
				['Trigger', 'POST'],
				['POST', 'Agent B'],
			);

			expect(
				findRootsAboveOtherRoots(stacked, parallelConnections, ['Agent A', 'Agent B']),
			).toEqual([]);
		});

		it('names every root on a loop, where none is the topmost', () => {
			const loopConnections = connect(
				['Trigger', 'Agent A'],
				['Agent A', 'Agent B'],
				['Agent B', 'Agent A'],
			);

			expect(findRootsAboveOtherRoots(stacked, loopConnections, ['Agent A', 'Agent B'])).toEqual([
				'Agent A',
				'Agent B',
			]);
		});

		it('names nothing for a single root', () => {
			expect(findRootsAboveOtherRoots(nodes, connections, ['Agent'])).toEqual([]);
		});
	});

	it('runs the chain for a tool with no node to run it', () => {
		const orphan = [node('Trigger'), node('Calculator')];

		const plan = planStepRun({
			nodes: orphan,
			connections: {},
			targetName: 'Calculator',
			mockItems: toExecutionItems([{ id: 1 }]),
		});

		// Nothing above it to keep from running, so the plan has nothing to say.
		// The run is refused a step later, where the node types are known and the
		// message can name the missing Agent — see the adapter tests.
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

	// Proof that refusing a tool on stacked Agents is not over-caution. The plan
	// covers both Agents, yet the engine drops that data when it picks the
	// lower one, and the upper Agent and "POST" run for real.
	describe('a tool shared by an Agent and an Agent below it', () => {
		const agentA = node('Agent A');
		const post = node('POST');
		const agentB = node('Agent B');
		const tool = node('Calculator');
		const stacked = [trigger, agentA, post, agentB, tool];
		const stackedConnections = connect(
			['Trigger', 'Agent A'],
			['Agent A', 'POST'],
			['POST', 'Agent B'],
		);
		stackedConnections.Calculator = {
			[NodeConnectionTypes.AiTool]: [
				[
					{ node: 'Agent A', type: NodeConnectionTypes.AiTool, index: 0 },
					{ node: 'Agent B', type: NodeConnectionTypes.AiTool, index: 0 },
				],
			],
		};

		/** Runs the engine's partial-run steps, with the tool's edges in `order`. */
		function startNodesFor(order: INode[]) {
			const plan = planStepRun({
				nodes: stacked,
				connections: stackedConnections,
				targetName: 'Calculator',
				mockItems: toExecutionItems([{ id: 1 }]),
			});

			const graph = new DirectedGraph()
				.addNodes(...stacked)
				.addConnections(
					{ from: trigger, to: agentA },
					{ from: agentA, to: post },
					{ from: post, to: agentB },
					...order.map((agent) => ({ from: tool, to: agent, type: NodeConnectionTypes.AiTool })),
				);
			const rewired = rewireGraph(tool, graph);
			const destination = rewired.getNodes().get(TOOL_EXECUTOR_NODE_NAME)!;
			const subgraph = findSubgraph({ graph: rewired, destination, trigger });
			const runData = cleanRunData(
				plan.runData!,
				subgraph,
				subgraph.getNodesByNames(['Calculator']),
			);

			return [
				...findStartNodes({ graph: subgraph, trigger, destination, runData, pinData: {} }),
			].map((startNode) => startNode.name);
		}

		it('runs the upper Agent again when the engine picks the lower one', () => {
			expect(startNodesFor([agentB, agentA])).toEqual(['Agent A']);
		});

		it('starts at the Tool Executor when the engine picks the upper one', () => {
			expect(startNodesFor([agentA, agentB])).toEqual([TOOL_EXECUTOR_NODE_NAME]);
		});
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
