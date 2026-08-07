import {
	generateWorkflowCode,
	parseWorkflowCodeToBuilder,
	type WorkflowJSON,
} from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import { preserveExistingNodePositions } from '../preserve-node-positions';

/**
 * End-to-end guard for the omitPositions codegen change: an edit roundtrip
 * (saved workflow -> get-as-code -> rebuild) must land every surviving node on
 * its saved coordinates even though the generated code no longer carries
 * position arrays, and a fresh build must still get a real auto-layout (no
 * [0, 0] pile-ups).
 */

const SAVED: WorkflowJSON = {
	id: 'wf-1',
	name: 'Position Roundtrip',
	nodes: [
		{
			id: '1',
			name: 'Every Hour',
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1.2,
			position: [180, 240],
			parameters: {},
		},
		{
			id: '2',
			name: 'Fetch Tasks',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.3,
			position: [420, 240],
			parameters: { method: 'GET', url: 'https://api.acme.dev/tasks' },
		},
		{
			id: '3',
			name: 'Is Urgent',
			type: 'n8n-nodes-base.if',
			typeVersion: 2.2,
			position: [660, 240],
			parameters: {},
		},
		{
			id: '4',
			name: 'Notify Team',
			type: 'n8n-nodes-base.slack',
			typeVersion: 2.3,
			position: [900, 120],
			parameters: { resource: 'message', operation: 'post' },
		},
		{
			id: '5',
			name: 'Log Skipped',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [900, 380],
			parameters: {},
		},
		{
			id: '6',
			name: 'Sticky Note',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [140, 40],
			parameters: { content: 'Escalation flow', width: 900, height: 460 },
		},
	],
	connections: {
		'Every Hour': { main: [[{ node: 'Fetch Tasks', type: 'main', index: 0 }]] },
		'Fetch Tasks': { main: [[{ node: 'Is Urgent', type: 'main', index: 0 }]] },
		'Is Urgent': {
			main: [
				[{ node: 'Notify Team', type: 'main', index: 0 }],
				[{ node: 'Log Skipped', type: 'main', index: 0 }],
			],
		},
	},
};

function makeContext(): InstanceAiContext {
	return {
		workflowService: { getAsWorkflowJSON: vi.fn().mockResolvedValue(SAVED) },
		logger: { warn: vi.fn(), debug: vi.fn() },
	} as unknown as InstanceAiContext;
}

function positionsByName(json: WorkflowJSON): Map<string, [number, number]> {
	const map = new Map<string, [number, number]>();
	for (const node of json.nodes) {
		if (node.name && Array.isArray(node.position)) {
			map.set(node.name, [node.position[0], node.position[1]]);
		}
	}
	return map;
}

async function rebuildFromCode(omitPositions: boolean): Promise<WorkflowJSON> {
	const code = generateWorkflowCode({ workflow: SAVED, omitPositions });
	if (omitPositions) expect(code).not.toContain('position:');
	const json = parseWorkflowCodeToBuilder(code).toJSON({ tidyUp: true });
	await preserveExistingNodePositions(json, 'wf-1', makeContext());
	return json;
}

describe('position roundtrip with omitPositions', () => {
	it('restores every saved node position on an edit roundtrip without positions in code', async () => {
		const withPositions = await rebuildFromCode(false);
		const withoutPositions = await rebuildFromCode(true);

		const expected = positionsByName(SAVED);
		for (const [name, position] of expected) {
			expect(positionsByName(withoutPositions).get(name)).toEqual(position);
			expect(positionsByName(withPositions).get(name)).toEqual(position);
		}
		expect(positionsByName(withoutPositions)).toEqual(positionsByName(withPositions));
	});

	it('auto-layout still spreads a fresh build (no saved workflow) instead of stacking at [0,0]', () => {
		const code = generateWorkflowCode({ workflow: SAVED, omitPositions: true });
		const json = parseWorkflowCodeToBuilder(code).toJSON({ tidyUp: true });

		const positions = [...positionsByName(json).entries()].filter(
			([name]) => name !== 'Sticky Note',
		);
		const distinct = new Set(positions.map(([, p]) => p.join(',')));
		expect(distinct.size).toBe(positions.length);
		expect([...distinct]).not.toContain('0,0');
	});
});
