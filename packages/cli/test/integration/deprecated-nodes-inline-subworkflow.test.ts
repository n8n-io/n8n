import { testDb, createWorkflow } from '@n8n/backend-test-utils';
import { NodesConfig } from '@n8n/config';
import { ExecutionRepository, type IWorkflowDb } from '@n8n/db';
import { Container } from '@n8n/di';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';
import { loadNodesFromDist } from './shared/utils/node-types-data';

describe('inline sub-workflow with a deprecated node', () => {
	let owner: Awaited<ReturnType<typeof createOwner>>;
	let workflowExecutionService: WorkflowExecutionService;
	let executionRepository: ExecutionRepository;
	let nodesConfig: NodesConfig;
	let previousBlockDeprecated: boolean;

	beforeAll(async () => {
		await testDb.init();

		owner = await createOwner();

		const nodeTypes = loadNodesFromDist([
			'n8n-nodes-base.manualTrigger',
			'n8n-nodes-base.executeWorkflow',
			'n8n-nodes-base.executeWorkflowTrigger',
			'n8n-nodes-base.function',
		]);

		await utils.initNodeTypes(nodeTypes);
		await utils.initBinaryDataService();

		workflowExecutionService = Container.get(WorkflowExecutionService);
		executionRepository = Container.get(ExecutionRepository);
		nodesConfig = Container.get(NodesConfig);
		previousBlockDeprecated = nodesConfig.blockDeprecated;
	});

	afterEach(async () => {
		nodesConfig.blockDeprecated = previousBlockDeprecated;
		await testDb.truncate(['ExecutionEntity', 'WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	function inlineSubWorkflowWithFunctionNode() {
		return {
			nodes: [
				{
					parameters: { inputSource: 'passthrough' },
					type: 'n8n-nodes-base.executeWorkflowTrigger',
					typeVersion: 1.1,
					id: uuid(),
					name: 'Sub Trigger',
					position: [0, 0],
				},
				{
					parameters: { functionCode: "return [{ json: { ran: 'function' } }];" },
					type: 'n8n-nodes-base.function',
					typeVersion: 1,
					id: uuid(),
					name: 'Function',
					position: [200, 0],
				},
			],
			connections: {
				'Sub Trigger': {
					main: [[{ node: 'Function', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
		};
	}

	function parentWithInlineSubWorkflow() {
		return {
			nodes: [
				{
					parameters: {},
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					id: uuid(),
					name: 'Trigger',
					position: [0, 0],
				},
				{
					parameters: {
						source: 'parameter',
						workflowJson: JSON.stringify(inlineSubWorkflowWithFunctionNode()),
						options: { waitForSubWorkflow: true },
					},
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1.2,
					id: uuid(),
					name: 'Execute Sub-workflow',
					position: [200, 0],
				},
			],
			connections: {
				Trigger: {
					main: [[{ node: 'Execute Sub-workflow', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
		};
	}

	async function runParent() {
		const parent = await createWorkflow(
			{ name: 'Parent', ...parentWithInlineSubWorkflow() } as unknown as IWorkflowDb,
			owner,
		);

		const result = await workflowExecutionService.executeManually(
			parent,
			{ triggerToStartFrom: { name: 'Trigger' } },
			owner,
		);
		if (!('executionId' in result)) {
			throw new Error(`Expected an executionId, got ${JSON.stringify(result)}`);
		}

		const start = Date.now();
		while (Date.now() - start < 10000) {
			const execution = await executionRepository.findSingleExecution(result.executionId, {
				includeData: true,
				unflattenData: true,
			});
			if (execution && ['error', 'success'].includes(execution.status)) return execution;
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		throw new Error(`Execution ${result.executionId} did not finish within 10000ms`);
	}

	it('fails the parent node before the deprecated node runs when the block is on', async () => {
		nodesConfig.blockDeprecated = true;

		const execution = await runParent();

		expect(execution.status).toBe('error');
		const nodeRun = execution.data.resultData.runData['Execute Sub-workflow']?.at(-1);
		expect(nodeRun?.executionStatus).toBe('error');
		expect(JSON.stringify(nodeRun?.error)).toContain('n8n-nodes-base.function');
		expect(await executionRepository.count({ where: { workflowId: execution.workflowId } })).toBe(
			1,
		);
	});

	it('runs the deprecated node when the block is off', async () => {
		nodesConfig.blockDeprecated = false;

		const execution = await runParent();

		expect(execution.status).toBe('success');
		const output = execution.data.resultData.runData['Execute Sub-workflow']?.at(-1)?.data?.main;
		expect(output?.[0]?.[0]?.json).toEqual({ ran: 'function' });
	});
});
