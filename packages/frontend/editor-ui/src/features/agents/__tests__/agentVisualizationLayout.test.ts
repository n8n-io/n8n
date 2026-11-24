import { describe, expect, it } from 'vitest';
import {
	layoutAgentVisualization,
	routeLinkAroundNodes,
	type LinkCurve,
	type LinkObstacle,
	visualizationBounds,
	visualizationNodeBounds,
} from '../components/agentVisualizationLayout';
import type { AgentVisualizationNode } from '../components/AgentVisualization.types';

const root: AgentVisualizationNode = {
	id: 'agent',
	label: 'Agent',
	icon: 'bot',
	addActions: [{ id: 'tools', label: 'Tools' }],
	children: [
		{
			id: 'invocation',
			label: 'Start',
			icon: 'mouse-pointer',
			children: [
				{
					id: 'channels',
					label: 'Channels',
					icon: 'messages-square',
					children: [{ id: 'slack', label: 'Slack', icon: 'slack' }],
				},
			],
		},
		{
			id: 'tools',
			label: 'Tools',
			icon: 'wrench',
			children: Array.from({ length: 6 }, (_, index) => ({
				id: `tool-${index}`,
				label: `Tool ${index}`,
				icon: 'wrench',
			})),
		},
		{
			id: 'knowledge',
			label: 'Knowledge',
			icon: 'database',
			children: [{ id: 'guide', label: 'Guide', icon: 'file-text' }],
		},
	],
};
describe('Agent visualization layout', () => {
	it('keeps collapsed descendants out of the graph and puts Add last on the right', () => {
		const layout = layoutAgentVisualization(root, new Set(), true, 'Add');
		expect(layout.map((item) => item.node.id)).toEqual([
			'invocation',
			'tools',
			'knowledge',
			'__add__',
		]);
		expect(layout.at(-1)?.x).toBeGreaterThan(0);
		expect(layout.at(-1)?.y).toBeGreaterThan(layout[2].y);
	});
	it('grows entry branches to the left at every depth', () => {
		const layout = layoutAgentVisualization(
			root,
			new Set(['agent/invocation', 'agent/invocation/channels']),
			false,
			'Add',
		);
		const invocation = layout.find((item) => item.node.id === 'invocation')!;
		const channels = layout.find((item) => item.node.id === 'channels')!;
		const slack = layout.find((item) => item.node.id === 'slack')!;
		expect(slack.x).toBeLessThan(channels.x);
		expect(channels.x).toBeLessThan(invocation.x);
		expect(slack.incoming).toBe(true);
	});
	it('reserves room for open subtrees and increases the graph bounds', () => {
		const collapsed = layoutAgentVisualization(root, new Set(), false, 'Add');
		const expanded = layoutAgentVisualization(
			root,
			new Set(['agent/tools', 'agent/knowledge']),
			false,
			'Add',
		);
		const toolY = expanded.filter((item) => item.parentKey === 'agent/tools').map((item) => item.y);
		const guideY = expanded.find((item) => item.node.id === 'guide')!.y;
		expect(guideY - Math.max(...toolY)).toBeGreaterThan(128);
		expect(visualizationBounds(expanded).right).toBeGreaterThan(
			visualizationBounds(collapsed).right,
		);
	});
	it('opens an outward fan while keeping the other spokes around the hub', () => {
		const graph: AgentVisualizationNode = {
			...root,
			children: [
				{ id: 'instructions', label: 'Instructions', icon: 'file-text' },
				root.children![1],
				{ id: 'mcp', label: 'MCP servers', icon: 'plug' },
				{ id: 'workflows', label: 'Workflows', icon: 'workflow' },
			],
		};
		const collapsed = layoutAgentVisualization(graph, new Set(), true, 'Add');
		const expanded = layoutAgentVisualization(graph, new Set(['agent/tools']), true, 'Add');
		const bounds = visualizationBounds(expanded);
		expect(bounds.bottom - bounds.top).toBeLessThan(1200);
		const parent = expanded.find((item) => item.node.id === 'tools')!;
		const children = expanded.filter((item) => item.parentKey === parent.key);
		expect(parent.y).toBe((children[0].y + children.at(-1)!.y) / 2);
		const mcp = expanded.find((item) => item.node.id === 'mcp')!;
		expect(mcp.x).toBeLessThan(parent.x - 96);
		expect(mcp.x).toBeLessThan(collapsed.find((item) => item.node.id === 'mcp')!.x);
		expect(mcp.y).toBe(collapsed.find((item) => item.node.id === 'mcp')!.y);
		expect(parent.x).toBeGreaterThan(collapsed.find((item) => item.node.id === 'tools')!.x);
		expect(parent.y).toBe(collapsed.find((item) => item.node.id === 'tools')!.y);
		expect(parent.spoke).toEqual(collapsed.find((item) => item.node.id === 'tools')!.spoke);
		expect(
			new Set(expanded.filter((item) => item.parentKey === 'agent').map((item) => item.x)).size,
		).toBeGreaterThan(2);
		expect(new Set(children.map((item) => item.x)).size).toBeGreaterThan(1);
		expect(children.every((item) => item.x - 48 > mcp.x + 48)).toBe(true);
		for (const [index, item] of expanded.entries()) {
			const box = visualizationNodeBounds(item);
			for (const other of expanded.slice(index + 1)) {
				const next = visualizationNodeBounds(other);
				expect(
					box.right <= next.left ||
						next.right <= box.left ||
						box.bottom <= next.top ||
						next.bottom <= box.top,
				).toBe(true);
			}
		}
	});
	it('keeps the entry point and resting spoke heights stable while Tools opens', () => {
		const collapsed = layoutAgentVisualization(root, new Set(), false, 'Add');
		const expanded = layoutAgentVisualization(root, new Set(['agent/tools']), false, 'Add');
		const entry = expanded.find((item) => item.node.id === 'invocation')!;
		expect(entry).toEqual(collapsed.find((item) => item.node.id === 'invocation'));
		for (const item of collapsed.filter((item) => item.parentKey === 'agent')) {
			expect(expanded.find((next) => next.key === item.key)!.y).toBe(item.y);
		}
	});
	it('uses measured label height for spacing instead of a subtree-wide allowance', () => {
		const graph: AgentVisualizationNode = {
			...root,
			children: [
				{
					id: 'tools',
					label: 'Tools',
					icon: 'wrench',
					children: [
						{ id: 'a', label: 'One', icon: 'wrench' },
						{ id: 'b', label: 'Two', icon: 'wrench' },
					],
				},
			],
		};
		const sizes = new Map([
			['agent/tools/a', { width: 96, height: 96, labelWidth: 192, labelHeight: 21 }],
		]);
		const short = layoutAgentVisualization(graph, new Set(['agent/tools']), false, 'Add', sizes);
		sizes.set('agent/tools/a', { width: 96, height: 96, labelWidth: 192, labelHeight: 42 });
		const tall = layoutAgentVisualization(graph, new Set(['agent/tools']), false, 'Add', sizes);
		const gap = (items: typeof short) =>
			items.find((item) => item.node.id === 'b')!.y - items.find((item) => item.node.id === 'a')!.y;
		expect(gap(tall) - gap(short)).toBe(21);
	});
	it('keeps repeated child ids independent through their parent paths', () => {
		const graph = {
			...root,
			children: [
				{
					id: 'a',
					label: 'A',
					icon: 'book-open' as const,
					children: [{ id: 'reference-0', label: 'One', icon: 'file-text' as const }],
				},
				{
					id: 'b',
					label: 'B',
					icon: 'book-open' as const,
					children: [{ id: 'reference-0', label: 'Two', icon: 'file-text' as const }],
				},
			],
		};
		const layout = layoutAgentVisualization(graph, new Set(['agent/a', 'agent/b']), false, 'Add');
		expect(new Set(layout.map((item) => item.key)).size).toBe(layout.length);
	});
});

describe('routeLinkAroundNodes', () => {
	const at = ([p0, p1, p2, p3]: LinkCurve, t: number) => {
		const u = 1 - t;
		return {
			x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
			y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y,
		};
	};
	const samples = (curve: LinkCurve) =>
		Array.from({ length: 101 }, (_, step) => at(curve, step / 100));
	const inside = (point: { x: number; y: number }, box: LinkObstacle) =>
		point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom;
	// A tucked sibling sits on the straight line from the hub to an open group.
	const straight: LinkCurve = [
		{ x: 42, y: 0 },
		{ x: 150, y: 0 },
		{ x: 250, y: 0 },
		{ x: 352, y: 0 },
	];
	const sibling = (y = 0, side: 1 | -1 = -1): LinkObstacle => ({
		left: 152,
		right: 248,
		top: y - 48,
		bottom: y + 98,
		side,
	});

	it('leaves a clear link unchanged', () => {
		const clear = { ...sibling(), top: 200, bottom: 300 };
		expect(routeLinkAroundNodes(straight, [clear])).toEqual(straight);
	});

	it('bends the link to the given side so it passes beside the node', () => {
		const box = sibling();
		const routed = routeLinkAroundNodes(straight, [box]);
		expect(samples(routed).some((point) => inside(point, box))).toBe(false);
		expect(Math.max(...samples(routed).map((point) => point.y))).toBeLessThanOrEqual(0);
		expect(routed[0]).toEqual(straight[0]);
		expect(routed[3]).toEqual(straight[3]);
		const below = routeLinkAroundNodes(straight, [sibling(0, 1)]);
		expect(Math.min(...samples(below).map((point) => point.y))).toBeGreaterThanOrEqual(0);
	});

	it('moves the link a little when the node moves a little', () => {
		const first = routeLinkAroundNodes(straight, [sibling(0)]);
		const next = routeLinkAroundNodes(straight, [sibling(2)]);
		for (const [index, point] of first.entries()) {
			expect(Math.hypot(point.x - next[index].x, point.y - next[index].y)).toBeLessThan(12);
		}
	});

	it('ignores a node that holds an end of the link', () => {
		const owner = { left: 300, right: 400, top: -50, bottom: 50, side: 1 as const };
		expect(routeLinkAroundNodes(straight, [owner])).toEqual(straight);
	});
});
