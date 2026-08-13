import { describe, it, expect } from 'vitest';
import type { AgentGoalConfig } from '@n8n/api-types';

import { computeGoalGraphLayout } from '../goalGraphLayout';

function goal(id: string, requires: string[] = []): AgentGoalConfig {
	return { id, name: id, instructions: '', requires };
}

describe('computeGoalGraphLayout', () => {
	it('places dependent goals to the right of their prerequisites', () => {
		const layout = computeGoalGraphLayout([goal('a'), goal('b', ['a']), goal('c', ['b'])]);

		expect(layout.goals.a.x).toBeLessThan(layout.goals.b.x);
		expect(layout.goals.b.x).toBeLessThan(layout.goals.c.x);
		// Trigger sits left of the first goal.
		expect(layout.trigger.x).toBeLessThan(layout.goals.a.x);
	});

	it('reports goals without prerequisites as roots', () => {
		const layout = computeGoalGraphLayout([goal('a'), goal('b', ['a']), goal('standalone')]);
		expect(layout.roots.sort()).toEqual(['a', 'standalone']);
	});

	it('stacks parallel goals (same depth) in one column at different y', () => {
		const layout = computeGoalGraphLayout([goal('root'), goal('x', ['root']), goal('y', ['root'])]);
		expect(layout.goals.x.x).toBe(layout.goals.y.x);
		expect(layout.goals.x.y).not.toBe(layout.goals.y.y);
	});

	it('is deterministic for the same input', () => {
		const goals = [goal('a'), goal('b', ['a']), goal('c', ['a', 'b'])];
		expect(computeGoalGraphLayout(goals)).toEqual(computeGoalGraphLayout(goals));
	});

	it('is cycle-safe — produces finite positions without throwing', () => {
		const layout = computeGoalGraphLayout([goal('a', ['b']), goal('b', ['a'])]);
		for (const id of ['a', 'b']) {
			expect(Number.isFinite(layout.goals[id].x)).toBe(true);
			expect(Number.isFinite(layout.goals[id].y)).toBe(true);
		}
		expect(Number.isFinite(layout.width)).toBe(true);
		expect(Number.isFinite(layout.height)).toBe(true);
	});

	it('ignores requires referencing unknown goals', () => {
		const layout = computeGoalGraphLayout([goal('a', ['ghost'])]);
		// `ghost` doesn't exist, so `a` is treated as a root at column 0.
		expect(layout.roots).toEqual(['a']);
		expect(Number.isFinite(layout.goals.a.x)).toBe(true);
	});
});
