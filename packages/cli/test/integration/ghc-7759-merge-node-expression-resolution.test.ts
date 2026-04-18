/**
 * Regression test for GHC-7759:
 * Merge node inside a sub-workflow clobbers $('NodeName') expression resolution in the parent workflow
 *
 * Bug description:
 * When a sub-workflow (called via Execute Workflow) contains a Merge node on its execution path,
 * expressions in the parent workflow that reference earlier parent nodes via $('NodeName').item.json...
 * resolve to [undefined] in nodes placed after the Execute Workflow node.
 *
 * GitHub issue: https://github.com/n8n-io/n8n/issues/28618
 */

import { testDb, createWorkflow, createActiveWorkflow } from '@n8n/backend-test-utils';
import { ExecutionRepository, type IWorkflowDb } from '@n8n/db';
import { Container } from '@n8n/di';
import { readFileSync } from 'fs';
import { UnrecognizedNodeTypeError } from 'n8n-core';
import type { INodeType, INodeTypeData, NodeLoadingDetails } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import path from 'path';
import { v4 as uuid } from 'uuid';

import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';

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
		const nodeDistPath = path.join(BASE_DIR, 'nodes-base', loadInfo.sourcePath);
		const node = new (require(nodeDistPath)[loadInfo.className])() as INodeType;
		nodeTypes[nodeName] = {
			sourcePath: '',
			type: node,
		};
	}

	return nodeTypes;
}

/**
 * Creates a sub-workflow with a Merge node.
 * This is the key to reproducing the bug - the Merge node in the sub-workflow
 * causes expression resolution issues in the parent workflow.
 */
function createSubWorkflowWithMergeNode() {
	const triggerId = uuid();
	const noOpId = uuid();
	const mergeId = uuid();

	return {
		nodes: [
			{
				parameters: {
					workflowInputs: {
						values: [],
					},
				},
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				typeVersion: 1.1,
				position: [0, 0] as [number, number],
				id: triggerId,
				name: 'Execute Workflow Trigger',
			},
			{
				parameters: {},
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [200, -100] as [number, number],
				id: noOpId,
				name: 'NoOp',
			},
			{
				parameters: {
					mode: 'combine',
					combineBy: 'combineAll',
				},
				type: 'n8n-nodes-base.merge',
				typeVersion: 3,
				position: [400, 0] as [number, number],
				id: mergeId,
				name: 'Merge',
			},
		],
		connections: {
			'Execute Workflow Trigger': {
				main: [
					[
						{
							node: 'NoOp',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
						{
							node: 'Merge',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
			NoOp: {
				main: [
					[
						{
							node: 'Merge',
							type: NodeConnectionTypes.Main,
							index: 1,
						},
					],
				],
			},
		},
		pinData: {},
	};
}

/**
 * Creates a parent workflow that:
 * 1. Sets a value in the "Set Value" node
 * 2. Calls a sub-workflow via "Execute Workflow"
 * 3. References the "Set Value" node in the "Final Output" node
 *
 * The bug causes the expression {{ $('Set Value').item.json.Value }} to resolve to [undefined]
 * in the "Final Output" node when the sub-workflow contains a Merge node.
 */
function createParentWorkflowWithExpressionReference(childWorkflowId: string) {
	const triggerId = uuid();
	const setValueId = uuid();
	const executeWorkflowId = uuid();
	const finalOutputId = uuid();

	return {
		nodes: [
			{
				parameters: {},
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				id: triggerId,
				name: 'Manual Trigger',
			},
			{
				parameters: {
					assignments: {
						assignments: [
							{
								id: uuid(),
								name: 'Value',
								value: 'Text',
								type: 'string',
							},
						],
					},
					options: {},
				},
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [200, 0] as [number, number],
				id: setValueId,
				name: 'Set Value',
			},
			{
				parameters: {
					workflowId: {
						__rl: true,
						value: childWorkflowId,
						mode: 'list',
						cachedResultUrl: `/workflow/${childWorkflowId}`,
						cachedResultName: 'Sub Workflow',
					},
					workflowInputs: {
						mappingMode: 'defineBelow',
						value: {},
						matchingColumns: [],
						schema: [],
						attemptToConvertTypes: false,
						convertFieldsToString: true,
					},
					options: {},
				},
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1.3,
				position: [400, 0] as [number, number],
				id: executeWorkflowId,
				name: 'Execute Workflow',
			},
			{
				parameters: {
					assignments: {
						assignments: [
							{
								id: uuid(),
								name: 'ReferencedValue',
								// This expression should resolve to "Text" but resolves to [undefined] when bug is present
								value: "={{ $('Set Value').item.json.Value }}",
								type: 'string',
							},
						],
					},
					options: {},
				},
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [600, 0] as [number, number],
				id: finalOutputId,
				name: 'Final Output',
			},
		],
		connections: {
			'Manual Trigger': {
				main: [
					[
						{
							node: 'Set Value',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
			'Set Value': {
				main: [
					[
						{
							node: 'Execute Workflow',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
			'Execute Workflow': {
				main: [
					[
						{
							node: 'Final Output',
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
		},
		pinData: {},
	};
}

describe('GHC-7759: Merge node in sub-workflow breaks parent expression resolution', () => {
	let owner: any;
	let workflowExecutionService: WorkflowExecutionService;
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		await testDb.init();

		owner = await createOwner();

		// Load required node types
		const nodeTypes = loadNodesFromDist([
			'n8n-nodes-base.manualTrigger',
			'n8n-nodes-base.executeWorkflow',
			'n8n-nodes-base.executeWorkflowTrigger',
			'n8n-nodes-base.set',
			'n8n-nodes-base.merge',
			'n8n-nodes-base.noOp',
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

	async function getExecutionWithData(executionId: string) {
		const executionWithData = await executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!executionWithData) {
			throw new Error(`Execution ${executionId} not found`);
		}

		return executionWithData;
	}

	it('should resolve $("Set Value").item.json.Value correctly when sub-workflow has a Merge node', async () => {
		// Create sub-workflow with Merge node
		const subWorkflow = await createActiveWorkflow(
			{
				name: 'Sub Workflow with Merge',
				...createSubWorkflowWithMergeNode(),
			} as any as IWorkflowDb,
			owner,
		);

		// Create parent workflow with expression reference
		const parentWorkflow = await createWorkflow(
			{
				name: 'Parent Workflow',
				...createParentWorkflowWithExpressionReference(subWorkflow.id),
			} as any as IWorkflowDb,
			owner,
		);

		// Execute parent workflow
		const result = await workflowExecutionService.executeManually(
			parentWorkflow,
			{
				triggerToStartFrom: { name: 'Manual Trigger' },
			},
			owner,
		);

		if (!('executionId' in result)) {
			throw new Error(`Expected an '{executionId: string}', instead got ${JSON.stringify(result)}`);
		}

		expect(result.executionId).toBeDefined();

		// Wait for execution to complete
		await waitForExecution(result.executionId);

		// Get execution data
		const execution = await getExecutionWithData(result.executionId);

		// Verify execution finished successfully
		expect(execution.status).toBe('success');

		// Get the data from the "Final Output" node
		const finalOutputData = execution.data.resultData.runData['Final Output'];
		expect(finalOutputData).toBeDefined();
		expect(finalOutputData).toHaveLength(1);

		const outputItem = finalOutputData[0].data?.main?.[0]?.[0];
		expect(outputItem).toBeDefined();

		// BUG: This expression should resolve to "Text" but currently resolves to "[undefined]"
		// when the sub-workflow contains a Merge node
		expect(outputItem.json.ReferencedValue).toBe('Text');
	});

	it('should resolve $("Set Value").item.json.Value correctly when sub-workflow has NO Merge node', async () => {
		// Create simple sub-workflow WITHOUT Merge node (control test)
		const subWorkflow = await createActiveWorkflow(
			{
				name: 'Sub Workflow without Merge',
				nodes: [
					{
						parameters: {
							workflowInputs: {
								values: [],
							},
						},
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						typeVersion: 1.1,
						position: [0, 0] as [number, number],
						id: uuid(),
						name: 'Execute Workflow Trigger',
					},
				],
				connections: {},
				pinData: {},
			} as any as IWorkflowDb,
			owner,
		);

		// Create parent workflow with expression reference (same as before)
		const parentWorkflow = await createWorkflow(
			{
				name: 'Parent Workflow - Control',
				...createParentWorkflowWithExpressionReference(subWorkflow.id),
			} as any as IWorkflowDb,
			owner,
		);

		// Execute parent workflow
		const result = await workflowExecutionService.executeManually(
			parentWorkflow,
			{
				triggerToStartFrom: { name: 'Manual Trigger' },
			},
			owner,
		);

		if (!('executionId' in result)) {
			throw new Error(`Expected an '{executionId: string}', instead got ${JSON.stringify(result)}`);
		}

		expect(result.executionId).toBeDefined();

		// Wait for execution to complete
		await waitForExecution(result.executionId);

		// Get execution data
		const execution = await getExecutionWithData(result.executionId);

		// Verify execution finished successfully
		expect(execution.status).toBe('success');

		// Get the data from the "Final Output" node
		const finalOutputData = execution.data.resultData.runData['Final Output'];
		expect(finalOutputData).toBeDefined();
		expect(finalOutputData).toHaveLength(1);

		const outputItem = finalOutputData[0].data?.main?.[0]?.[0];
		expect(outputItem).toBeDefined();

		// This should work correctly when there's no Merge node in the sub-workflow
		expect(outputItem.json.ReferencedValue).toBe('Text');
	});
});
