/**
 * The tidyUp layout does not know about node groups.
 *
 * `calculateNodePositionsDagre` in layout-utils.ts positions every node as if it
 * were visible, and json-serializer.ts appends `nodeGroups` afterwards without
 * reserving space for them. The canvas draws a group collapsed by default: a
 * fixed 400x96 chip that sits GROUP_PADDING_Y_TOP + CANVAS_GROUP_HEADER_HEIGHT above
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
import { node, sticky, trigger } from './node-builders/node-builder';
import { languageModel, tool } from './node-builders/subnode-builders';

// Written out rather than imported on purpose: these are the canvas's numbers, from
// packages/frontend/editor-ui/src/features/workflows/canvas/stores/canvasNodeGroups.constants.ts.
// Reading the SDK's own copy here would let both sides drift from the canvas together.
const GROUP_PADDING_X = 56;
const GROUP_PADDING_Y_TOP = 40;
// Keep the canvas expectation independent from the SDK constant so this test can
// detect drift between the two packages.
const CANVAS_GROUP_HEADER_HEIGHT = 96;
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

function serializedBox(json: WorkflowJSON, name: string): Box {
	const found = json.nodes.find((n) => n.name === name);
	if (!found) throw new Error(`Node "${name}" not found in workflow JSON`);
	return {
		x: found.position[0],
		y: found.position[1],
		width: typeof found.parameters?.width === 'number' ? found.parameters.width : NODE_W,
		height: typeof found.parameters?.height === 'number' ? found.parameters.height : NODE_H,
	};
}

function contains(outer: Box, inner: Box): boolean {
	return (
		inner.x >= outer.x &&
		inner.y >= outer.y &&
		inner.x + inner.width <= outer.x + outer.width &&
		inner.y + inner.height <= outer.y + outer.height
	);
}

function overlaps(a: Box, b: Box): boolean {
	return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
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
			y: snap(minY - GROUP_PADDING_Y_TOP - CANVAS_GROUP_HEADER_HEIGHT),
			width: GROUP_HEADER_WIDTH_COLLAPSED,
			height: CANVAS_GROUP_HEADER_HEIGHT,
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

	it('keeps a group that bridges disconnected components on one layout row', () => {
		const start = trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { name: 'Nightly' },
		});
		const left = node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { name: 'Left' },
		});
		const rightNode = node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { name: 'Right' },
		});
		const finish = node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { name: 'Finish' },
		});

		const json = workflow('wf', 'Bridged group')
			.add(start.to(left))
			.add(rightNode.to(finish))
			.group('Bridge', [left, rightNode])
			.toJSON({ tidyUp: true });

		const visible = visibleBoxes(json);
		const row = centerY(visible.get('Nightly')!);
		expect(centerY(visible.get('Bridge')!)).toBe(row);
		expect(centerY(visible.get('Finish')!)).toBe(row);
		expect(visible.get('Bridge')!.x).toBeGreaterThan(right(visible.get('Nightly')!));
		expect(visible.get('Finish')!.x).toBeGreaterThan(right(visible.get('Bridge')!));
	});

	it('includes an auto-sized anchored sticky in an eligible group', () => {
		const start = trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { name: 'Nightly' },
		});
		const fetch = node({
			type: 'n8n-nodes-base.postgres',
			version: 2.5,
			config: { name: 'Fetch' },
		});
		const transform = node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { name: 'Transform' },
		});
		const save = node({
			type: 'n8n-nodes-base.postgres',
			version: 2.5,
			config: { name: 'Save' },
		});
		const note = sticky('## Processing', [fetch, transform], { name: 'Processing note' });

		const json = workflow('wf', 'Group with sticky')
			.add(start.to(fetch).to(transform).to(save))
			.add(note)
			.group('Processing', [fetch, transform, note])
			.toJSON({ tidyUp: true });

		const group = json.nodeGroups?.find((candidate) => candidate.name === 'Processing');
		expect(group?.nodeIds).toContain(note.id);
		expect(contains(serializedBox(json, 'Processing note'), serializedBox(json, 'Fetch'))).toBe(
			true,
		);
		expect(contains(serializedBox(json, 'Processing note'), serializedBox(json, 'Transform'))).toBe(
			true,
		);
		const visible = visibleBoxes(json);
		expect(right(visible.get('Processing')!)).toBeLessThan(visible.get('Save')!.x);
	});

	it('keeps an editor-created sticky on the normal path when it has persisted geometry', () => {
		const build = (withGroup: boolean) => {
			const start = trigger({
				type: 'n8n-nodes-base.scheduleTrigger',
				version: 1.2,
				config: { name: 'Nightly' },
			});
			const fetch = node({
				type: 'n8n-nodes-base.postgres',
				version: 2.5,
				config: { name: 'Fetch' },
			});
			const note = sticky('## Existing', [fetch], {
				name: 'Existing note',
				position: [640, 320],
				width: 400,
				height: 300,
			});

			const builder = workflow('wf', 'Persisted sticky').add(start.to(fetch)).add(note);
			if (withGroup) builder.group('Stage', [fetch, note]);
			return builder.toJSON({ tidyUp: true });
		};

		const withoutGroup = build(false);
		const withGroup = build(true);
		expect(serializedBox(withGroup, 'Existing note')).toEqual({
			x: 640,
			y: 320,
			width: 400,
			height: 300,
		});
		expect(positionOf(withGroup, 'Fetch')).toEqual(positionOf(withoutGroup, 'Fetch'));
	});

	it('keeps a group with an explicitly positioned node on the normal path', () => {
		const start = trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { name: 'Nightly' },
		});
		const fixed = node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { name: 'Fixed', position: [640, 320] },
		});
		const next = node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { name: 'Next' },
		});

		const builder = workflow('wf', 'Explicitly positioned group').add(start.to(fixed).to(next));
		const withoutGroup = builder.toJSON({ tidyUp: true });
		const withGroup = builder.group('Stage', [fixed, next]).toJSON({ tidyUp: true });

		expect(positionOf(withGroup, 'Fixed')).toEqual([640, 320]);
		expect(positionOf(withGroup, 'Next')).toEqual(positionOf(withoutGroup, 'Next'));
	});

	it('does not let group input order choose a winner for overlapping groups', () => {
		const build = (reverse: boolean) => {
			const start = trigger({
				type: 'n8n-nodes-base.scheduleTrigger',
				version: 1.2,
				config: { name: 'Nightly' },
			});
			const first = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'First' } });
			const second = node({
				type: 'n8n-nodes-base.code',
				version: 2,
				config: { name: 'Second' },
			});
			const third = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Third' } });
			const builder = workflow('wf', 'Overlapping groups').add(
				start.to(first).to(second).to(third),
			);
			if (reverse) {
				builder.group('Second stage', [second, third]).group('First stage', [first, second]);
			} else {
				builder.group('First stage', [first, second]).group('Second stage', [second, third]);
			}
			return builder.toJSON({ tidyUp: true });
		};

		const forward = build(false);
		const reverse = build(true);
		for (const name of ['First', 'Second', 'Third']) {
			expect(positionOf(forward, name)).toEqual(positionOf(reverse, name));
		}
	});
	it('lays out a complete AI subtree inside the collapsed group chip', () => {
		const model = languageModel({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1,
			config: { name: 'Model' },
		});
		const calculator = tool({
			type: '@n8n/n8n-nodes-langchain.toolCalculator',
			version: 1,
			config: { name: 'Calculator' },
		});
		const agent = node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: { name: 'Answer', subnodes: { model, tools: [calculator] } },
		});
		const chat = trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: { name: 'On Chat' },
		});

		const json = workflow('wf', 'Agent in a group')
			.add(chat.to(agent))
			.group('Brain', [agent, model, calculator])
			.toJSON({ tidyUp: true });

		const visible = visibleBoxes(json);
		const chip = visible.get('Brain')!;
		const chatBox = visible.get('On Chat')!;
		expect(centerY(chip)).toBe(centerY(chatBox));

		// The AI sub-layout still stacks the model under its parent when the group
		// is expanded.
		expect(positionOf(json, 'Model')[1]).toBeGreaterThan(positionOf(json, 'Answer')[1]);
		expect(positionOf(json, 'Calculator')[1]).toBeGreaterThan(positionOf(json, 'Answer')[1]);
		expect(json.nodeGroups?.map((g) => g.name)).toEqual(['Brain']);
	});

	it('keeps disconnected members clear of a complete AI subtree when expanded', () => {
		const model = languageModel({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1,
			config: { name: 'Model' },
		});
		const calculator = tool({
			type: '@n8n/n8n-nodes-langchain.toolCalculator',
			version: 1,
			config: { name: 'Calculator' },
		});
		const agent = node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: { name: 'Answer', subnodes: { model, tools: [calculator] } },
		});
		const chat = trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: { name: 'On Chat' },
		});
		const unrelated = node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { name: 'Unrelated' },
		});

		const json = workflow('wf', 'Disconnected AI group')
			.add(chat.to(agent))
			.add(unrelated)
			.group('Brain', [agent, model, calculator, unrelated])
			.toJSON({ tidyUp: true });

		const boxes = ['Answer', 'Model', 'Calculator', 'Unrelated'].map((name) =>
			serializedBox(json, name),
		);
		for (let i = 0; i < boxes.length; i++) {
			for (let j = i + 1; j < boxes.length; j++) {
				expect(overlaps(boxes[i], boxes[j])).toBe(false);
			}
		}
	});

	it('falls back when a group contains only part of an AI subtree', () => {
		const model = languageModel({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1,
			config: { name: 'Model' },
		});
		const calculator = tool({
			type: '@n8n/n8n-nodes-langchain.toolCalculator',
			version: 1,
			config: { name: 'Calculator' },
		});
		const agent = node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: { name: 'Answer', subnodes: { model, tools: [calculator] } },
		});
		const chat = trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: { name: 'On Chat' },
		});

		const builder = workflow('wf', 'Partial agent group').add(chat.to(agent));
		const withoutGroup = builder.toJSON({ tidyUp: true });
		const json = builder.group('Brain', [agent, model]).toJSON({ tidyUp: true });

		const agentPosition = positionOf(json, 'Answer');
		const modelPosition = positionOf(json, 'Model');
		const calculatorPosition = positionOf(json, 'Calculator');

		// No chip is allowed to replace only part of the AI subtree. The AI nodes
		// therefore keep the same layout as they do without the group.
		expect(agentPosition).toEqual(positionOf(withoutGroup, 'Answer'));
		expect(modelPosition).toEqual(positionOf(withoutGroup, 'Model'));
		expect(calculatorPosition).toEqual(positionOf(withoutGroup, 'Calculator'));
		expect(modelPosition[1]).toBeGreaterThan(agentPosition[1]);
		expect(calculatorPosition[1]).toBeGreaterThan(agentPosition[1]);
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
		expect(SDK_GROUP_HEADER_HEIGHT).toBe(CANVAS_GROUP_HEADER_HEIGHT);
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

	it('does not serialize the synthetic group node', () => {
		const start = trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { name: 'Nightly' },
		});
		const first = node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { name: 'First' },
		});
		const second = node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { name: 'Second' },
		});

		const json = workflow('wf', 'Synthetic group node')
			.add(start.to(first).to(second))
			.group('Steps', [first, second])
			.toJSON({ tidyUp: true });

		expect(json.nodes.every((node) => !node.name?.startsWith('__nodeGroup__:'))).toBe(true);
	});

	it('keeps tidy-up positions stable across repeated serialization', () => {
		const start = trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { name: 'Nightly' },
		});
		const first = node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { name: 'First' },
		});
		const second = node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { name: 'Second' },
		});
		const builder = workflow('wf', 'Stable tidy-up')
			.add(start.to(first).to(second))
			.group('Steps', [first, second]);

		const firstSerialization = builder.toJSON({ tidyUp: true });
		const secondSerialization = builder.toJSON({ tidyUp: true });
		for (const name of ['Nightly', 'First', 'Second']) {
			expect(positionOf(secondSerialization, name)).toEqual(positionOf(firstSerialization, name));
		}
	});
});
