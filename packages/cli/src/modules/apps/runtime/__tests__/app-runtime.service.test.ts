import type { Logger } from '@n8n/backend-common';
import type { WorkflowEntity } from '@n8n/db';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import {
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	type IExecuteResponsePromiseData,
	type INode,
	type IRun,
	type IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import { WorkflowToolUnavailableError } from '@/modules/agents/tools/workflow-tool-unavailable-error';
import type { WorkflowToolWorkflowLoader } from '@/modules/agents/tools/workflow-tool-workflow-loader.service';
import type { WebhookResponseRelay } from '@/scaling/webhook-response-relay';
import type { WorkflowRunner } from '@/workflow-runner';

import type { App } from '../../app.entity';
import type { AppRepository } from '../../app.repository';
import type { AppsConfig } from '../../apps.config';
import { AppRuntimeError } from '../app-runtime.error';
import { AppRuntimeService } from '../app-runtime.service';

const triggerNode: INode = {
	id: 'trigger',
	name: 'When Executed by Another Workflow',
	type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	typeVersion: 1.1,
	position: [0, 0],
	parameters: {
		inputSource: 'workflowInputs',
		workflowInputs: {
			values: [
				{ name: 'message', type: 'string' },
				{ name: 'count', type: 'number' },
			],
		},
	},
};

const workflow = (overrides: Partial<WorkflowEntity> = {}): WorkflowEntity =>
	({
		id: 'wf-1',
		name: 'Echo',
		nodes: [triggerNode],
		connections: {},
		...overrides,
	}) as WorkflowEntity;

const app = {
	id: 'app-1',
	namespace: 'runner',
	projectId: 'proj-1',
	bindings: [{ key: 'submit', kind: 'workflow', workflowId: 'wf-1' }],
} as unknown as App;

const failedRun = (lastNodeExecuted: string, message: string): IRun =>
	({
		status: 'error',
		data: {
			resultData: {
				runData: {
					[triggerNode.name]: [{ data: { main: [[{ json: { message: 'hi' } }]] } }],
				},
				lastNodeExecuted,
				error: { message },
			},
		},
	}) as unknown as IRun;

const finishedRun = (lastNodeItems: unknown[]): IRun =>
	({
		status: 'success',
		data: {
			resultData: {
				runData: {
					[triggerNode.name]: [{ data: { main: [[{ json: { message: 'hi' } }]] } }],
					Set: [{ data: { main: [lastNodeItems.map((json) => ({ json }))] } }],
				},
			},
		},
	}) as unknown as IRun;

const expectRuntimeError = async (
	promise: Promise<unknown>,
	status: number,
	code: AppRuntimeError['code'],
) => {
	const error = await promise.catch((e: unknown) => e);
	expect(error).toBeInstanceOf(AppRuntimeError);
	expect(error).toMatchObject({ status, code });
	return error as AppRuntimeError;
};

describe('AppRuntimeService', () => {
	let appRepository: ReturnType<typeof mock<AppRepository>>;
	let workflowLoader: ReturnType<typeof mock<WorkflowToolWorkflowLoader>>;
	let subworkflowPolicyChecker: ReturnType<typeof mock<SubworkflowPolicyChecker>>;
	let workflowRunner: ReturnType<typeof mock<WorkflowRunner>>;
	let activeExecutions: ReturnType<typeof mock<ActiveExecutions>>;
	let relay: ReturnType<typeof mock<WebhookResponseRelay>>;
	let executionPersistence: ReturnType<typeof mock<ExecutionPersistence>>;
	let logger: ReturnType<typeof mock<Logger>>;
	let appsConfig: AppsConfig;
	let service: AppRuntimeService;

	beforeEach(() => {
		appRepository = mock<AppRepository>();
		workflowLoader = mock<WorkflowToolWorkflowLoader>();
		subworkflowPolicyChecker = mock<SubworkflowPolicyChecker>();
		workflowRunner = mock<WorkflowRunner>();
		activeExecutions = mock<ActiveExecutions>();
		relay = mock<WebhookResponseRelay>();
		executionPersistence = mock<ExecutionPersistence>();
		logger = mock<Logger>();
		appsConfig = { runtimeRateLimit: 60, runtimeMaxConcurrent: 10 };
		service = new AppRuntimeService(
			appRepository,
			workflowLoader,
			subworkflowPolicyChecker,
			workflowRunner,
			activeExecutions,
			relay,
			executionPersistence,
			logger,
			appsConfig,
		);

		appRepository.findByNamespace.mockResolvedValue(app);
		workflowLoader.loadWorkflow.mockResolvedValue(workflow());
		subworkflowPolicyChecker.checkForProject.mockResolvedValue(undefined);
		workflowRunner.run.mockResolvedValue('exec-1');
		activeExecutions.has.mockReturnValue(true);
		activeExecutions.getPostExecutePromise.mockResolvedValue(finishedRun([{ reply: 'got hi' }]));
		relay.restoreOffloadedBody.mockImplementation(async (response) => response);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('resolution', () => {
		it('returns app_not_found for an unknown namespace', async () => {
			appRepository.findByNamespace.mockResolvedValue(null);

			await expectRuntimeError(service.runWorkflow('nobody', 'submit', {}), 404, 'app_not_found');
			expect(workflowLoader.loadWorkflow).not.toHaveBeenCalled();
		});

		it('returns binding_not_found for a key the app has not bound', async () => {
			await expectRuntimeError(service.runWorkflow('runner', 'nope', {}), 404, 'binding_not_found');
			expect(workflowLoader.loadWorkflow).not.toHaveBeenCalled();
		});

		it('loads the published version of the bound workflow as the app project', async () => {
			await service.runWorkflow('runner', 'submit', {});

			expect(workflowLoader.loadWorkflow).toHaveBeenCalledWith(
				'proj-1',
				{ workflowId: 'wf-1', workflowName: '' },
				{ usePublishedVersion: true },
			);
		});

		it('returns workflow_not_found when the workflow left the project', async () => {
			workflowLoader.loadWorkflow.mockResolvedValue(null);

			await expectRuntimeError(
				service.runWorkflow('runner', 'submit', {}),
				404,
				'workflow_not_found',
			);
		});

		it('returns workflow_not_published when the workflow has no published version', async () => {
			workflowLoader.loadWorkflow.mockRejectedValue(
				new WorkflowToolUnavailableError('not_published', 'not published'),
			);

			await expectRuntimeError(
				service.runWorkflow('runner', 'submit', {}),
				409,
				'workflow_not_published',
			);
		});

		it('returns workflow_incompatible when the workflow contains a Form node', async () => {
			workflowLoader.loadWorkflow.mockResolvedValue(
				workflow({
					nodes: [
						triggerNode,
						{ ...triggerNode, id: 'form', name: 'Form', type: 'n8n-nodes-base.form' },
					],
					connections: {
						[triggerNode.name]: { main: [[{ node: 'Form', type: 'main', index: 0 }]] },
					},
				}),
			);

			await expectRuntimeError(
				service.runWorkflow('runner', 'submit', {}),
				409,
				'workflow_incompatible',
			);
			expect(workflowRunner.run).not.toHaveBeenCalled();
		});

		it('returns workflow_not_callable when the caller policy denies the app project', async () => {
			subworkflowPolicyChecker.checkForProject.mockRejectedValue(
				new SubworkflowPolicyDenialError({
					subworkflowId: 'wf-1',
					subworkflowProject: { id: 'other', name: 'Other', type: 'team' },
					instanceUrl: 'http://n8n',
					hasReadAccess: false,
				} as ConstructorParameters<typeof SubworkflowPolicyDenialError>[0]),
			);

			await expectRuntimeError(
				service.runWorkflow('runner', 'submit', {}),
				403,
				'workflow_not_callable',
			);
			expect(subworkflowPolicyChecker.checkForProject).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'wf-1' }),
				'proj-1',
			);
			expect(workflowRunner.run).not.toHaveBeenCalled();
		});

		it('returns invalid_input with issues when the body does not match the trigger fields', async () => {
			const error = await expectRuntimeError(
				service.runWorkflow('runner', 'submit', { count: 'many' }),
				400,
				'invalid_input',
			);

			expect(error.issues).toEqual([{ path: ['count'], code: 'invalid_type' }]);
			expect(workflowRunner.run).not.toHaveBeenCalled();
		});

		it('returns invalid_input for a body that is not an object', async () => {
			await expectRuntimeError(service.runWorkflow('runner', 'submit', [1]), 400, 'invalid_input');
			await expectRuntimeError(
				service.runWorkflow('runner', 'submit', 'text'),
				400,
				'invalid_input',
			);
		});
	});

	describe('execution', () => {
		it('pins the parsed input on the trigger and runs in integrated mode', async () => {
			await service.runWorkflow('runner', 'submit', { message: 'hi', count: '3' });

			const runData = workflowRunner.run.mock.calls[0][0];
			expect(runData.executionMode).toBe('integrated');
			expect(runData.startNodes).toEqual([{ name: triggerNode.name, sourceData: null }]);
			expect(runData.pinData).toEqual({
				[triggerNode.name]: [{ json: { message: 'hi', count: 3 } }],
			});
			expect(runData.executionData?.executionData?.nodeExecutionStack[0].node).toBe(triggerNode);
		});

		it('returns the last node items as output with principal null', async () => {
			const result = await service.runWorkflow('runner', 'submit', { message: 'hi' });

			expect(result).toEqual({
				executionId: 'exec-1',
				status: 'success',
				output: [{ reply: 'got hi' }],
				error: undefined,
				principal: null,
			});
		});

		it('prefers a Respond to Webhook body over the last node items', async () => {
			const relayed: IExecuteResponsePromiseData = {
				body: { binaryData: { id: 'database:abc' } },
				headers: {},
				statusCode: 200,
			};
			workflowRunner.run.mockImplementation(
				async (
					_runData: IWorkflowExecutionDataProcess,
					_loadStaticData?: boolean,
					_realtime?: boolean,
					_existing?: unknown,
					responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
				) => {
					responsePromise?.resolve(relayed);
					return 'exec-1';
				},
			);
			relay.restoreOffloadedBody.mockResolvedValue({
				body: { reply: 'from respond node' },
				headers: {},
				statusCode: 200,
			});

			const result = await service.runWorkflow('runner', 'submit', { message: 'hi' });

			expect(relay.restoreOffloadedBody).toHaveBeenCalledWith(relayed, {
				reclaim: true,
				context: { workflowId: 'wf-1', executionId: 'exec-1' },
			});
			expect(result).toMatchObject({ status: 'success', output: { reply: 'from respond node' } });
		});

		it('reports a binary Respond to Webhook body as truncated', async () => {
			workflowRunner.run.mockImplementation(
				async (
					_runData: IWorkflowExecutionDataProcess,
					_loadStaticData?: boolean,
					_realtime?: boolean,
					_existing?: unknown,
					responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
				) => {
					responsePromise?.resolve({ body: Buffer.from('pdf'), headers: {}, statusCode: 200 });
					return 'exec-1';
				},
			);

			const result = await service.runWorkflow('runner', 'submit', { message: 'hi' });

			expect(result).toMatchObject({ status: 'success', output: null, outputTruncated: true });
		});

		it('replaces the error of a failed node with a generic message and logs the original', async () => {
			workflowLoader.loadWorkflow.mockResolvedValue(
				workflow({
					nodes: [triggerNode, { ...triggerNode, name: 'Set', type: 'n8n-nodes-base.set' }],
				}),
			);
			activeExecutions.getPostExecutePromise.mockResolvedValue(
				failedRun('Set', 'connect ECONNREFUSED 10.1.2.3:5432'),
			);

			const result = await service.runWorkflow('runner', 'submit', { message: 'hi' });

			expect(result).toEqual({
				executionId: 'exec-1',
				status: 'error',
				error: 'The workflow failed.',
				output: [],
				principal: null,
			});
			expect(logger.warn).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					appId: 'app-1',
					namespace: 'runner',
					key: 'submit',
					executionId: 'exec-1',
					error: 'connect ECONNREFUSED 10.1.2.3:5432',
				}),
			);
		});

		it('keeps the message of a Stop and Error node', async () => {
			workflowLoader.loadWorkflow.mockResolvedValue(
				workflow({
					nodes: [
						triggerNode,
						{ ...triggerNode, name: 'Stop', type: 'n8n-nodes-base.stopAndError' },
					],
				}),
			);
			activeExecutions.getPostExecutePromise.mockResolvedValue(
				failedRun('Stop', 'Amount must be positive'),
			);

			const result = await service.runWorkflow('runner', 'submit', { message: 'hi' });

			expect(result).toMatchObject({
				status: 'error',
				error: 'Amount must be positive',
				output: [],
			});
		});

		it('reads a run that already left the active set from the database', async () => {
			activeExecutions.has.mockReturnValue(false);
			executionPersistence.findSingleExecution.mockResolvedValue(undefined);

			const result = await service.runWorkflow('runner', 'submit', { message: 'hi' });

			expect(executionPersistence.findSingleExecution).toHaveBeenCalledWith('exec-1', {
				includeData: true,
				unflattenData: true,
			});
			expect(result).toEqual({
				executionId: 'exec-1',
				status: 'unknown',
				output: [],
				principal: null,
			});
		});

		it('answers running after 60 s and leaves the execution alone', async () => {
			vi.useFakeTimers();
			activeExecutions.getPostExecutePromise.mockReturnValue(new Promise<IRun>(() => {}));

			const pending = service.runWorkflow('runner', 'submit', { message: 'hi' });
			await vi.advanceTimersByTimeAsync(60_000);

			expect(await pending).toEqual({ executionId: 'exec-1', status: 'running', principal: null });
			expect(activeExecutions.stopExecution).not.toHaveBeenCalled();
		});

		it('answers 429 too_many_requests without starting a run once the cap is reached', async () => {
			vi.useFakeTimers();
			appsConfig.runtimeMaxConcurrent = 1;
			activeExecutions.getPostExecutePromise.mockReturnValue(new Promise<IRun>(() => {}));

			const first = service.runWorkflow('runner', 'submit', { message: 'hi' });
			await vi.advanceTimersByTimeAsync(0);
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);

			await expectRuntimeError(
				service.runWorkflow('runner', 'submit', { message: 'hi' }),
				429,
				'too_many_requests',
			);
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(60_000);
			expect(await first).toMatchObject({ status: 'running' });
		});

		it('releases the slot when the run completes', async () => {
			appsConfig.runtimeMaxConcurrent = 1;

			await service.runWorkflow('runner', 'submit', { message: 'hi' });
			const result = await service.runWorkflow('runner', 'submit', { message: 'hi' });

			expect(result).toMatchObject({ status: 'success' });
			expect(workflowRunner.run).toHaveBeenCalledTimes(2);
		});

		it('releases the slot when the call answers running after 60 s', async () => {
			vi.useFakeTimers();
			appsConfig.runtimeMaxConcurrent = 1;
			activeExecutions.getPostExecutePromise.mockReturnValue(new Promise<IRun>(() => {}));

			const first = service.runWorkflow('runner', 'submit', { message: 'hi' });
			await vi.advanceTimersByTimeAsync(60_000);
			expect(await first).toMatchObject({ status: 'running' });

			activeExecutions.getPostExecutePromise.mockResolvedValue(finishedRun([{ reply: 'late' }]));
			const second = await service.runWorkflow('runner', 'submit', { message: 'hi' });

			expect(second).toMatchObject({ status: 'success' });
			expect(workflowRunner.run).toHaveBeenCalledTimes(2);
		});

		it('does not answer running before the 60 s are over', async () => {
			vi.useFakeTimers();
			let finish: (run: IRun) => void = () => {};
			activeExecutions.getPostExecutePromise.mockReturnValue(
				new Promise<IRun>((resolve) => {
					finish = resolve;
				}),
			);

			const pending = service.runWorkflow('runner', 'submit', { message: 'hi' });
			await vi.advanceTimersByTimeAsync(59_000);
			finish(finishedRun([{ reply: 'late' }]));

			expect(await pending).toMatchObject({ status: 'success', output: [{ reply: 'late' }] });
		});
	});
});
