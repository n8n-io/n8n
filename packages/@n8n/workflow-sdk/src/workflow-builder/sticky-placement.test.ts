/**
 * Sticky note placement through the full builder -> tidyUp layout -> JSON path.
 *
 * Agent-generated SDK code never sets explicit node positions — layout runs later,
 * at toJSON({ tidyUp: true }). These tests pin the placement contract for that case.
 */

import type { NodeJSON, WorkflowJSON } from '../types/base';
import { workflow } from '../workflow-builder';
import { DEFAULT_NODE_SIZE, DEFAULT_STICKY_SIZE, STICKY_NODE_TYPE } from './constants';
import { node, sticky, trigger } from './node-builders/node-builder';

interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

function findNode(json: WorkflowJSON, name: string): NodeJSON {
	const found = json.nodes.find((n) => n.name === name);
	if (!found) throw new Error(`Node "${name}" not found in workflow JSON`);
	return found;
}

function nodeBox(json: WorkflowJSON, name: string): Box {
	const { position } = findNode(json, name);
	return {
		x: position[0],
		y: position[1],
		width: DEFAULT_NODE_SIZE[0],
		height: DEFAULT_NODE_SIZE[1],
	};
}

function stickyBox(json: WorkflowJSON, name: string): Box {
	const found = findNode(json, name);
	const { width, height } = found.parameters ?? {};
	return {
		x: found.position[0],
		y: found.position[1],
		width: typeof width === 'number' ? width : DEFAULT_STICKY_SIZE[0],
		height: typeof height === 'number' ? height : DEFAULT_STICKY_SIZE[1],
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
	return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** Five chained nodes with no explicit positions, mirroring real agent output. */
function buildChain() {
	return {
		start: trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { name: 'Every Friday' },
		}),
		fetch: node({ type: 'n8n-nodes-base.notion', version: 2.2, config: { name: 'Active teams' } }),
		compute: node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Compute week' } }),
		post: node({ type: 'n8n-nodes-base.slack', version: 2.3, config: { name: 'DM pre-brief' } }),
		record: node({
			type: 'n8n-nodes-base.postgres',
			version: 2.5,
			config: { name: 'Record run' },
		}),
	};
}

describe('sticky note placement with tidyUp', () => {
	it('wraps the nodes it is anchored to', () => {
		const { start, fetch, compute, post, record } = buildChain();
		const note = sticky('## Ingest', [start, fetch], { name: 'Ingest note' });

		const json = workflow('wf', 'Test')
			.add(start.to(fetch).to(compute).to(post).to(record))
			.add(note)
			.toJSON({ tidyUp: true });

		const box = stickyBox(json, 'Ingest note');
		expect(contains(box, nodeBox(json, 'Every Friday'))).toBe(true);
		expect(contains(box, nodeBox(json, 'Active teams'))).toBe(true);
	});

	it('does not stack stickies anchored to different node groups', () => {
		const { start, fetch, compute, post, record } = buildChain();
		const ingest = sticky('## Ingest', [start, fetch], { name: 'Ingest note' });
		const deliver = sticky('## Deliver', [post, record], { name: 'Deliver note' });

		const json = workflow('wf', 'Test')
			.add(start.to(fetch).to(compute).to(post).to(record))
			.add(ingest)
			.add(deliver)
			.toJSON({ tidyUp: true });

		const ingestBox = stickyBox(json, 'Ingest note');
		const deliverBox = stickyBox(json, 'Deliver note');

		expect(ingestBox).not.toEqual(deliverBox);
		expect(overlaps(ingestBox, deliverBox)).toBe(false);
		expect(contains(ingestBox, nodeBox(json, 'Every Friday'))).toBe(true);
		expect(contains(deliverBox, nodeBox(json, 'Record run'))).toBe(true);
	});

	it('does not stack stickies that have neither anchors nor explicit positions', () => {
		const { start, fetch, compute } = buildChain();

		const json = workflow('wf', 'Test')
			.add(start.to(fetch).to(compute))
			.add(sticky('## One', { name: 'One' }))
			.add(sticky('## Two', { name: 'Two' }))
			.add(sticky('## Three', { name: 'Three' }))
			.toJSON({ tidyUp: true });

		const boxes = ['One', 'Two', 'Three'].map((name) => stickyBox(json, name));
		for (const [i, a] of boxes.entries()) {
			for (const b of boxes.slice(i + 1)) {
				expect(overlaps(a, b)).toBe(false);
			}
		}
	});

	it('keeps an explicit position and size the caller passed', () => {
		const { start, fetch } = buildChain();
		const note = sticky('## Pinned', [start, fetch], {
			name: 'Pinned note',
			position: [-960, -480],
			width: 400,
			height: 300,
		});

		const json = workflow('wf', 'Test').add(start.to(fetch)).add(note).toJSON({ tidyUp: true });

		expect(stickyBox(json, 'Pinned note')).toEqual({
			x: -960,
			y: -480,
			width: 400,
			height: 300,
		});
	});

	it('sizes the sticky to its content group rather than a fixed box', () => {
		const { start, fetch, compute, post, record } = buildChain();
		const small = sticky('## Small', [start], { name: 'Small note' });
		const large = sticky('## Large', [fetch, compute, post, record], { name: 'Large note' });

		const json = workflow('wf', 'Test')
			.add(start.to(fetch).to(compute).to(post).to(record))
			.add(small)
			.add(large)
			.toJSON({ tidyUp: true });

		expect(stickyBox(json, 'Large note').width).toBeGreaterThan(
			stickyBox(json, 'Small note').width,
		);
	});

	it('keeps wrapping its anchors when two anchored stickies overlap', () => {
		const { start, fetch, compute, post, record } = buildChain();
		// Overlapping anchor sets: both stickies want a box around "Compute week"
		const first = sticky('## Ingest', [start, fetch, compute], { name: 'First note' });
		const second = sticky('## Deliver', [compute, post, record], { name: 'Second note' });

		const json = workflow('wf', 'Test')
			.add(start.to(fetch).to(compute).to(post).to(record))
			.add(first)
			.add(second)
			.toJSON({ tidyUp: true });

		// Neither may be shoved off its anchors just because the two boxes intersect
		const firstBox = stickyBox(json, 'First note');
		expect(contains(firstBox, nodeBox(json, 'Every Friday'))).toBe(true);
		expect(contains(firstBox, nodeBox(json, 'Compute week'))).toBe(true);

		const secondBox = stickyBox(json, 'Second note');
		expect(contains(secondBox, nodeBox(json, 'Compute week'))).toBe(true);
		expect(contains(secondBox, nodeBox(json, 'Record run'))).toBe(true);
	});

	it('derives only the dimension the caller left out', () => {
		const { start, fetch } = buildChain();
		const note = sticky('## Wide', [start, fetch], { name: 'Wide note', width: 800 });

		const json = workflow('wf', 'Test').add(start.to(fetch)).add(note).toJSON({ tidyUp: true });

		const box = stickyBox(json, 'Wide note');
		// Declared width is honoured, height still wraps the anchors
		expect(box.width).toBe(800);
		expect(contains(box, nodeBox(json, 'Every Friday'))).toBe(true);
		expect(contains(box, nodeBox(json, 'Active teams'))).toBe(true);
	});

	it('emits every sticky as a sticky note node', () => {
		const { start, fetch } = buildChain();

		const json = workflow('wf', 'Test')
			.add(start.to(fetch))
			.add(sticky('## A', [start], { name: 'A' }))
			.add(sticky('## B', [fetch], { name: 'B' }))
			.toJSON({ tidyUp: true });

		expect(json.nodes.filter((n) => n.type === STICKY_NODE_TYPE)).toHaveLength(2);
	});
});
