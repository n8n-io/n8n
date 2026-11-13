/**
 * Structural round trip: v1 JSON → converted source → compiled canvas
 * projection (`src/compiler/projection.ts`).
 *
 * Every node that becomes a step (HTTP Request, library and fallback-host
 * nodes, Code, Wait, Respond to Webhook) comes back as a canvas node with the
 * same name and type. Core nodes that become plain code come back as
 * projection control nodes (Transform, If, Loop), so the test compares
 * connections between steps: when a step reaches another step in the original
 * through core nodes only, it reaches it in the projection through control
 * nodes only; and every such connection of the projection exists as a path in
 * the original.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compile } from '../../compiler/index.ts';
import { convertWorkflow } from '../index.ts';
import { extraWorkflows } from './workflows.ts';

const here = dirname(fileURLToPath(import.meta.url));
const casesDir = join(here, 'behaviour', 'cases');

interface Wf {
	nodes: Array<{ name: string; type: string }>;
	connections: Record<
		string,
		Record<string, Array<Array<{ node: string; index?: number }> | null>>
	>;
}

type Edges = Map<string, string[]>;

function edgesOf(connections: Wf['connections']): Edges {
	const out: Edges = new Map();
	for (const [from, types] of Object.entries(connections)) {
		for (const list of types.main ?? []) {
			for (const c of list ?? []) out.set(from, [...(out.get(from) ?? []), c.node]);
		}
	}
	return out;
}

/** Pairs (a, b) of `ends` where b is reachable from a through nodes outside `ends` only. */
function direct(edges: Edges, ends: Set<string>): Set<string> {
	const pairs = new Set<string>();
	for (const a of ends) {
		const seen = new Set<string>();
		const queue = [...(edges.get(a) ?? [])];
		while (queue.length > 0) {
			const n = queue.shift() ?? '';
			if (seen.has(n)) continue;
			seen.add(n);
			if (ends.has(n)) {
				if (n !== a) pairs.add(`${a} -> ${n}`);
				continue;
			}
			queue.push(...(edges.get(n) ?? []));
		}
	}
	return pairs;
}

function reachable(edges: Edges, from: string): Set<string> {
	const seen = new Set<string>();
	const queue = [...(edges.get(from) ?? [])];
	while (queue.length > 0) {
		const n = queue.shift() ?? '';
		if (seen.has(n)) continue;
		seen.add(n);
		queue.push(...(edges.get(n) ?? []));
	}
	return seen;
}

const samples: Array<[string, Wf]> = [
	...readdirSync(casesDir)
		.sort()
		.map((name): [string, Wf] => [
			name,
			JSON.parse(readFileSync(join(casesDir, name, 'workflow.json'), 'utf8')) as Wf,
		]),
	...Object.entries(extraWorkflows).map(([name, wf]): [string, Wf] => [name, wf as Wf]),
];

describe('round trip through the canvas projection', () => {
	for (const [name, wf] of samples) {
		it(name, () => {
			const converted = convertWorkflow(wf);
			expect(converted.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
			const compiled = compile(converted.source, { fileName: '/workflow.ts' });
			expect(compiled.ok, JSON.stringify(compiled.diagnostics)).toBe(true);
			const canvas = compiled.canvas;
			const manifest = compiled.manifest;
			if (!canvas || !manifest) throw new Error('no canvas');

			// The trigger and every step keep their node name and type.
			const byName = new Map(wf.nodes.map((n) => [n.name, n]));
			// The wait between the retries of a node is a step of its own, not a node.
			const retryWait = (name: string) =>
				name.endsWith(' (retry)') && byName.has(name.slice(0, -' (retry)'.length));
			const steps = new Set(manifest.steps.map((s) => s.name).filter((n) => !retryWait(n)));
			for (const step of steps) {
				const original = byName.get(step);
				expect(original, `step ${step} is a node of the original`).toBeDefined();
				const node = canvas.nodes.find((n) => n.name === step);
				expect(node, `canvas node ${step}`).toBeDefined();
				const type = original?.type ?? '';
				const expectedType =
					type.endsWith('.function') || type.endsWith('.functionItem')
						? 'n8n-nodes-base.code'
						: type;
				expect(node?.type).toBe(expectedType);
			}
			const trigger = wf.nodes.find(
				(n) => n.type.endsWith('.webhook') || n.type.toLowerCase().endsWith('trigger'),
			);
			if (!trigger) throw new Error('no trigger');
			// The projection names its trigger node "Webhook".
			const canvasTrigger = canvas.nodes.find((n) => n.id === 'trigger');
			expect(canvasTrigger).toBeDefined();

			// The engine shape (loops, runs for each parent) keeps the graph in data, not in the
			// structure of the code, so the projection cannot find its connections.
			if (converted.diagnostics.some((d) => d.code === 'engine')) return;

			// Connections between steps.
			const rename = (n: string) => (n === trigger.name ? '<trigger>' : n);
			const originalEdges = edgesOf(wf.connections);
			const canvasEdges: Edges = new Map();
			for (const [from, { main }] of Object.entries(canvas.connections)) {
				canvasEdges.set(
					from === canvasTrigger?.name ? '<trigger>' : from,
					main.flat().map((c) => (c.node === canvasTrigger?.name ? '<trigger>' : c.node)),
				);
			}
			const renamedOriginal: Edges = new Map(
				[...originalEdges.entries()].map(([k, v]) => [rename(k), v.map(rename)]),
			);
			const ends = new Set(['<trigger>', ...steps]);
			const expectedPairs = direct(renamedOriginal, ends);
			const projectedPairs = direct(canvasEdges, ends);
			for (const pair of expectedPairs) {
				expect(projectedPairs.has(pair), `projection has ${pair}`).toBe(true);
			}
			for (const pair of projectedPairs) {
				const [a, b] = pair.split(' -> ');
				expect(reachable(renamedOriginal, a).has(b), `original has a path for ${pair}`).toBe(true);
			}

			// AI sub-nodes come back with their connection type and target input.
			for (const [from, types] of Object.entries(wf.connections)) {
				for (const [type, outputs] of Object.entries(types)) {
					if (type === 'main') continue;
					for (const c of (outputs ?? []).flat()) {
						if (!c) continue;
						const projected = canvas.connections[from]?.[type]?.flat() ?? [];
						expect(
							projected.some((p) => p.node === c.node && p.index === (c.index ?? 0)),
							`canvas has ${from} -${type}-> ${c.node}`,
						).toBe(true);
						expect(canvas.nodes.find((n) => n.name === from)?.type).toBe(
							wf.nodes.find((n) => n.name === from)?.type,
						);
					}
				}
			}
		});
	}
});
