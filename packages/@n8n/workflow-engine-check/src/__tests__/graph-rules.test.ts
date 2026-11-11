import type { IConnections, INode } from 'n8n-workflow';

import { checkEngineV2Eligibility, type EngineV2ReasonCode } from '../index';

/** `[from, to, outputIndex = 0, inputIndex = 0]` */
type Connection = [string, string, number?, number?];

/** Node types follow the name: `Trigger*` is a manual trigger, `Loop*` a Split In Batches. */
function nodeNamed(name: string, disabled: boolean): INode {
	const node: INode = {
		id: name.toLowerCase(),
		name,
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		disabled,
	};
	if (name.startsWith('Trigger')) node.type = 'n8n-nodes-base.manualTrigger';
	if (name.startsWith('Loop')) {
		node.type = 'n8n-nodes-base.splitInBatches';
		node.typeVersion = 3;
		node.parameters = { batchSize: 1 };
	}
	return node;
}

function check(connectionList: Connection[], disabled: string[] = []) {
	const names = [...new Set(connectionList.flatMap(([from, to]) => [from, to]))];
	const connections: IConnections = {};
	for (const [from, to, outputIndex = 0, inputIndex = 0] of connectionList) {
		const slots = (connections[from] ??= { main: [] }).main;
		while (slots.length <= outputIndex) slots.push([]);
		slots[outputIndex]!.push({ node: to, type: 'main', index: inputIndex });
	}
	const nodes = names.map((name) => nodeNamed(name, disabled.includes(name)));
	return checkEngineV2Eligibility({ nodes, connections, settings: {} }, []);
}

const simpleLoop: Connection[] = [
	['Trigger', 'Loop'],
	['Loop', 'Body', 1],
	['Body', 'Loop'],
	['Loop', 'After', 0],
];

describe('graph rules', () => {
	it.each<{ shape: string; connections: Connection[]; code: EngineV2ReasonCode; node?: string }>([
		{
			shape: 'a cycle without a Split In Batches node',
			connections: [
				['Trigger', 'A'],
				['A', 'B'],
				['B', 'A'],
			],
			code: 'CYCLE_WITHOUT_SPLIT_IN_BATCHES',
		},
		{
			shape: 'a cycle whose node names contain "|"',
			connections: [
				['Trigger', 'A'],
				['A', 'B|C'],
				['B|C', 'A|B'],
				['A|B', 'C'],
				['C', 'A'],
			],
			code: 'CYCLE_WITHOUT_SPLIT_IN_BATCHES',
		},
		{
			shape: 'a loop entered at a body node',
			connections: [
				['Trigger', 'Body'],
				['Body', 'Loop'],
				['Loop', 'Body', 1],
				['Loop', 'After', 0],
			],
			code: 'LOOP_ENTERED_MID_BODY',
			node: 'Body',
		},
		{
			shape: 'a loop entered at its Split In Batches node and at a body node',
			connections: [...simpleLoop, ['Trigger', 'Body', 0, 1]],
			code: 'LOOP_ENTERED_MID_BODY',
			node: 'Body',
		},
		{
			shape: 'a loop with two entry connections',
			connections: [...simpleLoop, ['Trigger', 'Before'], ['Before', 'Loop']],
			code: 'LOOP_MULTIPLE_ENTRIES',
			node: 'Loop',
		},
		{
			shape: 'a loop entered at two Split In Batches nodes',
			connections: [
				['Trigger', 'LoopA'],
				['Trigger', 'LoopB'],
				['LoopA', 'LoopB', 1],
				['LoopB', 'LoopA', 1],
			],
			code: 'LOOP_MULTIPLE_ENTRIES',
			node: 'LoopA',
		},
		{
			shape: 'a loop with two return connections',
			connections: [
				['Trigger', 'Loop'],
				['Loop', 'If', 1],
				['If', 'Loop', 0],
				['If', 'Loop', 1],
				['Loop', 'After', 0],
			],
			code: 'LOOP_MULTIPLE_RETURNS',
			node: 'Loop',
		},
		{
			shape: 'a loop nested inside another loop',
			connections: [
				['Trigger', 'LoopOuter'],
				['LoopOuter', 'LoopInner', 1],
				['LoopInner', 'Body', 1],
				['Body', 'LoopInner'],
				['LoopInner', 'LoopOuter', 0],
				['LoopOuter', 'After', 0],
			],
			code: 'NESTED_LOOP',
			node: 'LoopInner',
		},
		{
			shape: 'a loop that a body node leaves',
			connections: [...simpleLoop, ['Body', 'Side', 1]],
			code: 'LOOP_EXITS_MID_BODY',
			node: 'Body',
		},
		{
			shape: 'a loop that the loop output leaves',
			connections: [...simpleLoop, ['Loop', 'Side', 1]],
			code: 'LOOP_EXITS_MID_BODY',
			node: 'Loop',
		},
		{
			shape: 'two connections into one input',
			connections: [
				['Trigger', 'If'],
				['If', 'Join', 0],
				['If', 'Join', 1],
			],
			code: 'INPUT_SLOT_CONVERGENCE',
			node: 'Join',
		},
	])('blocks $shape with code $code', ({ connections, code, node }) => {
		const result = check(connections);

		expect(result.eligible).toBe(false);
		expect(result.reasons).toEqual([
			{
				code,
				severity: 'blocking',
				message: expect.any(String),
				...(node && { nodeId: node.toLowerCase(), nodeName: node }),
			},
		]);
	});

	it.each<{ shape: string; connections: Connection[]; disabled?: string[] }>([
		{ shape: 'a simple loop', connections: simpleLoop },
		{
			shape: 'a loop whose body branches and rejoins on two inputs',
			connections: [
				['Trigger', 'Loop'],
				['Loop', 'Fork', 1],
				['Fork', 'Left'],
				['Fork', 'Right'],
				['Left', 'Join', 0, 0],
				['Right', 'Join', 0, 1],
				['Join', 'Loop'],
				['Loop', 'After', 0],
			],
		},
		{
			shape: 'a loop that returns straight to itself',
			connections: [
				['Trigger', 'Loop'],
				['Loop', 'Loop', 1],
				['Loop', 'After', 0],
			],
		},
		{
			shape: 'two loops in a row',
			connections: [
				['Trigger', 'LoopOne'],
				['LoopOne', 'BodyOne', 1],
				['BodyOne', 'LoopOne'],
				['LoopOne', 'LoopTwo', 0],
				['LoopTwo', 'BodyTwo', 1],
				['BodyTwo', 'LoopTwo'],
				['LoopTwo', 'After', 0],
			],
		},
		{
			shape: 'a cycle that no trigger reaches',
			connections: [
				['Trigger', 'A'],
				['B', 'C'],
				['C', 'B'],
			],
		},
		{
			// Bypassing the disabled node gives A -> After twice, and the converter keeps one.
			shape: 'a disabled node next to a direct connection to the same input',
			connections: [
				['Trigger', 'A'],
				['A', 'Disabled'],
				['Disabled', 'After'],
				['A', 'After'],
			],
			disabled: ['Disabled'],
		},
	])('allows $shape', ({ connections, disabled }) => {
		expect(check(connections, disabled)).toEqual({ eligible: true, reasons: [] });
	});

	it('reports a shape once when several triggers reach it', () => {
		const { reasons } = check([
			['Trigger', 'A'],
			['TriggerTwo', 'A'],
			['A', 'B'],
			['B', 'A'],
		]);

		expect(reasons.map((reason) => reason.code)).toEqual(['CYCLE_WITHOUT_SPLIT_IN_BATCHES']);
	});
});
