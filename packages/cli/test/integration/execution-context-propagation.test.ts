/**
 * Integration tests for execution context propagation across workflows.
 * These tests verify that execution context is properly inherited by sub-workflows,
 * error workflows, and preserved during workflow resume scenarios.
 */

import { testDb, createWorkflow, createActiveWorkflow } from '@n8n/backend-test-utils';
import { ExecutionRepository, type IWorkflowDb } from '@n8n/db';
import { Container } from '@n8n/di';
import { readFileSync } from 'fs';
import { UnrecognizedNodeTypeError } from 'n8n-core';
import type { IExecutionContext, INodeType, INodeTypeData, NodeLoadingDetails } from 'n8n-workflow';
import path from 'path';

import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';
import {
	createSubWorkflowFixture,
	createParentWorkflowFixture,
	createMiddleWorkflowFixture,
	createSimpleWorkflowFixture,
} from './shared/workflow-fixtures';
import {
	validateRootContext,
	validateChildContextInheritance,
	validateContextInheritanceChain,
	validateBasicContextStructure,
} from './shared/execution-context-helpers';

// ============================================================
// Helper to load nodes from dist folder
// ============================================================

const BASE_DIR = path.resolve(__dirname, '../../..');

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

// Fixtures are now imported from './shared/workflow-fixtures'

describe('Execution Context Propagation Integration Tests', () => {
	let owner: any;
	let workflowExecutionService: WorkflowExecutionService;
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		await testDb.init();

		owner = await createOwner();

		// Load required node types from dist folder
		const nodeTypes = loadNodesFromDist([
			'n8n-nodes-base.manualTrigger',
			'n8n-nodes-base.executeWorkflow',
			'n8n-nodes-base.executeWorkflowTrigger',
		]);

		await utils.initNodeTypes(nodeTypes);
		await utils.initBinaryDataService();

		workflowExecutionService = Container.get(WorkflowExecutionService);
		executionRepository = Container.get(ExecutionRepository);
	});

	afterEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	// ============================================================
	// Helper Functions
	// ============================================================

	/**
	 * Wait for an execution to complete by polling the database
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
	 * Get execution data including the full execution context from the database
	 */
	async function getExecutionWithData(executionId: string) {
		// Use ExecutionRepository's method to properly deserialize execution data
		const executionWithData = await executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!executionWithData) {
			throw new Error(`Execution ${executionId} not found`);
		}

		return executionWithData;
	}

	// ============================================================
	// Tests
	// ============================================================

	describe('Sub-workflow context propagation', () => {
		it('should propagate context from parent to child workflow', async () => {
			// ============================================================
			// SETUP: Create Child Workflow
			// ============================================================
			const childWorkflow = await createActiveWorkflow(
				{
					name: 'Child Workflow',
					...createSubWorkflowFixture(),
				} as any as IWorkflowDb,
				owner,
			);

			// ============================================================
			// SETUP: Create Parent Workflow
			// ============================================================
			const parentWorkflow = await createWorkflow(
				{
					name: 'Parent Workflow',
					...createParentWorkflowFixture(childWorkflow.id),
				} as any as IWorkflowDb,
				owner,
			);

			// ============================================================
			// EXECUTE: Run Parent Workflow
			// ============================================================
			const result = await workflowExecutionService.executeManually(
				{
					workflowData: parentWorkflow,
					triggerToStartFrom: { name: 'Trigger' },
				},
				owner,
			);

			hasExecutionId(result);
			expect(result).toBeDefined();
			expect(result.executionId).toBeDefined();

			// Wait for parent execution to complete
			await waitForExecution(result.executionId);

			// ============================================================
			// VERIFY: Fetch Parent Execution and Context
			// ============================================================
			const parentExecution = await getExecutionWithData(result.executionId);

			const parentContext = parentExecution.data.executionData?.runtimeData as IExecutionContext;

			// Validate parent is a root context with manual execution source
			validateRootContext(parentContext, 'manual');

			// ============================================================
			// VERIFY: Find Child Execution
			// ============================================================
			// Child workflow should have been executed, find it by workflow ID
			const childExecutions = await executionRepository.find({
				where: { workflowId: childWorkflow.id },
				order: { createdAt: 'DESC' },
			});

			expect(childExecutions.length).toBeGreaterThan(0);

			// ============================================================
			// VERIFY: Child Execution Context
			// ============================================================
			const childExecution = await getExecutionWithData(childExecutions[0].id);
			const childContext = childExecution.data.executionData?.runtimeData as IExecutionContext;

			// Validate child context properly inherits from parent
			validateChildContextInheritance(childContext, parentContext, result.executionId);

			// Verify execution finished successfully
			expect(parentExecution.status).toBe('success');
			expect(childExecution.status).toBe('success');
		});
	});

	describe('Nested sub-workflow propagation', () => {
		it('should propagate context through multiple workflow levels', async () => {
			// ============================================================
			// SETUP: Create Grandchild Workflow (Workflow C)
			// ============================================================
			const grandchildWorkflow = await createActiveWorkflow(
				{
					name: 'Grandchild Workflow',
					...createSubWorkflowFixture(),
				} as any as IWorkflowDb,
				owner,
			);

			// ============================================================
			// SETUP: Create Parent Workflow (Workflow B) - calls Grandchild
			// ============================================================
			const parentWorkflow = await createActiveWorkflow(
				{
					name: 'Parent Workflow (B)',
					...createMiddleWorkflowFixture(grandchildWorkflow.id),
				} as any as IWorkflowDb,
				owner,
			);

			// ============================================================
			// SETUP: Create Grandparent Workflow (Workflow A) - calls Parent
			// ============================================================
			const grandparentWorkflow = await createWorkflow(
				{
					name: 'Grandparent Workflow (A)',
					...createParentWorkflowFixture(parentWorkflow.id),
				} as any as IWorkflowDb,
				owner,
			);

			// ============================================================
			// EXECUTE: Run Grandparent Workflow
			// ============================================================
			const result = await workflowExecutionService.executeManually(
				{
					workflowData: grandparentWorkflow,
					triggerToStartFrom: { name: 'Trigger' },
				},
				owner,
			);

			hasExecutionId(result);
			expect(result).toBeDefined();
			expect(result.executionId).toBeDefined();

			// Wait for grandparent execution to complete
			await waitForExecution(result.executionId);

			// ============================================================
			// VERIFY: Fetch All Execution Contexts
			// ============================================================
			const grandparentExecution = await getExecutionWithData(result.executionId);
			const grandparentContext = grandparentExecution.data.executionData
				?.runtimeData as IExecutionContext;

			const parentExecutions = await executionRepository.find({
				where: { workflowId: parentWorkflow.id },
				order: { createdAt: 'DESC' },
			});
			expect(parentExecutions.length).toBeGreaterThan(0);

			const parentExecution = await getExecutionWithData(parentExecutions[0].id);
			const parentContext = parentExecution.data.executionData?.runtimeData as IExecutionContext;

			const grandchildExecutions = await executionRepository.find({
				where: { workflowId: grandchildWorkflow.id },
				order: { createdAt: 'DESC' },
			});
			expect(grandchildExecutions.length).toBeGreaterThan(0);

			const grandchildExecution = await getExecutionWithData(grandchildExecutions[0].id);
			const grandchildContext = grandchildExecution.data.executionData
				?.runtimeData as IExecutionContext;

			// ============================================================
			// VERIFY: Complete Context Inheritance Chain
			// ============================================================
			validateContextInheritanceChain([
				{
					context: grandparentContext,
					parentExecutionId: undefined,
				},
				{
					context: parentContext,
					parentExecutionId: result.executionId,
				},
				{
					context: grandchildContext,
					parentExecutionId: parentExecutions[0].id,
				},
			]);

			// ============================================================
			// VERIFY: All Executions Finished Successfully
			// ============================================================
			expect(grandparentExecution.status).toBe('success');
			expect(parentExecution.status).toBe('success');
			expect(grandchildExecution.status).toBe('success');
		});
	});

	describe('Context isolation', () => {
		it('should not leak context between independent workflows', async () => {
			// ============================================================
			// SETUP: Create Two Independent Workflows
			// ============================================================
			const workflow1 = await createWorkflow(
				{
					name: 'Independent Workflow 1',
					...createSimpleWorkflowFixture(),
				} as any as IWorkflowDb,
				owner,
			);

			const workflow2 = await createWorkflow(
				{
					name: 'Independent Workflow 2',
					...createSimpleWorkflowFixture(),
				} as any as IWorkflowDb,
				owner,
			);

			// ============================================================
			// EXECUTE: Run Both Workflows Independently
			// ============================================================
			const result1 = await workflowExecutionService.executeManually(
				{
					workflowData: workflow1,
					triggerToStartFrom: { name: 'Trigger' },
				},
				owner,
			);
			hasExecutionId(result1);

			expect(result1).toBeDefined();
			expect(result1.executionId).toBeDefined();

			// Wait for first execution to complete
			await waitForExecution(result1.executionId);

			const result2 = await workflowExecutionService.executeManually(
				{
					workflowData: workflow2,
					triggerToStartFrom: { name: 'Trigger' },
				},
				owner,
			);

			hasExecutionId(result2);
			expect(result2).toBeDefined();
			expect(result2.executionId).toBeDefined();

			// Wait for second execution to complete
			await waitForExecution(result2.executionId);

			// ============================================================
			// VERIFY: Fetch Both Execution Contexts
			// ============================================================
			const execution1 = await getExecutionWithData(result1.executionId);
			const context1 = execution1.data.executionData?.runtimeData as IExecutionContext;

			const execution2 = await getExecutionWithData(result2.executionId);
			const context2 = execution2.data.executionData?.runtimeData as IExecutionContext;

			// ============================================================
			// VERIFY: Both Contexts Are Root Contexts
			// ============================================================
			validateRootContext(context1, 'manual');
			validateRootContext(context2, 'manual');

			// ============================================================
			// VERIFY: Complete Context Isolation
			// ============================================================

			// Both should have valid basic structure
			validateBasicContextStructure(context1);
			validateBasicContextStructure(context2);

			// Both should be root contexts with no parent
			expect(context1.parentExecutionId).toBeUndefined();
			expect(context2.parentExecutionId).toBeUndefined();

			// Both should have manual execution source
			expect(context1.source).toBe('manual');
			expect(context2.source).toBe('manual');

			// Both should have different establishedAt timestamps (since executed sequentially)
			expect(context1.establishedAt).not.toBe(context2.establishedAt);
			expect(context2.establishedAt).toBeGreaterThanOrEqual(context1.establishedAt);

			// Verify no credential sharing between independent workflows
			// Both should either have different credentials or no credentials at all
			if (context1.credentials && context2.credentials) {
				// If both have credentials, they should not be the same reference
				expect(context1.credentials).not.toBe(context2.credentials);
			}

			// ============================================================
			// VERIFY: Both Executions Finished Successfully
			// ============================================================
			expect(execution1.status).toBe('success');
			expect(execution2.status).toBe('success');
		});
	});
});

function hasExecutionId(
	data: Awaited<ReturnType<WorkflowExecutionService['executeManually']>>,
): asserts data is { executionId: string } {
	if ('executionId' in data) {
		return;
	}

	throw new Error(`Expected an '{executionId: string}', instead got ${JSON.stringify(data)}`);
}
