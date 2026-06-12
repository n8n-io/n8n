import { describe, expect, it } from 'vitest';
import type { IWorkflowGroup } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import {
	aggregateNodeGroupLayoutOffsets,
	buildNodeGroupLayoutComponents,
	computeNodeGroupLayoutPushes,
	type GroupLayoutComponent,
	type NodeGroupLayoutComponent,
	type NodeLayoutComponent,
} from './useCanvasNodeGroupLayout';
import {
	createCanvasGroupNodeId as groupComponentId,
	type BoundingBox,
} from '@/features/workflows/canvas/canvas.types';

function makeNode(id: string, x: number, y: number): INodeUi {
	return {
		id,
		name: id,
		type: 'n8n-nodes-base.noop',
		typeVersion: 1,
		position: [x, y],
		parameters: {},
		disabled: false,
	} as INodeUi;
}

function makeGroupComponent(groupId: string, expandedRect: BoundingBox): GroupLayoutComponent {
	return {
		id: groupComponentId(groupId),
		kind: 'group',
		groupId,
		nodeIds: [`${groupId}-node`],
		rect: expandedRect,
		collapsedRect: { x: expandedRect.x, y: expandedRect.y, width: 400, height: 40 },
		expandedRect,
	};
}

function makeNodeComponent(id: string, rect: BoundingBox): NodeLayoutComponent {
	return { id, kind: 'node', nodeIds: [id], rect };
}

function nodeStore(nodes: INodeUi[]) {
	const byId = new Map(nodes.map((node) => [node.id, node]));
	return (id: string) => byId.get(id);
}

describe('useCanvasNodeGroupLayout', () => {
	const group: IWorkflowGroup = { id: 'g1', name: 'G1', nodeIds: ['a', 'b'] };

	interface LayoutOptions {
		ignored?: Map<string, Set<string>>;
		order?: string[];
	}

	function computeOffsets(
		components: NodeGroupLayoutComponent[],
		expandedGroupIds: Set<string>,
		{ ignored, order }: LayoutOptions = {},
	) {
		return aggregateNodeGroupLayoutOffsets(
			computeNodeGroupLayoutPushes({
				components,
				expandedGroupIds,
				ignoredNodeIdsBySourceGroup: ignored,
				expandedGroupIdOrder: order,
			}),
		);
	}

	function layout(
		nodes: INodeUi[],
		{
			groups = [group],
			expanded = new Set(['g1']),
			...options
		}: LayoutOptions & { groups?: IWorkflowGroup[]; expanded?: Set<string> } = {},
	) {
		const components = buildNodeGroupLayoutComponents({
			allGroups: groups,
			nodes,
			getNodeById: nodeStore(nodes),
			isGroupCollapsed: (id) => !expanded.has(id),
		});
		return computeOffsets(components, expanded, options);
	}

	it('pushes components in the right-side region to the right', () => {
		const offsets = layout([
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('x', 520, 210),
		]);

		expect(offsets.get('x')?.x).toBeGreaterThan(0);
		expect(offsets.get('x')?.y).toBe(0);
	});

	it('pushes components in the lower region down', () => {
		const offsets = layout([
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('x', 120, 320),
		]);

		expect(offsets.get('x')?.x).toBe(0);
		expect(offsets.get('x')?.y).toBeGreaterThan(0);
	});

	it('moves components in the affected right-side expansion band together', () => {
		const offsets = layout([
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('near', 520, 210),
			makeNode('middle', 620, 210),
			makeNode('far', 820, 210),
		]);

		expect(offsets.get('near')).toEqual(offsets.get('middle'));
		expect(offsets.get('near')).toEqual(offsets.get('far'));
		expect(offsets.get('far')?.x).toBeGreaterThan(0);
	});

	it('does not move right-side components when nothing overlaps the expanded group', () => {
		const offsets = layout([
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('far', 900, 210),
		]);

		expect(offsets.has('far')).toBe(false);
	});

	it('moves lower-lane components together when one lower component overlaps', () => {
		const offsets = layout([
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('near', 120, 320),
			makeNode('far', 120, 700),
		]);

		expect(offsets.get('near')).toEqual(offsets.get('far'));
		expect(offsets.get('far')?.y).toBeGreaterThan(0);
	});

	it('pushes a lower-right component right when it is farther right than below', () => {
		const offsets = layout([
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('x', 520, 260),
		]);

		expect(offsets.get('x')?.x).toBeGreaterThan(0);
		expect(offsets.get('x')?.y).toBe(0);
	});

	it('moves another group as a whole component', () => {
		const otherGroup: IWorkflowGroup = { id: 'g2', name: 'G2', nodeIds: ['c', 'd'] };
		const offsets = layout(
			[
				makeNode('a', 100, 200),
				makeNode('b', 400, 200),
				makeNode('c', 500, 210),
				makeNode('d', 650, 210),
			],
			{ groups: [group, otherGroup] },
		);

		expect(offsets.get(groupComponentId('g2'))?.x).toBeGreaterThan(0);
		expect(offsets.has('c')).toBe(false);
		expect(offsets.has('d')).toBe(false);
	});

	it('moves a lower right-shifted group down when it is farther below than right', () => {
		const lowerGroup: IWorkflowGroup = { id: 'g2', name: 'G2', nodeIds: ['c', 'd'] };
		const offsets = layout(
			[
				makeNode('a', 100, 200),
				makeNode('b', 400, 200),
				makeNode('c', 500, 380),
				makeNode('d', 650, 380),
			],
			{ groups: [group, lowerGroup] },
		);

		expect(offsets.get(groupComponentId('g2'))?.x).toBe(0);
		expect(offsets.get(groupComponentId('g2'))?.y).toBeGreaterThan(0);
		expect(offsets.has('c')).toBe(false);
		expect(offsets.has('d')).toBe(false);
	});

	it('does not move a group above the expanding group', () => {
		const upperGroup: IWorkflowGroup = { id: 'g2', name: 'G2', nodeIds: ['c', 'd'] };
		const offsets = layout(
			[
				makeNode('a', 100, 200),
				makeNode('b', 400, 200),
				makeNode('c', 100, 40),
				makeNode('d', 400, 40),
				makeNode('lower', 120, 260),
			],
			{ groups: [group, upperGroup] },
		);

		expect(offsets.get('lower')?.y).toBeGreaterThan(0);
		expect(offsets.has(groupComponentId('g2'))).toBe(false);
	});

	it('does not move a collapsed chip stacked closely above the expanding group', () => {
		// The chip sits fully above the source chip, separated by less than the
		// group top padding. Expansion grows down and right, so the chip above
		// must stay put instead of jumping below the expanded frame.
		const upperChip: IWorkflowGroup = { id: 'g4', name: 'G4', nodeIds: ['c'] };
		const offsets = layout(
			[makeNode('a', 100, 400), makeNode('b', 400, 400), makeNode('c', 100, 280)],
			{ groups: [group, upperChip] },
		);

		expect(offsets.has(groupComponentId('g4'))).toBe(false);
	});

	it('moves an above-band collapsed group with the band when its expanded footprint dips into it', () => {
		// The chip sits above the expansion band and right of the frame — only
		// its expanded footprint (which grows downward) reaches into the band.
		// It must ride along with the in-band component by the same delta so
		// siblings hanging off the same outputs stay arranged together.
		const aboveGroup: IWorkflowGroup = { id: 'g4', name: 'G4', nodeIds: ['c'] };
		const offsets = layout(
			[
				makeNode('a', 100, 200),
				makeNode('b', 400, 200),
				makeNode('inBand', 520, 210),
				makeNode('c', 640, 40),
			],
			{ groups: [group, aboveGroup] },
		);

		expect(offsets.get(groupComponentId('g4'))).toEqual(offsets.get('inBand'));
		expect(offsets.get(groupComponentId('g4'))?.x).toBeGreaterThan(0);
		expect(offsets.get(groupComponentId('g4'))?.y).toBe(0);
		expect(offsets.has('c')).toBe(false);
	});

	it('moves both left collapsed chips down together when the expansion reaches the upper one', () => {
		// Source expands over the upper chip; the lower chip shares the same
		// column. Both must travel by the same delta — otherwise the upper chip
		// lands on the lower one.
		const sourceGroup: IWorkflowGroup = { id: 'g5', name: 'G5', nodeIds: ['m1', 'm2'] };
		const upperChip: IWorkflowGroup = { id: 'g4', name: 'G4', nodeIds: ['c4'] };
		const lowerChip: IWorkflowGroup = { id: 'g3', name: 'G3', nodeIds: ['c3'] };
		const offsets = layout(
			[
				makeNode('m1', 560, 140),
				makeNode('m2', 960, 140),
				makeNode('c4', 480, 260),
				makeNode('c3', 400, 520),
			],
			{ groups: [sourceGroup, upperChip, lowerChip], expanded: new Set(['g5']) },
		);

		const upperOffset = offsets.get(groupComponentId('g4'));
		expect(upperOffset?.y).toBeGreaterThan(0);
		expect(upperOffset?.x).toBe(0);
		expect(offsets.get(groupComponentId('g3'))).toEqual(upperOffset);
	});

	it('does not move an above-band collapsed group whose expanded footprint stays above the band', () => {
		const aboveGroup: IWorkflowGroup = { id: 'g4', name: 'G4', nodeIds: ['c'] };
		const offsets = layout(
			[
				makeNode('a', 100, 200),
				makeNode('b', 400, 200),
				makeNode('inBand', 520, 210),
				makeNode('c', 640, -200),
			],
			{ groups: [group, aboveGroup] },
		);

		expect(offsets.has('inBand')).toBe(true);
		expect(offsets.has(groupComponentId('g4'))).toBe(false);
	});

	it('pushes a group when its expanded frame overlaps another expanded group', () => {
		const components = [
			makeGroupComponent('source', { x: 500, y: 100, width: 600, height: 240 }),
			makeGroupComponent('target', { x: 80, y: 260, width: 1000, height: 240 }),
		];

		const offsets = computeOffsets(components, new Set(['source', 'target']));

		expect(offsets.get(groupComponentId('target'))?.y).toBeGreaterThan(0);
	});

	it('does not let a lower expanded group push an already processed upper expanded group', () => {
		const components = [
			makeGroupComponent('a', { x: 500, y: 0, width: 600, height: 240 }),
			makeGroupComponent('b', { x: 150, y: 160, width: 920, height: 240 }),
			makeNodeComponent('rightOfB', { x: 600, y: 200, width: 100, height: 100 }),
		];

		const offsets = computeOffsets(components, new Set(['a', 'b']));

		expect(offsets.get(groupComponentId('b'))?.y).toBeGreaterThan(0);
		expect(offsets.has(groupComponentId('a'))).toBe(false);
		expect(offsets.get('rightOfB')?.x).toBeGreaterThan(0);
	});

	it('keeps a right push when the pushed group is also expanded', () => {
		// No explicit expansion order: relies on the geometric fallback, which
		// processes the upper-left source first.
		const components = [
			makeGroupComponent('target', { x: 800, y: 120, width: 800, height: 240 }),
			makeGroupComponent('source', { x: 0, y: 100, width: 1000, height: 240 }),
		];

		const offsets = computeOffsets(components, new Set(['target', 'source']));

		expect(offsets.get(groupComponentId('target'))?.x).toBeGreaterThan(0);
	});

	it('uses expanded group order to keep an older source pushing a newly expanded target', () => {
		// Unlike the geometric-fallback test above, the explicit order makes the
		// source process first even though the target sits higher.
		const components = [
			makeGroupComponent('target', { x: 350, y: 90, width: 800, height: 240 }),
			makeGroupComponent('source', { x: 0, y: 100, width: 1000, height: 240 }),
		];

		const offsets = computeOffsets(components, new Set(['target', 'source']), {
			order: ['source', 'target'],
		});

		expect(offsets.get(groupComponentId('target'))?.x).toBeGreaterThan(0);
		expect(offsets.has(groupComponentId('source'))).toBe(false);
	});

	it('does not move components in distinct regions outside the expanded group bands', () => {
		const offsets = layout([
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('x', 500, 210),
			makeNode('other', 900, 800),
		]);

		expect(offsets.has('x')).toBe(true);
		expect(offsets.has('other')).toBe(false);
	});

	it('pushes a node below a narrow group when it sits under the rendered minimum-width frame', () => {
		// A single-node group's content width is far below the rendered minimum
		// frame width — the push band must use the rendered footprint, or the
		// expanded frame overlaps the node below.
		const narrowGroup: IWorkflowGroup = { id: 'g6', name: 'G6', nodeIds: ['a'] };
		const offsets = layout([makeNode('a', 100, 200), makeNode('x', 300, 340)], {
			groups: [narrowGroup],
			expanded: new Set(['g6']),
		});

		expect(offsets.get('x')?.y).toBeGreaterThan(0);
		expect(offsets.get('x')?.x).toBe(0);
	});

	it('returns no offsets when no group is expanded', () => {
		const offsets = layout(
			[makeNode('a', 100, 200), makeNode('b', 400, 200), makeNode('x', 560, 210)],
			{ expanded: new Set() },
		);

		expect(offsets.size).toBe(0);
	});

	it('skips components manually placed while the source group is expanded', () => {
		const offsets = layout(
			[makeNode('a', 100, 200), makeNode('b', 400, 200), makeNode('x', 520, 210)],
			{ ignored: new Map([['g1', new Set(['x'])]]) },
		);

		expect(offsets.has('x')).toBe(false);
	});

	it('applies expanded groups in order so later groups use earlier visual offsets', () => {
		const lowerGroup: IWorkflowGroup = { id: 'g2', name: 'G2', nodeIds: ['c', 'd'] };
		const offsets = layout(
			[
				makeNode('a', 0, 0),
				makeNode('b', 300, 0),
				makeNode('c', 0, 80),
				makeNode('d', 500, 80),
				makeNode('rightOfLower', 430, 320),
			],
			{ groups: [group, lowerGroup], expanded: new Set(['g1', 'g2']) },
		);

		expect(offsets.get(groupComponentId('g2'))?.y).toBeGreaterThan(0);
		expect(offsets.get('rightOfLower')).toEqual(offsets.get(groupComponentId('g2')));
	});

	it('uses a pushed expanded source visual position when deciding its later pushes', () => {
		const components = [
			makeGroupComponent('a', { x: 0, y: 0, width: 1000, height: 240 }),
			makeGroupComponent('b', { x: 450, y: 20, width: 600, height: 340 }),
			makeNodeComponent('nearOldBPosition', { x: 480, y: 300, width: 100, height: 100 }),
		];

		const offsets = computeOffsets(components, new Set(['a', 'b']), { order: ['a', 'b'] });

		expect(offsets.get(groupComponentId('b'))?.x).toBeGreaterThan(0);
		expect(offsets.has('nearOldBPosition')).toBe(false);
	});

	it('preserves a lower group right push when the lower group was expanded before being pushed down', () => {
		const upperGroup: IWorkflowGroup = { id: 'upper', name: 'Upper', nodeIds: ['a', 'b'] };
		const lowerGroup: IWorkflowGroup = { id: 'lower', name: 'Lower', nodeIds: ['c', 'd', 'e'] };
		const offsets = layout(
			[
				makeNode('a', 100, 200),
				makeNode('b', 400, 200),
				makeNode('c', 100, 480),
				makeNode('d', 400, 480),
				makeNode('e', 650, 480),
				makeNode('rightOfLower', 760, 510),
			],
			{
				groups: [upperGroup, lowerGroup],
				expanded: new Set(['upper', 'lower']),
				order: ['lower', 'upper'],
			},
		);
		const lowerOffset = offsets.get(groupComponentId('lower'));
		const rightOfLowerOffset = offsets.get('rightOfLower');

		expect(lowerOffset?.y).toBeGreaterThan(0);
		expect(offsets.has(groupComponentId('upper'))).toBe(false);
		expect(rightOfLowerOffset?.x).toBeGreaterThan(0);
		expect(rightOfLowerOffset?.y).toBe(lowerOffset?.y);
	});

	it('adds the expanded source push even when the target already moved with the source', () => {
		const components = [
			makeGroupComponent('b', { x: 0, y: 0, width: 700, height: 240 }),
			makeGroupComponent('group3', { x: 500, y: 0, width: 700, height: 240 }),
			makeNodeComponent('edit25', { x: 1000, y: 20, width: 100, height: 100 }),
		];

		const offsets = computeOffsets(components, new Set(['b', 'group3']), {
			order: ['b', 'group3'],
		});
		const group3Offset = offsets.get(groupComponentId('group3'));
		const edit25Offset = offsets.get('edit25');

		expect(group3Offset?.x).toBeGreaterThan(0);
		expect(edit25Offset?.x).toBe((group3Offset?.x ?? 0) * 2);
		expect(edit25Offset?.y).toBe(0);
	});

	it('processes stacked expanded groups by visual position instead of document order', () => {
		const upperGroup: IWorkflowGroup = { id: 'upper', name: 'Upper', nodeIds: ['a'] };
		const lowerGroup: IWorkflowGroup = { id: 'lower', name: 'Lower', nodeIds: ['b'] };
		const offsets = layout([makeNode('a', 0, 0), makeNode('b', 0, 80)], {
			groups: [lowerGroup, upperGroup],
			expanded: new Set(['upper', 'lower']),
		});

		expect(offsets.get(groupComponentId('lower'))?.y).toBeGreaterThan(0);
	});

	it('keeps grouped pushed nodes visually stable by deriving the same offset for the group', () => {
		const nodes = [
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('x', 520, 210),
			makeNode('y', 680, 210),
		];
		const ungroupedOffsets = layout(nodes);
		const grouped: IWorkflowGroup = { id: 'g2', name: 'Grouped', nodeIds: ['x', 'y'] };

		const groupedOffsets = layout(nodes, { groups: [group, grouped] });

		expect(groupedOffsets.get(groupComponentId('g2'))).toEqual(ungroupedOffsets.get('x'));
	});
});
