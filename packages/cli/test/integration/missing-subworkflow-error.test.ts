import { testDb, createWorkflow } from '@n8n/backend-test-utils';
import { ExecutionRepository, type IWorkflowDb } from '@n8n/db';
import { Container } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';
import { loadNodesFromDist } from './shared/utils/node-types-data';

describe('ExecuteWorkflow node with missing or invalid sub-workflow ID', () => {
	let owner: Awaited<ReturnType<typeof createOwner>>;
	let workflowExecutionService: WorkflowExecutionService;
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		await testDb.init();

		owner = await createOwner();

		const nodeTypes = loadNodesFromDist([
			'n8n-nodes-base.manualTrigger',
			'n8n-nodes-base.executeWorkflow',
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

	async function runParentWithSubworkflow(workflowIdValue: string, mode: 'once' | 'each' = 'once') {
		const parent = await createWorkflow(
			{
				name: 'Parent',
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
							source: 'database',
							workflowId: {
								__rl: true,
								mode: 'id',
								value: workflowIdValue,
							},
							mode,
							options: { waitForSubWorkflow: true },
						},
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1.4,
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
			} as unknown as IWorkflowDb,
			owner,
		);

		const result = await workflowExecutionService.executeManually({
			workflowData: parent,
			payload: { triggerToStartFrom: { name: 'Trigger' } },
			user: owner,
		});
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

	it('fails in once mode with a non-reportable UserError naming the missing sub-workflow ID', async () => {
		const errorReporter = Container.get(ErrorReporter);
		const errorSpy = vi.spyOn(errorReporter, 'error');

		try {
			const execution = await runParentWithSubworkflow('deleted-subworkflow-id-404', 'once');

			expect(execution.status).toBe('error');
			const nodeError = execution.data.resultData.runData['Execute Sub-workflow']?.at(-1)?.error;
			expect(nodeError).toMatchObject({
				name: 'UserError',
				level: 'info',
				shouldReport: false,
				message: expect.stringContaining('deleted-subworkflow-id-404'),
			});
			expect(await executionRepository.count()).toBe(1);

			const reportedError = errorSpy.mock.calls[0]?.[0];
			expect(reportedError).toBeDefined();
			expect(
				await errorReporter.beforeSend({ type: undefined }, { originalException: reportedError }),
			).toBeNull();
		} finally {
			errorSpy.mockRestore();
		}
	});

	it('fails in each mode with a warning-level NodeOperationError naming the missing sub-workflow ID', async () => {
		const errorReporter = Container.get(ErrorReporter);
		const errorSpy = vi.spyOn(errorReporter, 'error');

		try {
			const execution = await runParentWithSubworkflow('deleted-subworkflow-id-404', 'each');

			expect(execution.status).toBe('error');
			const nodeError = execution.data.resultData.runData['Execute Sub-workflow']?.at(-1)?.error;
			expect(nodeError).toMatchObject({
				name: 'NodeOperationError',
				level: 'warning',
				description: expect.stringContaining('deleted-subworkflow-id-404'),
			});
			expect(await executionRepository.count()).toBe(1);

			const reportedError = errorSpy.mock.calls[0]?.[0];
			expect(reportedError).toBeDefined();
			expect(
				await errorReporter.beforeSend({ type: undefined }, { originalException: reportedError }),
			).toBeNull();
		} finally {
			errorSpy.mockRestore();
		}
	});

	it('fails with a non-reportable UserError when the workflow ID expression resolves to an empty string', async () => {
		const execution = await runParentWithSubworkflow('={{ "" }}', 'once');

		expect(execution.status).toBe('error');
		const nodeError = execution.data.resultData.runData['Execute Sub-workflow']?.at(-1)?.error;
		expect(nodeError).toMatchObject({
			name: 'UserError',
			level: 'info',
			shouldReport: false,
		});
		expect(await executionRepository.count()).toBe(1);
	});

	it('fails with a non-reportable UserError when the workflow ID expression resolves to undefined', async () => {
		const execution = await runParentWithSubworkflow('={{ $json.missingId }}', 'once');

		expect(execution.status).toBe('error');
		const nodeError = execution.data.resultData.runData['Execute Sub-workflow']?.at(-1)?.error;
		expect(nodeError).toMatchObject({
			name: 'UserError',
			level: 'info',
			shouldReport: false,
		});
		expect(await executionRepository.count()).toBe(1);
	});

	it('fails with a non-reportable UserError naming the value when the workflow ID expression resolves to a workflow name', async () => {
		const execution = await runParentWithSubworkflow('={{ "My Sub-workflow Name" }}', 'once');

		expect(execution.status).toBe('error');
		const nodeError = execution.data.resultData.runData['Execute Sub-workflow']?.at(-1)?.error;
		expect(nodeError).toMatchObject({
			name: 'UserError',
			level: 'info',
			shouldReport: false,
			message: expect.stringContaining('My Sub-workflow Name'),
		});
		expect(await executionRepository.count()).toBe(1);
	});
});
