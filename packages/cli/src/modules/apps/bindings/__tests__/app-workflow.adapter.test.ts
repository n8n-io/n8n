import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { AppCallContext, AppsConfig } from '@n8n/backend-module-apps';
import type { GlobalConfig } from '@n8n/config';
import type { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { CredentialCheckResult, IRun } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { CredentialCheckProxyService } from '@/modules/dynamic-credentials.ee/services/credential-check-proxy.service';
import type { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import { CallableWorkflowUnavailableError } from '@/workflows/callable/callable-workflow-unavailable.error';
import type { CallableWorkflowLoader } from '@/workflows/callable/callable-workflow-loader.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowRunner } from '@/workflow-runner';

import { AppWorkflowAdapter } from '../app-workflow.adapter';

vi.mock('@/modules/dynamic-credentials.ee/services/credential-check-proxy.service', () => ({
	CredentialCheckProxyService: class {},
}));

const ctx: AppCallContext = {
	appId: 'app-1',
	namespace: 'crm',
	projectId: 'project-1',
	bindingKey: 'submit',
	userId: 'user-1',
};

const nodes = [
	{ name: 'Start', type: 'n8n-nodes-base.executeWorkflowTrigger' },
	{ name: 'Fail', type: 'n8n-nodes-base.stopAndError' },
	{ name: 'Query', type: 'n8n-nodes-base.postgres' },
];

function execution(overrides: {
	status?: string;
	metadata?: Record<string, string>;
	lastNodeExecuted?: string;
	error?: string;
	runData?: Record<string, unknown>;
}) {
	return {
		workflowId: 'workflow-1',
		status: overrides.status ?? 'error',
		workflowData: { nodes },
		data: {
			resultData: {
				runData: overrides.runData ?? {},
				lastNodeExecuted: overrides.lastNodeExecuted ?? 'Query',
				error: overrides.error ? { message: overrides.error } : undefined,
				metadata: overrides.metadata ?? {
					appId: 'app-1',
					appBindingKey: 'submit',
					appVisitor: 'user:user-1',
				},
			},
		},
	};
}

function setup({ maxRuns = 20, waitMs = 60_000, dynamicCredentials = false } = {}) {
	const loader = mock<CallableWorkflowLoader>();
	const executions = mock<ExecutionPersistence>();
	const runner = mock<WorkflowRunner>();
	const finder = mock<WorkflowFinderService>();
	const activeExecutions = mock<ActiveExecutions>();
	activeExecutions.has.mockReturnValue(false);
	const logger = mock<Logger>();
	const moduleRegistry = mock<ModuleRegistry>();
	moduleRegistry.isActive.mockImplementation(
		(name) => dynamicCredentials && name === 'dynamic-credentials',
	);
	const credentialCheck = mock<CredentialCheckProxyService>();
	Container.set(CredentialCheckProxyService, credentialCheck);
	const adapter = new AppWorkflowAdapter(
		loader,
		finder,
		mock<SubworkflowPolicyChecker>(),
		runner,
		activeExecutions,
		executions,
		mock<AppsConfig>({ apiMaxConcurrentRuns: maxRuns, apiRunWaitMs: waitMs }),
		mock<GlobalConfig>(),
		logger,
		moduleRegistry,
	);
	return { adapter, loader, executions, runner, finder, activeExecutions, logger, credentialCheck };
}

const passthroughTrigger = {
	name: 'Start',
	type: 'n8n-nodes-base.executeWorkflowTrigger',
	typeVersion: 1.1,
	position: [0, 0],
	parameters: { inputSource: 'passthrough' },
};

function workflow(overrides: Record<string, unknown> = {}) {
	return {
		id: 'workflow-1',
		name: 'Flow',
		nodes: [passthroughTrigger],
		connections: {},
		settings: {},
		shared: [{ role: 'workflow:owner', projectId: 'project-1' }],
		...overrides,
	} as unknown as WorkflowEntity;
}

const queryRunData = {
	Query: [{ data: { main: [[{ json: { id: 1, ok: true } }]] } }],
};

describe('AppWorkflowAdapter', () => {
	describe('getRun', () => {
		it.each([
			['another visitor', { appId: 'app-1', appBindingKey: 'submit', appVisitor: 'user:user-2' }],
			['another binding', { appId: 'app-1', appBindingKey: 'other', appVisitor: 'user:user-1' }],
			['another app', { appId: 'app-2', appBindingKey: 'submit', appVisitor: 'user:user-1' }],
		])('hides a run that %s started', async (_, metadata) => {
			const { adapter, executions } = setup();
			executions.findSingleExecution.mockResolvedValue(execution({ metadata }) as never);

			await expect(adapter.getRun(ctx, 'workflow-1', '12')).rejects.toMatchObject({
				code: 'run_not_found',
			});
		});

		it('rejects an execution ID that is not a number', async () => {
			const { adapter, executions } = setup();

			await expect(adapter.getRun(ctx, 'workflow-1', '../12')).rejects.toMatchObject({
				code: 'run_not_found',
			});
			expect(executions.findSingleExecution).not.toHaveBeenCalled();
		});

		it('reports a run that is still in progress', async () => {
			const { adapter, executions } = setup();
			executions.findSingleExecution.mockResolvedValue(execution({ status: 'running' }) as never);

			expect(await adapter.getRun(ctx, 'workflow-1', '12')).toEqual({
				executionId: '12',
				status: 'running',
			});
		});

		it('does not report a run in an unknown state as a success', async () => {
			const { adapter, executions } = setup();
			executions.findSingleExecution.mockResolvedValue(
				execution({ status: 'unknown', runData: queryRunData }) as never,
			);

			expect(await adapter.getRun(ctx, 'workflow-1', '12')).toEqual({
				executionId: '12',
				status: 'unknown',
				output: [],
			});
		});

		it('hides the error text of a private node from the visitor and the log', async () => {
			const { adapter, executions, logger } = setup();
			const rawError = 'password authentication failed for user "admin"';
			executions.findSingleExecution.mockResolvedValue(execution({ error: rawError }) as never);

			expect(await adapter.getRun(ctx, 'workflow-1', '12')).toEqual({
				executionId: '12',
				status: 'error',
				output: [],
				error: 'The workflow failed.',
			});
			expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(rawError);
		});

		it('shows the message of a Stop and Error node', async () => {
			const { adapter, executions } = setup();
			executions.findSingleExecution.mockResolvedValue(
				execution({ lastNodeExecuted: 'Fail', error: 'The email is already registered.' }) as never,
			);

			expect(await adapter.getRun(ctx, 'workflow-1', '12')).toMatchObject({
				error: 'The email is already registered.',
			});
		});
	});

	describe('run', () => {
		it('refuses an unpublished workflow', async () => {
			const { adapter, loader } = setup();
			loader.loadWorkflow.mockRejectedValue(
				new CallableWorkflowUnavailableError('not_published', 'Not published'),
			);

			await expect(adapter.run(ctx, 'workflow-1', {})).rejects.toMatchObject({
				code: 'workflow_not_published',
			});
		});

		it.each([
			['not_published', 409, 'workflow_not_published'],
			['not_found', 404, 'resource_missing'],
			['incompatible', 409, 'workflow_incompatible'],
		] as const)('answers a workflow that is %s with %i %s', async (reason, status, code) => {
			const { adapter, loader } = setup();
			loader.loadWorkflow.mockRejectedValue(
				new CallableWorkflowUnavailableError(reason, 'Workflow "Private flow" is unavailable'),
			);

			const error: unknown = await adapter.run(ctx, 'workflow-1', {}).catch((e) => e);

			expect(error).toMatchObject({ status, code });
			expect(String((error as Error).message)).not.toContain('Private flow');
		});

		it('refuses a workflow that left the project', async () => {
			const { adapter, loader } = setup();
			loader.loadWorkflow.mockResolvedValue(null);

			await expect(adapter.run(ctx, 'workflow-1', {})).rejects.toMatchObject({
				code: 'resource_missing',
			});
			expect(loader.loadWorkflow).toHaveBeenCalledWith(
				'project-1',
				{ workflowId: 'workflow-1', workflowName: '' },
				{ usePublishedVersion: true },
			);
		});

		it('refuses a workflow without a supported trigger', async () => {
			const { adapter, loader } = setup();
			loader.loadWorkflow.mockResolvedValue(
				mock<WorkflowEntity>({ name: 'Flow', nodes: [], connections: {} }),
			);

			await expect(adapter.run(ctx, 'workflow-1', {})).rejects.toMatchObject({
				code: 'workflow_incompatible',
			});
		});

		it('saves execution data even when the workflow settings prune it', async () => {
			const { adapter, loader, runner } = setup();
			loader.loadWorkflow.mockResolvedValue({
				id: 'workflow-1',
				name: 'Flow',
				nodes: [
					{
						name: 'Start',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						typeVersion: 1.1,
						position: [0, 0],
						parameters: { inputSource: 'passthrough' },
					},
				],
				connections: {},
				settings: { saveDataSuccessExecution: 'none', saveDataErrorExecution: 'none' },
			} as unknown as WorkflowEntity);
			runner.run.mockResolvedValue('12');

			await adapter.run(ctx, 'workflow-1', {});

			expect(runner.run.mock.calls[0][0].workflowData.settings).toMatchObject({
				saveDataSuccessExecution: 'all',
				saveDataErrorExecution: 'all',
			});
		});

		it('runs with the sealed identity of the visitor', async () => {
			const { adapter, loader, runner } = setup();
			loader.loadWorkflow.mockResolvedValue(workflow());
			runner.run.mockResolvedValue('12');

			await adapter.run({ ...ctx, runnerIdentity: 'sealed-identity' }, 'workflow-1', {});

			expect(runner.run.mock.calls[0][0].encryptedRunnerIdentity).toBe('sealed-identity');
		});

		it('runs without an identity when the visitor has no sealed identity', async () => {
			const { adapter, loader, runner } = setup();
			loader.loadWorkflow.mockResolvedValue(workflow());
			runner.run.mockResolvedValue('12');

			await adapter.run(ctx, 'workflow-1', {});

			expect(runner.run.mock.calls[0][0].encryptedRunnerIdentity).toBeUndefined();
		});

		describe('end-user credentials', () => {
			const visitor = { ...ctx, runnerIdentity: 'sealed-identity' };
			const action = {
				name: 'Fetch',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				position: [0, 0],
				parameters: {},
			};
			const unreachable = { ...action, name: 'Other' };
			const gatedWorkflow = () =>
				workflow({
					nodes: [passthroughTrigger, action, unreachable],
					connections: { Start: { main: [[{ node: 'Fetch', type: 'main', index: 0 }]] } },
				});
			const notReady: CredentialCheckResult = {
				readyToExecute: false,
				credentials: [
					{
						credentialId: 'cred-1',
						credentialName: 'GitHub',
						credentialType: 'githubOAuth2Api',
						resolverId: 'resolver-1',
						status: 'missing',
						authorizationUrl: 'https://n8n.test/rest/credentials/cred-1/authorize?token=t',
						iconUrl: 'https://n8n.test/icons/github.svg',
					},
					{
						credentialId: 'cred-2',
						credentialName: 'Slack',
						credentialType: 'slackOAuth2Api',
						resolverId: 'resolver-1',
						status: 'configured',
						revokeUrl: 'https://n8n.test/rest/credentials/cred-2/revoke',
					},
				],
			};

			it('refuses the run with connect links when the visitor has not connected a credential', async () => {
				const { adapter, loader, runner, credentialCheck } = setup({ dynamicCredentials: true });
				loader.loadWorkflow.mockResolvedValue(gatedWorkflow());
				credentialCheck.checkCredentialStatus.mockResolvedValue(notReady);

				const error = await adapter.run(visitor, 'workflow-1', {}).catch((e: unknown) => e);

				expect(error).toMatchObject({ status: 428, code: 'credentials_required' });
				expect((error as { toBody(): unknown }).toBody()).toEqual({
					code: 'credentials_required',
					message: 'Connect your accounts to run this workflow.',
					credentials: [
						{
							name: 'GitHub',
							type: 'githubOAuth2Api',
							status: 'missing',
							connectUrl: 'https://n8n.test/rest/credentials/cred-1/authorize?token=t',
							iconUrl: 'https://n8n.test/icons/github.svg',
						},
						{ name: 'Slack', type: 'slackOAuth2Api', status: 'configured' },
					],
				});
				expect(runner.run).not.toHaveBeenCalled();
			});

			it('checks only the nodes that the trigger can reach, as the visitor', async () => {
				const { adapter, loader, runner, credentialCheck } = setup({ dynamicCredentials: true });
				loader.loadWorkflow.mockResolvedValue(gatedWorkflow());
				credentialCheck.checkCredentialStatus.mockResolvedValue({
					readyToExecute: true,
					credentials: [],
				});
				runner.run.mockResolvedValue('12');

				await adapter.run(visitor, 'workflow-1', {});

				const [workflowId, context, options] = credentialCheck.checkCredentialStatus.mock.calls[0];
				expect(workflowId).toBe('workflow-1');
				expect(context).toEqual({ credentials: 'sealed-identity' });
				expect(options?.rootNodes?.map((node) => node.name).sort()).toEqual(['Fetch', 'Start']);
				expect(runner.run).toHaveBeenCalled();
			});

			it.each([
				['the dynamic credentials module is not active', visitor, false],
				['the visitor has no sealed identity', ctx, true],
			])('skips the check when %s', async (_, callContext, dynamicCredentials) => {
				const { adapter, loader, runner, credentialCheck } = setup({ dynamicCredentials });
				loader.loadWorkflow.mockResolvedValue(gatedWorkflow());
				runner.run.mockResolvedValue('12');

				await adapter.run(callContext, 'workflow-1', {});

				expect(credentialCheck.checkCredentialStatus).not.toHaveBeenCalled();
				expect(runner.run).toHaveBeenCalled();
			});
		});

		it('returns the items of the last node when the run succeeds', async () => {
			const { adapter, loader, runner, executions } = setup();
			loader.loadWorkflow.mockResolvedValue(workflow());
			runner.run.mockResolvedValue('12');
			executions.findSingleExecution.mockResolvedValue(
				execution({ status: 'success', runData: queryRunData }) as never,
			);

			expect(await adapter.run(ctx, 'workflow-1', { email: 'a@b.c' })).toEqual({
				executionId: '12',
				status: 'success',
				output: [{ id: 1, ok: true }],
			});
			expect(runner.run.mock.calls[0][0].pinData).toEqual({
				Start: [{ json: { email: 'a@b.c' } }],
			});
		});
	});

	describe('concurrency limit', () => {
		it('counts a run until the execution ends, also after the request stops waiting', async () => {
			const { adapter, loader, runner, activeExecutions } = setup({ maxRuns: 1, waitMs: 5 });
			loader.loadWorkflow.mockResolvedValue(workflow());
			runner.run.mockResolvedValueOnce('12').mockResolvedValueOnce('13');
			const finished = createDeferredPromise<IRun | undefined>();
			activeExecutions.has.mockReturnValue(true);
			activeExecutions.getPostExecutePromise.mockReturnValue(finished.promise);

			expect(await adapter.run(ctx, 'workflow-1', {})).toEqual({
				executionId: '12',
				status: 'running',
			});
			await expect(adapter.run(ctx, 'workflow-1', {})).rejects.toMatchObject({
				status: 429,
				code: 'too_many_requests',
			});
			expect(runner.run).toHaveBeenCalledTimes(1);

			finished.resolve(undefined);
			await finished.promise;
			await expect(adapter.run(ctx, 'workflow-1', {})).resolves.toMatchObject({
				executionId: '13',
			});
		});

		it('frees the slot when the execution does not start', async () => {
			const { adapter, loader, runner } = setup({ maxRuns: 1 });
			loader.loadWorkflow.mockResolvedValue(workflow());
			runner.run.mockRejectedValueOnce(new Error('queue full')).mockResolvedValueOnce('12');

			await expect(adapter.run(ctx, 'workflow-1', {})).rejects.toThrow('queue full');
			await expect(adapter.run(ctx, 'workflow-1', {})).resolves.toMatchObject({
				executionId: '12',
			});
		});
	});

	describe('getRun success', () => {
		it('returns the items of the last node', async () => {
			const { adapter, executions } = setup();
			executions.findSingleExecution.mockResolvedValue(
				execution({ status: 'success', runData: queryRunData }) as never,
			);

			expect(await adapter.getRun(ctx, 'workflow-1', '12')).toEqual({
				executionId: '12',
				status: 'success',
				output: [{ id: 1, ok: true }],
			});
		});
	});

	describe('assertCanBind', () => {
		const binding = { key: 'submit', kind: 'workflow' as const, workflowId: 'workflow-1' };

		it('accepts a workflow of the app project that the user can run', async () => {
			const { adapter, finder } = setup();
			finder.findWorkflowForUser.mockResolvedValue(workflow());

			await expect(adapter.assertCanBind(mock(), 'project-1', binding)).resolves.toBeUndefined();
			expect(finder.findWorkflowForUser).toHaveBeenCalledWith('workflow-1', expect.anything(), [
				'workflow:execute',
			]);
		});

		it('refuses a workflow that the user cannot run', async () => {
			const { adapter, finder } = setup();
			finder.findWorkflowForUser.mockResolvedValue(null);

			await expect(adapter.assertCanBind(mock(), 'project-1', binding)).rejects.toThrow(
				NotFoundError,
			);
		});

		it('refuses a workflow that another project owns', async () => {
			const { adapter, finder } = setup();
			finder.findWorkflowForUser.mockResolvedValue(
				workflow({ shared: [{ role: 'workflow:owner', projectId: 'project-2' }] }),
			);

			await expect(adapter.assertCanBind(mock(), 'project-1', binding)).rejects.toThrow(
				BadRequestError,
			);
		});

		it('refuses a workflow without a supported trigger', async () => {
			const { adapter, finder } = setup();
			finder.findWorkflowForUser.mockResolvedValue(workflow({ nodes: [] }));

			await expect(adapter.assertCanBind(mock(), 'project-1', binding)).rejects.toThrow(
				BadRequestError,
			);
		});
	});

	describe('describe', () => {
		const binding = { key: 'submit', kind: 'workflow' as const, workflowId: 'workflow-1' };

		it('describes a published workflow with open input and unknown output', async () => {
			const { adapter, loader, executions } = setup();
			loader.loadWorkflow.mockResolvedValue(workflow());
			executions.findMultipleExecutions.mockResolvedValue([]);

			expect(await adapter.describe('project-1', binding)).toEqual({
				...binding,
				name: 'Flow',
				published: true,
				input: { type: 'object', additionalProperties: true },
				output: { type: 'array', items: { type: 'object', additionalProperties: true } },
			});
		});

		it('infers the output from the last successful run', async () => {
			const { adapter, loader, executions } = setup();
			loader.loadWorkflow.mockResolvedValue(workflow());
			executions.findMultipleExecutions.mockResolvedValue([
				{ data: { resultData: { lastNodeExecuted: 'Query', runData: queryRunData } } },
			] as never);

			expect((await adapter.describe('project-1', binding))?.output).toEqual({
				type: 'array',
				items: {
					type: 'object',
					properties: { id: { type: 'number' }, ok: { type: 'boolean' } },
					required: ['id', 'ok'],
				},
			});
		});

		it('describes the draft of an unpublished workflow', async () => {
			const { adapter, loader, executions } = setup();
			loader.loadWorkflow
				.mockRejectedValueOnce(
					new CallableWorkflowUnavailableError('not_published', 'Not published'),
				)
				.mockResolvedValueOnce(workflow());
			executions.findMultipleExecutions.mockResolvedValue([]);

			expect(await adapter.describe('project-1', binding)).toMatchObject({ published: false });
		});

		it.each(['not_found', 'incompatible'] as const)(
			'describes a workflow that the loader reports as %s as null',
			async (reason) => {
				const { adapter, loader } = setup();
				loader.loadWorkflow.mockRejectedValue(
					new CallableWorkflowUnavailableError(reason, 'Unavailable'),
				);

				expect(await adapter.describe('project-1', binding)).toBeNull();
			},
		);

		it('describes a missing or incompatible workflow as null', async () => {
			const { adapter, loader } = setup();
			loader.loadWorkflow.mockResolvedValueOnce(null);
			expect(await adapter.describe('project-1', binding)).toBeNull();

			loader.loadWorkflow.mockResolvedValueOnce(workflow({ nodes: [] }));
			expect(await adapter.describe('project-1', binding)).toBeNull();
		});
	});
});
