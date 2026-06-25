/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { WorkflowsConfig } from '@n8n/config';
import type { WorkflowEntity, WorkflowHistory, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import {
	ActiveWorkflowTriggers,
	PollTriggerExecutor,
	ScheduledTaskManager,
	Tracing,
} from 'n8n-core';
import type {
	CronExpression,
	ExecutionError,
	INodeExecutionData,
	INode,
	INodeType,
	INodeTypes,
	IPollFunctions,
	IRun,
	IWorkflowExecuteAdditionalData,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { createDeferredPromise, sleep, Workflow, WorkflowActivationError } from 'n8n-workflow';

import type { ActivationErrorsService } from '@/activation-errors.service';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import type { EventService } from '@/events/event.service';
import type { ExecutionService } from '@/executions/execution.service';
import type { NodeTypes } from '@/node-types';
import type { Push } from '@/push';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';
import { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';

describe('ActiveWorkflowManager', () => {
	const WORKFLOW_SCHEDULE_GROUP_TYPE = 'workflow';
	const workflowGroup = (id: string) => ({ type: WORKFLOW_SCHEDULE_GROUP_TYPE, id });
	let activeWorkflowManager: ActiveWorkflowManager;
	const instanceSettings = mock<InstanceSettings>({ isMultiMain: false });
	const nodeTypes = mock<NodeTypes>();
	const workflowRepository = mock<WorkflowRepository>();
	const workflowsConfig = mock<WorkflowsConfig>({ useWorkflowPublicationService: false });

	beforeEach(() => {
		jest.clearAllMocks();
		activeWorkflowManager = new ActiveWorkflowManager(
			mockLogger(),
			mock(),
			mock(),
			mock(),
			nodeTypes,
			mock(),
			workflowRepository,
			mock(),
			mock(),
			mock(),
			instanceSettings,
			mock(),
			workflowsConfig,
			mock(),
			mock<TriggerExecutionContextFactory>(),
			mock(),
		);
	});

	describe('shouldAddWebhooks', () => {
		describe('if leader', () => {
			beforeAll(() => {
				Object.assign(instanceSettings, { isLeader: true, isFollower: false });
			});

			test('should return `true` for `init`', () => {
				// ensure webhooks are populated on init: https://github.com/n8n-io/n8n/pull/8830
				const result = activeWorkflowManager.shouldAddWebhooks('init');
				expect(result).toBe(true);
			});

			test('should return `true` for `leadershipChange`', () => {
				const result = activeWorkflowManager.shouldAddWebhooks('leadershipChange');
				expect(result).toBe(true);
			});

			test('should return `true` for `update` or `activate`', () => {
				const modes = ['update', 'activate'] as WorkflowActivateMode[];
				for (const mode of modes) {
					const result = activeWorkflowManager.shouldAddWebhooks(mode);
					expect(result).toBe(true);
				}
			});
		});

		describe('if follower', () => {
			beforeAll(() => {
				Object.assign(instanceSettings, { isLeader: false, isFollower: true });
			});

			test('should return `false` for `update` or `activate`', () => {
				const modes = ['update', 'activate'] as WorkflowActivateMode[];
				for (const mode of modes) {
					const result = activeWorkflowManager.shouldAddWebhooks(mode);
					expect(result).toBe(false);
				}
			});
		});

		describe('add', () => {
			test.each<[WorkflowActivateMode]>([['init'], ['leadershipChange']])(
				'should skip inactive workflow in `%s` activation mode',
				async (mode) => {
					const addWebhooksSpy = jest.spyOn(activeWorkflowManager, 'addWebhooks');
					const addNonWebhookTriggersSpy = jest.spyOn(
						activeWorkflowManager,
						'addNonWebhookTriggers',
					);
					workflowRepository.findById.mockResolvedValue(
						mock<WorkflowEntity>({ active: false, activeVersionId: null, activeVersion: null }),
					);

					const added = await activeWorkflowManager.add('some-id', mode);

					expect(addWebhooksSpy).not.toHaveBeenCalled();
					expect(addNonWebhookTriggersSpy).not.toHaveBeenCalled();
					expect(added).toEqual({ triggersAndPollers: false, webhooks: false });
				},
			);

			test.each<[WorkflowActivateMode]>([['init'], ['leadershipChange'], ['activate']])(
				'should skip archived workflow in `%s` activation mode',
				async (mode) => {
					const addWebhooksSpy = jest.spyOn(activeWorkflowManager, 'addWebhooks');
					const addNonWebhookTriggersSpy = jest.spyOn(
						activeWorkflowManager,
						'addNonWebhookTriggers',
					);
					workflowRepository.findById.mockResolvedValue(
						mock<WorkflowEntity>({
							id: 'archived-id',
							active: true,
							activeVersionId: 'v1',
							isArchived: true,
						}),
					);

					const added = await activeWorkflowManager.add('archived-id', mode);

					expect(addWebhooksSpy).not.toHaveBeenCalled();
					expect(addNonWebhookTriggersSpy).not.toHaveBeenCalled();
					expect(added).toEqual({ triggersAndPollers: false, webhooks: false });
				},
			);
		});
	});

	describe('addActiveWorkflows', () => {
		test('should prevent concurrent activations', async () => {
			const getAllActiveIds = jest.spyOn(workflowRepository, 'getAllActiveIds');

			workflowRepository.getAllActiveIds.mockImplementation(
				async () => await new Promise((resolve) => setTimeout(() => resolve(['workflow-1']), 50)),
			);

			await Promise.all([
				activeWorkflowManager.addActiveWorkflows('init'),
				activeWorkflowManager.addActiveWorkflows('leadershipChange'),
			]);

			expect(getAllActiveIds).toHaveBeenCalledTimes(1);
		});
	});

	describe('handleAddWebhooksAndNonWebhookTriggers', () => {
		const push = mock<Push>();
		const publisher = mock<Publisher>();

		beforeEach(() => {
			activeWorkflowManager = new ActiveWorkflowManager(
				mockLogger(),
				mock(),
				mock(),
				mock(),
				nodeTypes,
				mock(),
				workflowRepository,
				mock(),
				mock(),
				mock(),
				instanceSettings,
				publisher,
				mock(),
				push,
				mock<TriggerExecutionContextFactory>(),
				mock(),
			);
		});

		test('should include nodeId in broadcast when error has node', async () => {
			const triggerNode = mock<INode>({ id: 'node-123', name: 'Linear Trigger' });
			const activationError = new WorkflowActivationError('Invalid role: admin required', {
				node: triggerNode,
			});

			jest.spyOn(activeWorkflowManager, 'add').mockRejectedValue(activationError);

			await activeWorkflowManager.handleAddWebhooksAndNonWebhookTriggers({
				workflowId: 'wf-1',
				activeVersionId: 'v1',
				activationMode: 'activate',
			});

			expect(push.broadcast).toHaveBeenCalledWith({
				type: 'workflowFailedToActivate',
				data: {
					workflowId: 'wf-1',
					errorMessage: 'Invalid role: admin required',
					nodeId: 'node-123',
				},
			});

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'display-workflow-activation-error',
				payload: {
					workflowId: 'wf-1',
					errorMessage: 'Invalid role: admin required',
					nodeId: 'node-123',
				},
			});
		});

		test('should not include nodeId in broadcast when error has no node', async () => {
			jest.spyOn(activeWorkflowManager, 'add').mockRejectedValue(new Error('Some error'));

			await activeWorkflowManager.handleAddWebhooksAndNonWebhookTriggers({
				workflowId: 'wf-1',
				activeVersionId: 'v1',
				activationMode: 'activate',
			});

			expect(push.broadcast).toHaveBeenCalledWith({
				type: 'workflowFailedToActivate',
				data: { workflowId: 'wf-1', errorMessage: 'Some error' },
			});
		});
	});

	describe('activateWorkflow', () => {
		beforeEach(() => {
			// Set up as leader to allow workflow activation
			Object.assign(instanceSettings, { isLeader: true });
		});

		test('should use active version when calling executeErrorWorkflow on activation failure', async () => {
			// Create different nodes for draft vs active version
			const draftNodes = [
				{
					id: 'draft-node-1',
					name: 'Draft Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
				},
			];

			const activeNodes = [
				{
					id: 'active-node-1',
					name: 'Active Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
				},
			];

			const activeVersion = mock<WorkflowHistory>({
				versionId: 'v1',
				workflowId: 'workflow-1',
				nodes: activeNodes,
				connections: {},
				authors: 'test-user',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const workflowEntity = mock<WorkflowEntity>({
				id: 'workflow-1',
				name: 'Test Workflow',
				active: true,
				activeVersionId: activeVersion.versionId,
				nodes: draftNodes,
				connections: {},
				activeVersion,
			});

			workflowRepository.findById.mockResolvedValue(workflowEntity);

			// Mock the add method to throw an error (simulating activation failure)
			jest.spyOn(activeWorkflowManager, 'add').mockRejectedValue(new Error('Authorization failed'));

			const executeErrorWorkflowSpy = jest
				.spyOn(activeWorkflowManager, 'executeErrorWorkflow')
				.mockImplementation(() => {});

			await activeWorkflowManager['activateWorkflow']('workflow-1', 'init');

			expect(executeErrorWorkflowSpy).toHaveBeenCalled();

			// Get the workflow data that was passed to executeErrorWorkflow
			const callArgs = executeErrorWorkflowSpy.mock.calls[0];
			const workflowData = callArgs[1];

			expect(workflowData.nodes).toEqual(activeNodes);
			expect(workflowData.nodes[0].name).toBe('Active Webhook');
		});
	});

	describe('getExecuteTriggerFunctions / getExecutePollFunctions', () => {
		const workflowStaticDataService = mock<WorkflowStaticDataService>();
		const workflowExecutionService = mock<WorkflowExecutionService>();
		const eventService = mock<EventService>();
		const activeWorkflowTriggers = mock<ActiveWorkflowTriggers>();
		const activationErrorsService = mock<ActivationErrorsService>();
		const executionService = mock<ExecutionService>();
		let scopedLogger: Logger;

		let factory: TriggerExecutionContextFactory;

		beforeEach(() => {
			jest.clearAllMocks();
			workflowStaticDataService.saveStaticData.mockResolvedValue(undefined);
			workflowExecutionService.runWorkflow.mockResolvedValue('exec-123');
			activeWorkflowTriggers.remove.mockResolvedValue(true);
			activationErrorsService.register.mockResolvedValue(undefined);
			executionService.createErrorExecution.mockResolvedValue(undefined);

			scopedLogger = mock<Logger>();
			const rootLogger = mock<Logger>({ scoped: jest.fn().mockReturnValue(scopedLogger) });

			factory = new TriggerExecutionContextFactory(
				rootLogger,
				mock(), // errorReporter
				mock(), // activeExecutions
				eventService,
				executionService,
				workflowStaticDataService,
				workflowExecutionService,
				mock(), // storageConfig
				mock(), // workflowPublishedDataService
			);

			activeWorkflowManager = new ActiveWorkflowManager(
				rootLogger,
				mock(), // errorReporter
				activeWorkflowTriggers,
				mock(), // externalHooks
				nodeTypes,
				mock(), // webhookService
				workflowRepository,
				activationErrorsService,
				workflowStaticDataService,
				mock(), // activeWorkflowsService
				instanceSettings,
				mock(), // publisher
				workflowsConfig,
				mock(), // push
				factory,
				mock(), // eventBus
			);
		});

		describe('emit', () => {
			test('calls workflowStaticDataService.saveStaticData, workflowExecutionService.runWorkflow, and eventService.emit', async () => {
				const workflowData = mock<WorkflowEntity>({
					id: 'wf-1',
					name: 'Test Workflow',
				});
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node' });
				const triggerData: INodeExecutionData[][] = [[]];

				const getTriggerFunctions = activeWorkflowManager.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				context.emit(triggerData);

				await sleep(0);

				expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
				expect(workflowExecutionService.runWorkflow).toHaveBeenCalledWith(
					workflowData,
					node,
					triggerData,
					additionalData,
					mode,
					undefined,
					undefined,
				);

				expect(eventService.emit).toHaveBeenCalledWith('workflow-executed', {
					workflowId: workflowData.id,
					workflowName: workflowData.name,
					executionId: 'exec-123',
					source: 'trigger',
				});
			});

			test('forwards deduplicationKey to workflowExecutionService.runWorkflow', async () => {
				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node', id: 'node-1' });
				const triggerData: INodeExecutionData[][] = [[]];

				const getTriggerFunctions = activeWorkflowManager.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				context.emit(triggerData, undefined, undefined, 'wf-1:node-1:1700000000000');

				await sleep(0);

				expect(workflowExecutionService.runWorkflow).toHaveBeenCalledWith(
					workflowData,
					node,
					triggerData,
					additionalData,
					mode,
					undefined,
					'wf-1:node-1:1700000000000',
				);
			});

			test('skips event emission when runWorkflow rejects with DuplicateExecutionError', async () => {
				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node', id: 'node-1' });
				const triggerData: INodeExecutionData[][] = [[]];

				workflowExecutionService.runWorkflow.mockRejectedValueOnce(
					new DuplicateExecutionError('wf-1:node-1:1700000000000'),
				);

				const getTriggerFunctions = activeWorkflowManager.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				context.emit(triggerData, undefined, undefined, 'wf-1:node-1:1700000000000');

				await sleep(0);

				expect(eventService.emit).not.toHaveBeenCalled();
			});

			test('resolves donePromise with undefined when runWorkflow rejects with DuplicateExecutionError', async () => {
				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node', id: 'node-1' });
				const triggerData: INodeExecutionData[][] = [[]];

				workflowExecutionService.runWorkflow.mockRejectedValueOnce(
					new DuplicateExecutionError('wf-1:node-1:1700000000000'),
				);

				const getTriggerFunctions = activeWorkflowManager.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				const donePromise = createDeferredPromise<IRun>();
				context.emit(triggerData, undefined, donePromise, 'wf-1:node-1:1700000000000');

				await expect(donePromise.promise).resolves.toBeUndefined();
			});
		});

		describe('emitError', () => {
			test('removes workflow from activeWorkflowTriggers, registers error, calls executeErrorWorkflow and addQueuedWorkflowActivation', () => {
				const workflowData = mock<WorkflowEntity>({
					id: 'wf-1',
					name: 'Test Workflow',
				});
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node' });
				const triggerError = new Error('Trigger connection failed');

				const executeErrorWorkflowSpy = jest
					.spyOn(activeWorkflowManager, 'executeErrorWorkflow')
					.mockImplementation(() => {});
				const addQueuedWorkflowActivationSpy = jest.spyOn(
					activeWorkflowManager as unknown as Record<
						'addQueuedWorkflowActivation',
						(a: WorkflowActivateMode, w: WorkflowEntity) => void
					>,
					'addQueuedWorkflowActivation',
				);

				const getTriggerFunctions = activeWorkflowManager.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				context.emitError(triggerError);

				expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith(workflowData.id);
				expect(activationErrorsService.register).toHaveBeenCalledWith(
					workflowData.id,
					triggerError.message,
				);
				expect(executeErrorWorkflowSpy).toHaveBeenCalled();
				expect(addQueuedWorkflowActivationSpy).toHaveBeenCalledWith(activation, workflowData);
			});
		});

		describe('saveFailedExecution', () => {
			test('calls executionService.createErrorExecution and executeErrorWorkflow', async () => {
				const workflowData = mock<WorkflowEntity>({
					id: 'wf-1',
					name: 'Test Workflow',
				});
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node' });
				const executionError = mock<ExecutionError>();

				const executeErrorWorkflowSpy = jest
					.spyOn(factory, 'executeErrorWorkflow')
					.mockImplementation(() => {});

				const getTriggerFunctions = activeWorkflowManager.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				context.saveFailedExecution(executionError);

				await sleep(0);

				expect(executionService.createErrorExecution).toHaveBeenCalledWith(
					executionError,
					node,
					workflowData,
					workflow,
					mode,
				);
				expect(executeErrorWorkflowSpy).toHaveBeenCalledWith(executionError, workflowData, mode);
			});
		});

		describe('getExecutePollFunctions', () => {
			const scheduledTaskManager = mock<ScheduledTaskManager>();

			const createPollContext = () => {
				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ id: 'wf-1', name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Poll Node' });

				const getPollFunctions = activeWorkflowManager.getExecutePollFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
				);
				return {
					workflow,
					node,
					context: getPollFunctions(workflow, node, additionalData, mode, activation),
				};
			};

			test('__emit persists static data and starts a workflow execution', async () => {
				const { workflow, context } = createPollContext();

				context.__emit([[{ json: {} }]]);

				await sleep(0);

				expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
				expect(workflowExecutionService.runWorkflow).toHaveBeenCalled();
			});

			test('does not persist the state of an in-flight poll dropped by workflow removal', async () => {
				// ActiveWorkflowTriggers drops in-flight polls of superseded registrations before
				// `__emit`; see active-workflow-triggers.ts. That is only safe because persistence
				// happens exclusively in `__emit`, and by skipping it, a poller advancing
				// its state via getWorkflowStaticData() inside poll() only mutates in-memory,
				// so the next registration's poller re-fetches the same events from the stored state.
				let pollCount = 0;
				let resolveInFlightPoll!: (value: INodeExecutionData[][] | null) => void;
				const pollNodeType = {
					description: { properties: [] },
					async poll(this: IPollFunctions) {
						const cursor = this.getWorkflowStaticData('node');
						pollCount++;
						cursor.lastId = pollCount;
						if (pollCount === 1) return null; // activation test poll: no new events
						if (pollCount === 2) return [[{ json: { id: 2 } }]]; // first cron tick: emits
						// second cron tick: hangs in flight
						return await new Promise<INodeExecutionData[][] | null>((resolve) => {
							resolveInFlightPoll = resolve;
						});
					},
				} as unknown as INodeType;
				const pollNodeTypes = {
					getByNameAndVersion: () => pollNodeType,
				} as unknown as INodeTypes;

				const workflow = new Workflow({
					id: 'wf-1',
					name: 'Test Workflow',
					nodes: [
						{
							id: 'node-1',
							name: 'Poll Node',
							type: 'test.poll',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
					connections: {},
					active: true,
					nodeTypes: pollNodeTypes,
					staticData: {},
				});
				workflow.nodes['Poll Node'].parameters = {
					pollTimes: { item: [{ mode: 'everyMinute' }] },
				};

				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const logger = mock<Logger>({ scoped: jest.fn().mockReturnValue(mock<Logger>()) });
				const triggersAndPollers = {
					runPollFunction: async (wf: Workflow, node: INode, pollFunctions: IPollFunctions) =>
						await wf.nodeTypes
							.getByNameAndVersion(node.type, node.typeVersion)
							.poll!.call(pollFunctions),
				} as ConstructorParameters<typeof ActiveWorkflowTriggers>[2];
				const realActiveWorkflowTriggers = new ActiveWorkflowTriggers(
					logger,
					scheduledTaskManager,
					triggersAndPollers,
					mock(),
					new PollTriggerExecutor(logger, triggersAndPollers, new Tracing()),
				);

				await realActiveWorkflowTriggers.addAllTriggers(
					'wf-1',
					workflow,
					additionalData,
					'trigger',
					'activate',
					mock(),
					activeWorkflowManager.getExecutePollFunctions(
						workflowData,
						additionalData,
						'trigger',
						'activate',
						async () => workflowData,
					),
				);

				const executeScheduledPoll = scheduledTaskManager.register.mock.calls[0][1] as () => void;

				// First cron tick completes and emits: advanced pool state is persisted.
				executeScheduledPoll();
				await sleep(0);
				expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledTimes(1);
				expect(workflowExecutionService.runWorkflow).toHaveBeenCalledTimes(1);

				// Second cron tick hangs in flight; the workflow is removed during that time
				executeScheduledPoll();
				await sleep(0);
				await realActiveWorkflowTriggers.remove('wf-1');
				resolveInFlightPoll([[{ json: { id: 3 } }]]);
				await sleep(0);

				// poll() did advance the state in memory, but the dropped poll neither
				// persisted it nor started an execution; the next registration
				// fetches the same events from upstream
				expect(workflow.getStaticData('node', workflow.nodes['Poll Node']).lastId).toBe(3);
				expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledTimes(1);
				expect(workflowExecutionService.runWorkflow).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('removeNonWebhookTriggers', () => {
		// Wire the real ActiveWorkflowTriggers + real ScheduledTaskManager through the manager
		// so the test asserts the cron is actually stopped, not just that a method was
		// called.
		const hourly = '0 * * * *' as CronExpression;
		let realScheduledTaskManager: ScheduledTaskManager;
		let realActiveWorkflowTriggers: ActiveWorkflowTriggers;

		beforeEach(() => {
			jest.clearAllMocks();
			jest.useFakeTimers();
			realScheduledTaskManager = new ScheduledTaskManager(
				mock<InstanceSettings>({ isLeader: true }),
				mock<Logger>({ scoped: jest.fn().mockReturnValue(mock<Logger>()) }),
				mock(),
			);
			realActiveWorkflowTriggers = new ActiveWorkflowTriggers(
				mock<Logger>({ scoped: jest.fn().mockReturnValue(mock<Logger>()) }),
				realScheduledTaskManager,
				mock(),
				mock(),
				mock<PollTriggerExecutor>(),
			);
			activeWorkflowManager = new ActiveWorkflowManager(
				mockLogger(),
				mock(),
				realActiveWorkflowTriggers,
				mock(),
				nodeTypes,
				mock(),
				workflowRepository,
				mock(),
				mock(),
				mock(),
				instanceSettings,
				mock(),
				workflowsConfig,
				mock(),
				mock<TriggerExecutionContextFactory>(),
				mock(),
			);
		});

		afterEach(() => {
			realScheduledTaskManager.deregisterGroups(WORKFLOW_SCHEDULE_GROUP_TYPE);
			jest.useRealTimers();
		});

		it('should stop a cron left registered for an inactive workflow', async () => {
			realScheduledTaskManager.register(
				{
					group: workflowGroup('wf-desynced'),
					targetId: 'schedule-node',
					timezone: 'GMT',
					expression: hourly,
				},
				jest.fn(),
			);
			expect(realScheduledTaskManager.hasGroup(workflowGroup('wf-desynced'))).toBe(true);
			expect(realActiveWorkflowTriggers.isActive('wf-desynced')).toBe(false);

			await activeWorkflowManager.removeNonWebhookTriggers('wf-desynced');

			expect(realScheduledTaskManager.hasGroup(workflowGroup('wf-desynced'))).toBe(false);
		});

		it('should stop a stranded cron on leader stepdown / shutdown', async () => {
			// removeAllNonWebhookTriggerWorkflows is the @OnLeaderStepdown / @OnShutdown
			// handler. On stepdown the process keeps running as a follower, so a stranded
			// cron left behind would survive the demotion and resurface on the next takeover.
			realScheduledTaskManager.register(
				{
					group: workflowGroup('wf-orphan'),
					targetId: 'schedule-node',
					timezone: 'GMT',
					expression: hourly,
				},
				jest.fn(),
			);
			expect(realScheduledTaskManager.hasGroup(workflowGroup('wf-orphan'))).toBe(true);
			expect(realActiveWorkflowTriggers.isActive('wf-orphan')).toBe(false);

			await activeWorkflowManager.removeAllNonWebhookTriggerWorkflows();

			expect(realScheduledTaskManager.hasGroup(workflowGroup('wf-orphan'))).toBe(false);
		});

		it('does not tear down triggers under the publication service flag', async () => {
			// Under the publication service, teardown runs in PublishedWorkflowTriggerDeactivator
			// under the lifecycle lock, so this handler must be a no-op.
			workflowsConfig.useWorkflowPublicationService = true;
			try {
				realScheduledTaskManager.register(
					{
						group: workflowGroup('wf-pub'),
						targetId: 'schedule-node',
						timezone: 'GMT',
						expression: hourly,
					},
					jest.fn(),
				);

				await activeWorkflowManager.removeAllNonWebhookTriggerWorkflows();

				expect(realScheduledTaskManager.hasGroup(workflowGroup('wf-pub'))).toBe(true);
			} finally {
				workflowsConfig.useWorkflowPublicationService = false;
			}
		});

		it('does not re-activate workflows on takeover under the publication service flag', async () => {
			// Re-activation goes through the outbox consumer instead.
			workflowsConfig.useWorkflowPublicationService = true;
			const addActiveWorkflows = jest
				.spyOn(activeWorkflowManager, 'addActiveWorkflows')
				.mockResolvedValue(undefined);
			try {
				await activeWorkflowManager.addAllNonWebhookTriggerWorkflows();

				expect(addActiveWorkflows).not.toHaveBeenCalled();
			} finally {
				workflowsConfig.useWorkflowPublicationService = false;
				addActiveWorkflows.mockRestore();
			}
		});
	});
});
