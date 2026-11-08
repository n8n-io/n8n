import type { InstanceAiEvalFailedExecutionEnvelope } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { IExecutionFlattedDb, SharedWorkflowRepository, User } from '@n8n/db';
import { parse, stringify } from 'flatted';
import {
	createRunExecutionData,
	type ExecutionError,
	type INode,
	type IRunExecutionData,
	type IWorkflowBase,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { FailedExecutionPortabilityService } from '../failed-execution-portability.service';

const { loadExecutionForViewer } = vi.hoisted(() => ({ loadExecutionForViewer: vi.fn() }));
vi.mock('@/executions/execution-viewer-reader', () => ({ loadExecutionForViewer }));

/** The execution as `loadExecutionForViewer` returns it: run data unflattened. */
function viewedExecution(data = makeRunData()) {
	const { data: _serialized, ...rest } = makeSourceExecution(data);
	return { ...rest, data };
}

const user = mock<User>({ id: 'user-1' });
const projectId = 'project-1';
const sourceWorkflowId = 'source-workflow';
const targetWorkflowId = 'target-workflow';
const sourceExecutionId = '12';
const sourceVersionId = '22222222-2222-4222-8222-222222222222';
const sourceCreatedAt = new Date('2025-01-01T00:00:00.000Z');
const sourceStartedAt = new Date('2025-01-01T00:00:01.000Z');
const sourceStoppedAt = new Date('2025-01-01T00:00:05.000Z');
const importTime = new Date('2026-01-01T00:00:05.000Z');

const node: INode = {
	id: 'node-1',
	name: 'Fail',
	type: 'n8n-nodes-base.code',
	typeVersion: 2,
	position: [0, 0],
	parameters: {},
	credentials: { httpBasicAuth: { id: 'source-credential', name: 'Historical credential' } },
};

const snapshot = {
	id: sourceWorkflowId,
	name: 'Historical workflow',
	nodes: [node],
	connections: {},
	settings: { executionOrder: 'v1' as const },
	nodeGroups: [],
};

const sourceWorkflowData: IWorkflowBase = {
	...snapshot,
	active: false,
	isArchived: false,
	createdAt: sourceCreatedAt,
	updatedAt: sourceCreatedAt,
	activeVersionId: null,
	versionId: sourceVersionId,
};

function makeRunData(): IRunExecutionData {
	return createRunExecutionData({
		resultData: {
			error: { message: 'Synthetic failure' } as ExecutionError,
			lastNodeExecuted: 'Fail',
			runData: {
				Prepare: [
					{
						startTime: sourceStartedAt.getTime(),
						executionTime: 5,
						executionIndex: 0,
						source: [],
						data: {
							main: [Array.from({ length: 12 }, (_, index) => ({ json: { index } }))],
						},
					},
				],
				Fail: [
					{
						startTime: sourceStoppedAt.getTime() - 10,
						executionTime: 10,
						executionIndex: 1,
						source: [{ previousNode: 'Prepare' }],
						error: { message: 'Synthetic failure' } as ExecutionError,
					},
					{
						startTime: sourceStoppedAt.getTime() - 5,
						executionTime: 5,
						executionIndex: 2,
						source: [{ previousNode: 'Prepare' }],
						error: { message: 'Synthetic failure' } as ExecutionError,
					},
				],
			},
		},
		executionData: {
			runtimeData: {
				version: 1,
				establishedAt: sourceStartedAt.getTime() - 10,
				source: 'manual',
				triggerNode: { name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger' },
			},
		},
		pushRef: 'source-push-ref',
		manualData: {
			userId: 'source-user',
			evaluationRunId: 'source-evaluation',
			suppressErrorWorkflow: true,
			dirtyNodeNames: ['Fail'],
			triggerToStartFrom: { name: 'Manual Trigger' },
			source: 'instance_ai',
		},
	});
}

function makeSourceExecution(data = makeRunData()): IExecutionFlattedDb {
	return {
		id: sourceExecutionId,
		mode: 'manual',
		createdAt: sourceCreatedAt,
		startedAt: sourceStartedAt,
		stoppedAt: sourceStoppedAt,
		workflowId: sourceWorkflowId,
		finished: false,
		status: 'error',
		waitTill: null,
		storedAt: 'db',
		workflowVersionId: sourceVersionId,
		usedPrivateCredentials: false,
		data: stringify(data),
		workflowData: sourceWorkflowData,
		customData: {},
	};
}

function makeEnvelope(data = makeRunData()): InstanceAiEvalFailedExecutionEnvelope {
	delete data.resumeToken;
	delete data.pushRef;
	if (data.manualData) {
		delete data.manualData.userId;
		delete data.manualData.evaluationRunId;
		delete data.manualData.suppressErrorWorkflow;
	}
	return {
		format: 'n8n-instance-ai-failed-execution',
		version: 1,
		source: {
			executionId: sourceExecutionId,
			workflowId: sourceWorkflowId,
			workflowVersionId: sourceVersionId,
			createdAt: sourceCreatedAt.toISOString(),
			startedAt: sourceStartedAt.toISOString(),
			stoppedAt: sourceStoppedAt.toISOString(),
		},
		execution: {
			mode: 'manual',
			status: 'error',
			finished: false,
			workflowData: snapshot,
			data: stringify(data),
		},
	};
}

describe('FailedExecutionPortabilityService', () => {
	const executionPersistence = mock<ExecutionPersistence>();
	const activeExecutions = mock<ActiveExecutions>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const logger = mock<Logger>();
	const service = new FailedExecutionPortabilityService(
		executionPersistence,
		activeExecutions,
		workflowFinderService,
		sharedWorkflowRepository,
		logger,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(importTime);
		activeExecutions.has.mockReturnValue(false);
		loadExecutionForViewer.mockImplementation(async () => viewedExecution());
		workflowFinderService.findWorkflowForUser.mockResolvedValue(mock());
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue({ id: projectId } as never);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('exports complete native data, an historical snapshot, and a derived summary', async () => {
		executionPersistence.findSingleExecution.mockResolvedValue(makeSourceExecution());

		const result = await service.exportExecution(user, projectId, sourceExecutionId);

		expect(result.envelope.source).toEqual({
			executionId: sourceExecutionId,
			workflowId: sourceWorkflowId,
			workflowVersionId: sourceVersionId,
			createdAt: sourceCreatedAt.toISOString(),
			startedAt: sourceStartedAt.toISOString(),
			stoppedAt: sourceStoppedAt.toISOString(),
		});
		expect(result.envelope.execution.workflowData).toEqual(snapshot);
		expect(result.summary).toEqual({
			status: 'error',
			lastNodeExecuted: 'Fail',
			error: 'Synthetic failure',
			nodeRunCounts: { Prepare: 1, Fail: 2 },
		});

		const exported = parse(result.envelope.execution.data) as IRunExecutionData;
		expect(exported.resultData.runData.Prepare[0].data?.main[0]).toHaveLength(12);
		expect(exported.resumeToken).toBeUndefined();
		expect(exported.pushRef).toBeUndefined();
		expect(exported.manualData).toEqual({
			dirtyNodeNames: ['Fail'],
			triggerToStartFrom: { name: 'Manual Trigger' },
			source: 'instance_ai',
		});
		expect(snapshot.nodes[0].credentials).toBeDefined();
	});

	it('restores a fresh native row and verifies the exact transformed readback', async () => {
		const envelope = makeEnvelope();
		let createdPayload: Parameters<ExecutionPersistence['create']>[0] | undefined;
		executionPersistence.create.mockImplementation(async (payload) => {
			createdPayload = payload;
			return '34';
		});
		executionPersistence.findSingleExecution.mockImplementation(
			async () =>
				({
					id: '34',
					mode: createdPayload!.mode,
					createdAt: importTime,
					startedAt: createdPayload!.startedAt!,
					stoppedAt: createdPayload!.stoppedAt,
					workflowId: targetWorkflowId,
					finished: false,
					status: createdPayload!.status,
					waitTill: null,
					storedAt: 'db',
					workflowVersionId: sourceVersionId,
					usedPrivateCredentials: false,
					data: createdPayload!.data,
					workflowData: {
						id: targetWorkflowId,
						name: snapshot.name,
						nodes: snapshot.nodes,
						connections: snapshot.connections,
						settings: snapshot.settings,
						nodeGroups: snapshot.nodeGroups,
					},
					customData: {},
				}) as never,
		);

		const result = await service.restoreExecution(user, projectId, targetWorkflowId, envelope);

		const offset = importTime.getTime() - sourceStoppedAt.getTime();
		expect(result).toMatchObject({
			ok: true,
			workflowId: targetWorkflowId,
			executionId: '34',
			timestampOffsetMs: offset,
			summary: { nodeRunCounts: { Prepare: 1, Fail: 2 } },
		});
		expect(createdPayload?.startedAt).toEqual(new Date(sourceStartedAt.getTime() + offset));
		expect(createdPayload?.workflowData).toMatchObject({
			id: targetWorkflowId,
			versionId: sourceVersionId,
			nodes: snapshot.nodes,
		});
		expect(createdPayload?.stoppedAt).toEqual(importTime);
		expect(createdPayload?.tracingContext).toBeNull();
		expect(createdPayload?.deduplicationKey).toBeNull();

		const restoredData = createdPayload!.data;
		expect(restoredData.resumeToken).toMatch(/^[a-f\d]{64}$/);
		expect(restoredData.pushRef).toBeUndefined();
		expect(restoredData.resultData.runData.Prepare[0].startTime).toBe(
			sourceStartedAt.getTime() + offset,
		);
		expect(restoredData.executionData?.runtimeData?.establishedAt).toBe(
			sourceStartedAt.getTime() - 10 + offset,
		);
		expect(restoredData.resultData.runData.Prepare[0].executionTime).toBe(5);
	});

	it('compensates the native row and blob when exact readback differs', async () => {
		executionPersistence.create.mockResolvedValue('34');
		executionPersistence.findSingleExecution.mockResolvedValue({
			...makeSourceExecution(),
			id: '34',
			workflowId: targetWorkflowId,
		} as never);

		await expect(
			service.restoreExecution(user, projectId, targetWorkflowId, makeEnvelope()),
		).rejects.toThrow('did not match the native transformed payload');
		expect(executionPersistence.hardDeleteById).toHaveBeenCalledWith('34');
	});

	it('rejects a workflow outside the thread project before writing', async () => {
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue({ id: 'other' } as never);

		await expect(
			service.restoreExecution(user, projectId, targetWorkflowId, makeEnvelope()),
		).rejects.toThrow('Workflow not found');
		expect(executionPersistence.create).not.toHaveBeenCalled();
	});

	it.each([
		[
			'source resume token',
			(data: IRunExecutionData): void => {
				data.resumeToken = 'source-token';
			},
		],
		[
			'parent execution',
			(data: IRunExecutionData): void => {
				data.parentExecution = { executionId: 'parent', workflowId: 'parent-workflow' };
			},
		],
		[
			'runtime credentials',
			(data: IRunExecutionData): void => {
				data.executionData!.runtimeData!.credentials = 'encrypted';
			},
		],
		[
			'runtime identity',
			(data: IRunExecutionData): void => {
				data.executionData!.runtimeData!.executedByUserId = 'source-user';
			},
		],
		[
			'task execution link',
			(data: IRunExecutionData): void => {
				data.resultData.runData.Fail[0].metadata = {
					subExecution: { executionId: 'child', workflowId: 'child-workflow' },
				};
			},
		],
		[
			'external binary data',
			(data: IRunExecutionData): void => {
				data.resultData.runData.Prepare[0].data!.main[0]![0].binary = {
					file: { id: 'filesystem:source-file', data: '', mimeType: 'text/plain' },
				};
			},
		],
		[
			'wait state',
			(data: IRunExecutionData): void => {
				data.waitTill = sourceStoppedAt;
			},
		],
		[
			'redacted data',
			(data: IRunExecutionData): void => {
				data.redactionInfo = { isRedacted: true, reason: 'policy', canReveal: false };
			},
		],
	] as const)('rejects unsupported %s without a partial write', async (_name, mutate) => {
		const envelope = makeEnvelope();
		const data = parse(envelope.execution.data) as IRunExecutionData;
		mutate(data);
		envelope.execution.data = stringify(data);

		await expect(
			service.restoreExecution(user, projectId, targetWorkflowId, envelope),
		).rejects.toThrow();
		expect(executionPersistence.create).not.toHaveBeenCalled();
	});

	it('rejects an engine v2 execution id without reading the execution table', async () => {
		await expect(
			service.exportExecution(user, projectId, '0192f8a4-5b6c-7d8e-9f01-23456789abcd'),
		).rejects.toThrow('Engine v2 executions are not portable');
		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
	});

	it('rejects an active source execution', async () => {
		activeExecutions.has.mockReturnValue(true);
		executionPersistence.findSingleExecution.mockResolvedValue(makeSourceExecution());

		await expect(service.exportExecution(user, projectId, sourceExecutionId)).rejects.toThrow(
			'still active',
		);
	});

	it('rejects malformed native task data before writing', async () => {
		const envelope = makeEnvelope();
		const data = parse(envelope.execution.data) as IRunExecutionData;
		data.resultData.runData.Fail = [null] as never;
		envelope.execution.data = stringify(data);

		await expect(
			service.restoreExecution(user, projectId, targetWorkflowId, envelope),
		).rejects.toThrow('runData.Fail.0 must be an object');
		expect(executionPersistence.create).not.toHaveBeenCalled();
	});

	it('rejects a retry-mode envelope before writing', async () => {
		const envelope = makeEnvelope();
		envelope.execution.mode = 'retry';

		await expect(
			service.restoreExecution(user, projectId, targetWorkflowId, envelope),
		).rejects.toThrow('A retry execution cannot be restored');
		expect(executionPersistence.create).not.toHaveBeenCalled();
	});

	it('rejects run data that belongs to a parent agent run', async () => {
		const envelope = makeEnvelope();
		const data = parse(envelope.execution.data) as IRunExecutionData;
		data.parentAgentRun = { agentId: 'agent-1', runId: 'run-1' } as never;
		envelope.execution.data = stringify(data);

		await expect(
			service.restoreExecution(user, projectId, targetWorkflowId, envelope),
		).rejects.toThrow('run data has a parent agent run');
		expect(executionPersistence.create).not.toHaveBeenCalled();
	});

	it('requires execution:read to export run data', async () => {
		executionPersistence.findSingleExecution.mockResolvedValue(makeSourceExecution());

		await service.exportExecution(user, projectId, sourceExecutionId);

		expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(sourceWorkflowId, user, [
			'workflow:read',
			'execution:read',
		]);
		expect(loadExecutionForViewer).toHaveBeenCalledWith(sourceExecutionId, user);
	});

	it('refuses a run that is redacted for the user', async () => {
		executionPersistence.findSingleExecution.mockResolvedValue(makeSourceExecution());
		const redacted = makeRunData();
		redacted.redactionInfo = {
			isRedacted: true,
			reason: 'workflow_redaction_policy',
			canReveal: true,
		} as never;
		loadExecutionForViewer.mockResolvedValue(viewedExecution(redacted));

		await expect(service.exportExecution(user, projectId, sourceExecutionId)).rejects.toThrow(
			'run data is redacted',
		);
	});
});
