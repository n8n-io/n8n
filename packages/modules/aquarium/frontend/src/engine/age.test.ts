import { OLD_WORKFLOW } from '../aquarium.constants';
import type { AquariumEntity, EntityKind } from '../aquarium.types';
import { DEMO_ENTITIES } from '../sources/demo.source';
import { emptyMetrics } from '../sources/source.utils';
import { ageInDays, oldWorkflowKeys } from './age';

const NOW = Date.parse('2026-11-18T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const aged = (
	key: string,
	days: number | undefined,
	kind: EntityKind = 'workflow',
): AquariumEntity => ({
	key,
	id: key,
	kind,
	name: key,
	...(days === undefined ? {} : { createdAt: new Date(NOW - days * DAY_MS).toISOString() }),
	metrics: emptyMetrics(),
});

describe('ageInDays', () => {
	it('reads the age, and ignores a missing or broken date', () => {
		expect(ageInDays(aged('a', 10), NOW)).toBeCloseTo(10);
		expect(ageInDays(aged('b', undefined), NOW)).toBeUndefined();
		expect(ageInDays({ ...aged('c', 1), createdAt: 'not a date' }, NOW)).toBeUndefined();
	});
});

describe('oldWorkflowKeys', () => {
	it('picks only the oldest share, and only when they are old enough', () => {
		const entities = Array.from({ length: 100 }, (_, i) => aged(`w${i}`, (i + 1) * 10));

		// Ages 10 to 1000 days. The oldest 2% are 990 and 1000 days old.
		expect([...oldWorkflowKeys(entities, NOW)].sort()).toEqual(['w98', 'w99']);
	});

	it('finds nothing old in a young instance', () => {
		const young = Array.from({ length: 10 }, (_, i) => aged(`w${i}`, i * 5));

		expect(oldWorkflowKeys(young, NOW).size).toBe(0);
	});

	it('can find one old workflow in a small tank', () => {
		expect([...oldWorkflowKeys([aged('old', 400), aged('new', 3)], NOW)]).toEqual(['old']);
	});

	it('ignores agents and entities without a date', () => {
		const keys = oldWorkflowKeys(
			[
				aged('agent', 900, 'agent'),
				aged('undated', undefined),
				aged('wf', OLD_WORKFLOW.minAgeDays + 1),
			],
			NOW,
		);

		expect([...keys]).toEqual(['wf']);
	});

	it('makes only the oldest demo workflow old, and not the other old ones', () => {
		const names = DEMO_ENTITIES.filter((e) =>
			oldWorkflowKeys(DEMO_ENTITIES, Date.now()).has(e.key),
		).map((e) => e.name);

		// 13 demo workflows: 2% rounds down, and at least one turtle is allowed.
		expect(names).toEqual(['Fax gateway']);
	});
});
