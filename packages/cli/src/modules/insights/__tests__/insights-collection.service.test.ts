import { mockLogger } from '@n8n/backend-test-utils';
import type {
	Project,
	SharedWorkflow,
	SharedWorkflowRepository,
	IWorkflowDb,
	WorkflowEntity,
} from '@n8n/db';
import type { WorkflowExecuteAfterContext } from '@n8n/decorators';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { IRun } from 'n8n-workflow';

import type { InsightsMetadata } from '../database/entities/insights-metadata';
import type { InsightsMetadataRepository } from '../database/repositories/insights-metadata.repository';
import type { InsightsRawRepository } from '../database/repositories/insights-raw.repository';
import { InsightsCollectionService } from '../insights-collection.service';
import type { InsightsConfig } from '../insights.config';

describe('initialization safeguards', () => {
	let insightsCollectionService: InsightsCollectionService;
	let insightsRawRepository: InsightsRawRepository;
	let insightsMetadataRepository: ReturnType<typeof mock<InsightsMetadataRepository>>;
	let sharedWorkflowRepository: ReturnType<typeof mock<SharedWorkflowRepository>>;

	const workflow = mock<WorkflowEntity & IWorkflowDb>({
		id: 'workflow-id',
		name: 'Test Workflow',
	});

	beforeAll(async () => {
		insightsRawRepository = mock<InsightsRawRepository>();
		insightsMetadataRepository = mock<InsightsMetadataRepository>();
		sharedWorkflowRepository = mock<SharedWorkflowRepository>();
		insightsCollectionService = new InsightsCollectionService(
			sharedWorkflowRepository,
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

		// expect private buffer to be empty
		expect(insightsCollectionService['bufferedInsights'].size).toBe(0);
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

		// simulate events in the buffer
		insightsCollectionService['bufferedInsights'].add({
			workflowId: ctx.workflow.id,
			workflowName: ctx.workflow.name,
			timestamp: DateTime.utc().toJSDate(),
			type: 'success',
			value: 1,
		});

		// mock shared workflow repository for the flushing process
		sharedWorkflowRepository.find.mockResolvedValueOnce([
			mock<SharedWorkflow>({
				workflow,
				project: mock<Project>(),
				role: 'workflow:editor',
			}),
		]);
		// mock insights metadata repository for the flushing process
		insightsMetadataRepository.findBy.mockResolvedValueOnce([
			mock<InsightsMetadata>({ workflowId: ctx.workflow.id, metaId: 1 }),
		]);

		// ACT - Try to flush without initialization
		await insightsCollectionService.flushEvents();

		// ASSERT - no insights raw and metadata in the buffer should have been saved
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

describe('calculateTimeSaved', () => {
	let insightsCollectionService: InsightsCollectionService;

	const workflow = mock<WorkflowEntity & IWorkflowDb>({
		id: 'workflow-id',
		name: 'Test Workflow',
	});

	beforeAll(() => {
		insightsCollectionService = new InsightsCollectionService(
			mock<SharedWorkflowRepository>(),
			mock<InsightsRawRepository>(),
			mock<InsightsMetadataRepository>(),
			mock<InsightsConfig>(),
			mockLogger(),
		);
	});

	test('returns the workflow time saved when the time saved mode is fixed', () => {
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow });
		ctx.workflow.settings = {
			timeSavedMode: 'fixed',
			timeSavedPerExecution: 10,
		};
		ctx.runData = mock<IRun>({
			mode: 'webhook',
			status: 'success',
			startedAt: DateTime.utc().toJSDate(),
			stoppedAt: DateTime.utc().plus({ minutes: 10 }).toJSDate(),
		});

		// @ts-ignore-next-line
		const timeSaved = insightsCollectionService.calculateTimeSaved(ctx);
		expect(timeSaved).toBe(10);
	});

	test('returns the node time saved when the time saved mode is dynamic', () => {
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow });
		ctx.workflow.settings = {
			timeSavedMode: 'dynamic',
		};
		ctx.runData = mock<IRun>({
			mode: 'webhook',
			status: 'success',
			startedAt: DateTime.utc().toJSDate(),
			stoppedAt: DateTime.utc().plus({ minutes: 10 }).toJSDate(),
			data: {
				resultData: {
					runData: {
						'node-1': [{ metadata: { timeSaved: { minutes: 5 } } }],
						'node-2': [{ metadata: { timeSaved: { minutes: 15 } } }],
					},
				},
			},
		});

		// @ts-ignore-next-line
		const timeSaved = insightsCollectionService.calculateTimeSaved(ctx);
		expect(timeSaved).toBe(20);
	});
});
