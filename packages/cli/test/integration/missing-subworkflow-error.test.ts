import { testDb, createWorkflow } from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import { ExecutionRepository, type IWorkflowDb } from '@n8n/db';
import { Container } from '@n8n/di';
import { OperationalError, UserError } from '@n8n/errors';
import { ErrorReporter } from 'n8n-core';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { getPublishedWorkflowData } from '@/workflow-execute-additional-data';
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

	it('fails with a non-reportable UserError naming the ID when a numeric workflow ID expression matches no workflow', async () => {
		const execution = await runParentWithSubworkflow('={{ 123 }}', 'once');

		expect(execution.status).toBe('error');
		const nodeError = execution.data.resultData.runData['Execute Sub-workflow']?.at(-1)?.error;
		expect(nodeError).toMatchObject({
			name: 'UserError',
			level: 'info',
			shouldReport: false,
			message: 'Workflow "123" does not exist.',
		});
		expect(await executionRepository.count()).toBe(1);
	});

	it('executes an existing sub-workflow whose legacy string ID matches a numeric expression', async () => {
		await createWorkflow(
			{
				id: '5',
				name: 'Legacy Numeric ID Sub-workflow',
				nodes: [
					{
						parameters: { inputSource: 'passthrough' },
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						typeVersion: 1.1,
						id: uuid(),
						name: 'When Executed by Another Workflow',
						position: [0, 0],
					},
				],
				connections: {},
			} as unknown as IWorkflowDb,
			owner,
		);

		const execution = await runParentWithSubworkflow('={{ 5 }}', 'once');

		expect(execution.status).toBe('success');
		expect(await executionRepository.count()).toBe(2);
	});

	it.each([
		['boolean', '={{ true }}'],
		['NaN', '={{ Number.NaN }}'],
		['Infinity', '={{ Infinity }}'],
		['object', '={{ ({}) }}'],
	])(
		'fails with a non-reportable UserError when the workflow ID expression resolves to %s',
		async (_label, expression) => {
			const execution = await runParentWithSubworkflow(expression, 'once');

			expect(execution.status).toBe('error');
			const nodeError = execution.data.resultData.runData['Execute Sub-workflow']?.at(-1)?.error;
			expect(nodeError).toMatchObject({
				name: 'UserError',
				level: 'info',
				shouldReport: false,
				message: expect.stringContaining('Workflow ID is invalid.'),
			});
			expect(await executionRepository.count()).toBe(1);
		},
	);

	it('throws a non-reportable UserError naming the missing ID in published mode with publication service enabled', async () => {
		expect(Container.get(WorkflowsConfig).useWorkflowPublicationService).toBe(true);

		const promise = getPublishedWorkflowData(
			{ id: 'deleted-subworkflow-id-404' },
			'parent-workflow-id',
		);

		await expect(promise).rejects.toBeInstanceOf(UserError);
		await expect(promise).rejects.toMatchObject({
			shouldReport: false,
			message: expect.stringContaining('deleted-subworkflow-id-404'),
		});
	});

	it('throws an OperationalError for an existing unpublished workflow in published mode with publication service enabled', async () => {
		expect(Container.get(WorkflowsConfig).useWorkflowPublicationService).toBe(true);
		const unpublished = await createWorkflow({ name: 'Unpublished Sub', active: false }, owner);

		const promise = getPublishedWorkflowData({ id: unpublished.id }, 'parent-workflow-id');

		await expect(promise).rejects.toBeInstanceOf(OperationalError);
		await expect(promise).rejects.toThrow('Workflow is not active and cannot be executed.');
	});
});
