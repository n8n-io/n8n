import { layout, type ArtGraph, type ArtNode } from './art';

type Vertex = [number, number, number];
export const plaque = { width: 160, height: 100, base: 2, relief: 2, pitch: 1 };

function distance(p: ArtNode, a: ArtNode, b: ArtNode) {
	const dx = b.x - a.x,
		dy = b.y - a.y;
	const t = Math.max(
		0,
		Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
	);
	return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/** A single height field joins every raised feature to the solid base. */
export function reliefMesh(graph: ArtGraph): Vertex[][] {
	const g = layout(graph, 132, 72);
	const nodes = g.nodes.map(({ x, y }) => ({ x: x + 14, y: y + 14 }));
	const heights = Array.from({ length: 101 }, (_, y) =>
		Array.from({ length: 161 }, (_, x) => {
			const p = { x, y };
			const nodeDistance = Math.min(...nodes.map((n) => Math.hypot(x - n.x, y - n.y)));
			const edgeDistance = Math.min(...g.edges.map(([a, b]) => distance(p, nodes[a], nodes[b])));
			return (
				2 +
				Math.max(
					Math.max(0, Math.min(1, 4 - nodeDistance)) * 2,
					Math.max(0, Math.min(1, 1.8 - edgeDistance)) * 1.2,
				)
			);
		}),
	);
	const triangles: Vertex[][] = [];
	const top = (x: number, y: number): Vertex => [x, y, heights[y][x]];
	const bottom = (x: number, y: number): Vertex => [x, y, 0];
	const quad = (a: Vertex, b: Vertex, c: Vertex, d: Vertex) => {
		triangles.push([a, b, c], [a, c, d]);
	};
	for (let y = 0; y < 100; y++)
		for (let x = 0; x < 160; x++) {
			quad(top(x, y), top(x + 1, y), top(x + 1, y + 1), top(x, y + 1));
			quad(bottom(x, y), bottom(x, y + 1), bottom(x + 1, y + 1), bottom(x + 1, y));
		}
	for (let x = 0; x < 160; x++) {
		quad(bottom(x, 0), bottom(x + 1, 0), top(x + 1, 0), top(x, 0));
		quad(bottom(x + 1, 100), bottom(x, 100), top(x, 100), top(x + 1, 100));
	}
	for (let y = 0; y < 100; y++) {
		quad(bottom(0, y + 1), bottom(0, y), top(0, y), top(0, y + 1));
		quad(bottom(160, y), bottom(160, y + 1), top(160, y + 1), top(160, y));
	}
	return triangles;
}

export function renderStl(graph: ArtGraph): ArrayBuffer {
	const triangles = reliefMesh(graph);
	const buffer = new ArrayBuffer(84 + triangles.length * 50);
	const view = new DataView(buffer);
	new Uint8Array(buffer, 0, 80).set(
		new TextEncoder().encode('n8n relief | millimeters | 160 x 100 | base 2 | max height 4'),
	);
	view.setUint32(80, triangles.length, true);
	let offset = 84;
	for (const [a, b, c] of triangles) {
		const u = b.map((v, i) => v - a[i]),
			v = c.map((value, i) => value - a[i]);
		const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
		const length = Math.hypot(...n);
		for (const value of [...n.map((value) => value / length), ...a, ...b, ...c]) {
			view.setFloat32(offset, value, true);
			offset += 4;
		}
		offset += 2;
	}
	return buffer;
}
