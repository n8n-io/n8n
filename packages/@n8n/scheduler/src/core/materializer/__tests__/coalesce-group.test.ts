import { ScheduledJobMisfirePolicy } from '@n8n/constants';

import type { ScheduledJob } from '../../types';
import { applyCoalesceOwnerPolicy } from '../coalesce-group';
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
	missedAt: Date,
	plan: Partial<OccurrencePlan> = {},
): PlannedJob => ({
	job: makeJob(job),
	plan: makePlan({
		occurrences: [missedAt],
		skippedOccurrences: 4,
		catchUpAt: missedAt,
		retireBefore: missedAt,
		lastFiredAt: secondsBefore(NOW, 10),
		...plan,
	}),
});

const byId = (result: PlannedJob[], id: number): PlannedJob => {
	const found = result.find(({ job }) => job.id === id);
	if (found === undefined) throw new Error(`no planned job with id ${id}`);
	return found;
};

describe('applyCoalesceOwnerPolicy', () => {
	describe('a group of overdue siblings', () => {
		const missedOne = secondsBefore(NOW, 30);
		const missedTwo = secondsBefore(NOW, 20);
		const missedThree = secondsBefore(NOW, 10);

		const makeSiblings = (): PlannedJob[] => [
			makeMember({ id: 1 }, missedOne),
			makeMember({ id: 2 }, missedTwo),
			makeMember({ id: 3 }, missedThree),
		];

		it("keeps the winner's late run and plan untouched", () => {
			const result = applyCoalesceOwnerPolicy(makeSiblings());

			const withLateRun = result.filter(({ plan }) => plan.catchUpAt !== null);
			expect(withLateRun).toHaveLength(1);
			const winner = withLateRun[0];
			expect(winner.job.id).toBe(3);
			expect(winner.plan.catchUpAt).toEqual(missedThree);
			expect(winner.plan.occurrences).toEqual([missedThree]);
			expect(winner.plan.retireBefore).toEqual(missedThree);
		});

		it("drops each loser's late run, leaving its clock, retirement instant and backlog count untouched", () => {
			const result = applyCoalesceOwnerPolicy(makeSiblings());

			const loserOne = byId(result, 1);
			expect(loserOne.plan.catchUpAt).toBeNull();
			expect(loserOne.plan.retireBefore).toEqual(missedOne);

			const loserTwo = byId(result, 2);
			expect(loserTwo.plan.catchUpAt).toBeNull();
			expect(loserTwo.plan.retireBefore).toEqual(missedTwo);

			for (const id of [1, 2, 3]) {
				const member = byId(result, id);
				expect(member.plan.nextRunAt).toEqual(secondsAfter(NOW, 10));
				expect(member.plan.lastFiredAt).toEqual(secondsBefore(NOW, 10));
				expect(member.plan.skippedOccurrences).toBe(4);
			}
		});
	});

	it('removes only the late run from a loser, keeping its future occurrences in order', () => {
		const missedAt = secondsBefore(NOW, 30);
		const laterMissed = secondsBefore(NOW, 10);
		const futureOne = secondsAfter(NOW, 10);
		const futureTwo = secondsAfter(NOW, 20);
		const planned = [
			makeMember({ id: 1 }, missedAt, {
				occurrences: [missedAt, futureOne, futureTwo],
				nextRunAt: secondsAfter(NOW, 30),
			}),
			makeMember({ id: 2 }, laterMissed),
		];

		const result = applyCoalesceOwnerPolicy(planned);

		const loser = byId(result, 1);
		expect(loser.plan.occurrences).toEqual([futureOne, futureTwo]);
		expect(loser.plan.nextRunAt).toEqual(secondsAfter(NOW, 30));
	});

	it('leaves a lone member of an owner untouched', () => {
		const missedAt = secondsBefore(NOW, 30);
		const planned = [makeMember({ id: 1 }, missedAt)];

		const result = applyCoalesceOwnerPolicy(planned);

		expect(result).toHaveLength(1);
		expect(result[0].plan.catchUpAt).toEqual(missedAt);
		expect(result[0].plan.occurrences).toEqual([missedAt]);
		expect(result[0].plan.retireBefore).toEqual(missedAt);
	});

	it('leaves members on the per-job coalesce policy untouched despite a shared owner', () => {
		const perJob = (id: number, missedAt: Date) =>
			makeMember({ id, misfirePolicy: ScheduledJobMisfirePolicy.Coalesce }, missedAt);
		const planned = [perJob(1, secondsBefore(NOW, 30)), perJob(2, secondsBefore(NOW, 20))];

		const result = applyCoalesceOwnerPolicy(planned);

		expect(result.filter(({ plan }) => plan.catchUpAt !== null)).toHaveLength(2);
	});

	it('leaves members on the skip policy untouched despite a shared owner', () => {
		const ahead = secondsAfter(NOW, 10);
		const skipped = (id: number): PlannedJob => ({
			job: makeJob({ id, misfirePolicy: ScheduledJobMisfirePolicy.Skip }),
			plan: makePlan({ occurrences: [ahead], skippedOccurrences: 4 }),
		});
		const planned = [skipped(1), skipped(2)];

		const result = applyCoalesceOwnerPolicy(planned);

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

		const result = applyCoalesceOwnerPolicy(planned);

		expect(byId(result, 1).plan.catchUpAt).toBeNull();
		expect(byId(result, 2).plan.catchUpAt).toEqual(secondsBefore(NOW, 20));
		expect(byId(result, 3).plan.catchUpAt).toBeNull();
		expect(byId(result, 4).plan.catchUpAt).toEqual(secondsBefore(NOW, 5));
	});

	it('breaks a tie on the missed instant by the lowest job id', () => {
		const tied = secondsBefore(NOW, 10);
		const planned = [makeMember({ id: 5 }, tied), makeMember({ id: 2 }, tied)];

		const result = applyCoalesceOwnerPolicy(planned);

		expect(byId(result, 2).plan.catchUpAt).toEqual(tied);
		expect(byId(result, 5).plan.catchUpAt).toBeNull();
	});

	it('drops the late run of an exhausted member the same as any other loser', () => {
		const exhaustedMissed = secondsBefore(NOW, 30);
		const laterMissed = secondsBefore(NOW, 10);
		const planned = [
			makeMember({ id: 1 }, exhaustedMissed, { nextRunAt: null }),
			makeMember({ id: 2 }, laterMissed),
		];

		const result = applyCoalesceOwnerPolicy(planned);

		const exhausted = byId(result, 1);
		expect(exhausted.plan.catchUpAt).toBeNull();
		expect(exhausted.plan.occurrences).toEqual([]);
		expect(exhausted.plan.nextRunAt).toBeNull();
		expect(byId(result, 2).plan.catchUpAt).toEqual(laterMissed);
	});

	it.each([
		['taskType', { taskType: 'trigger' }, { taskType: 'poll' }],
		['misfireGraceSeconds', { misfireGraceSeconds: 60 }, { misfireGraceSeconds: 120 }],
		['payload', { payload: { rule: 'one' } }, { payload: { rule: 'two' } }],
	])('still groups siblings whose %s differs', (_label, first, second) => {
		const planned = [
			makeMember({ id: 1, ...first }, secondsBefore(NOW, 30)),
			makeMember({ id: 2, ...second }, secondsBefore(NOW, 20)),
		];

		const result = applyCoalesceOwnerPolicy(planned);

		expect(byId(result, 1).plan.catchUpAt).toBeNull();
		expect(byId(result, 2).plan.catchUpAt).toEqual(secondsBefore(NOW, 20));
	});

	it('still groups siblings whose attempt limits differ', () => {
		const planned = [
			makeMember({ id: 1, maxAttempts: 1 }, secondsBefore(NOW, 30)),
			makeMember({ id: 2, maxAttempts: 3 }, secondsBefore(NOW, 20)),
		];

		const result = applyCoalesceOwnerPolicy(planned);

		expect(byId(result, 1).plan.catchUpAt).toBeNull();
		expect(byId(result, 2).plan.catchUpAt).toEqual(secondsBefore(NOW, 20));
	});

	it('leaves a member with nothing missed alone and still groups the rest', () => {
		const planned = [
			makeMember({ id: 1 }, secondsBefore(NOW, 30), {
				occurrences: [],
				catchUpAt: null,
				retireBefore: null,
			}),
			makeMember({ id: 2 }, secondsBefore(NOW, 20)),
			makeMember({ id: 3 }, secondsBefore(NOW, 10)),
		];

		const result = applyCoalesceOwnerPolicy(planned);

		const untouched = byId(result, 1);
		expect(untouched.plan.catchUpAt).toBeNull();
		expect(untouched.plan.occurrences).toEqual([]);
		expect(untouched.plan.retireBefore).toBeNull();

		expect(byId(result, 2).plan.catchUpAt).toBeNull();
		expect(byId(result, 3).plan.catchUpAt).toEqual(secondsBefore(NOW, 10));
	});

	it('keeps a single late run even when every member of the owner is exhausted', () => {
		const planned = [
			makeMember({ id: 1 }, secondsBefore(NOW, 30), { nextRunAt: null }),
			makeMember({ id: 2 }, secondsBefore(NOW, 20), { nextRunAt: null }),
			makeMember({ id: 3 }, secondsBefore(NOW, 10), { nextRunAt: null }),
		];

		const result = applyCoalesceOwnerPolicy(planned);

		const withLateRun = result.filter(({ plan }) => plan.catchUpAt !== null);
		expect(withLateRun).toHaveLength(1);
		expect(withLateRun[0].job.id).toBe(3);
	});

	it("lets an exhausted member hold the group's late run when its instant is the latest", () => {
		const latest = secondsBefore(NOW, 10);
		const planned = [
			makeMember({ id: 1 }, secondsBefore(NOW, 30)),
			makeMember({ id: 2 }, secondsBefore(NOW, 20)),
			makeMember({ id: 3 }, latest, { nextRunAt: null }),
		];

		const result = applyCoalesceOwnerPolicy(planned);

		const winner = byId(result, 3);
		expect(winner.plan.catchUpAt).toEqual(latest);
		expect(winner.plan.occurrences).toEqual([latest]);
		expect(winner.plan.nextRunAt).toBeNull();
		for (const id of [1, 2]) {
			expect(byId(result, id).plan.catchUpAt).toBeNull();
		}
	});

	it('groups only the owner-wide members when a sibling uses the per-job coalesce policy', () => {
		const perJobMissed = secondsBefore(NOW, 30);
		const planned = [
			makeMember({ id: 1, misfirePolicy: ScheduledJobMisfirePolicy.Coalesce }, perJobMissed),
			makeMember({ id: 2 }, secondsBefore(NOW, 20)),
			makeMember({ id: 3 }, secondsBefore(NOW, 10)),
		];

		const result = applyCoalesceOwnerPolicy(planned);

		const perJob = byId(result, 1);
		expect(perJob.plan.catchUpAt).toEqual(perJobMissed);
		expect(perJob.plan.occurrences).toEqual([perJobMissed]);

		expect(byId(result, 2).plan.catchUpAt).toBeNull();
		expect(byId(result, 3).plan.catchUpAt).toEqual(secondsBefore(NOW, 10));
	});

	it('groups a member whose occurrences were capped but still hold a late run', () => {
		const cappedMissed = secondsBefore(NOW, 30);
		const remaining = secondsBefore(NOW, 25);
		const planned = [
			makeMember({ id: 1 }, cappedMissed, {
				occurrences: [cappedMissed, remaining],
				nextRunAt: secondsBefore(NOW, 20),
			}),
			makeMember({ id: 2 }, secondsBefore(NOW, 10)),
		];

		const result = applyCoalesceOwnerPolicy(planned);

		const capped = byId(result, 1);
		expect(capped.plan.catchUpAt).toBeNull();
		expect(capped.plan.occurrences).toEqual([remaining]);
		expect(capped.plan.retireBefore).toEqual(cappedMissed);
		expect(capped.plan.nextRunAt).toEqual(secondsBefore(NOW, 20));
	});
});
