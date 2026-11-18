import { describe, expect, it } from 'vitest';
import { createConstellation } from './graph';
import { sampleWorkflow } from './demo/sample';

describe('workflow constellation', () => {
	it('preserves branches and relative geometry without changing the workflow', () => {
		const before = JSON.stringify(sampleWorkflow);
		const graph = createConstellation(sampleWorkflow);
		expect(graph.stars).toHaveLength(13);
		expect(graph.connections).toHaveLength(13);
		expect(graph.connections.filter((edge) => edge.from === 2)).toHaveLength(2);
		const scale = (graph.stars[1].x - graph.stars[0].x) / 180;
		expect(graph.stars[3].y - graph.stars[2].y).toBeCloseTo(-170 * scale);
		expect(JSON.stringify(sampleWorkflow)).toBe(before);
	});

	it('copies only names and coordinates and omits sticky notes and unknown targets', () => {
		const graph = createConstellation({
			nodes: [
				{
					name: 'Start',
					position: [0, 0],
					parameters: { token: 'private-value' },
					credentials: { id: 'private-id' },
				},
				{
					name: 'Note',
					type: 'n8n-nodes-base.stickyNote',
					position: [10, 10],
					parameters: { content: 'private-note' },
				},
				{ name: 'Invalid', position: [Number.NaN, 0] },
			],
			connections: { Start: { main: [[{ node: 'Note' }, { node: 'Missing' }]] } },
		});
		expect(graph).toEqual({
			stars: [{ name: 'Start', x: 800, y: 485, degree: 0 }],
			connections: [],
		});
		expect(JSON.stringify(graph)).not.toContain('private');
	});

	it('keeps auxiliary connections and cycles', () => {
		const graph = createConstellation({
			nodes: [
				{ name: 'Agent', position: [200, 0] },
				{ name: 'Model', position: [0, 100] },
			],
			connections: {
				Model: { ai_languageModel: [[{ node: 'Agent' }]] },
				Agent: { main: [[{ node: 'Agent' }]] },
			},
		});
		expect(graph.connections).toEqual([
			{ from: 1, to: 0, auxiliary: true },
			{ from: 0, to: 0, auxiliary: false },
		]);
	});

	it('handles empty and malformed graph data', () => {
		expect(createConstellation({ nodes: [], connections: {} })).toEqual({
			stars: [],
			connections: [],
		});
		expect(
			createConstellation({
				nodes: [null, {}, { name: 'A', position: [1, 2] }],
				connections: { A: { main: [null] } },
			}).stars,
		).toHaveLength(1);
		expect(() => createConstellation({})).toThrow('Invalid workflow');
	});
});
