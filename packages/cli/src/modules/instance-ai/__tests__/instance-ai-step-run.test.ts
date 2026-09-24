import type { IConnections, INode, IRunData, ITaskData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	buildMockedStepRunData,
	collectAncestorNames,
	pinDataForStepRun,
	planStepRun,
	toExecutionItems,
} from '../instance-ai-step-run';

function node(name: string, options: { disabled?: boolean } = {}): INode {
	return {
		id: name,
		name,
		type: 'n8n-nodes-base.noOp',
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

function itemsOn(runData: IRunData, nodeName: string, outputIndex = 0) {
	return runData[nodeName]?.[0]?.data?.[NodeConnectionTypes.Main]?.[outputIndex];
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

	it('runs the chain when the prior run never reached an ancestor', () => {
		// The prior run only covers a node on an unrelated branch.
		const priorRunData: IRunData = { Elsewhere: [taskData([{ json: {} }])] };

		const plan = planStepRun({ nodes, connections, targetName: 'Target', priorRunData });

		expect(plan.inputMode).toBe('chain');
		expect(plan.runData).toBeUndefined();
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
