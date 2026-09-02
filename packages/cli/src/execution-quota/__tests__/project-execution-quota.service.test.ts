import type {
	Project,
	ProjectExecutionCounterRepository,
	ProjectExecutionQuotaRepository,
	ProjectRepository,
	SharedWorkflowRepository,
} from '@n8n/db';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import { DateTime, Settings } from 'luxon';
import { mock } from 'vitest-mock-extended';

import type { License } from '@/license';
import type { InsightsByPeriodRepository } from '@/modules/insights/database/repositories/insights-by-period.repository';

import { computePeriodBucket } from '../period-bucket';
import { ProjectExecutionQuotaExceededError } from '../project-execution-quota.error';
import { ProjectExecutionQuotaService } from '../project-execution-quota.service';

describe('ProjectExecutionQuotaService.assertWithinQuotaAndIncrement', () => {
	const project = { id: 'project-1' } as Project;

	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const quotaRepository = mock<ProjectExecutionQuotaRepository>();
	const counterRepository = mock<ProjectExecutionCounterRepository>();
	const license = mock<License>();
	const insightsByPeriodRepository = mock<InsightsByPeriodRepository>();

	const service = new ProjectExecutionQuotaService(
		sharedWorkflowRepository,
		quotaRepository,
		counterRepository,
		license,
		insightsByPeriodRepository,
		mock(),
	);

	beforeEach(() => {
		vi.clearAllMocks();
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(project);
	});

	it('skips the check entirely for modes Insights itself skips (e.g. manual)', async () => {
		await service.assertWithinQuotaAndIncrement('workflow-1', 'manual');

		expect(sharedWorkflowRepository.getWorkflowOwningProject).not.toHaveBeenCalled();
		expect(counterRepository.incrementWorkflowCount).not.toHaveBeenCalled();
	});

	it('allows and increments when under quota', async () => {
		quotaRepository.findOneBy.mockResolvedValue({
			projectId: 'project-1',
			limit: 10,
			periodUnit: 'day',
		} as never);
		counterRepository.getProjectPeriodTotal.mockResolvedValue(5);

		await service.assertWithinQuotaAndIncrement('workflow-1', 'webhook');

		expect(counterRepository.incrementWorkflowCount).toHaveBeenCalledWith(
			'project-1',
			'workflow-1',
			'day',
			expect.any(String),
		);
	});

	it('throws and does not increment when at quota', async () => {
		quotaRepository.findOneBy.mockResolvedValue({
			projectId: 'project-1',
			limit: 10,
			periodUnit: 'day',
		} as never);
		counterRepository.getProjectPeriodTotal.mockResolvedValue(10);

		await expect(service.assertWithinQuotaAndIncrement('workflow-1', 'webhook')).rejects.toThrow(
			ProjectExecutionQuotaExceededError,
		);
		expect(counterRepository.incrementWorkflowCount).not.toHaveBeenCalled();
	});

	it('throws and does not increment when over quota', async () => {
		quotaRepository.findOneBy.mockResolvedValue({
			projectId: 'project-1',
			limit: 10,
			periodUnit: 'day',
		} as never);
		counterRepository.getProjectPeriodTotal.mockResolvedValue(15);

		await expect(service.assertWithinQuotaAndIncrement('workflow-1', 'webhook')).rejects.toThrow(
			ProjectExecutionQuotaExceededError,
		);
	});

	it('allows unconditionally when the resolved limit is unlimited', async () => {
		quotaRepository.findOneBy.mockResolvedValue(null);
		license.getValue.mockReturnValue(UNLIMITED_LICENSE_QUOTA);
		license.getPlanName.mockReturnValue('Enterprise');

		await service.assertWithinQuotaAndIncrement('workflow-1', 'webhook');

		expect(counterRepository.getProjectPeriodTotal).not.toHaveBeenCalled();
		expect(counterRepository.incrementWorkflowCount).toHaveBeenCalled();
	});

	it('does nothing when the workflow has no owning project', async () => {
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined);

		await service.assertWithinQuotaAndIncrement('workflow-1', 'webhook');

		expect(quotaRepository.findOneBy).not.toHaveBeenCalled();
		expect(counterRepository.incrementWorkflowCount).not.toHaveBeenCalled();
	});

	// Regression test for: getSpikes always reads the 'day'-unit bucket via
	// findByProjectId(projectId, 'day', today), but a project configured for
	// 'week' or 'month' only ever had its configured-periodUnit bucket
	// incremented — so no 'day' rows were ever created and the spike-guard
	// silently had nothing to read, forever. This asserts the dual-increment
	// stopgap: a 'week'-period project must also write a 'day' bucket, keyed
	// exactly the way getSpikes reads it (computePeriodBucket('day', ...)).
	it('also increments a day bucket for a week-period project, so getSpikes has day-level data to read', async () => {
		quotaRepository.findOneBy.mockResolvedValue({
			projectId: 'project-1',
			limit: 100,
			periodUnit: 'week',
		} as never);
		counterRepository.getProjectPeriodTotal.mockResolvedValue(5);

		await service.assertWithinQuotaAndIncrement('workflow-1', 'webhook');

		const expectedDayBucket = computePeriodBucket('day', DateTime.utc());

		expect(counterRepository.incrementWorkflowCount).toHaveBeenCalledTimes(2);
		expect(counterRepository.incrementWorkflowCount).toHaveBeenCalledWith(
			'project-1',
			'workflow-1',
			'week',
			expect.any(String),
		);
		expect(counterRepository.incrementWorkflowCount).toHaveBeenCalledWith(
			'project-1',
			'workflow-1',
			'day',
			expectedDayBucket,
		);
	});

	it('does not double-increment when the configured periodUnit is already day', async () => {
		quotaRepository.findOneBy.mockResolvedValue({
			projectId: 'project-1',
			limit: 100,
			periodUnit: 'day',
		} as never);
		counterRepository.getProjectPeriodTotal.mockResolvedValue(5);

		await service.assertWithinQuotaAndIncrement('workflow-1', 'webhook');

		expect(counterRepository.incrementWorkflowCount).toHaveBeenCalledTimes(1);
	});
});

describe('ProjectExecutionQuotaService.getSpikes', () => {
	const originalDefaultZone = Settings.defaultZone;

	afterEach(() => {
		Settings.defaultZone = originalDefaultZone;
	});

	it('flags a workflow whose today count exceeds 5x its trailing baseline', async () => {
		const counterRepository = mock<ProjectExecutionCounterRepository>();
		const insightsByPeriodRepository = mock<InsightsByPeriodRepository>();
		counterRepository.findByProjectId.mockResolvedValue([{ workflowId: 'workflow-1', count: 500 }]);
		// One trailing day (yesterday) with a baseline value of 10. Must not be
		// "today" — getSpikes strips today's bucket out of the baseline (it only
		// exists to be compared against, not counted as history), so a fixture
		// dated today would leave an empty baseline and never flag a spike.
		insightsByPeriodRepository.getTrailingHourlyRows.mockResolvedValue([
			{ periodStart: DateTime.utc().minus({ days: 1 }).toJSDate(), value: 10 },
		]);

		const service = new ProjectExecutionQuotaService(
			mock(),
			mock(),
			counterRepository,
			mock(),
			insightsByPeriodRepository,
			mock(),
		);

		const spikes = await service.getSpikes('project-1');

		expect(spikes).toEqual([
			expect.objectContaining({ workflowId: 'workflow-1', todayCount: 500 }),
		]);
	});

	// Regression test for the baseline-math fix: the spec says the baseline
	// is "summed per calendar day and averaged over the trailing 7 days,
	// excluding today" — a *fixed* 7-day denominator, zero-filling silent
	// days. The old code divided by the number of days that actually had
	// data, which inflates the baseline for a sparse/bursty workflow and
	// makes it *harder* to flag (the opposite of the intended effect).
	it('flags a workflow active on only 1 of the last 7 trailing days at a much lower today-count than an activity-only average would require', async () => {
		const counterRepository = mock<ProjectExecutionCounterRepository>();
		const insightsByPeriodRepository = mock<InsightsByPeriodRepository>();

		// Old (buggy) calc: baseline = 70 / 1 populated day = 70 → today's
		// count would need to exceed 350 (70 * 5) to flag.
		// Fixed calc: baseline = 70 / 7 (fixed window) = 10 → today's count
		// only needs to exceed 50 (10 * 5) to flag.
		counterRepository.findByProjectId.mockResolvedValue([{ workflowId: 'workflow-1', count: 60 }]);
		insightsByPeriodRepository.getTrailingHourlyRows.mockResolvedValue([
			{ periodStart: DateTime.utc().minus({ days: 3 }).toJSDate(), value: 70 },
		]);

		const service = new ProjectExecutionQuotaService(
			mock(),
			mock(),
			counterRepository,
			mock(),
			insightsByPeriodRepository,
			mock(),
		);

		const spikes = await service.getSpikes('project-1');

		// 60 would NOT have flagged under the old days.length-averaged
		// baseline (60 < 350) — only the fixed 7-day denominator flags it.
		expect(spikes).toEqual([
			expect.objectContaining({ workflowId: 'workflow-1', todayCount: 60, baseline: 10 }),
		]);
	});

	// Regression test for the timezone fix: `today` is always a UTC day-key
	// (computePeriodBucket('day', DateTime.utc())), but reading each row's
	// `periodStart` without an explicit zone uses Luxon's default zone. On a
	// non-UTC server that mismatch means `byDay.delete(today)` fails to
	// strip today's own data out of the baseline, inflating it and masking
	// a real spike. `Settings.defaultZone` simulates a non-UTC server here.
	it('excludes today’s own data from the baseline using UTC day-keys, independent of the server’s local zone', async () => {
		Settings.defaultZone = 'America/New_York';

		const counterRepository = mock<ProjectExecutionCounterRepository>();
		const insightsByPeriodRepository = mock<InsightsByPeriodRepository>();

		counterRepository.findByProjectId.mockResolvedValue([{ workflowId: 'workflow-1', count: 60 }]);

		// Five real trailing days at midday UTC (clear of any zone-boundary
		// ambiguity), each contributing 14 → 70 total → a true baseline of
		// 10/day over the fixed 7-day window.
		const historicalRows = [1, 2, 3, 4, 5].map((daysAgo) => ({
			periodStart: DateTime.utc().minus({ days: daysAgo }).set({ hour: 12 }).toJSDate(),
			value: 14,
		}));

		// A bogus "today" row timestamped just after UTC midnight. Under the
		// simulated non-UTC local zone, an unzoned reinterpretation of this
		// instant lands on the *previous* calendar day — exactly the bug this
		// fix closes. If this leaks into the baseline instead of being
		// stripped, it inflates the baseline enough that the real spike below
		// (60 vs a true baseline of 10) is missed.
		const todayNearMidnightUtc = DateTime.utc().startOf('day').plus({ hours: 2 }).toJSDate();

		insightsByPeriodRepository.getTrailingHourlyRows.mockResolvedValue([
			...historicalRows,
			{ periodStart: todayNearMidnightUtc, value: 500 },
		]);

		const service = new ProjectExecutionQuotaService(
			mock(),
			mock(),
			counterRepository,
			mock(),
			insightsByPeriodRepository,
			mock(),
		);

		const spikes = await service.getSpikes('project-1');

		expect(spikes).toEqual([
			expect.objectContaining({ workflowId: 'workflow-1', todayCount: 60, baseline: 10 }),
		]);
	});
});

describe('ProjectExecutionQuotaService.getConsumption', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('includes resetsAt as the start of the next period bucket, for a day-period project', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-03T10:00:00.000Z'));

		const quotaRepository = mock<ProjectExecutionQuotaRepository>();
		const counterRepository = mock<ProjectExecutionCounterRepository>();
		quotaRepository.findOneBy.mockResolvedValue({
			projectId: 'project-1',
			limit: 100,
			periodUnit: 'day',
		} as never);
		counterRepository.getProjectPeriodTotal.mockResolvedValue(10);

		const service = new ProjectExecutionQuotaService(
			mock(),
			quotaRepository,
			counterRepository,
			mock(),
			mock(),
			mock(),
		);

		const consumption = await service.getConsumption('project-1');

		expect(consumption.resetsAt).toBe('2026-09-04T00:00:00.000Z');
	});

	it('includes resetsAt as the start of the next month, for a month-period project', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-15T10:00:00.000Z'));

		const quotaRepository = mock<ProjectExecutionQuotaRepository>();
		const counterRepository = mock<ProjectExecutionCounterRepository>();
		quotaRepository.findOneBy.mockResolvedValue({
			projectId: 'project-1',
			limit: 100,
			periodUnit: 'month',
		} as never);
		counterRepository.getProjectPeriodTotal.mockResolvedValue(10);

		const service = new ProjectExecutionQuotaService(
			mock(),
			quotaRepository,
			counterRepository,
			mock(),
			mock(),
			mock(),
		);

		const consumption = await service.getConsumption('project-1');

		expect(consumption.resetsAt).toBe('2026-10-01T00:00:00.000Z');
	});
});

describe('ProjectExecutionQuotaService.getAllProjectsConsumption', () => {
	it('returns one row per project with its resolved quota and consumption', async () => {
		const projectRepository = mock<ProjectRepository>();
		const quotaRepository = mock<ProjectExecutionQuotaRepository>();
		const counterRepository = mock<ProjectExecutionCounterRepository>();
		const license = mock<License>();

		projectRepository.find.mockResolvedValue([
			{ id: 'project-1', name: 'Marketing' } as Project,
			{ id: 'project-2', name: 'Engineering' } as Project,
		]);
		quotaRepository.findOneBy.mockImplementation(async ({ projectId }: never) =>
			projectId === 'project-1'
				? ({ projectId: 'project-1', limit: 10, periodUnit: 'day' } as never)
				: null,
		);
		counterRepository.getProjectPeriodTotal.mockResolvedValue(3);
		license.getValue.mockReturnValue(undefined);
		license.getPlanName.mockReturnValue('Community');

		const service = new ProjectExecutionQuotaService(
			mock(),
			quotaRepository,
			counterRepository,
			license,
			mock(),
			projectRepository,
		);

		const rows = await service.getAllProjectsConsumption();

		expect(rows).toHaveLength(2);
		expect(rows).toContainEqual(
			expect.objectContaining({
				projectId: 'project-1',
				projectName: 'Marketing',
				limit: 10,
				periodUnit: 'day',
				consumed: 3,
			}),
		);
		expect(rows).toContainEqual(
			expect.objectContaining({ projectId: 'project-2', projectName: 'Engineering' }),
		);
	});
});
