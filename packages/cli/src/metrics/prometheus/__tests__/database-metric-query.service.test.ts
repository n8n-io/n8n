import type { CacheService } from '@n8n/backend-services';
import type {
	DbConnection,
	LicenseMetricsRepository,
	ScheduledJobRepository,
	ScheduledTaskRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { CachedMetricQueryFactory } from '../cached-metric-query';
import { DatabaseMetricQueryService } from '../database-metric-query.service';

describe('DatabaseMetricQueryService', () => {
	const cacheService = mock<CacheService>();
	const dbConnection = mock<DbConnection>({
		connectionState: { connected: true, migrated: true },
	});
	const workflowRepository = mock<WorkflowRepository>();
	const licenseMetricsRepository = mock<LicenseMetricsRepository>();
	const outboxRepository = mock<WorkflowPublicationOutboxRepository>();
	const taskRepository = mock<ScheduledTaskRepository>();
	const jobRepository = mock<ScheduledJobRepository>();
	const service = new DatabaseMetricQueryService(
		new CachedMetricQueryFactory(cacheService, dbConnection),
		workflowRepository,
		licenseMetricsRepository,
		outboxRepository,
		taskRepository,
		jobRepository,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		dbConnection.connectionState.connected = false;
		cacheService.get.mockResolvedValue(undefined);
		workflowRepository.getActiveCount.mockResolvedValue(5);
		workflowRepository.getWorkflowInfo.mockResolvedValue([]);
		licenseMetricsRepository.getLicenseRenewalMetrics.mockResolvedValue({
			enabledUsers: 1,
			totalUsers: 1,
			activeWorkflows: 5,
			totalWorkflows: 5,
			totalCredentials: 0,
			productionExecutions: 0,
			productionRootExecutions: 0,
			manualExecutions: 0,
			evaluations: 0,
		});
		outboxRepository.getRecordStatsByStatus.mockResolvedValue(new Map());
		taskRepository.getMetricSnapshot.mockResolvedValue({
			pending: 1,
			due: 0,
			running: 0,
			oldestPendingAgeMs: 0,
		});
		jobRepository.findScheduleStatesByOwnerType.mockResolvedValue([]);
	});

	const queries = [
		{
			name: 'active workflows',
			create: () => service.activeWorkflowCount(1000),
			read: workflowRepository.getActiveCount,
		},
		{
			name: 'workflow info',
			create: () => service.workflowInfo(1000, false),
			read: workflowRepository.getWorkflowInfo,
		},
		{
			name: 'active workflow info',
			create: () => service.workflowInfo(1000, true),
			read: workflowRepository.getWorkflowInfo,
		},
		{
			name: 'workflow statistics',
			create: () => service.workflowStatistics(1000),
			read: licenseMetricsRepository.getLicenseRenewalMetrics,
		},
		{
			name: 'workflow publication',
			create: () => service.workflowPublication(1000),
			read: outboxRepository.getRecordStatsByStatus,
		},
		{
			name: 'scheduler snapshot',
			create: () => service.schedulerSnapshot(1000),
			read: taskRepository.getMetricSnapshot,
		},
		{
			name: 'durable system task jobs',
			create: () => service.durableSystemTaskJobs(1000),
			read: jobRepository.findScheduleStatesByOwnerType,
		},
	];

	it.each(queries)(
		'skips $name queries during an outage and resumes after recovery',
		async ({ create, read }) => {
			const query = create();
			await expect(query.get()).resolves.toBeUndefined();
			expect(read).not.toHaveBeenCalled();

			dbConnection.connectionState.connected = true;
			await expect(query.get()).resolves.toBeDefined();
			expect(read).toHaveBeenCalledTimes(1);
		},
	);

	it.each(queries)('returns cached $name during an outage', async ({ create, read }) => {
		const query = create();
		dbConnection.connectionState.connected = true;
		const value = await query.get();
		cacheService.get.mockResolvedValue(value);
		dbConnection.connectionState.connected = false;

		await expect(query.get()).resolves.toEqual(value);
		expect(read).toHaveBeenCalledTimes(1);
	});
});
