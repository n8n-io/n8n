import { describe, expect, it } from 'vitest';
import type { IWorkflowGroup } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import {
	aggregateNodeGroupLayoutOffsets,
	buildNodeGroupLayoutComponents,
	computeNodeGroupLayoutPushes,
} from './useCanvasNodeGroupLayout';
import { createCanvasGroupNodeId as groupComponentId } from '@/features/workflows/canvas/canvas.types';

function makeNode(id: string, x: number, y: number): INodeUi {
	return {
		id,
		name: id,
		type: 'n8n-nodes-base.noop',
		typeVersion: 1,
		position: [x, y] as [number, number],
		parameters: {},
		disabled: false,
	} as INodeUi;
}

function nodeStore(nodes: INodeUi[]) {
	const byId = new Map(nodes.map((node) => [node.id, node]));
	return (id: string) => byId.get(id);
}

describe('useCanvasNodeGroupLayout', () => {
	const group: IWorkflowGroup = { id: 'g1', name: 'G1', nodeIds: ['a', 'b'] };

	function build(
		nodes: INodeUi[],
		groups: IWorkflowGroup[] = [group],
		expandedGroupIds = new Set<string>(['g1']),
	) {
		return buildNodeGroupLayoutComponents({
			allGroups: groups,
			nodes,
			getNodeById: nodeStore(nodes),
			isGroupCollapsed: (id) => !expandedGroupIds.has(id),
		});
	}

	function computeOffsets(
		components: ReturnType<typeof build>,
		expandedGroupIds = new Set<string>(['g1']),
		ignoredNodeIdsBySourceGroup?: Map<string, Set<string>>,
		expandedGroupIdOrder?: string[],
	) {
		return aggregateNodeGroupLayoutOffsets(
			computeNodeGroupLayoutPushes({
				components,
				expandedGroupIds,
				ignoredNodeIdsBySourceGroup,
				expandedGroupIdOrder,
			}),
		);
	}

	it('pushes components in the right-side region to the right', () => {
		const components = build([
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('x', 520, 210),
		]);

		const offsets = computeOffsets(components);

		expect(offsets.get('x')?.x).toBeGreaterThan(0);
		expect(offsets.get('x')?.y).toBe(0);
	});

	it('pushes components in the lower region down', () => {
		const components = build([
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('x', 120, 320),
		]);

		const offsets = computeOffsets(components);

		expect(offsets.get('x')?.x).toBe(0);
		expect(offsets.get('x')?.y).toBeGreaterThan(0);
	});

	it('moves components in the affected right-side expansion band together', () => {
		const components = build([
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('near', 520, 210),
			makeNode('middle', 620, 210),
			makeNode('far', 820, 210),
		]);

		const offsets = computeOffsets(components);

		expect(offsets.get('near')).toEqual(offsets.get('middle'));
		expect(offsets.get('near')).toEqual(offsets.get('far'));
		expect(offsets.get('far')?.x).toBeGreaterThan(0);
	});

	it('does not move right-side components when nothing overlaps the expanded group', () => {
		const components = build([
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('far', 900, 210),
		]);

		const offsets = computeOffsets(components);

		expect(offsets.has('far')).toBe(false);
	});

	it('moves lower-lane components together when one lower component overlaps', () => {
		const components = build([
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('near', 120, 320),
			makeNode('far', 120, 700),
		]);

		const offsets = computeOffsets(components);

		expect(offsets.get('near')).toEqual(offsets.get('far'));
		expect(offsets.get('far')?.y).toBeGreaterThan(0);
	});

	it('pushes a lower-right component right when it is farther right than below', () => {
		const components = build([
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('x', 520, 260),
		]);

		const offsets = computeOffsets(components);

		expect(offsets.get('x')?.x).toBeGreaterThan(0);
		expect(offsets.get('x')?.y).toBe(0);
	});

	it('moves another group as a whole component', () => {
		const otherGroup: IWorkflowGroup = { id: 'g2', name: 'G2', nodeIds: ['c', 'd'] };
		const components = build(
			[
				makeNode('a', 100, 200),
				makeNode('b', 400, 200),
				makeNode('c', 500, 210),
				makeNode('d', 650, 210),
			],
			[group, otherGroup],
		);

		const offsets = computeOffsets(components);

		expect(offsets.get(groupComponentId('g2'))?.x).toBeGreaterThan(0);
		expect(offsets.get('c')).toBeUndefined();
		expect(offsets.get('d')).toBeUndefined();
	});

	it('moves a lower right-shifted group down when it is farther below than right', () => {
		const lowerGroup: IWorkflowGroup = { id: 'g2', name: 'G2', nodeIds: ['c', 'd'] };
		const components = build(
			[
				makeNode('a', 100, 200),
				makeNode('b', 400, 200),
				makeNode('c', 500, 380),
				makeNode('d', 650, 380),
			],
			[group, lowerGroup],
		);

		const offsets = computeOffsets(components);

		expect(offsets.get(groupComponentId('g2'))?.x).toBe(0);
		expect(offsets.get(groupComponentId('g2'))?.y).toBeGreaterThan(0);
		expect(offsets.get('c')).toBeUndefined();
		expect(offsets.get('d')).toBeUndefined();
	});

	it('does not move a group above the expanding group', () => {
		const upperGroup: IWorkflowGroup = { id: 'g2', name: 'G2', nodeIds: ['c', 'd'] };
		const components = build(
			[
				makeNode('a', 100, 200),
				makeNode('b', 400, 200),
				makeNode('c', 100, 40),
				makeNode('d', 400, 40),
				makeNode('lower', 120, 260),
			],
			[group, upperGroup],
		);

		const offsets = computeOffsets(components);

		expect(offsets.get('lower')?.y).toBeGreaterThan(0);
		expect(offsets.has(groupComponentId('g2'))).toBe(false);
	});

	it('moves an above-band collapsed group with the band when its expanded footprint dips into it', () => {
		// The chip sits above the expansion band and right of the frame — only
		// its expanded footprint (which grows downward) reaches into the band.
		// It must ride along with the in-band component by the same delta so
		// siblings hanging off the same outputs stay arranged together.
		const aboveGroup: IWorkflowGroup = { id: 'g4', name: 'G4', nodeIds: ['c'] };
		const components = build(
			[
				makeNode('a', 100, 200),
				makeNode('b', 400, 200),
				makeNode('inBand', 520, 210),
				makeNode('c', 640, 40),
			],
			[group, aboveGroup],
		);

		const offsets = computeOffsets(components);

		expect(offsets.get(groupComponentId('g4'))).toEqual(offsets.get('inBand'));
		expect(offsets.get(groupComponentId('g4'))?.x).toBeGreaterThan(0);
		expect(offsets.get(groupComponentId('g4'))?.y).toBe(0);
		expect(offsets.get('c')).toBeUndefined();
	});

	it('moves both left collapsed chips down together when the expansion reaches the upper one', () => {
		// Source expands over the upper chip; the lower chip shares the same
		// column. Both must travel by the same delta — otherwise the upper chip
		// lands on the lower one.
		const sourceGroup: IWorkflowGroup = { id: 'g5', name: 'G5', nodeIds: ['m1', 'm2'] };
		const upperChip: IWorkflowGroup = { id: 'g4', name: 'G4', nodeIds: ['c4'] };
		const lowerChip: IWorkflowGroup = { id: 'g3', name: 'G3', nodeIds: ['c3'] };
		const components = build(
			[
				makeNode('m1', 560, 140),
				makeNode('m2', 960, 140),
				makeNode('c4', 480, 260),
				makeNode('c3', 400, 520),
			],
			[sourceGroup, upperChip, lowerChip],
			new Set(['g5']),
		);

		const offsets = computeOffsets(components, new Set(['g5']));

		const upperOffset = offsets.get(groupComponentId('g4'));
		expect(upperOffset?.y).toBeGreaterThan(0);
		expect(upperOffset?.x).toBe(0);
		expect(offsets.get(groupComponentId('g3'))).toEqual(upperOffset);
	});

	it('does not move an above-band collapsed group whose expanded footprint stays above the band', () => {
		const aboveGroup: IWorkflowGroup = { id: 'g4', name: 'G4', nodeIds: ['c'] };
		const components = build(
			[
				makeNode('a', 100, 200),
				makeNode('b', 400, 200),
				makeNode('inBand', 520, 210),
				makeNode('c', 640, -200),
			],
			[group, aboveGroup],
		);

		const offsets = computeOffsets(components);

		expect(offsets.has('inBand')).toBe(true);
		expect(offsets.has(groupComponentId('g4'))).toBe(false);
	});

	it('pushes a group when its expanded frame overlaps another expanded group', () => {
		const components = [
			{
				id: groupComponentId('source'),
				kind: 'group',
				groupId: 'source',
				nodeIds: ['a'],
				rect: { x: 500, y: 100, width: 600, height: 240 },
				collapsedRect: { x: 500, y: 100, width: 400, height: 40 },
				expandedRect: { x: 500, y: 100, width: 600, height: 240 },
			},
			{
				id: groupComponentId('target'),
				kind: 'group',
				groupId: 'target',
				nodeIds: ['b'],
				rect: { x: 80, y: 260, width: 1000, height: 240 },
				collapsedRect: { x: 80, y: 260, width: 400, height: 40 },
				expandedRect: { x: 80, y: 260, width: 1000, height: 240 },
			},
		] as ReturnType<typeof build>;

		const offsets = computeOffsets(components, new Set(['source', 'target']));

		expect(offsets.get(groupComponentId('target'))?.y).toBeGreaterThan(0);
	});

	it('does not let a lower expanded group push an already processed upper expanded group', () => {
		const components = [
			{
				id: groupComponentId('a'),
				kind: 'group',
				groupId: 'a',
				nodeIds: ['a1'],
				rect: { x: 500, y: 0, width: 600, height: 240 },
				collapsedRect: { x: 500, y: 0, width: 400, height: 40 },
				expandedRect: { x: 500, y: 0, width: 600, height: 240 },
			},
			{
				id: groupComponentId('b'),
				kind: 'group',
				groupId: 'b',
				nodeIds: ['b1'],
				rect: { x: 150, y: 160, width: 920, height: 240 },
				collapsedRect: { x: 150, y: 160, width: 400, height: 40 },
				expandedRect: { x: 150, y: 160, width: 920, height: 240 },
			},
			{
				id: 'rightOfB',
				kind: 'node',
				nodeIds: ['rightOfB'],
				rect: { x: 600, y: 200, width: 100, height: 100 },
			},
		] as ReturnType<typeof build>;

		const offsets = computeOffsets(components, new Set(['a', 'b']));

		expect(offsets.get(groupComponentId('b'))?.y).toBeGreaterThan(0);
		expect(offsets.has(groupComponentId('a'))).toBe(false);
		expect(offsets.get('rightOfB')?.x).toBeGreaterThan(0);
	});

	it('keeps a right push when the pushed group is also expanded', () => {
		const components = [
			{
				id: groupComponentId('target'),
				kind: 'group',
				groupId: 'target',
				nodeIds: ['targetNode'],
				rect: { x: 800, y: 120, width: 800, height: 240 },
				collapsedRect: { x: 800, y: 120, width: 400, height: 40 },
				expandedRect: { x: 800, y: 120, width: 800, height: 240 },
			},
			{
				id: groupComponentId('source'),
				kind: 'group',
				groupId: 'source',
				nodeIds: ['sourceNode'],
				rect: { x: 0, y: 100, width: 1000, height: 240 },
				collapsedRect: { x: 0, y: 100, width: 400, height: 40 },
				expandedRect: { x: 0, y: 100, width: 1000, height: 240 },
			},
		] as ReturnType<typeof build>;

		const offsets = computeOffsets(components, new Set(['target', 'source']));

		expect(offsets.get(groupComponentId('target'))?.x).toBeGreaterThan(0);
	});

	it('uses expanded group order to keep an older source pushing a newly expanded target', () => {
		const components = [
			{
				id: groupComponentId('target'),
				kind: 'group',
				groupId: 'target',
				nodeIds: ['targetNode'],
				rect: { x: 350, y: 90, width: 800, height: 240 },
				collapsedRect: { x: 350, y: 90, width: 400, height: 40 },
				expandedRect: { x: 350, y: 90, width: 800, height: 240 },
			},
			{
				id: groupComponentId('source'),
				kind: 'group',
				groupId: 'source',
				nodeIds: ['sourceNode'],
				rect: { x: 0, y: 100, width: 1000, height: 240 },
				collapsedRect: { x: 0, y: 100, width: 400, height: 40 },
				expandedRect: { x: 0, y: 100, width: 1000, height: 240 },
			},
		] as ReturnType<typeof build>;

		const offsets = computeOffsets(components, new Set(['target', 'source']), undefined, [
			'source',
			'target',
		]);

		expect(offsets.get(groupComponentId('target'))?.x).toBeGreaterThan(0);
		expect(offsets.has(groupComponentId('source'))).toBe(false);
	});

	it('does not move components in distinct regions outside the expanded group bands', () => {
		const components = build([
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('x', 500, 210),
			makeNode('other', 900, 800),
		]);

		const offsets = computeOffsets(components);

		expect(offsets.has('x')).toBe(true);
		expect(offsets.has('other')).toBe(false);
	});

	it('returns no offsets when no group is expanded', () => {
		const components = build(
			[makeNode('a', 100, 200), makeNode('b', 400, 200), makeNode('x', 560, 210)],
			[group],
			new Set(),
		);

		const offsets = computeOffsets(components, new Set());

		expect(offsets.size).toBe(0);
	});

	it('skips components manually placed while the source group is expanded', () => {
		const components = build([
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('x', 520, 210),
		]);

		const offsets = computeOffsets(components, new Set(['g1']), new Map([['g1', new Set(['x'])]]));

		expect(offsets.has('x')).toBe(false);
	});

	it('applies expanded groups in order so later groups use earlier visual offsets', () => {
		const lowerGroup: IWorkflowGroup = { id: 'g2', name: 'G2', nodeIds: ['c', 'd'] };
		const components = build(
			[
				makeNode('a', 0, 0),
				makeNode('b', 300, 0),
				makeNode('c', 0, 80),
				makeNode('d', 500, 80),
				makeNode('rightOfLower', 430, 320),
			],
			[group, lowerGroup],
			new Set(['g1', 'g2']),
		);

		const offsets = computeOffsets(components, new Set(['g1', 'g2']));

		expect(offsets.get(groupComponentId('g2'))?.y).toBeGreaterThan(0);
		expect(offsets.get('rightOfLower')).toEqual(offsets.get(groupComponentId('g2')));
	});

	it('uses a pushed expanded source visual position when deciding its later pushes', () => {
		const components = [
			{
				id: groupComponentId('a'),
				kind: 'group',
				groupId: 'a',
				nodeIds: ['a1'],
				rect: { x: 0, y: 0, width: 1000, height: 240 },
				collapsedRect: { x: 0, y: 0, width: 400, height: 40 },
				expandedRect: { x: 0, y: 0, width: 1000, height: 240 },
			},
			{
				id: groupComponentId('b'),
				kind: 'group',
				groupId: 'b',
				nodeIds: ['b1'],
				rect: { x: 450, y: 20, width: 600, height: 340 },
				collapsedRect: { x: 450, y: 20, width: 400, height: 40 },
				expandedRect: { x: 450, y: 20, width: 600, height: 340 },
			},
			{
				id: 'nearOldBPosition',
				kind: 'node',
				nodeIds: ['nearOldBPosition'],
				rect: { x: 480, y: 300, width: 100, height: 100 },
			},
		] as ReturnType<typeof build>;

		const offsets = computeOffsets(components, new Set(['a', 'b']), undefined, ['a', 'b']);

		expect(offsets.get(groupComponentId('b'))?.x).toBeGreaterThan(0);
		expect(offsets.has('nearOldBPosition')).toBe(false);
	});

	it('preserves a lower group right push when the lower group was expanded before being pushed down', () => {
		const upperGroup: IWorkflowGroup = { id: 'upper', name: 'Upper', nodeIds: ['a', 'b'] };
		const lowerGroup: IWorkflowGroup = { id: 'lower', name: 'Lower', nodeIds: ['c', 'd', 'e'] };
		const components = build(
			[
				makeNode('a', 100, 200),
				makeNode('b', 400, 200),
				makeNode('c', 100, 480),
				makeNode('d', 400, 480),
				makeNode('e', 650, 480),
				makeNode('rightOfLower', 760, 510),
			],
			[upperGroup, lowerGroup],
			new Set(['upper', 'lower']),
		);

		const offsets = computeOffsets(components, new Set(['upper', 'lower']), undefined, [
			'lower',
			'upper',
		]);
		const lowerOffset = offsets.get(groupComponentId('lower'));
		const rightOfLowerOffset = offsets.get('rightOfLower');

		expect(lowerOffset?.y).toBeGreaterThan(0);
		expect(offsets.has(groupComponentId('upper'))).toBe(false);
		expect(rightOfLowerOffset?.x).toBeGreaterThan(0);
		expect(rightOfLowerOffset?.y).toBe(lowerOffset?.y);
	});

	it('adds the expanded source push even when the target already moved with the source', () => {
		const components = [
			{
				id: groupComponentId('b'),
				kind: 'group',
				groupId: 'b',
				nodeIds: ['b1'],
				rect: { x: 0, y: 0, width: 700, height: 240 },
				collapsedRect: { x: 0, y: 0, width: 400, height: 40 },
				expandedRect: { x: 0, y: 0, width: 700, height: 240 },
			},
			{
				id: groupComponentId('group3'),
				kind: 'group',
				groupId: 'group3',
				nodeIds: ['group3Node'],
				rect: { x: 500, y: 0, width: 700, height: 240 },
				collapsedRect: { x: 500, y: 0, width: 400, height: 40 },
				expandedRect: { x: 500, y: 0, width: 700, height: 240 },
			},
			{
				id: 'edit25',
				kind: 'node',
				nodeIds: ['edit25'],
				rect: { x: 1000, y: 20, width: 100, height: 100 },
			},
		] as ReturnType<typeof build>;

		const offsets = computeOffsets(components, new Set(['b', 'group3']), undefined, [
			'b',
			'group3',
		]);
		const group3Offset = offsets.get(groupComponentId('group3'));
		const edit25Offset = offsets.get('edit25');

		expect(group3Offset?.x).toBeGreaterThan(0);
		expect(edit25Offset?.x).toBe((group3Offset?.x ?? 0) * 2);
		expect(edit25Offset?.y).toBe(0);
	});

	it('processes stacked expanded groups by visual position instead of document order', () => {
		const upperGroup: IWorkflowGroup = { id: 'upper', name: 'Upper', nodeIds: ['a'] };
		const lowerGroup: IWorkflowGroup = { id: 'lower', name: 'Lower', nodeIds: ['b'] };
		const components = build(
			[makeNode('a', 0, 0), makeNode('b', 0, 80)],
			[lowerGroup, upperGroup],
			new Set(['upper', 'lower']),
		);

		const offsets = computeOffsets(components, new Set(['upper', 'lower']));

		expect(offsets.get(groupComponentId('lower'))?.y).toBeGreaterThan(0);
	});

	it('keeps grouped pushed nodes visually stable by deriving the same offset for the group', () => {
		const nodes = [
			makeNode('a', 100, 200),
			makeNode('b', 400, 200),
			makeNode('x', 520, 210),
			makeNode('y', 680, 210),
		];
		const ungroupedComponents = build(nodes);
		const ungroupedOffsets = computeOffsets(ungroupedComponents);
		const grouped: IWorkflowGroup = { id: 'g2', name: 'Grouped', nodeIds: ['x', 'y'] };
		const groupedComponents = build(nodes, [group, grouped]);

		const groupedOffsets = computeOffsets(groupedComponents);

		expect(groupedOffsets.get(groupComponentId('g2'))).toEqual(ungroupedOffsets.get('x'));
	});
});
