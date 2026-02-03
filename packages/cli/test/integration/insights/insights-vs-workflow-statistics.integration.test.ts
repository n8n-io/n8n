/**
 * Integration test to compare workflow statistics with insights data.
 * This test verifies that both systems report consistent execution counts,
 * properly distinguishing between root executions and subworkflow executions.
 *
 * This test actually executes workflows (not just mocking) to ensure end-to-end correctness.
 * It configures the system for fast compaction and waits for automatic processing.
 */

import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project, WorkflowEntity } from '@n8n/db';
import { ExecutionRepository, StatisticsNames, WorkflowStatisticsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { readFileSync } from 'fs';
import { InstanceSettings, UnrecognizedNodeTypeError } from 'n8n-core';
import type { INodeType, INodeTypeData, NodeLoadingDetails } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';
import path from 'path';

import { InsightsByPeriodRepository } from '@/modules/insights/database/repositories/insights-by-period.repository';
import { InsightsRawRepository } from '@/modules/insights/database/repositories/insights-raw.repository';
import { InsightsCollectionService } from '@/modules/insights/insights-collection.service';
import { InsightsCompactionService } from '@/modules/insights/insights-compaction.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { WorkflowRunner } from '@/workflow-runner';

import * as utils from '../shared/utils';
import { createSimpleWorkflowFixture } from '../shared/workflow-fixtures';

// ============================================================
// Helper to load nodes from dist folder
// ============================================================

const BASE_DIR = path.resolve(__dirname, '../../../..');

function loadNodesFromDist(nodeNames: string[]): INodeTypeData {
	const nodeTypes: INodeTypeData = {};

	const knownNodes = JSON.parse(
		readFileSync(path.join(BASE_DIR, 'nodes-base/dist/known/nodes.json'), 'utf-8'),
	) as Record<string, NodeLoadingDetails>;

	for (const nodeName of nodeNames) {
		const loadInfo = knownNodes[nodeName.replace('n8n-nodes-base.', '')];
		if (!loadInfo) {
			throw new UnrecognizedNodeTypeError('n8n-nodes-base', nodeName);
		}
		// Load from dist .js files (sourcePath already includes 'dist/')
		const nodeDistPath = path.join(BASE_DIR, 'nodes-base', loadInfo.sourcePath);
		const node = new (require(nodeDistPath)[loadInfo.className])() as INodeType;
		nodeTypes[nodeName] = {
			sourcePath: '',
			type: node,
		};
	}

	return nodeTypes;
}

describe('Insights vs Workflow Statistics Integration', () => {
	beforeAll(async () => {
		// Configure insights for fast flushing and compaction BEFORE loading modules
		process.env.N8N_INSIGHTS_FLUSH_BATCH_SIZE = '10'; // Flush after 10 events
		process.env.N8N_INSIGHTS_FLUSH_INTERVAL_SECONDS = '1'; // Flush every 1 second
		process.env.N8N_INSIGHTS_COMPACTION_INTERVAL_MINUTES = '0.05'; // Compact every ~3 seconds
		process.env.N8N_INSIGHTS_COMPACTION_BATCH_SIZE = '100'; // Process up to 100 items per batch

		await testModules.loadModules(['insights']);
		await testDb.init();

		// Load required node types from dist folder
		const nodeTypes = loadNodesFromDist([
			'n8n-nodes-base.manualTrigger',
			'n8n-nodes-base.executeWorkflow',
			'n8n-nodes-base.executeWorkflowTrigger',
		]);

		await utils.initNodeTypes(nodeTypes);
		await utils.initBinaryDataService();

		// Mark instance as leader to enable compaction
		Container.get(InstanceSettings).markAsLeader();
	});

	beforeEach(async () => {
		await testDb.truncate([
			'InsightsRaw',
			'InsightsByPeriod',
			'InsightsMetadata',
			'WorkflowEntity',
			'WorkflowStatistics',
			'ExecutionEntity',
			'Project',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	let insightsCollectionService: InsightsCollectionService;
	let insightsCompactionService: InsightsCompactionService;
	let insightsByPeriodRepository: InsightsByPeriodRepository;
	let insightsRawRepository: InsightsRawRepository;
	let workflowStatisticsRepository: WorkflowStatisticsRepository;
	let workflowRunner: WorkflowRunner;
	let executionRepository: ExecutionRepository;

	let project: Project;
	let workflow: WorkflowEntity;

	beforeAll(() => {
		// CRITICAL: Ensure SKIP_STATISTICS_EVENTS is not set
		// The WorkflowStatisticsService checks this in its constructor
		delete process.env.SKIP_STATISTICS_EVENTS;

		// IMPORTANT: Get WorkflowStatisticsService early to ensure its event listeners are set up
		// This must be done BEFORE any workflows are executed
		Container.get(WorkflowStatisticsService);

		insightsCollectionService = Container.get(InsightsCollectionService);
		insightsCompactionService = Container.get(InsightsCompactionService);
		insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
		insightsRawRepository = Container.get(InsightsRawRepository);
		workflowStatisticsRepository = Container.get(WorkflowStatisticsRepository);
		workflowRunner = Container.get(WorkflowRunner);
		executionRepository = Container.get(ExecutionRepository);

		// Initialize insights collection service (config already set via env vars)
		insightsCollectionService.init();

		// Start automatic compaction timer
		insightsCompactionService.startCompactionTimer();
	});

	afterAll(() => {
		// Stop compaction timer
		insightsCompactionService.stopCompactionTimer();
	});

	beforeEach(async () => {
		project = await createTeamProject('Test Project');

		// Create workflow 1 - standalone workflow with manual trigger
		workflow = await createWorkflow(
			{
				name: 'Workflow 1 - Standalone',
				...createSimpleWorkflowFixture(),
				settings: {
					timeSavedPerExecution: 5,
				},
			},
			project,
		);
	});

	/**
	 * Helper to wait for an execution to complete by polling the database
	 */
	async function waitForExecution(executionId: string, timeout = 10000): Promise<void> {
		const start = Date.now();
		while (Date.now() - start < timeout) {
			const execution = await executionRepository.findOneBy({ id: executionId });
			if (execution?.finished) {
				// Log execution status for debugging
				if (execution.status !== 'success') {
					console.log(`Execution ${executionId} finished with status: ${execution.status}`);
				}
				return;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		throw new Error(`Execution ${executionId} did not complete within ${timeout}ms`);
	}

	/**
	 * Helper to wait for workflow statistics to be recorded
	 */
	async function waitForStatistics(
		workflowId: string,
		expectedCount: number,
		timeout = 10000,
	): Promise<void> {
		const start = Date.now();
		while (Date.now() - start < timeout) {
			const stats = await workflowStatisticsRepository.findOne({
				where: {
					workflowId,
					name: StatisticsNames.productionSuccess,
				},
			});
			if (stats && stats.count >= expectedCount) {
				return;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		throw new Error(
			`Workflow statistics did not reach expected count ${expectedCount} within ${timeout}ms`,
		);
	}

	/**
	 * Helper to wait for insights to be compacted (raw insights cleared and compacted data available)
	 */
	async function waitForCompaction(workflowId: string, timeout = 10000): Promise<void> {
		const start = Date.now();
		while (Date.now() - start < timeout) {
			// Check if raw insights have been compacted (should be low or zero)
			const rawInsights = await insightsRawRepository.find();
			// Check if compacted insights exist for this workflow
			const compactedInsights = await insightsByPeriodRepository.find({
				where: {
					metadata: { workflowId },
				},
				relations: ['metadata'],
			});

			// Compaction is done if we have compacted data and few/no raw insights
			if (compactedInsights.length > 0 && rawInsights.length < 10) {
				return;
			}
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
		throw new Error(`Insights compaction did not complete within ${timeout}ms`);
	}

	/**
	 * Helper to execute a workflow in webhook/trigger mode
	 */
	async function executeWorkflow(
		workflow: WorkflowEntity,
		mode: 'webhook' | 'trigger' = 'webhook',
	): Promise<string> {
		const executionData = createRunExecutionData({});

		const executionId = await workflowRunner.run(
			{
				workflowData: workflow,
				userId: project.id,
				executionMode: mode,
				executionData,
			},
			true,
		);

		return executionId;
	}

	test('should match execution counts between insights and workflow statistics for standalone workflow', async () => {
		// ============================================================
		// ACT: Execute workflow 1 (standalone) ten times in webhook mode
		// ============================================================
		const execution1Ids: string[] = [];
		for (let i = 0; i < 10; i++) {
			const executionId = await executeWorkflow(workflow, 'webhook');
			execution1Ids.push(executionId);
		}

		// Wait for all executions to complete
		await Promise.all(execution1Ids.map(async (id) => await waitForExecution(id)));

		// Wait for workflow statistics to be recorded
		await waitForStatistics(workflow.id, 10);

		// Wait for automatic compaction to complete
		await waitForCompaction(workflow.id);

		// ============================================================
		// ASSERT: Query workflow statistics
		// ============================================================
		const stats1 = await workflowStatisticsRepository.findOne({
			where: {
				workflowId: workflow.id,
				name: StatisticsNames.productionSuccess,
			},
		});

		// Verify workflow statistics counts
		expect(stats1).toBeDefined();
		expect(stats1?.count).toBe(10); // Total executions
		expect(stats1?.rootCount).toBe(10); // All are root executions

		// ============================================================
		// ASSERT: Query insights data (compacted)
		// ============================================================
		const allInsights1 = await insightsByPeriodRepository.find({
			where: {
				metadata: { workflowId: workflow.id },
			},
			relations: ['metadata'],
		});

		// Filter by type 'success'
		const insights1 = allInsights1.filter((insight) => insight.type === 'success');
		const insights1SuccessCount = insights1.reduce((sum, insight) => sum + insight.value, 0);

		// Insights should match root execution counts
		expect(insights1SuccessCount).toBe(10);
		expect(insights1SuccessCount).toBe(stats1?.rootCount);

		// Verify runtime metrics
		const insights1Runtime = allInsights1.filter((insight) => insight.type === 'runtime_ms');
		const totalRuntime1 = insights1Runtime.reduce((sum, insight) => sum + insight.value, 0);
		expect(totalRuntime1).toBeGreaterThan(0);

		// Verify time saved metrics
		const insights1TimeSaved = allInsights1.filter((insight) => insight.type === 'time_saved_min');
		const totalTimeSaved1 = insights1TimeSaved.reduce((sum, insight) => sum + insight.value, 0);
		expect(totalTimeSaved1).toBe(10 * 5); // 10 executions * 5 minutes saved per execution
	}, 60000);
});
