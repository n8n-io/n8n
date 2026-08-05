import { ScheduledJobMisfirePolicy } from '@n8n/constants';

import type { ScheduledJob } from '../../types';
import { coalesceSiblingCatchUps } from '../coalesce-group';
import type { OccurrencePlan } from '../plan';
import type { PlannedJob } from '../transaction';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const secondsAfter = (base: Date, seconds: number) => new Date(base.getTime() + seconds * 1000);
const secondsBefore = (base: Date, seconds: number) => secondsAfter(base, -seconds);

const makeJob = (overrides: Partial<ScheduledJob> = {}): ScheduledJob => ({
	id: 1,
	taskType: 'test',
	payload: {},
	kind: 'interval',
	cronExpression: null,
	timezone: null,
	intervalSeconds: 10,
	fireAt: null,
	recurrenceUnit: null,
	recurrenceSize: null,
	nextRunAt: NOW,
	lastFiredAt: null,
	maxAttempts: 1,
	misfirePolicy: ScheduledJobMisfirePolicy.CoalesceOwner,
	misfireGraceSeconds: 60,
	ownerKey: 'owner-a',
	...overrides,
});

const makePlan = (overrides: Partial<OccurrencePlan> = {}): OccurrencePlan => ({
	occurrences: [],
	skippedOccurrences: 0,
	catchUpAt: null,
	retireBefore: null,
	nextRunAt: secondsAfter(NOW, 10),
	lastFiredAt: null,
	...overrides,
});

const makeMember = (
	job: Partial<ScheduledJob>,
	catchUpAt: Date,
	plan: Partial<OccurrencePlan> = {},
): PlannedJob => ({
	job: makeJob(job),
	plan: makePlan({
		occurrences: [catchUpAt],
		skippedOccurrences: 4,
		catchUpAt,
		retireBefore: catchUpAt,
		lastFiredAt: secondsBefore(NOW, 10),
		...plan,
	}),
});

const byId = (result: PlannedJob[], id: number): PlannedJob => {
	const found = result.find(({ job }) => job.id === id);
	if (found === undefined) throw new Error(`no planned job with id ${id}`);
	return found;
};

describe('coalesceSiblingCatchUps', () => {
	describe('a group of overdue siblings', () => {
		const catchUpOne = secondsBefore(NOW, 30);
		const catchUpTwo = secondsBefore(NOW, 20);
		const catchUpThree = secondsBefore(NOW, 10);

		const makeSiblings = (): PlannedJob[] => [
			makeMember({ id: 1 }, catchUpOne),
			makeMember({ id: 2 }, catchUpTwo),
			makeMember({ id: 3 }, catchUpThree),
		];

		it("keeps the winner's catch-up run and plan untouched", () => {
			const result = coalesceSiblingCatchUps(makeSiblings());

			const withCatchUp = result.filter(({ plan }) => plan.catchUpAt !== null);
			expect(withCatchUp).toHaveLength(1);
			const winner = withCatchUp[0];
			expect(winner.job.id).toBe(3);
			expect(winner.plan.catchUpAt).toEqual(catchUpThree);
			expect(winner.plan.occurrences).toEqual([catchUpThree]);
			expect(winner.plan.retireBefore).toEqual(catchUpThree);
		});

		it("drops each loser's catch-up run, leaving its clock, retirement instant and backlog count untouched", () => {
			const result = coalesceSiblingCatchUps(makeSiblings());

			const loserOne = byId(result, 1);
			expect(loserOne.plan.catchUpAt).toBeNull();
			expect(loserOne.plan.retireBefore).toEqual(catchUpOne);

			const loserTwo = byId(result, 2);
			expect(loserTwo.plan.catchUpAt).toBeNull();
			expect(loserTwo.plan.retireBefore).toEqual(catchUpTwo);

			for (const id of [1, 2, 3]) {
				const member = byId(result, id);
				expect(member.plan.nextRunAt).toEqual(secondsAfter(NOW, 10));
				expect(member.plan.lastFiredAt).toEqual(secondsBefore(NOW, 10));
				expect(member.plan.skippedOccurrences).toBe(4);
			}
		});
	});

	it('removes only the catch-up instant from a loser, keeping its future occurrences in order', () => {
		const catchUpAt = secondsBefore(NOW, 30);
		const laterCatchUp = secondsBefore(NOW, 10);
		const futureOne = secondsAfter(NOW, 10);
		const futureTwo = secondsAfter(NOW, 20);
		const planned = [
			makeMember({ id: 1 }, catchUpAt, {
				occurrences: [catchUpAt, futureOne, futureTwo],
				nextRunAt: secondsAfter(NOW, 30),
			}),
			makeMember({ id: 2 }, laterCatchUp),
		];

		const result = coalesceSiblingCatchUps(planned);

		const loser = byId(result, 1);
		expect(loser.plan.occurrences).toEqual([futureOne, futureTwo]);
		expect(loser.plan.nextRunAt).toEqual(secondsAfter(NOW, 30));
	});

	it('leaves a lone member of an owner untouched', () => {
		const catchUpAt = secondsBefore(NOW, 30);
		const planned = [makeMember({ id: 1 }, catchUpAt)];

		const result = coalesceSiblingCatchUps(planned);

		expect(result).toHaveLength(1);
		expect(result[0].plan.catchUpAt).toEqual(catchUpAt);
		expect(result[0].plan.occurrences).toEqual([catchUpAt]);
		expect(result[0].plan.retireBefore).toEqual(catchUpAt);
	});

	it('leaves ownerless members untouched even when they share a task type', () => {
		const planned = [
			makeMember({ id: 1, ownerKey: null }, secondsBefore(NOW, 30)),
			makeMember({ id: 2, ownerKey: null }, secondsBefore(NOW, 20)),
			makeMember({ id: 3, ownerKey: null }, secondsBefore(NOW, 10)),
		];

		const result = coalesceSiblingCatchUps(planned);

		expect(result.filter(({ plan }) => plan.catchUpAt !== null)).toHaveLength(3);
	});

	it('leaves members on the per-job coalesce policy untouched despite a shared owner', () => {
		const perJob = (id: number, catchUpAt: Date) =>
			makeMember({ id, misfirePolicy: ScheduledJobMisfirePolicy.Coalesce }, catchUpAt);
		const planned = [perJob(1, secondsBefore(NOW, 30)), perJob(2, secondsBefore(NOW, 20))];

		const result = coalesceSiblingCatchUps(planned);

		expect(result.filter(({ plan }) => plan.catchUpAt !== null)).toHaveLength(2);
	});

	it('leaves members on the skip policy untouched despite a shared owner', () => {
		const ahead = secondsAfter(NOW, 10);
		const skipped = (id: number): PlannedJob => ({
			job: makeJob({ id, misfirePolicy: ScheduledJobMisfirePolicy.Skip }),
			plan: makePlan({ occurrences: [ahead], skippedOccurrences: 4 }),
		});
		const planned = [skipped(1), skipped(2)];

		const result = coalesceSiblingCatchUps(planned);

		for (const id of [1, 2]) {
			const member = byId(result, id);
			expect(member.plan.occurrences).toEqual([ahead]);
			expect(member.plan.retireBefore).toBeNull();
		}
	});

	it('groups each owner in a batch separately', () => {
		const planned = [
			makeMember({ id: 1, ownerKey: 'owner-a' }, secondsBefore(NOW, 30)),
			makeMember({ id: 2, ownerKey: 'owner-a' }, secondsBefore(NOW, 20)),
			makeMember({ id: 3, ownerKey: 'owner-b' }, secondsBefore(NOW, 45)),
			makeMember({ id: 4, ownerKey: 'owner-b' }, secondsBefore(NOW, 5)),
		];

		const result = coalesceSiblingCatchUps(planned);

		expect(byId(result, 1).plan.catchUpAt).toBeNull();
		expect(byId(result, 2).plan.catchUpAt).toEqual(secondsBefore(NOW, 20));
		expect(byId(result, 3).plan.catchUpAt).toBeNull();
		expect(byId(result, 4).plan.catchUpAt).toEqual(secondsBefore(NOW, 5));
	});

	it('breaks a tie on the catch-up instant by the lowest job id', () => {
		const tied = secondsBefore(NOW, 10);
		const planned = [makeMember({ id: 5 }, tied), makeMember({ id: 2 }, tied)];

		const result = coalesceSiblingCatchUps(planned);

		expect(byId(result, 2).plan.catchUpAt).toEqual(tied);
		expect(byId(result, 5).plan.catchUpAt).toBeNull();
	});

	it('never drops the catch-up run of a member whose schedule is exhausted', () => {
		const exhaustedCatchUp = secondsBefore(NOW, 30);
		const laterCatchUp = secondsBefore(NOW, 10);
		const planned = [
			makeMember({ id: 1 }, exhaustedCatchUp, { nextRunAt: null }),
			makeMember({ id: 2 }, laterCatchUp),
		];

		const result = coalesceSiblingCatchUps(planned);

		const exhausted = byId(result, 1);
		expect(exhausted.plan.catchUpAt).toEqual(exhaustedCatchUp);
		expect(exhausted.plan.occurrences).toEqual([exhaustedCatchUp]);
		expect(exhausted.plan.nextRunAt).toBeNull();
		expect(byId(result, 2).plan.catchUpAt).toEqual(laterCatchUp);
	});

	it('drops the catch-up run of an exhausted member whose instant is the winner instant', () => {
		const shared = secondsBefore(NOW, 10);
		const planned = [
			makeMember({ id: 2 }, shared),
			makeMember({ id: 5 }, shared, { nextRunAt: null }),
		];

		const result = coalesceSiblingCatchUps(planned);

		expect(byId(result, 2).plan.catchUpAt).toEqual(shared);
		const exhausted = byId(result, 5);
		expect(exhausted.plan.catchUpAt).toBeNull();
		expect(exhausted.plan.occurrences).toEqual([]);
	});

	it.each([
		['taskType', { taskType: 'trigger' }, { taskType: 'poll' }],
		['misfireGraceSeconds', { misfireGraceSeconds: 60 }, { misfireGraceSeconds: 120 }],
		['payload', { payload: { rule: 'one' } }, { payload: { rule: 'two' } }],
	])('keeps both catch-up runs when siblings differ in %s', (_label, first, second) => {
		const planned = [
			makeMember({ id: 1, ...first }, secondsBefore(NOW, 30)),
			makeMember({ id: 2, ...second }, secondsBefore(NOW, 20)),
		];

		const result = coalesceSiblingCatchUps(planned);

		expect(byId(result, 1).plan.catchUpAt).toEqual(secondsBefore(NOW, 30));
		expect(byId(result, 2).plan.catchUpAt).toEqual(secondsBefore(NOW, 20));
	});

	it('still groups siblings whose attempt limits differ', () => {
		const planned = [
			makeMember({ id: 1, maxAttempts: 1 }, secondsBefore(NOW, 30)),
			makeMember({ id: 2, maxAttempts: 3 }, secondsBefore(NOW, 20)),
		];

		const result = coalesceSiblingCatchUps(planned);

		expect(byId(result, 1).plan.catchUpAt).toBeNull();
		expect(byId(result, 2).plan.catchUpAt).toEqual(secondsBefore(NOW, 20));
	});

	it('keeps the catch-up run of a sibling whose payload cannot be serialised', () => {
		const cyclic: Record<string, unknown> = { rule: 'one' };
		cyclic.self = cyclic;
		const planned = [
			makeMember({ id: 1, payload: cyclic }, secondsBefore(NOW, 30)),
			makeMember({ id: 2 }, secondsBefore(NOW, 20)),
			makeMember({ id: 3 }, secondsBefore(NOW, 10)),
		];

		const result = coalesceSiblingCatchUps(planned);

		expect(byId(result, 1).plan.catchUpAt).toEqual(secondsBefore(NOW, 30));
		expect(byId(result, 2).plan.catchUpAt).toBeNull();
		expect(byId(result, 3).plan.catchUpAt).toEqual(secondsBefore(NOW, 10));
	});

	it('leaves a member without a catch-up run alone and still groups the rest', () => {
		const planned = [
			makeMember({ id: 1 }, secondsBefore(NOW, 30), {
				occurrences: [],
				catchUpAt: null,
				retireBefore: null,
			}),
			makeMember({ id: 2 }, secondsBefore(NOW, 20)),
			makeMember({ id: 3 }, secondsBefore(NOW, 10)),
		];

		const result = coalesceSiblingCatchUps(planned);

		const untouched = byId(result, 1);
		expect(untouched.plan.catchUpAt).toBeNull();
		expect(untouched.plan.occurrences).toEqual([]);
		expect(untouched.plan.retireBefore).toBeNull();

		expect(byId(result, 2).plan.catchUpAt).toBeNull();
		expect(byId(result, 3).plan.catchUpAt).toEqual(secondsBefore(NOW, 10));
	});

	it('keeps every catch-up run when no member of the owner has a further run', () => {
		const planned = [
			makeMember({ id: 1 }, secondsBefore(NOW, 30), { nextRunAt: null }),
			makeMember({ id: 2 }, secondsBefore(NOW, 20), { nextRunAt: null }),
			makeMember({ id: 3 }, secondsBefore(NOW, 10), { nextRunAt: null }),
		];

		const result = coalesceSiblingCatchUps(planned);

		expect(result.filter(({ plan }) => plan.catchUpAt !== null)).toHaveLength(3);
		for (const id of [1, 2, 3]) {
			const member = byId(result, id);
			expect(member.plan.occurrences).toHaveLength(1);
		}
	});

	it('lets an exhausted member hold the group catch-up run when its instant is the latest', () => {
		const latest = secondsBefore(NOW, 10);
		const planned = [
			makeMember({ id: 1 }, secondsBefore(NOW, 30)),
			makeMember({ id: 2 }, secondsBefore(NOW, 20)),
			makeMember({ id: 3 }, latest, { nextRunAt: null }),
		];

		const result = coalesceSiblingCatchUps(planned);

		const winner = byId(result, 3);
		expect(winner.plan.catchUpAt).toEqual(latest);
		expect(winner.plan.occurrences).toEqual([latest]);
		expect(winner.plan.nextRunAt).toBeNull();
		for (const id of [1, 2]) {
			expect(byId(result, id).plan.catchUpAt).toBeNull();
		}
	});

	it('groups only the owner-wide members when a sibling uses the per-job coalesce policy', () => {
		const perJobCatchUp = secondsBefore(NOW, 30);
		const planned = [
			makeMember({ id: 1, misfirePolicy: ScheduledJobMisfirePolicy.Coalesce }, perJobCatchUp),
			makeMember({ id: 2 }, secondsBefore(NOW, 20)),
			makeMember({ id: 3 }, secondsBefore(NOW, 10)),
		];

		const result = coalesceSiblingCatchUps(planned);

		const perJob = byId(result, 1);
		expect(perJob.plan.catchUpAt).toEqual(perJobCatchUp);
		expect(perJob.plan.occurrences).toEqual([perJobCatchUp]);

		expect(byId(result, 2).plan.catchUpAt).toBeNull();
		expect(byId(result, 3).plan.catchUpAt).toEqual(secondsBefore(NOW, 10));
	});

	it('groups a member whose occurrences were capped but still hold a catch-up run', () => {
		const cappedCatchUp = secondsBefore(NOW, 30);
		const remaining = secondsBefore(NOW, 25);
		const planned = [
			makeMember({ id: 1 }, cappedCatchUp, {
				occurrences: [cappedCatchUp, remaining],
				nextRunAt: secondsBefore(NOW, 20),
			}),
			makeMember({ id: 2 }, secondsBefore(NOW, 10)),
		];

		const result = coalesceSiblingCatchUps(planned);

		const capped = byId(result, 1);
		expect(capped.plan.catchUpAt).toBeNull();
		expect(capped.plan.occurrences).toEqual([remaining]);
		expect(capped.plan.retireBefore).toEqual(cappedCatchUp);
		expect(capped.plan.nextRunAt).toEqual(secondsBefore(NOW, 20));
	});
});
