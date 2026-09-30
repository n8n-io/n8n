/**
 * The tidyUp layout does not know about node groups.
 *
 * `calculateNodePositionsDagre` in layout-utils.ts positions every node as if it
 * were visible, and json-serializer.ts appends `nodeGroups` afterwards without
 * reserving space for them. The canvas draws a group collapsed by default: a
 * fixed 400x96 chip that sits GROUP_PADDING_Y_TOP + GROUP_HEADER_HEIGHT above
 * its members. So the chip lands off-row and at the wrong width.
 */
import type { WorkflowJSON } from '../types/base';
import { workflow } from '../workflow-builder';
import {
	DEFAULT_NODE_SIZE,
	GRID_SIZE,
	GROUP_HEADER_HEIGHT as SDK_GROUP_HEADER_HEIGHT,
	GROUP_HEADER_WIDTH_COLLAPSED as SDK_GROUP_HEADER_WIDTH_COLLAPSED,
	GROUP_PADDING_X as SDK_GROUP_PADDING_X,
	GROUP_PADDING_Y_TOP as SDK_GROUP_PADDING_Y_TOP,
} from './constants';
import { node, trigger } from './node-builders/node-builder';
import { languageModel } from './node-builders/subnode-builders';

// Written out rather than imported on purpose: these are the canvas's numbers, from
// packages/frontend/editor-ui/src/features/workflows/canvas/stores/canvasNodeGroups.constants.ts.
// Reading the SDK's own copy here would let both sides drift from the canvas together.
const GROUP_PADDING_X = 56;
const GROUP_PADDING_Y_TOP = 40;
const GROUP_HEADER_HEIGHT = 96;
const GROUP_HEADER_WIDTH_COLLAPSED = 400;

const [NODE_W, NODE_H] = DEFAULT_NODE_SIZE;

// titleBarFromNodesRect snaps the bar to the canvas grid.
const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

type Box = { x: number; y: number; width: number; height: number };

const centerY = (b: Box) => b.y + b.height / 2;
const right = (b: Box) => b.x + b.width;

function positionOf(json: WorkflowJSON, name: string): [number, number] {
	const found = json.nodes.find((n) => n.name === name);
	if (!found) throw new Error(`Node "${name}" not found in workflow JSON`);
	return found.position;
}

/** What the canvas draws for a node the user can see. */
function visibleBoxes(json: WorkflowJSON): Map<string, Box> {
	const byId = new Map(json.nodes.map((n) => [n.id, n]));
	const grouped = new Set((json.nodeGroups ?? []).flatMap((g) => g.nodeIds));
	const boxes = new Map<string, Box>();

	for (const n of json.nodes) {
		if (n.name === undefined || grouped.has(n.id)) continue;
		boxes.set(n.name, { x: n.position[0], y: n.position[1], width: NODE_W, height: NODE_H });
	}

	// A collapsed group replaces its members with one chip, placed off the
	// members' bounding rect (computeGroupFrameRects in useCanvasMapping.groups.ts).
	for (const g of json.nodeGroups ?? []) {
		const members = g.nodeIds.map((id) => byId.get(id)!);
		const minX = Math.min(...members.map((m) => m.position[0]));
		const minY = Math.min(...members.map((m) => m.position[1]));
		boxes.set(g.name, {
			x: snap(minX - GROUP_PADDING_X),
			y: snap(minY - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT),
			width: GROUP_HEADER_WIDTH_COLLAPSED,
			height: GROUP_HEADER_HEIGHT,
		});
	}

	return boxes;
}

function buildReportedWorkflow() {
	const newLead = trigger({
		type: 'n8n-nodes-base.hubspotTrigger',
		version: 1,
		config: { name: 'New Lead Created' },
	});
	const fetchLead = node({
		type: 'n8n-nodes-base.hubspot',
		version: 2.1,
		config: { name: 'Fetch Lead Details' },
	});
	const lemlist = node({
		type: 'n8n-nodes-base.lemlist',
		version: 2,
		config: { name: 'Enrich With Lemlist' },
	});
	const scoreFit = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Score Fit' } });
	const isQualified = node({
		type: 'n8n-nodes-base.if',
		version: 2.2,
		config: { name: 'Is Qualified' },
	});
	const update = node({
		type: 'n8n-nodes-base.hubspot',
		version: 2.1,
		config: { name: 'Update Lead In HubSpot' },
	});
	const notify = node({
		type: 'n8n-nodes-base.slack',
		version: 2.3,
		config: { name: 'Notify Sales Team' },
	});

	return workflow('wf', 'CRM Lead Enrichment & Scoring')
		.add(newLead.to(fetchLead).to(lemlist).to(scoreFit).to(isQualified).to(update).to(notify))
		.group('Enrichment', [fetchLead, lemlist])
		.group('Scoring', [scoreFit, isQualified])
		.toJSON({ tidyUp: true });
}

describe('collapsed node group layout after tidyUp', () => {
	it('puts group chips on the same row as the nodes they connect to', () => {
		const boxes = visibleBoxes(buildReportedWorkflow());

		const rowCenter = centerY(boxes.get('New Lead Created')!);

		// Every arrow in a straight chain should be horizontal.
		expect(centerY(boxes.get('Enrichment')!)).toBe(rowCenter);
		expect(centerY(boxes.get('Scoring')!)).toBe(rowCenter);
		expect(centerY(boxes.get('Update Lead In HubSpot')!)).toBe(rowCenter);
		expect(centerY(boxes.get('Notify Sales Team')!)).toBe(rowCenter);
	});

	it('keeps an even gap between everything the canvas draws', () => {
		const boxes = buildReportedWorkflow();
		const visible = visibleBoxes(boxes);

		const ordered = [
			'New Lead Created',
			'Enrichment',
			'Scoring',
			'Update Lead In HubSpot',
			'Notify Sales Team',
		].map((name) => visible.get(name)!);

		const gaps = ordered.slice(1).map((box, i) => box.x - right(ordered[i]));

		// dagre lays plain nodes out on a fixed pitch, so every gap should match.
		expect(new Set(gaps).size).toBe(1);
		expect(gaps.every((gap) => gap > 0)).toBe(true);
	});

	it('does not let a one-member group chip swallow its neighbours', () => {
		const start = trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { name: 'Every Hour' },
		});
		const fetchRows = node({
			type: 'n8n-nodes-base.postgres',
			version: 2.5,
			config: { name: 'Fetch Rows' },
		});
		const post = node({
			type: 'n8n-nodes-base.slack',
			version: 2.3,
			config: { name: 'Post Digest' },
		});

		const visible = visibleBoxes(
			workflow('wf', 'One member group')
				.add(start.to(fetchRows).to(post))
				.group('Load', [fetchRows])
				.toJSON({ tidyUp: true }),
		);

		const chip = visible.get('Load')!;
		expect(chip.x).toBeGreaterThan(right(visible.get('Every Hour')!));
		expect(right(chip)).toBeLessThan(visible.get('Post Digest')!.x);
	});
	it('leaves a group holding an AI sub-node alone, so its own sub-layout still runs', () => {
		const model = languageModel({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1,
			config: { name: 'Model' },
		});
		const agent = node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: { name: 'Answer', subnodes: { model } },
		});
		const chat = trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: { name: 'On Chat' },
		});

		const json = workflow('wf', 'Agent in a group')
			.add(chat.to(agent))
			.group('Brain', [agent, model])
			.toJSON({ tidyUp: true });

		// The AI sub-layout stacks the model under its parent. Folding the group
		// would have flattened that into a left-to-right row.
		expect(positionOf(json, 'Model')[1]).toBeGreaterThan(positionOf(json, 'Answer')[1]);
		expect(json.nodeGroups?.map((g) => g.name)).toEqual(['Brain']);
	});

	it('keeps drawn boxes clear of each other when a group holds more nodes than the chip covers', () => {
		const start = trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { name: 'Nightly' },
		});
		const steps = ['Read', 'Clean', 'Enrich', 'Dedupe', 'Score'].map((name) =>
			node({ type: 'n8n-nodes-base.code', version: 2, config: { name } }),
		);
		const save = node({
			type: 'n8n-nodes-base.postgres',
			version: 2.5,
			config: { name: 'Save' },
		});

		let chain = start.to(steps[0]);
		for (const step of steps.slice(1)) chain = chain.to(step);

		const visible = visibleBoxes(
			workflow('wf', 'Wide group')
				.add(chain.to(save))
				.group('Pipeline', steps)
				.toJSON({ tidyUp: true }),
		);

		const ordered = ['Nightly', 'Pipeline', 'Save'].map((name) => visible.get(name)!);
		expect(ordered[1].x).toBeGreaterThan(right(ordered[0]));
		expect(ordered[2].x).toBeGreaterThan(right(ordered[1]));
		expect(ordered.every((box) => centerY(box) === centerY(ordered[0]))).toBe(true);
	});

	it("orders a group's members left to right, so expanding it reads in flow order", () => {
		const start = trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { name: 'Nightly' },
		});
		const first = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'First' } });
		const second = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Second' } });

		const json = workflow('wf', 'Member order')
			.add(start.to(first).to(second))
			.group('Steps', [first, second])
			.toJSON({ tidyUp: true });

		const [firstX, firstY] = positionOf(json, 'First');
		const [secondX, secondY] = positionOf(json, 'Second');
		expect(secondX).toBeGreaterThan(firstX);
		expect(secondY).toBe(firstY);
	});
	it('keeps the SDK constants in step with the canvas', () => {
		// If this fails, the SDK and the canvas disagree and every geometry
		// assertion below is measuring the wrong frame.
		expect(SDK_GROUP_PADDING_X).toBe(GROUP_PADDING_X);
		expect(SDK_GROUP_PADDING_Y_TOP).toBe(GROUP_PADDING_Y_TOP);
		expect(SDK_GROUP_HEADER_HEIGHT).toBe(GROUP_HEADER_HEIGHT);
		expect(SDK_GROUP_HEADER_WIDTH_COLLAPSED).toBe(GROUP_HEADER_WIDTH_COLLAPSED);
	});

	it('does not drop a node whose name collides with the synthetic group id', () => {
		const start = trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { name: 'Nightly' },
		});
		// The layout folds each group into a node keyed `__nodeGroup__:<index>`.
		const decoy = node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { name: '__nodeGroup__:0' },
		});
		const first = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'First' } });
		const second = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Second' } });

		const json = workflow('wf', 'Name collision')
			.add(start.to(decoy).to(first).to(second))
			.group('Steps', [first, second])
			.toJSON({ tidyUp: true });

		// Overwriting the real node drops it from the layout, and it falls back to
		// the default START_X/DEFAULT_Y corner instead of staying in the chain.
		const [decoyX, decoyY] = positionOf(json, '__nodeGroup__:0');
		const [triggerX, triggerY] = positionOf(json, 'Nightly');
		expect(decoyY).toBe(triggerY);
		expect(decoyX).toBeGreaterThan(triggerX);
		expect(decoyX).toBeLessThan(positionOf(json, 'First')[0]);
		expect(json.nodes).toHaveLength(4);
	});
});
