import { describe, expect, it } from 'vitest';

import {
	addMissingAgentPersonalisation,
	getRandomAgentPersonalisationGradient,
} from '../agentPersonalisation';

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
		for (const gradient of [first, second]) {
			expect(gradient.angle).toBeGreaterThanOrEqual(0);
			expect(gradient.angle).toBeLessThanOrEqual(359);
			expect(gradient.fromStop).toBeGreaterThanOrEqual(0);
			expect(gradient.fromStop).toBeLessThanOrEqual(24);
			expect(gradient.toStop).toBeGreaterThanOrEqual(76);
			expect(gradient.toStop).toBeLessThanOrEqual(100);
		}
	});

	it('adds randomized layout fields to existing two-color gradients', () => {
		const config = {
			name: 'Support',
			model: '',
			instructions: '',
			personalisation: {
				icon: 'bot',
				gradient: { from: '#111111', to: '#222222' },
			},
		} as unknown as Parameters<typeof addMissingAgentPersonalisation>[0];

		const updated = addMissingAgentPersonalisation(config, sequenceRandom([0.5, 0.25, 0.75]));

		expect(updated?.personalisation?.gradient).toEqual({
			from: '#111111',
			to: '#222222',
			angle: 180,
			fromStop: 6,
			toStop: 94,
		});
	});
});
