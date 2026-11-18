import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import { ExecutionRepository, WorkflowRepository, type WorkflowEntity } from '@n8n/db';
import type { WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Container } from '@n8n/di';
import {
	createRunExecutionData,
	NodeApiError,
	type INode,
	type IRun,
	type IWorkflowBase,
	type JsonObject,
	type WorkflowExecuteMode,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import { DurableScheduler } from '@/scheduling/durable-scheduler';
import { WorkflowScheduledJobOwner } from '@/scheduling/workflow-scheduled-job-owner';

import { ExecutionAutoRetryService } from '../execution-auto-retry.service';

const NOW = new Date('2026-11-18T10:00:00.000Z');
const WORKFLOW_ID = 'workflow-1';
const FAILED_ID = '42';

type RetryLink = {
	workflowId: string;
	workflowVersionId: string | null;
	mode: WorkflowExecuteMode;
	retryOf: string | null;
	retrySuccessId: string | null;
};

const ORIGINAL_ID = '0';

const node = mock<INode>({ name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' });
const httpError = (httpCode: string) => new NodeApiError(node, {}, { httpCode });
const secondsFromNow = (seconds: number) => new Date(NOW.getTime() + seconds * 1000);

describe('ExecutionAutoRetryService', () => {
	const globalConfig = Container.get(GlobalConfig);
	const workflowRepository = mockInstance(WorkflowRepository);
	const executionRepository = mockInstance(ExecutionRepository);
	const durableScheduler = mockInstance(DurableScheduler);
	const provisioner = mockInstance(DurableJobProvisioner);
	const owner = new WorkflowScheduledJobOwner(mock());
	const service = new ExecutionAutoRetryService(
		mockLogger(),
		workflowRepository,
		executionRepository,
		durableScheduler,
		provisioner,
		owner,
	);

	let ctx: WorkflowExecuteAfterContext;
	let facts: Record<string, RetryLink>;

	/** Makes `ctx` a failed retry of a trigger run that now has `retries` retries, this one included. */
	const failedRetryOfOriginal = (retries: number) => {
		facts = { [ORIGINAL_ID]: fact('trigger', null) };
		executionRepository.countRetries.mockResolvedValue(retries);
		ctx.mode = 'retry';
		ctx.retryOf = ORIGINAL_ID;
	};

	const fact = (mode: WorkflowExecuteMode, retryOf: string | null): RetryLink => ({
		workflowId: WORKFLOW_ID,
		workflowVersionId: 'version-1',
		mode,
		retryOf,
		retrySuccessId: null,
	});

	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
		globalConfig.executions.saveDataOnError = 'all';
		facts = {};
		durableScheduler.isActive.mockReturnValue(true);
		workflowRepository.findById.mockResolvedValue(
			mock<WorkflowEntity>({ id: WORKFLOW_ID, settings: { autoRetry: { enabled: true } } }),
		);
		executionRepository.findRetryLink.mockImplementation(
			async (executionId: string) => facts[executionId] ?? null,
		);
		executionRepository.countRetries.mockResolvedValue(0);
		ctx = {
			type: 'workflowExecuteAfter',
			workflow: { ...mock<IWorkflowBase>({ id: WORKFLOW_ID }), nodes: [], settings: {} },
			mode: 'trigger',
			runData: mock<IRun>({
				status: 'error',
				data: createRunExecutionData({ resultData: { error: httpError('503'), runData: {} } }),
			}),
			newStaticData: {},
			executionId: FAILED_ID,
			executedInThisProcess: true,
			endedByThisSave: true,
		};
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('schedules a retry 10 s out for a failed trigger run with a 503', async () => {
		await service.onWorkflowExecuteAfter(ctx);

		expect(provisioner.provision).toHaveBeenCalledWith({
			owner: owner.member(WORKFLOW_ID, `auto-retry:${FAILED_ID}`),
			taskType: 'execution-auto-retry',
			payload: { workflowId: WORKFLOW_ID, executionId: FAILED_ID },
			desired: [
				{
					name: `auto-retry:${WORKFLOW_ID}:${FAILED_ID}`,
					schedule: { kind: 'one_off', fireAt: secondsFromNow(10) },
					firstRunAt: secondsFromNow(10),
				},
			],
			misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
		});
	});

	it('schedules a retry for a queue-mode run that a worker executed', async () => {
		ctx.executedInThisProcess = false;

		await service.onWorkflowExecuteAfter(ctx);

		expect(provisioner.provision).toHaveBeenCalledWith(
			expect.objectContaining({
				desired: [expect.objectContaining({ firstRunAt: secondsFromNow(10) })],
			}),
		);
	});

	it('schedules a retry for the stored copy of a refused connection', async () => {
		const refused = new NodeApiError(
			node,
			Object.assign(new Error('connect ECONNREFUSED'), {
				code: 'ECONNREFUSED',
			}) as unknown as JsonObject,
		);
		ctx.runData.data.resultData.error = {
			...refused,
			message: refused.message,
			stack: refused.stack,
		} as NodeApiError;

		await service.onWorkflowExecuteAfter(ctx);

		expect(provisioner.provision).toHaveBeenCalledWith(
			expect.objectContaining({
				desired: [expect.objectContaining({ firstRunAt: secondsFromNow(10) })],
			}),
		);
	});

	const NO_RETRY_CASES: Array<[string, () => void]> = [
		[
			'the setting is off',
			() =>
				workflowRepository.findById.mockResolvedValue(
					mock<WorkflowEntity>({ settings: { autoRetry: { enabled: false } } }),
				),
		],
		[
			'the setting is missing',
			() => workflowRepository.findById.mockResolvedValue(mock<WorkflowEntity>({ settings: {} })),
		],
		['the run succeeded', () => (ctx.runData.status = 'success')],
		['the run crashed', () => (ctx.runData.status = 'crashed')],
		['the error is a 401', () => (ctx.runData.data.resultData.error = httpError('401'))],
		[
			'the error has no status',
			() => (ctx.runData.data.resultData.error = new NodeApiError(node, {})),
		],
		['the root run is manual', () => (ctx.mode = 'manual')],
		['the root run is a chat', () => (ctx.mode = 'chat')],
		[
			'error runs are not saved',
			() => (ctx.workflow.settings = { saveDataErrorExecution: 'none' }),
		],
		['the durable scheduler is inactive', () => durableScheduler.isActive.mockReturnValue(false)],
		['the original run already has 4 retries', () => failedRetryOfOriginal(4)],
		[
			'the original run is manual',
			() => {
				failedRetryOfOriginal(1);
				facts[ORIGINAL_ID] = fact('manual', null);
			},
		],
		[
			'the original run is gone',
			() => {
				failedRetryOfOriginal(1);
				delete facts[ORIGINAL_ID];
			},
		],
	];

	it.each(NO_RETRY_CASES)('schedules no retry when %s', async (_name, arrange) => {
		arrange();

		await service.onWorkflowExecuteAfter(ctx);

		expect(provisioner.provision).not.toHaveBeenCalled();
	});

	it.each([1, 2, 3])(
		'retries the original run again, 10 s out, after its retry %i failed',
		async (retries) => {
			failedRetryOfOriginal(retries);

			await service.onWorkflowExecuteAfter(ctx);

			expect(provisioner.provision).toHaveBeenCalledWith(
				expect.objectContaining({
					owner: owner.member(WORKFLOW_ID, `auto-retry:${ORIGINAL_ID}`),
					payload: { workflowId: WORKFLOW_ID, executionId: ORIGINAL_ID },
					desired: [expect.objectContaining({ firstRunAt: secondsFromNow(10) })],
				}),
			);
		},
	);

	it('does not fail the run when removing the parent job fails', async () => {
		failedRetryOfOriginal(1);
		provisioner.deprovisionOwnerMember.mockRejectedValue(new Error('SQLITE_BUSY'));

		await expect(service.onWorkflowExecuteAfter(ctx)).resolves.toBeUndefined();
	});

	it('retries the original run when a retry that resumed from a wait fails', async () => {
		facts = {
			[ORIGINAL_ID]: fact('trigger', null),
			[FAILED_ID]: fact('retry', ORIGINAL_ID),
		};
		executionRepository.countRetries.mockResolvedValue(1);
		ctx.mode = 'retry';
		ctx.retryOf = undefined;

		await service.onWorkflowExecuteAfter(ctx);

		expect(provisioner.provision).toHaveBeenCalledWith(
			expect.objectContaining({
				payload: { workflowId: WORKFLOW_ID, executionId: ORIGINAL_ID },
			}),
		);
	});

	it.each(['success', 'error'] as const)(
		'removes the job that started a retry run when it ends with %s',
		async (status) => {
			failedRetryOfOriginal(1);
			ctx.runData.status = status;

			await service.onWorkflowExecuteAfter(ctx);

			expect(provisioner.deprovisionOwnerMember).toHaveBeenCalledWith(
				owner.member(WORKFLOW_ID, `auto-retry:${ORIGINAL_ID}`),
			);
		},
	);
});
