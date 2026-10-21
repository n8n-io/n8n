import { describe, expect, it } from 'vitest';

import { DEFAULT_AGENT_PERSONALISATION } from '../agent-json-config.schema';
import {
	addMissingAgentPersonalisation,
	getRandomAgentPersonalisationGradient,
	resolveAgentPersonalisation,
	type AgentPersonalisation,
} from '../agent-personalisation';

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

describe('resolveAgentPersonalisation', () => {
	const gradient = { from: '#00ABED', to: '#EE5F00', angle: 171, fromStop: 0, toStop: 97 };

	it('keeps a valid stored gradient', () => {
		expect(resolveAgentPersonalisation({ icon: 'laugh', gradient }).gradient).toEqual(gradient);
	});

	it('fills a missing personalisation with the defaults', () => {
		expect(resolveAgentPersonalisation(null)).toEqual(DEFAULT_AGENT_PERSONALISATION);
	});

	it.each([
		['an empty icon name', ''],
		['an icon that is not text', 42],
	])('uses the default icon for %s', (_, icon) => {
		const value = { icon, gradient } as unknown as AgentPersonalisation;

		expect(resolveAgentPersonalisation(value).icon).toBe(DEFAULT_AGENT_PERSONALISATION.icon);
	});

	it.each([
		['a colour that is not #RRGGBB', { from: '#X000FF' }],
		['a short colour', { to: '#F00' }],
		['a missing colour', { from: null }],
		['equal stops', { fromStop: 50, toStop: 50 }],
		['reversed stops', { fromStop: 90, toStop: 10 }],
		['stops that are text', { fromStop: 'a' }],
		['an angle that is not a number', { angle: 'abc' }],
		['an angle too large to draw', { angle: 1e308 }],
		['a negative angle', { angle: -1 }],
		['an angle of a full turn', { angle: 360 }],
		['an angle that is not a whole number', { angle: 45.5 }],
		['a start stop past its range', { fromStop: 46 }],
		['an end stop before its range', { toStop: 54 }],
	])('uses the default gradient for %s', (_, broken) => {
		const value = {
			icon: 'laugh',
			gradient: { ...gradient, ...broken },
		} as unknown as AgentPersonalisation;

		expect(resolveAgentPersonalisation(value)).toEqual({
			icon: 'laugh',
			gradient: DEFAULT_AGENT_PERSONALISATION.gradient,
		});
	});

	it('fills a missing layout field with its default', () => {
		const { angle: _angle, ...withoutAngle } = gradient;

		const value = { icon: 'laugh', gradient: withoutAngle } as AgentPersonalisation;

		expect(resolveAgentPersonalisation(value).gradient).toEqual({
			...gradient,
			angle: DEFAULT_AGENT_PERSONALISATION.gradient.angle,
		});
	});

	it('drops keys the gradient does not draw', () => {
		const value = { icon: 'laugh', gradient: { ...gradient, extra: 1 } } as AgentPersonalisation;

		expect(resolveAgentPersonalisation(value).gradient).toEqual(gradient);
	});
});
