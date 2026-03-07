/**
 * Regression test for GHC-6559: Overview page has stopped tracking execution counts
 *
 * Bug report: After adding Time Saved nodes to workflows and publishing them,
 * the Overview page no longer shows the correct count of production executions.
 * The Executions list shows hundreds of executions, but the Overview shows very low numbers.
 *
 * This test verifies that workflows with Time Saved nodes (in dynamic mode) are
 * correctly counted in the Insights summary.
 */

import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project, WorkflowEntity } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { readFileSync } from 'fs';
import { InstanceSettings } from 'n8n-core';
import type { INodeType, INodeTypeData, NodeLoadingDetails } from 'n8n-workflow';
import { createRunExecutionData, UnrecognizedNodeTypeError } from 'n8n-workflow';
import path from 'path';

import { InsightsByPeriodRepository } from '@/modules/insights/database/repositories/insights-by-period.repository';
import { InsightsRawRepository } from '@/modules/insights/database/repositories/insights-raw.repository';
import { InsightsCollectionService } from '@/modules/insights/insights-collection.service';
import { InsightsCompactionService } from '@/modules/insights/insights-compaction.service';
import { InsightsService } from '@/modules/insights/insights.service';
import { WorkflowRunner } from '@/workflow-runner';

import * as utils from '../shared/utils';

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
		const nodeDistPath = path.join(BASE_DIR, 'nodes-base', loadInfo.sourcePath);
		const node = new (require(nodeDistPath)[loadInfo.className])() as INodeType;
		nodeTypes[nodeName] = {
			sourcePath: '',
			type: node,
		};
	}

	return nodeTypes;
}

describe('GHC-6559: Overview page execution count with Time Saved nodes', () => {
	beforeAll(async () => {
		// Configure insights for fast flushing and compaction
		process.env.N8N_INSIGHTS_FLUSH_BATCH_SIZE = '10';
		process.env.N8N_INSIGHTS_FLUSH_INTERVAL_SECONDS = '1';
		process.env.N8N_INSIGHTS_COMPACTION_INTERVAL_MINUTES = '0.05';
		process.env.N8N_INSIGHTS_COMPACTION_BATCH_SIZE = '100';

		await testModules.loadModules(['insights']);
		await testDb.init();

		// Load required node types
		const nodeTypes = loadNodesFromDist([
			'n8n-nodes-base.manualTrigger',
			'n8n-nodes-base.timeSaved',
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
	let insightsService: InsightsService;
	let workflowRunner: WorkflowRunner;
	let executionRepository: ExecutionRepository;

	let project: Project;

	beforeAll(() => {
		insightsCollectionService = Container.get(InsightsCollectionService);
		insightsCompactionService = Container.get(InsightsCompactionService);
		insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
		insightsRawRepository = Container.get(InsightsRawRepository);
		insightsService = Container.get(InsightsService);
		workflowRunner = Container.get(WorkflowRunner);
		executionRepository = Container.get(ExecutionRepository);

		// Initialize insights collection service
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
	});

	/**
	 * Helper to wait for an execution to complete
	 */
	async function waitForExecution(executionId: string, timeout = 10000): Promise<void> {
		const start = Date.now();
		while (Date.now() - start < timeout) {
			const execution = await executionRepository.findOneBy({ id: executionId });
			if (execution?.finished) {
				return;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		throw new Error(`Execution ${executionId} did not complete within ${timeout}ms`);
	}

	/**
	 * Helper to wait for insights to be compacted
	 */
	async function waitForCompaction(workflowId: string, timeout = 15000): Promise<void> {
		const start = Date.now();
		while (Date.now() - start < timeout) {
			const rawInsights = await insightsRawRepository.find();
			const compactedInsights = await insightsByPeriodRepository.find({
				where: {
					metadata: { workflowId },
				},
				relations: ['metadata'],
			});

			if (compactedInsights.length > 0 && rawInsights.length < 10) {
				return;
			}
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
		throw new Error(`Insights compaction did not complete within ${timeout}ms`);
	}

	/**
	 * Helper to execute a workflow
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

	test('should correctly count executions for workflows with Time Saved nodes in fixed mode', async () => {
		// Create workflow with Time Saved node in FIXED mode (default)
		const workflow = await createWorkflow(
			{
				name: 'Workflow with Time Saved (fixed)',
				nodes: [
					{
						id: 'uuid-1',
						name: 'When clicking "Test workflow"',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [100, 100],
						parameters: {},
					},
					{
						id: 'uuid-2',
						name: 'Time Saved',
						type: 'n8n-nodes-base.timeSaved',
						typeVersion: 1,
						position: [300, 100],
						parameters: {
							mode: 'once',
							minutesSaved: 5,
						},
					},
				],
				connections: {
					'When clicking "Test workflow"': {
						main: [[{ node: 'Time Saved', type: 'main', index: 0 }]],
					},
				},
				settings: {
					timeSavedMode: 'fixed',
					timeSavedPerExecution: 10,
				},
			},
			project,
		);

		// Execute workflow 10 times
		const executionIds: string[] = [];
		for (let i = 0; i < 10; i++) {
			const executionId = await executeWorkflow(workflow, 'webhook');
			executionIds.push(executionId);
		}

		// Wait for all executions to complete
		await Promise.all(executionIds.map((id) => waitForExecution(id)));

		// Wait for compaction
		await waitForCompaction(workflow.id);

		// Get insights summary
		const summary = await insightsService.getInsightsSummary({
			startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
			endDate: new Date(),
			projectId: project.id,
		});

		// Verify the execution count matches
		expect(summary.total.value).toBe(10);
		expect(summary.failed.value).toBe(0);
	}, 60000);

	test('should correctly count executions for workflows with Time Saved nodes in dynamic mode', async () => {
		// Create workflow with Time Saved node in DYNAMIC mode
		// This is what the user reported as causing the issue
		const workflow = await createWorkflow(
			{
				name: 'Workflow with Time Saved (dynamic)',
				nodes: [
					{
						id: 'uuid-1',
						name: 'When clicking "Test workflow"',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [100, 100],
						parameters: {},
					},
					{
						id: 'uuid-2',
						name: 'Time Saved',
						type: 'n8n-nodes-base.timeSaved',
						typeVersion: 1,
						position: [300, 100],
						parameters: {
							mode: 'once',
							minutesSaved: 5,
						},
					},
				],
				connections: {
					'When clicking "Test workflow"': {
						main: [[{ node: 'Time Saved', type: 'main', index: 0 }]],
					},
				},
				settings: {
					// IMPORTANT: This is the mode that the user reported causes the issue
					timeSavedMode: 'dynamic',
				},
			},
			project,
		);

		// Execute workflow 10 times (simulating the "several hundred executions")
		const executionIds: string[] = [];
		for (let i = 0; i < 10; i++) {
			const executionId = await executeWorkflow(workflow, 'webhook');
			executionIds.push(executionId);
		}

		// Wait for all executions to complete
		await Promise.all(executionIds.map((id) => waitForExecution(id)));

		// Wait for compaction
		await waitForCompaction(workflow.id);

		// Get insights summary (this is what the Overview page displays)
		const summary = await insightsService.getInsightsSummary({
			startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
			endDate: new Date(),
			projectId: project.id,
		});

		// BUG: The user reports that this shows very low numbers despite having hundreds of executions
		// This test should FAIL if the bug exists
		expect(summary.total.value).toBe(10);
		expect(summary.failed.value).toBe(0);

		// Also verify the time saved is correctly calculated from the Time Saved node
		expect(summary.timeSaved.value).toBe(50); // 10 executions * 5 minutes each
	}, 60000);

	test('should correctly count executions for workflows with multiple Time Saved nodes', async () => {
		// Create workflow with multiple Time Saved nodes (user mentioned "adding Time Saved nodes to MOST workflows")
		const workflow = await createWorkflow(
			{
				name: 'Workflow with Multiple Time Saved nodes',
				nodes: [
					{
						id: 'uuid-1',
						name: 'When clicking "Test workflow"',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [100, 100],
						parameters: {},
					},
					{
						id: 'uuid-2',
						name: 'Time Saved 1',
						type: 'n8n-nodes-base.timeSaved',
						typeVersion: 1,
						position: [300, 100],
						parameters: {
							mode: 'once',
							minutesSaved: 5,
						},
					},
					{
						id: 'uuid-3',
						name: 'Time Saved 2',
						type: 'n8n-nodes-base.timeSaved',
						typeVersion: 1,
						position: [500, 100],
						parameters: {
							mode: 'once',
							minutesSaved: 3,
						},
					},
				],
				connections: {
					'When clicking "Test workflow"': {
						main: [[{ node: 'Time Saved 1', type: 'main', index: 0 }]],
					},
					'Time Saved 1': {
						main: [[{ node: 'Time Saved 2', type: 'main', index: 0 }]],
					},
				},
				settings: {
					timeSavedMode: 'dynamic',
				},
			},
			project,
		);

		// Execute workflow multiple times
		const executionIds: string[] = [];
		for (let i = 0; i < 10; i++) {
			const executionId = await executeWorkflow(workflow, 'webhook');
			executionIds.push(executionId);
		}

		// Wait for all executions to complete
		await Promise.all(executionIds.map((id) => waitForExecution(id)));

		// Wait for compaction
		await waitForCompaction(workflow.id);

		// Get insights summary
		const summary = await insightsService.getInsightsSummary({
			startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
			endDate: new Date(),
			projectId: project.id,
		});

		// Verify execution counts are correct
		expect(summary.total.value).toBe(10);
		expect(summary.failed.value).toBe(0);

		// Verify time saved is summed from both nodes
		expect(summary.timeSaved.value).toBe(80); // 10 executions * (5 + 3) minutes
	}, 60000);
});
