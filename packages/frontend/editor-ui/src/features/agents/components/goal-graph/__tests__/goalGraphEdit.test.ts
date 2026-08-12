import { describe, it, expect } from 'vitest';
import type { AgentGoalConfig, AgentSlotConfig } from '@n8n/api-types';

import {
	addGoal,
	connectGoals,
	createDefaultGoal,
	createDefaultSlot,
	disconnectGoals,
	generateGoalId,
	generateSlotName,
	removeGoal,
	removeSlot,
	renameGoalId,
	updateGoal,
	upsertSlot,
	wouldCreateCycle,
} from '../goalGraphEdit';

function goal(id: string, requires?: string[]): AgentGoalConfig {
	return { id, name: id, instructions: '', ...(requires ? { requires } : {}) };
}

function slot(name: string): AgentSlotConfig {
	return { name, type: 'string', access: 'standard' };
}

describe('generateGoalId', () => {
	it('generates goal-1 for an empty graph', () => {
		expect(generateGoalId([])).toBe('goal-1');
	});

	it('skips ids that are already taken', () => {
		expect(generateGoalId([goal('goal-2'), goal('goal-3')])).toBe('goal-4');
	});
});

describe('createDefaultGoal', () => {
	it('creates a minimal valid goal with a fresh id', () => {
		expect(createDefaultGoal([goal('goal-1')])).toEqual({
			id: 'goal-2',
			name: 'New goal',
			instructions: '',
		});
	});
});

describe('addGoal', () => {
	it('appends without mutating the input', () => {
		const goals = [goal('a')];
		const next = addGoal(goals, goal('b'));
		expect(next.map((g) => g.id)).toEqual(['a', 'b']);
		expect(goals).toHaveLength(1);
	});
});

describe('removeGoal', () => {
	it('removes the goal and cascades into requires', () => {
		const goals = [goal('a'), goal('b', ['a']), goal('c', ['a', 'b'])];
		const next = removeGoal(goals, 'a');
		expect(next.map((g) => g.id)).toEqual(['b', 'c']);
		// Empty requires arrays are dropped entirely.
		expect(next[0].requires).toBeUndefined();
		expect(next[1].requires).toEqual(['b']);
	});

	it('does not mutate the input', () => {
		const goals = [goal('a'), goal('b', ['a'])];
		removeGoal(goals, 'a');
		expect(goals[1].requires).toEqual(['a']);
	});
});

describe('renameGoalId', () => {
	it('renames the goal and cascades into requires', () => {
		const next = renameGoalId([goal('a'), goal('b', ['a'])], 'a', 'verified');
		expect(next[0].id).toBe('verified');
		expect(next[1].requires).toEqual(['verified']);
	});
});

describe('updateGoal', () => {
	it('replaces the goal in place', () => {
		const next = updateGoal([goal('a'), goal('b')], 'a', { ...goal('a'), name: 'Renamed' });
		expect(next[0].name).toBe('Renamed');
	});

	it('cascades a changed id into other goals requires', () => {
		const next = updateGoal([goal('a'), goal('b', ['a'])], 'a', goal('a2', undefined));
		expect(next[0].id).toBe('a2');
		expect(next[1].requires).toEqual(['a2']);
	});
});

describe('wouldCreateCycle', () => {
	it('detects a self edge', () => {
		expect(wouldCreateCycle([goal('a')], 'a', 'a')).toBe(true);
	});

	it('detects a direct back-edge', () => {
		// b requires a; adding b into a.requires would be a cycle.
		expect(wouldCreateCycle([goal('a'), goal('b', ['a'])], 'b', 'a')).toBe(true);
	});

	it('detects a transitive cycle', () => {
		// a → b → c chain (a requires b, b requires c); adding a into c.requires closes it.
		const goals = [goal('a', ['b']), goal('b', ['c']), goal('c')];
		expect(wouldCreateCycle(goals, 'a', 'c')).toBe(true);
	});

	it('allows independent connections', () => {
		const goals = [goal('a'), goal('b', ['a']), goal('c')];
		expect(wouldCreateCycle(goals, 'a', 'c')).toBe(false);
		expect(wouldCreateCycle(goals, 'c', 'b')).toBe(false);
	});
});

describe('connectGoals', () => {
	it('appends the prerequisite on the target goal', () => {
		const res = connectGoals([goal('a'), goal('b')], 'a', 'b');
		expect(res).toEqual({ ok: true, goals: [goal('a'), goal('b', ['a'])] });
	});

	it('preserves existing prerequisites', () => {
		const res = connectGoals([goal('a'), goal('b'), goal('c', ['a'])], 'b', 'c');
		expect(res.ok && res.goals[2].requires).toEqual(['a', 'b']);
	});

	it('rejects unknown goals', () => {
		expect(connectGoals([goal('a')], 'a', 'ghost')).toEqual({ ok: false, error: 'unknown-goal' });
		expect(connectGoals([goal('a')], 'ghost', 'a')).toEqual({ ok: false, error: 'unknown-goal' });
	});

	it('rejects self edges', () => {
		expect(connectGoals([goal('a')], 'a', 'a')).toEqual({ ok: false, error: 'self' });
	});

	it('rejects duplicate edges', () => {
		expect(connectGoals([goal('a'), goal('b', ['a'])], 'a', 'b')).toEqual({
			ok: false,
			error: 'duplicate',
		});
	});

	it('rejects cycles', () => {
		const goals = [goal('a', ['b']), goal('b', ['c']), goal('c')];
		expect(connectGoals(goals, 'a', 'c')).toEqual({ ok: false, error: 'cycle' });
	});

	it('does not mutate the input', () => {
		const goals = [goal('a'), goal('b')];
		connectGoals(goals, 'a', 'b');
		expect(goals[1].requires).toBeUndefined();
	});
});

describe('disconnectGoals', () => {
	it('removes the prerequisite and drops an emptied requires array', () => {
		const next = disconnectGoals([goal('a'), goal('b', ['a'])], 'a', 'b');
		expect(next[1].requires).toBeUndefined();
	});

	it('keeps other prerequisites', () => {
		const next = disconnectGoals([goal('a'), goal('b'), goal('c', ['a', 'b'])], 'a', 'c');
		expect(next[2].requires).toEqual(['b']);
	});
});

describe('slots', () => {
	it('generateSlotName skips taken names', () => {
		expect(generateSlotName([])).toBe('slot1');
		expect(generateSlotName([slot('slot2')])).toBe('slot3');
		expect(generateSlotName([slot('slot1'), slot('slot2')])).toBe('slot3');
	});

	it('createDefaultSlot creates a standard-access string slot', () => {
		expect(createDefaultSlot([])).toEqual({ name: 'slot1', type: 'string', access: 'standard' });
	});

	it('upsertSlot appends when index is null and replaces otherwise', () => {
		const slots = [slot('a'), slot('b')];
		expect(upsertSlot(slots, null, slot('c'))).toHaveLength(3);
		const replaced = upsertSlot(slots, 1, slot('b2'));
		expect(replaced.map((s) => s.name)).toEqual(['a', 'b2']);
		expect(slots[1].name).toBe('b');
	});

	it('removeSlot removes by index without mutating', () => {
		const slots = [slot('a'), slot('b')];
		expect(removeSlot(slots, 0).map((s) => s.name)).toEqual(['b']);
		expect(slots).toHaveLength(2);
	});
});
