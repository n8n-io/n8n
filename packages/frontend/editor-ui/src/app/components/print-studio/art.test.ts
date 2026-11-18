import { describe, expect, it } from 'vitest';
import { readGraph, renderSvg, type PrintStyle } from './art';
import { reliefMesh, renderStl } from './relief';
import { sampleWorkflow } from './sample';

const graph = readGraph(sampleWorkflow);
describe('print studio exports', () => {
	it('keeps branches and strips source metadata', () => {
		const sensitive = {
			...sampleWorkflow,
			credentials: { token: 'private-token' },
			nodes: sampleWorkflow.nodes.map((node) => ({
				...node,
				parameters: { value: 'private-value' },
			})),
		};
		expect(readGraph(sensitive)).toEqual(graph);
		expect(graph.nodes).toHaveLength(9);
		expect(graph.edges).toHaveLength(9);
		for (const style of ['blueprint', 'minimal', 'circuit'] as const) {
			const svg = renderSvg(graph, style, 'original');
			expect(svg).toContain('width="1200" height="1500"');
			for (const value of [
				'private-token',
				'private-value',
				...sampleWorkflow.nodes.map((node) => node.name),
			])
				expect(svg).not.toContain(value);
		}
	});
	it('creates distinct styles and palettes', () => {
		const styles: PrintStyle[] = ['blueprint', 'minimal', 'circuit'];
		const exports = styles.flatMap((style) =>
			(['original', 'warm', 'mono'] as const).map((palette) => renderSvg(graph, style, palette)),
		);
		expect(new Set(exports).size).toBe(9);
	});
	it('rejects empty, oversized, and invalid graphs', () => {
		for (const value of [
			null,
			{},
			{ nodes: [] },
			{ nodes: Array(301).fill(sampleWorkflow.nodes[0]) },
			{ nodes: [{ name: 'test', position: [Infinity, 0] }] },
		])
			expect(() => readGraph(value)).toThrow();
	});
	it('excludes notes and ignores stale connection targets', () => {
		const result = readGraph({
			nodes: [
				...sampleWorkflow.nodes,
				{ name: 'note', type: 'n8n-nodes-base.stickyNote', position: [0, 0] },
			],
			connections: { 'Order webhook': { main: [[{ node: 'note' }, { node: 'missing' }]] } },
		});
		expect(result.nodes).toHaveLength(9);
		expect(result.edges).toEqual([]);
	});
	it('renders a single positioned node', () => {
		const single = readGraph({ nodes: [sampleWorkflow.nodes[0]] });
		expect(renderSvg(single, 'blueprint', 'original')).not.toContain('NaN');
		expect(renderStl(single).byteLength).toBe(3252084);
	});
	it('exports one closed manifold plaque with consistent winding and mm dimensions', () => {
		const mesh = reliefMesh(graph);
		const edges = new Map<string, { count: number; direction: number }>();
		const vertices = new Set<string>();
		let volume = 0;
		const max = [0, 0, 0],
			min = [Infinity, Infinity, Infinity];
		for (const triangle of mesh) {
			const [a, b, c] = triangle;
			volume +=
				(a[0] * (b[1] * c[2] - b[2] * c[1]) +
					a[1] * (b[2] * c[0] - b[0] * c[2]) +
					a[2] * (b[0] * c[1] - b[1] * c[0])) /
				6;
			for (const vertex of triangle) {
				vertices.add(vertex.join(','));
				vertex.forEach((value, i) => {
					min[i] = Math.min(min[i], value);
					max[i] = Math.max(max[i], value);
				});
			}
			for (let i = 0; i < 3; i++) {
				const from = triangle[i].join(','),
					to = triangle[(i + 1) % 3].join(',');
				const key = [from, to].sort().join('|');
				const entry = edges.get(key) ?? { count: 0, direction: 0 };
				entry.count++;
				entry.direction += from < to ? 1 : -1;
				edges.set(key, entry);
			}
		}
		expect(mesh).toHaveLength(65040);
		expect(
			[...edges.values()].every(({ count, direction }) => count === 2 && direction === 0),
		).toBe(true);
		expect(vertices.size - edges.size + mesh.length).toBe(2);
		expect(min).toEqual([0, 0, 0]);
		expect(max).toEqual([160, 100, 4]);
		expect(volume).toBeGreaterThan(32000);
		const stl = renderStl(graph);
		expect(new DataView(stl).getUint32(80, true)).toBe(mesh.length);
		expect(stl.byteLength).toBe(84 + mesh.length * 50);
	});
});
