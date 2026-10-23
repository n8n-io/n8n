import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig, InstanceAiConfig } from '@n8n/config';
import { SharedWorkflowRepository, type Project } from '@n8n/db';
import type { WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { InstanceSettings } from 'n8n-core';
import { createRunExecutionData, type IRun, type IWorkflowBase } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { Publisher } from '@/scaling/pubsub/publisher.service';

import { SelfHealingInvestigationService } from '../self-healing-investigation.service';
import { SelfHealingTriggerService } from '../self-healing-trigger.service';

vi.mock('../self-healing-investigation.service', () => ({
	SelfHealingInvestigationService: vi.fn(),
}));

describe('SelfHealingTriggerService', () => {
	const config = mockInstance(InstanceAiConfig, { workflowSuggestionsEnabled: true });
	const globalConfig = Container.get(GlobalConfig);
	const instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main' });
	const publisher = mockInstance(Publisher);
	const ownership = mockInstance(SharedWorkflowRepository);
	const logger = mockInstance(Logger);
	const investigations = mockInstance(SelfHealingInvestigationService);
	const service = new SelfHealingTriggerService(
		config,
		instanceSettings,
		publisher,
		ownership,
		logger,
	);
	let ctx: WorkflowExecuteAfterContext;

	beforeEach(() => {
		vi.resetAllMocks();
		config.workflowSuggestionsEnabled = true;
		Object.assign(instanceSettings, { instanceType: 'main' });
		globalConfig.executions.saveDataOnError = 'all';
		ownership.getWorkflowOwningProject.mockResolvedValue(mock<Project>({ id: 'project' }));

		ctx = {
			type: 'workflowExecuteAfter',
			workflow: { ...mock<IWorkflowBase>({ id: 'workflow' }), settings: {} },
			mode: 'trigger',
			runData: mock<IRun>({ status: 'error', data: createRunExecutionData({}) }),
			newStaticData: {},
			executionId: '42',
			executedInThisProcess: true,
		};
	});

	it.each(['trigger', 'webhook', 'chat'] as const)(
		'starts a saved %s failure on main',
		async (mode) => {
			ctx.mode = mode;

			await service.onWorkflowExecuteAfter(ctx);

			await vi.waitFor(() => {
				expect(investigations.start).toHaveBeenCalledWith({
					workflowId: 'workflow',
					executionId: '42',
					projectId: 'project',
				});
			});
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		},
	);

	it('returns on main while the owner lookup is pending', async () => {
		const project = createDeferredPromise<Project | undefined>();
		ownership.getWorkflowOwningProject.mockReturnValueOnce(project.promise);

		await expect(service.onWorkflowExecuteAfter(ctx)).resolves.toBeUndefined();

		expect(ownership.getWorkflowOwningProject).toHaveBeenCalledWith('workflow');
		expect(investigations.start).not.toHaveBeenCalled();
		project.resolve(undefined);
		await project.promise;
	});

	it('logs an admission rejection after the main hook returns', async () => {
		const admissionStarted = createDeferredPromise();
		const admission = createDeferredPromise<null>();
		investigations.start.mockImplementationOnce(async () => {
			admissionStarted.resolve();
			return await admission.promise;
		});

		await expect(service.onWorkflowExecuteAfter(ctx)).resolves.toBeUndefined();
		await admissionStarted.promise;
		expect(logger.warn).not.toHaveBeenCalled();

		const error = new Error('Admission unavailable');
		admission.reject(error);

		await vi.waitFor(() => {
			expect(logger.warn).toHaveBeenCalledWith(
				'Could not start self-healing after a production failure.',
				{ workflowId: 'workflow', executionId: '42', error },
			);
		});
	});

	it.each(['worker', 'webhook'] as const)(
		'waits for relay publication on %s',
		async (instanceType) => {
			Object.assign(instanceSettings, { instanceType });
			const publication = createDeferredPromise();
			publisher.publishCommand.mockReturnValueOnce(publication.promise);
			const completed = vi.fn();

			const completion = service.onWorkflowExecuteAfter(ctx).then(completed);
			await Promise.resolve();

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'self-healing-failure',
				payload: { workflowId: 'workflow', executionId: '42' },
			});
			expect(completed).not.toHaveBeenCalled();
			expect(ownership.getWorkflowOwningProject).not.toHaveBeenCalled();
			expect(investigations.start).not.toHaveBeenCalled();

			publication.resolve();
			await completion;
			expect(completed).toHaveBeenCalledOnce();
		},
	);

	it('skips the enqueuing main completion after a worker executes the workflow', async () => {
		ctx.executedInThisProcess = false;

		await service.onWorkflowExecuteAfter(ctx);

		expect(ownership.getWorkflowOwningProject).not.toHaveBeenCalled();
		expect(investigations.start).not.toHaveBeenCalled();
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('accepts a production crash reported through the existing recovery hook', async () => {
		ctx.runData.status = 'crashed';

		await service.onWorkflowExecuteAfter(ctx);

		await vi.waitFor(() => expect(investigations.start).toHaveBeenCalledOnce());
	});

	it.each([
		'manual',
		'evaluation',
		'retry',
		'integrated',
		'error',
		'internal',
		'cli',
		'agent',
	] as const)('skips %s executions', async (mode) => {
		ctx.mode = mode;

		await service.onWorkflowExecuteAfter(ctx);

		expect(ownership.getWorkflowOwningProject).not.toHaveBeenCalled();
	});

	it.each(['success', 'waiting', 'canceled', 'running'] as const)(
		'skips %s completions',
		async (status) => {
			ctx.runData.status = status;

			await service.onWorkflowExecuteAfter(ctx);

			expect(investigations.start).not.toHaveBeenCalled();
		},
	);

	it.each(['source', 'saved source', 'parent workflow', 'parent agent', 'retryOf'])(
		'skips a production-shaped execution with %s',
		async (origin) => {
			if (origin === 'source') {
				ctx.source = 'instance_ai';
			}
			if (origin === 'saved source') {
				ctx.runData.data.manualData = { source: 'instance_ai' };
			}
			if (origin === 'parent workflow') {
				ctx.runData.data.parentExecution = { executionId: 'parent', workflowId: 'parent' };
			}
			if (origin === 'parent agent') {
				ctx.runData.data.parentAgentRun = {
					agentId: 'agent',
					projectId: 'project',
					runId: 'run',
					threadId: 'thread',
					toolCallId: 'tool',
				};
			}
			if (origin === 'retryOf') {
				ctx.retryOf = '41';
			}

			await service.onWorkflowExecuteAfter(ctx);

			expect(ownership.getWorkflowOwningProject).not.toHaveBeenCalled();
		},
	);

	it.each([
		['all', undefined, true],
		['none', undefined, false],
		['all', 'none', false],
		['none', 'all', true],
		['all', 'DEFAULT', true],
		['none', 'DEFAULT', false],
	] as const)(
		'resolves instance=%s and workflow=%s saving settings',
		async (instance, workflow, allowed) => {
			globalConfig.executions.saveDataOnError = instance;
			ctx.workflow.settings = { saveDataErrorExecution: workflow };
			Object.assign(instanceSettings, { instanceType: 'worker' });

			await service.onWorkflowExecuteAfter(ctx);

			expect(publisher.publishCommand).toHaveBeenCalledTimes(allowed ? 1 : 0);
		},
	);

	it('relays only identifiers from an execution process without starting the Assistant locally', async () => {
		Object.assign(instanceSettings, { instanceType: 'worker' });

		await service.onWorkflowExecuteAfter(ctx);

		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'self-healing-failure',
			payload: { workflowId: 'workflow', executionId: '42' },
		});
		expect(ownership.getWorkflowOwningProject).not.toHaveBeenCalled();
		expect(investigations.start).not.toHaveBeenCalled();
	});

	it('checks the rollout flag for local completions and relayed failures', async () => {
		config.workflowSuggestionsEnabled = false;

		await service.onWorkflowExecuteAfter(ctx);
		await service.handleFailure({ workflowId: 'workflow', executionId: '42' });

		expect(ownership.getWorkflowOwningProject).not.toHaveBeenCalled();
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('ignores a workflow that no longer has an owning project', async () => {
		ownership.getWorkflowOwningProject.mockResolvedValue(undefined);

		await service.onWorkflowExecuteAfter(ctx);

		expect(investigations.start).not.toHaveBeenCalled();
	});

	it.each(['delivery', 'admission'] as const)(
		'keeps completion successful after a %s failure',
		async (stage) => {
			const error = new Error('Unavailable');
			if (stage === 'delivery') {
				Object.assign(instanceSettings, { instanceType: 'worker' });
				publisher.publishCommand.mockRejectedValue(error);
			} else {
				Object.assign(instanceSettings, { instanceType: 'main' });
				investigations.start.mockRejectedValue(error);
			}

			await expect(service.onWorkflowExecuteAfter(ctx)).resolves.toBeUndefined();

			await vi.waitFor(() => {
				expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
					workflowId: 'workflow',
					executionId: '42',
					error,
				});
			});
		},
	);
});
