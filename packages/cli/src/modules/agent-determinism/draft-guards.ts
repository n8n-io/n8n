import type { NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';
import { randomUUID } from 'node:crypto';
import type { JSONObject, JSONValue } from '@n8n/utils/json/to-json-value';

import { DRAFT_OUTPUT_NODE_NAME } from './agent-determinism.constants';
import type { RecordedRun } from './agent-determinism.contracts';

const INPUT_CHECK_NODE_NAME = 'Input fits draft?';
const OUTPUT_CHECK_NODE_NAME = 'Output looks right?';
const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';

type Connections = WorkflowJSON['connections'];

function isObject(value: JSONValue): value is JSONObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sharedKeys(objects: JSONObject[]) {
	if (objects.length === 0) return [];
	return Object.keys(objects[0]).filter((key) => objects.every((object) => key in object));
}

function booleanCheck(name: string, expression: string, position: [number, number]): NodeJSON {
	return {
		id: randomUUID(),
		name,
		type: 'n8n-nodes-base.if',
		typeVersion: 2.2,
		position,
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
				conditions: [
					{
						id: randomUUID(),
						leftValue: `={{ ${expression} }}`,
						rightValue: '',
						operator: { type: 'boolean', operation: 'true', singleValue: true },
					},
				],
				combinator: 'and',
			},
		},
	};
}

function findTrigger(draft: WorkflowJSON) {
	const targets = new Set(
		Object.values(draft.connections).flatMap((outputs) =>
			(outputs.main ?? []).flat().map((connection) => connection?.node),
		),
	);
	return draft.nodes.find(
		(node) => node.name && node.type !== STICKY_NOTE_TYPE && !targets.has(node.name),
	);
}

function retarget(connections: Connections, from: string, to: string) {
	for (const outputs of Object.values(connections)) {
		for (const branch of outputs.main ?? []) {
			for (const connection of branch ?? []) {
				if (connection.node === from) connection.node = to;
			}
		}
	}
}

export function wrapWithGuards(
	draft: WorkflowJSON,
	trainRuns: RecordedRun[],
	fallback: { nodes: NodeJSON[]; connections: Connections; entryNodeName: string },
): WorkflowJSON {
	const trigger = findTrigger(draft);
	const output = draft.nodes.find((node) => node.name === DRAFT_OUTPUT_NODE_NAME);
	if (!trigger?.name || !output) {
		throw new Error('The draft needs one trigger and an Output node');
	}

	const connections: Connections = structuredClone(draft.connections);
	const [x, y] = trigger.position;
	const inputKeys = sharedKeys(trainRuns.map((run) => run.input));
	const objectOutputs = trainRuns.map((run) => run.output).filter(isObject);
	const outputKeys = objectOutputs.length === trainRuns.length ? sharedKeys(objectOutputs) : [];

	const inputCheck = booleanCheck(
		INPUT_CHECK_NODE_NAME,
		`${JSON.stringify(inputKeys)}.every((key) => $json[key] !== undefined)`,
		[x + 200, y + 200],
	);
	const outputCheck = booleanCheck(
		OUTPUT_CHECK_NODE_NAME,
		`Object.keys($json).length > 0 && ${JSON.stringify(outputKeys)}.every((key) => key in $json)`,
		[output.position[0] - 200, output.position[1] + 200],
	);

	retarget(connections, DRAFT_OUTPUT_NODE_NAME, OUTPUT_CHECK_NODE_NAME);
	const triggerTargets = connections[trigger.name]?.main ?? [];
	connections[trigger.name] = { main: [[{ node: INPUT_CHECK_NODE_NAME, type: 'main', index: 0 }]] };
	connections[INPUT_CHECK_NODE_NAME] = {
		main: [triggerTargets[0] ?? [], [{ node: fallback.entryNodeName, type: 'main', index: 0 }]],
	};
	connections[OUTPUT_CHECK_NODE_NAME] = {
		main: [
			[{ node: DRAFT_OUTPUT_NODE_NAME, type: 'main', index: 0 }],
			[{ node: fallback.entryNodeName, type: 'main', index: 0 }],
		],
	};

	return {
		...draft,
		nodes: [...draft.nodes, inputCheck, outputCheck, ...fallback.nodes],
		connections: { ...connections, ...fallback.connections },
	};
}
