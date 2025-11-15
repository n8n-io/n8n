import { mockLogger } from '@n8n/backend-test-utils';
import type { SharedWorkflowRepository, IWorkflowDb, WorkflowEntity } from '@n8n/db';
import type { WorkflowExecuteAfterContext } from '@n8n/decorators';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { IRun } from 'n8n-workflow';

import type { InsightsMetadataRepository } from '../database/repositories/insights-metadata.repository';
import type { InsightsRawRepository } from '../database/repositories/insights-raw.repository';
import { InsightsCollectionService } from '../insights-collection.service';
import type { InsightsConfig } from '../insights.config';

describe('initialization safeguards', () => {
	let insightsCollectionService: InsightsCollectionService;
	let insightsRawRepository: InsightsRawRepository;
	let insightsMetadataRepository: InsightsMetadataRepository;

	const workflow = mock<WorkflowEntity & IWorkflowDb>({
		id: 'workflow-id',
		name: 'Test Workflow',
	});

	beforeAll(async () => {
		insightsRawRepository = mock<InsightsRawRepository>();
		insightsMetadataRepository = mock<InsightsMetadataRepository>();
		insightsCollectionService = new InsightsCollectionService(
			mock<SharedWorkflowRepository>(),
			insightsRawRepository,
			insightsMetadataRepository,
			mock<InsightsConfig>(),
			mockLogger(),
		);
	});

	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	test('does not collect events when not initialized', async () => {
		// ARRANGE
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow });
		const startedAt = DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		ctx.runData = mock<IRun>({
			mode: 'webhook',
			status: 'success',
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});

		// ACT - Call handler without init()
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();

		// ASSERT - no insights in the buffer should have been saved
		expect(insightsMetadataRepository.upsert).not.toHaveBeenCalled();
		expect(insightsRawRepository.insert).not.toHaveBeenCalled();
	});

	test('does not flush events when not initialized', async () => {
		// ARRANGE - manually create some test context
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow });
		const startedAt = DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		ctx.runData = mock<IRun>({
			mode: 'webhook',
			status: 'success',
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});

		// ACT - Try to flush without initialization
		await insightsCollectionService.flushEvents();

		// ASSERT - no insights in the buffer should have been saved
		expect(insightsMetadataRepository.upsert).not.toHaveBeenCalled();
		expect(insightsRawRepository.insert).not.toHaveBeenCalled();
	});

	test('does not schedule flushing when not initialized', async () => {
		// ACT - Try to schedule flushing without initialization
		insightsCollectionService.scheduleFlushing();

		// ASSERT - setTimeout should not have been called
		expect(jest.getTimerCount()).toBe(0);
	});
});
