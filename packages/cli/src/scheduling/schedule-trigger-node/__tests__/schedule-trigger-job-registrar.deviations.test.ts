/**
 * Behavioral deviations of the durable Schedule Trigger wiring versus the legacy
 * in-memory scheduler, one describe per deviation (D1–D5 in the ticket plan).
 *
 * Each test drives the collector exactly as the node would (a `Cron` carrying
 * the compiled expression, the recurrence rule, and the source-interval
 * descriptor) and then uses the scheduler engine's own `computeFirstRunAt` /
 * `computeNextRunAt` to show how the resulting fire sequence diverges from the
 * legacy cron path. The legacy path's fires are computed by evaluating the
 * legacy `every-N` cron with the same engine (that is precisely what `legacy` mode
 * persists), so no second cron implementation is needed.
 *
 * `recurring_cron`'s own edge deviations (leap-year / 24h+ / week-53 arithmetic
 * fixes, Sunday-start weeks, wall-clock hour steps, the 10k-candidate throw) are
 * owned and pinned by the scheduler package; see
 * `packages/@n8n/scheduler/RECURRING_CRON_DEVIATIONS.md`.
 */
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import type { Schedule, ScheduleDefinition } from '@n8n/scheduler';
import { computeFirstRunAt, computeNextRunAt } from '@n8n/scheduler';
import type { Cron, CronExpression, INode, Workflow } from 'n8n-workflow';
import { SCHEDULE_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { DurableJobProvisioner } from '../../durable-job-provisioner';
import { ScheduleTriggerJobRegistrar } from '../schedule-trigger-job-registrar';

/** Flatten a schedule into the per-kind columns a row stores; absent fields are null. */
const flatten = (schedule: ScheduleDefinition) => ({
	kind: schedule.kind,
	cronExpression:
		schedule.kind === 'cron' || schedule.kind === 'recurring_cron' ? schedule.cronExpression : null,
	timezone:
		schedule.kind === 'cron' || schedule.kind === 'recurring_cron' ? schedule.timezone : null,
	recurrenceUnit: schedule.kind === 'recurring_cron' ? schedule.recurrenceUnit : null,
	recurrenceSize: schedule.kind === 'recurring_cron' ? schedule.recurrenceSize : null,
	intervalSeconds: schedule.kind === 'interval' ? schedule.intervalSeconds : null,
	fireAt: schedule.kind === 'one_off' ? schedule.fireAt : null,
});

/** The persisted row view of a provisioned rule: its columns plus its seeded clock. */
type PersistedRow = ReturnType<typeof flatten> & { nextRunAt: Date | null };

const WORKFLOW_ID = 'wf-1';
const NODE_ID = 'node-1';

// Monday, seven seconds past the minute — deliberately off every clock boundary
// so phase/alignment deviations are visible.
const NOW = new Date('2026-01-05T12:00:07.000Z');

const workflow = { id: WORKFLOW_ID, settings: {} } as unknown as Workflow;
const scheduleNode = mock<INode>({ id: NODE_ID, type: SCHEDULE_TRIGGER_NODE_TYPE });

describe('ScheduleTriggerJobRegistrar deviations', () => {
	const jobProvisioner = mock<DurableJobProvisioner>();

	const makeRegistrar = (triggerNodeMode: 'legacy' | 'new') =>
		new ScheduleTriggerJobRegistrar(
			mockLogger(),
			mock<GlobalConfig>({
				scheduler: { enabled: true, triggerNodeMode },
				generic: { timezone: 'UTC' },
			}),
			mock<WorkflowsConfig>({ useWorkflowPublicationService: true }),
			jobProvisioner,
		);

	/** Collect one rule and return the row view the reconciliation would persist. */
	const collect = async (mode: 'legacy' | 'new', cron: Cron): Promise<PersistedRow> => {
		jobProvisioner.provision.mockClear();
		const session = makeRegistrar(mode).createSession();
		session.createCollector(workflow, scheduleNode).registerCron(cron, vi.fn());
		await session.commit(WORKFLOW_ID, NODE_ID);
		const desired = jobProvisioner.provision.mock.calls.at(-1)![4][0];
		return { ...flatten(desired.schedule), nextRunAt: desired.firstRunAt };
	};

	/** Reconstruct the engine schedule from a persisted row. */
	const scheduleOf = (row: PersistedRow): Schedule => {
		switch (row.kind) {
			case 'interval':
				return { kind: 'interval', intervalSeconds: row.intervalSeconds! };
			case 'recurring_cron':
				return {
					kind: 'recurring_cron',
					cronExpression: row.cronExpression as CronExpression,
					timezone: row.timezone ?? 'UTC',
					recurrenceUnit: row.recurrenceUnit!,
					recurrenceSize: row.recurrenceSize!,
				};
			case 'cron':
				return {
					kind: 'cron',
					cronExpression: row.cronExpression as CronExpression,
					timezone: row.timezone ?? 'UTC',
				};
			default:
				throw new Error(`unexpected kind ${row.kind}`);
		}
	};

	/** The first `count` fires from `from`, first ungated then chained. */
	const fires = (schedule: Schedule, from: Date, count: number): Date[] => {
		const out: Date[] = [];
		let t = computeFirstRunAt(schedule, from)!;
		for (let i = 0; i < count; i++) {
			out.push(t);
			t = computeNextRunAt(schedule, t)!;
		}
		return out;
	};

	const gaps = (times: Date[]): number[] =>
		times.slice(1).map((t, i) => t.getTime() - times[i].getTime());

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		jobProvisioner.provision.mockResolvedValue({
			inserted: [],
			redefined: [],
			unchanged: [],
			removed: [],
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('D1: a seconds interval fires phase-shifted off the clock in `new` mode', () => {
		// every 30 seconds
		const cron: Cron = {
			expression: '*/30 * * * * *' as CronExpression,
			recurrence: { activated: false },
			source: { field: 'seconds', size: 30 },
		};

		it('`legacy` keeps the clock-aligned cron; `new` anchors to activation time', async () => {
			const legacy = await collect('legacy', cron);
			const fresh = await collect('new', cron);

			expect(legacy.kind).toBe('cron');
			expect(fresh.kind).toBe('interval');
			expect(fresh.intervalSeconds).toBe(30);

			// legacy: next :30 boundary after 12:00:07
			expect(legacy.nextRunAt).toEqual(new Date('2026-01-05T12:00:30.000Z'));
			// new: activation + 30s, off the clock boundary
			expect(fresh.nextRunAt).toEqual(new Date('2026-01-05T12:00:37.000Z'));
			// the deviation: the two first fires differ
			expect(fresh.nextRunAt).not.toEqual(legacy.nextRunAt);
		});
	});

	describe('D2: a non-divisor seconds interval fires at a steady cadence in `new` mode', () => {
		// every 7 seconds (7 does not divide 60)
		const cron: Cron = {
			expression: '*/7 * * * * *' as CronExpression,
			recurrence: { activated: false },
			source: { field: 'seconds', size: 7 },
		};

		it('`new` is a steady 7s; `legacy` resets at the minute boundary', async () => {
			const fresh = await collect('new', cron);
			const legacy = await collect('legacy', cron);

			// new: every gap is exactly 7s across the minute boundary
			expect(gaps(fires(scheduleOf(fresh), NOW, 12))).toEqual(Array(11).fill(7000));

			// legacy: the cron restarts each minute, so a gap is shorter than 7s
			const legacyGaps = gaps(fires(scheduleOf(legacy), NOW, 12));
			expect(legacyGaps).toContain(4000); // :56 -> :00 next minute
			expect(legacyGaps.some((g) => g !== 7000)).toBe(true);
		});
	});

	describe('D3: the durable clock is seeded and persisted on the row', () => {
		// every 2 weeks on Monday
		const cron: Cron = {
			expression: '0 0 9 * * 1' as CronExpression,
			recurrence: { activated: true, index: 0, intervalSize: 2, typeInterval: 'weeks' },
			source: { field: 'weeks', size: 2 },
		};

		it('persists a concrete next-fire instant (unlike the in-memory timer)', async () => {
			// The in-memory scheduler holds the next fire only in process memory and
			// loses it on restart; the durable row carries it, so it survives and the
			// materializer catches up. Restart/catch-up itself is covered by the
			// scheduler suite; here we pin that the clock is durably seeded.
			const row = await collect('new', cron);
			expect(row.nextRunAt).toBeInstanceOf(Date);
			expect(row.nextRunAt).toEqual(new Date('2026-01-12T09:00:00.000Z'));
		});
	});

	describe('D4: the first fire of a recurring cadence is ungated', () => {
		// every 3 weeks on Monday
		const cron: Cron = {
			expression: '0 0 9 * * 1' as CronExpression,
			recurrence: { activated: true, index: 0, intervalSize: 3, typeInterval: 'weeks' },
			source: { field: 'weeks', size: 3 },
		};

		it('fires at the next anchor, then gates every 3 weeks after', async () => {
			const row = await collect('new', cron);
			expect(row.kind).toBe('recurring_cron');
			expect(row.recurrenceSize).toBe(3);

			// ungated: the very next Monday (09:00 today already passed at 12:00:07)
			const first = row.nextRunAt!;
			expect(first).toEqual(new Date('2026-01-12T09:00:00.000Z'));

			// gated afterwards: three weeks on
			const second = computeNextRunAt(scheduleOf(row), first)!;
			expect(second).toEqual(new Date('2026-02-02T09:00:00.000Z'));
		});
	});

	describe('D5: a stride-1 calendar cadence is a plain cron, not a gated one', () => {
		const everyWeek: Cron = {
			expression: '0 0 9 * * 1' as CronExpression,
			recurrence: { activated: false }, // the node never activates recurrence for N == 1
			source: { field: 'weeks', size: 1 },
		};
		const everyTwoWeeks: Cron = {
			expression: '0 0 9 * * 1' as CronExpression,
			recurrence: { activated: true, index: 0, intervalSize: 2, typeInterval: 'weeks' },
			source: { field: 'weeks', size: 2 },
		};

		it('stride 1 persists as cron with no gate; stride 2 as recurring_cron', async () => {
			const one = await collect('new', everyWeek);
			const two = await collect('new', everyTwoWeeks);

			expect(one.kind).toBe('cron');
			expect(one.recurrenceUnit).toBeNull();
			expect(one.recurrenceSize).toBeNull();

			expect(two.kind).toBe('recurring_cron');
			expect(two.recurrenceSize).toBe(2);
		});

		it('the engine rejects a stride-1 recurring_cron (one representation per schedule)', () => {
			expect(() =>
				computeFirstRunAt(
					{
						kind: 'recurring_cron',
						cronExpression: '0 0 9 * * 1' as CronExpression,
						timezone: 'UTC',
						recurrenceUnit: 'weeks',
						recurrenceSize: 1,
					},
					NOW,
				),
			).toThrow();
		});
	});
});
