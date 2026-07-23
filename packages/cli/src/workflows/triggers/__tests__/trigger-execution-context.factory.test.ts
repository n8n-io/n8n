/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { Project, WorkflowEntity } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { ErrorReporter, IGetExecutePollFunctions, StorageConfig } from 'n8n-core';
import { sleep, UnexpectedError, Workflow } from 'n8n-workflow';
import type {
	Cron,
	CronExpression,
	ExecutionError,
	IConnections,
	INode,
	INodeExecutionData,
	IPollFunctions,
	IRun,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import type { EventService } from '@/events/event.service';
import { executeErrorWorkflow } from '@/execution-lifecycle/execute-error-workflow';
import type { ExecutionService } from '@/executions/execution.service';
import type {
	ScheduleTriggerCollectionSession,
	ScheduleTriggerJobRegistrar,
} from '@/scheduling/schedule-trigger-node/schedule-trigger-job-registrar';
import type { OwnershipService } from '@/services/ownership.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import type {
	PublishedWorkflowDataForExecution,
	WorkflowPublishedDataService,
} from '@/workflows/workflow-published-data.service';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { createNodeTypes } from './trigger-test-utils';
import {
	TriggerExecutionContextFactory,
	type TriggerFailureHandler,
} from '../trigger-execution-context.factory';

vi.mock('@/execution-lifecycle/execute-error-workflow');

describe('TriggerExecutionContextFactory', () => {
	const workflowStaticDataService = mock<WorkflowStaticDataService>();
	const workflowExecutionService = mock<WorkflowExecutionService>();
	const eventService = mock<EventService>();
	const executionService = mock<ExecutionService>();
	const activeExecutions = mock<ActiveExecutions>();
	const workflowPublishedDataService = mock<WorkflowPublishedDataService>();
	const storageConfig = mock<StorageConfig>({ modeTag: 'db' }) as unknown as StorageConfig;
	const scheduleTriggerJobRegistrar = mock<ScheduleTriggerJobRegistrar>();
	const scheduleCollectionSession = mock<ScheduleTriggerCollectionSession>();
	const ownershipService = mock<OwnershipService>();
	const nodeTypes = createNodeTypes();

	let factory: TriggerExecutionContextFactory;

	beforeEach(() => {
		vi.clearAllMocks();
		workflowStaticDataService.saveStaticData.mockResolvedValue(undefined);
		workflowExecutionService.runWorkflow.mockResolvedValue('exec-123');
		executionService.createErrorExecution.mockResolvedValue(undefined);
		ownershipService.getWorkflowProjectCached.mockResolvedValue(
			mock<Project>({ id: 'project-1', name: 'Test Project' }),
		);

		scheduleTriggerJobRegistrar.interceptsNode.mockReturnValue(false);
		const scopedLogger = mock<Logger>();
		const rootLogger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });

		factory = new TriggerExecutionContextFactory(
			rootLogger,
			mock<ErrorReporter>(),
			activeExecutions,
			eventService,
			executionService,
			workflowStaticDataService,
			workflowExecutionService,
			storageConfig,
			workflowPublishedDataService,
			scheduleTriggerJobRegistrar,
			ownershipService,
			nodeTypes,
		);
	});

	describe('getExecuteTriggerFunctions', () => {
		describe('emit', () => {
			test('saves static data, runs workflow, and emits workflow-executed', async () => {
				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node' });
				const triggerData: INodeExecutionData[][] = [[]];

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					vi.fn(),
					scheduleCollectionSession,
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
					projectId: 'project-1',
					projectName: 'Test Project',
					source: 'trigger',
				});
			});

			test('forwards deduplicationKey to runWorkflow', async () => {
				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node', id: 'node-1' });

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					vi.fn(),
					scheduleCollectionSession,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				context.emit([[]], undefined, undefined, 'wf-1:node-1:1700000000000');
				await sleep(0);

				expect(workflowExecutionService.runWorkflow).toHaveBeenCalledWith(
					workflowData,
					node,
					[[]],
					additionalData,
					mode,
					undefined,
					'wf-1:node-1:1700000000000',
				);
			});

			test('resolves donePromise via getPostExecutePromise', async () => {
				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node' });
				const runResult = mock<IRun>();
				activeExecutions.getPostExecutePromise.mockResolvedValue(runResult);

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					vi.fn(),
					scheduleCollectionSession,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);
				const donePromise = createDeferredPromise<IRun>();

				context.emit([[]], undefined, donePromise);
				await sleep(0);

				expect(activeExecutions.getPostExecutePromise).toHaveBeenCalledWith('exec-123');
				await expect(donePromise.promise).resolves.toBe(runResult);
			});

			test('does not emit workflow-executed on DuplicateExecutionError', async () => {
				workflowExecutionService.runWorkflow.mockRejectedValueOnce(
					new DuplicateExecutionError('wf-1:node-1:1700000000000'),
				);

				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node', id: 'node-1' });

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					vi.fn(),
					scheduleCollectionSession,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				context.emit([[]], undefined, undefined, 'wf-1:node-1:1700000000000');
				await sleep(0);

				expect(eventService.emit).not.toHaveBeenCalled();
			});

			test('resolves donePromise with undefined on DuplicateExecutionError', async () => {
				workflowExecutionService.runWorkflow.mockRejectedValueOnce(
					new DuplicateExecutionError('wf-1:node-1:1700000000000'),
				);

				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node', id: 'node-1' });

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					vi.fn(),
					scheduleCollectionSession,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);
				const donePromise = createDeferredPromise<IRun>();

				context.emit([[]], undefined, donePromise, 'wf-1:node-1:1700000000000');

				await expect(donePromise.promise).resolves.toBeUndefined();
			});
		});

		describe('emitError', () => {
			test('delegates to the injected onTriggerFailure callback', () => {
				const onTriggerFailure =
					vi.fn<(...args: Parameters<TriggerFailureHandler>) => () => void>();
				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node' });

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					onTriggerFailure,
					scheduleCollectionSession,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				const error = new Error('Trigger connection failed');
				context.emitError(error);

				expect(onTriggerFailure).toHaveBeenCalledWith({
					error,
					node,
					workflowData,
					mode,
					activation,
				});
			});
		});

		describe('schedule trigger interception', () => {
			test('hands the registrar collector to the trigger context of an intercepted node', () => {
				scheduleTriggerJobRegistrar.interceptsNode.mockReturnValue(true);
				const registerCron = vi.fn();
				scheduleCollectionSession.createCollector.mockReturnValue({ registerCron });

				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Schedule Trigger Node' });

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					vi.fn(),
					scheduleCollectionSession,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				expect(scheduleTriggerJobRegistrar.interceptsNode).toHaveBeenCalledWith(node);
				expect(scheduleCollectionSession.createCollector).toHaveBeenCalledWith(workflow, node);

				// The node's registerCron calls must reach the collector, not the
				// in-memory scheduler.
				const cron: Cron = { expression: '0 0 9 * * *' as CronExpression };
				const onTick = vi.fn();
				context.helpers.registerCron(cron, onTick);

				expect(registerCron).toHaveBeenCalledWith(cron, onTick);
			});

			test('keeps the in-memory scheduling functions for a non-intercepted node', () => {
				// interceptsNode returns false by default in this suite.
				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node' });

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					vi.fn(),
					scheduleCollectionSession,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				expect(scheduleCollectionSession.createCollector).not.toHaveBeenCalled();
				// The context still exposes the default in-memory scheduling helper.
				expect(typeof context.helpers.registerCron).toBe('function');
			});
		});

		describe('saveFailedExecution', () => {
			test('calls createErrorExecution then executeErrorWorkflow', async () => {
				const executeErrorWorkflowSpy = vi
					.spyOn(factory, 'executeErrorWorkflow')
					.mockImplementation(() => {});

				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node' });

				const getTriggerFunctions = factory.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
					vi.fn(),
					scheduleCollectionSession,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);
				const executionError = mock<ExecutionError>();

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
	});

	describe('getExecutePollFunctions', () => {
		describe('__emit', () => {
			test('saves static data and runs workflow', async () => {
				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ id: 'wf-1', name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Poll Node' });
				const pollData: INodeExecutionData[][] = [[{ json: {} }]];

				const getPollFunctions = factory.getExecutePollFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
				);
				const context = getPollFunctions(workflow, node, additionalData, mode, activation);

				context.__emit(pollData);
				await sleep(0);

				expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
				expect(workflowExecutionService.runWorkflow).toHaveBeenCalledWith(
					workflowData,
					node,
					pollData,
					additionalData,
					mode,
					undefined,
				);
			});

			test('resolves donePromise via getPostExecutePromise', async () => {
				const runResult = mock<IRun>();
				activeExecutions.getPostExecutePromise.mockResolvedValue(runResult);

				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ id: 'wf-1', name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Poll Node' });

				const getPollFunctions = factory.getExecutePollFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
				);
				const context = getPollFunctions(workflow, node, additionalData, mode, activation);
				const donePromise = createDeferredPromise<IRun>();

				context.__emit([[]], undefined, donePromise);
				await sleep(0);

				expect(activeExecutions.getPostExecutePromise).toHaveBeenCalledWith('exec-123');
				await expect(donePromise.promise).resolves.toBe(runResult);
			});
		});

		describe('__emitError', () => {
			test('calls createErrorExecution then executeErrorWorkflow', async () => {
				const executeErrorWorkflowSpy = vi
					.spyOn(factory, 'executeErrorWorkflow')
					.mockImplementation(() => {});

				const workflowData = mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' });
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ id: 'wf-1', name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Poll Node' });

				const getPollFunctions = factory.getExecutePollFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
					async () => workflowData,
				);
				const context = getPollFunctions(workflow, node, additionalData, mode, activation);
				const executionError = mock<ExecutionError>();

				context.__emitError(executionError);
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
	});

	describe('createPollExecutionContext', () => {
		const pollNode: INode = {
			id: 'node-1',
			name: 'Poll Trigger',
			type: 'poll',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		const buildWorkflowData = (): IWorkflowBase =>
			({
				id: 'wf-1',
				name: 'My Polling Workflow',
				active: true,
				nodes: [pollNode],
				connections: {},
				settings: { timezone: 'Europe/Berlin' },
				staticData: {},
			}) as IWorkflowBase;

		test('builds the workflow and poll context with the activation path modes', async () => {
			const workflowData = buildWorkflowData();
			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);

			const pollFunctions = mock<IPollFunctions>();
			const getPollFunctions = vi.fn().mockReturnValue(pollFunctions);
			const getExecutePollFunctionsSpy = vi
				.spyOn(factory, 'getExecutePollFunctions')
				.mockReturnValue(getPollFunctions as unknown as IGetExecutePollFunctions);

			const result = await factory.createPollExecutionContext(workflowData, pollNode);

			expect(result.workflow).toBeInstanceOf(Workflow);
			expect(result.pollFunctions).toBe(pollFunctions);

			expect(WorkflowExecuteAdditionalData.getBase).toHaveBeenCalledWith({
				workflowId: 'wf-1',
				workflowSettings: { timezone: 'Europe/Berlin' },
			});

			// Built with the activation path's execution/activation modes ('trigger'/'update').
			// Exactly five args: no per-occurrence deduplication key is threaded as a sixth.
			expect(getExecutePollFunctionsSpy).toHaveBeenCalledWith(
				workflowData,
				additionalData,
				'trigger',
				'update',
				expect.any(Function),
			);

			// The poll context is bound to the built workflow, the node, and the same modes.
			expect(getPollFunctions).toHaveBeenCalledWith(
				result.workflow,
				pollNode,
				additionalData,
				'trigger',
				'update',
			);
		});

		test('binds a fresh (non-cached) resolver so the poll cursor is never stale', async () => {
			const workflowData = buildWorkflowData();
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				mock<IWorkflowExecuteAdditionalData>(),
			);

			const getExecutePollFunctionsSpy = vi
				.spyOn(factory, 'getExecutePollFunctions')
				.mockReturnValue(vi.fn() as unknown as IGetExecutePollFunctions);

			workflowPublishedDataService.getPublishedWorkflowDataForExecution.mockResolvedValue(
				mock<PublishedWorkflowDataForExecution>(),
			);

			await factory.createPollExecutionContext(workflowData, pollNode);

			// The __emit -> runWorkflow closure must resolve fresh data, never the cache.
			const resolveWorkflowData = getExecutePollFunctionsSpy.mock.calls[0][4];
			await resolveWorkflowData();

			expect(
				workflowPublishedDataService.getPublishedWorkflowDataForExecution,
			).toHaveBeenCalledWith('wf-1');
			expect(
				workflowPublishedDataService.getCachedPublishedWorkflowDataForExecution,
			).not.toHaveBeenCalled();
		});
	});

	describe('executeErrorWorkflow', () => {
		test('calls the standalone function with a correctly shaped IRun', () => {
			const workflowData = mock<IWorkflowBase>();
			const error = mock<ExecutionError>();
			const mode: WorkflowExecuteMode = 'trigger';

			factory.executeErrorWorkflow(error, workflowData, mode);

			expect(executeErrorWorkflow).toHaveBeenCalledWith(
				workflowData,
				expect.objectContaining({
					mode,
					finished: false,
					status: 'running',
					storedAt: 'db',
				}),
				mode,
			);
		});
	});

	const buildPublishedWorkflowData = (
		overrides: Partial<PublishedWorkflowDataForExecution> = {},
	): PublishedWorkflowDataForExecution => ({
		id: 'wf-1',
		name: 'My workflow',
		description: null,
		active: true,
		isArchived: false,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date('2026-01-02T00:00:00.000Z'),
		settings: { timezone: 'Europe/Berlin' },
		staticData: { foo: 'bar' },
		activeVersionId: 'published-version',
		versionCounter: 3,
		versionId: 'published-version',
		nodes: [{ id: 'n1' } as INode],
		connections: {} as IConnections,
		nodeGroups: [],
		...overrides,
	});

	describe('loadPublishedWorkflowData', () => {
		test('sources nodes/connections/versionId from the published version and other fields from the workflow projection', async () => {
			const publishedNodes: INode[] = [{ id: 'n1' } as INode];
			const publishedConnections: IConnections = {};
			const publishedNodeGroups = [{ id: 'g1', name: 'Group', nodeIds: ['n1'] }];
			const workflowData = buildPublishedWorkflowData({
				nodes: publishedNodes,
				connections: publishedConnections,
				nodeGroups: publishedNodeGroups,
			});

			workflowPublishedDataService.getCachedPublishedWorkflowDataForExecution.mockResolvedValue(
				workflowData,
			);

			const result = await factory.loadPublishedWorkflowData('wf-1');

			// Topology + version that actually ran come from the published snapshot.
			expect(result.nodes).toBe(publishedNodes);
			expect(result.connections).toBe(publishedConnections);
			expect(result.nodeGroups).toBe(publishedNodeGroups);
			expect(result.versionId).toBe('published-version');

			// Other execution-relevant fields come from the live workflow entity.
			expect(result.id).toBe('wf-1');
			expect(result.name).toBe('My workflow');
			expect(result.active).toBe(true);
			expect(result.settings).toEqual({ timezone: 'Europe/Berlin' });
			expect(result.staticData).toEqual({ foo: 'bar' });
			expect(result.activeVersionId).toBe('published-version');
			expect(result.versionCounter).toBe(3);

			// Deliberately excluded from a production trigger execution.
			expect(result.pinData).toBeUndefined();
			expect(result.meta).toBeUndefined();
		});

		test('bypasses the cache and reads fresh from the database when bypassCache is true', async () => {
			const workflowData = buildPublishedWorkflowData();
			workflowPublishedDataService.getPublishedWorkflowDataForExecution.mockResolvedValue(
				workflowData,
			);

			const result = await factory.loadPublishedWorkflowData('wf-1', { bypassCache: true });

			expect(result.staticData).toEqual({ foo: 'bar' });
			// The poll path must never read through the publish-time cache.
			expect(
				workflowPublishedDataService.getPublishedWorkflowDataForExecution,
			).toHaveBeenCalledWith('wf-1');
			expect(
				workflowPublishedDataService.getCachedPublishedWorkflowDataForExecution,
			).not.toHaveBeenCalled();
		});

		it.each([
			{
				description: 'default (cached) path',
				options: undefined,
				calledMethod: 'getCachedPublishedWorkflowDataForExecution' as const,
				skippedMethod: 'getPublishedWorkflowDataForExecution' as const,
			},
			{
				description: 'bypassCache path',
				options: { bypassCache: true },
				calledMethod: 'getPublishedWorkflowDataForExecution' as const,
				skippedMethod: 'getCachedPublishedWorkflowDataForExecution' as const,
			},
		])(
			'throws UnexpectedError when the service returns null ($description)',
			async ({ options, calledMethod, skippedMethod }) => {
				workflowPublishedDataService[calledMethod].mockResolvedValue(null);

				await expect(factory.loadPublishedWorkflowData('wf-1', options)).rejects.toThrow(
					UnexpectedError,
				);
				// Confirms the null came back from the branch bypassCache actually
				// selects, not merely that some unmocked call returned undefined.
				expect(workflowPublishedDataService[calledMethod]).toHaveBeenCalledWith('wf-1');
				expect(workflowPublishedDataService[skippedMethod]).not.toHaveBeenCalled();
			},
		);
	});
});
