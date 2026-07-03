import { describe, expect, it } from 'vitest';

import { getRandomAgentPersonalisationGradient } from '../agent-personalisation';

function sequenceRandom(values: number[]) {
	let index = 0;
	return () => values[index++] ?? values[values.length - 1] ?? 0;
}

describe('agent personalisation gradients', () => {
	it('uses multiple random inputs to generate richer gradient variations', () => {
		const first = getRandomAgentPersonalisationGradient(sequenceRandom([0.5, 0.1, 0.1, 0.1]));
		const second = getRandomAgentPersonalisationGradient(sequenceRandom([0.5, 0.9, 0.9, 0.9]));

		expect(first).not.toEqual(second);
		for (const color of [first.from, first.to, second.from, second.to]) {
			expect(color).toMatch(/^#[0-9A-F]{6}$/);
		}
	});
});
