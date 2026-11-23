import { ExecutionRedactionServiceProxy } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import type { ExecutionEntity, IExecutionResponse, User, WorkflowEntity } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ExecutionSnapshot } from '@n8n/engine';
import { mock } from 'vitest-mock-extended';

import { UnsavedManualExecutionService } from '@/execution-lifecycle/unsaved-manual-execution.service';
import { EngineV2ExecutionReader } from '@/executions/engine-v2-execution-reader.service';
import type { ExecutionIdV2 } from '@/executions/execution-id';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import {
	loadEngineV2ExecutionMetadataForViewer,
	findUnsavedManualExecutionForViewer,
	loadExecutionForViewer,
	loadLatestEngineV2ExecutionForViewer,
} from '../execution-viewer-reader';

const executionPersistence = mockInstance(ExecutionPersistence);
const executionRepository = mockInstance(ExecutionRepository);
const unsavedManualExecutionService = mockInstance(UnsavedManualExecutionService);
const workflowFinderService = mockInstance(WorkflowFinderService);
const redaction = mockInstance(ExecutionRedactionServiceProxy);

const viewer = mock<User>({ id: 'user-1' });

beforeEach(() => {
	vi.clearAllMocks();
	unsavedManualExecutionService.isStarter.mockResolvedValue(true);
});

describe('loadExecutionForViewer', () => {
	const unsavedExecution = mock<IExecutionResponse>({ id: 'exec-1', workflowId: 'wf-1' });

	beforeEach(() => {
		executionPersistence.findSingleExecution.mockResolvedValue(undefined);
		executionPersistence.findUnsavedManualExecution.mockResolvedValue(unsavedExecution);
	});

	it('loads an unsaved manual execution the viewer started and may read', async () => {
		workflowFinderService.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());

		const execution = await loadExecutionForViewer('exec-1', viewer);

		expect(execution).toBe(unsavedExecution);
		expect(unsavedManualExecutionService.isStarter).toHaveBeenCalledWith('exec-1', 'user-1');
		expect(executionPersistence.findUnsavedManualExecution).toHaveBeenCalledWith('exec-1');
		expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', viewer, [
			'execution:read',
		]);
		expect(redaction.processExecution).toHaveBeenCalledWith(unsavedExecution, { user: viewer });
	});

	it('does not load an unsaved manual execution that another user started', async () => {
		unsavedManualExecutionService.isStarter.mockResolvedValue(false);

		const execution = await loadExecutionForViewer('exec-1', viewer);

		expect(execution).toBeUndefined();
		expect(executionPersistence.findUnsavedManualExecution).not.toHaveBeenCalled();
	});

	it('does not load an unsaved manual execution when the viewer can no longer read executions', async () => {
		workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

		const execution = await loadExecutionForViewer('exec-1', viewer);

		expect(execution).toBeUndefined();
		expect(redaction.processExecution).not.toHaveBeenCalled();
	});

	it('does not look for an unsaved execution when a saved one exists', async () => {
		const savedExecution = mock<IExecutionResponse>({ id: 'exec-1', workflowId: 'wf-1' });
		executionPersistence.findSingleExecution.mockResolvedValue(savedExecution);

		const execution = await loadExecutionForViewer('exec-1', viewer);

		expect(execution).toBe(savedExecution);
		expect(unsavedManualExecutionService.isStarter).not.toHaveBeenCalled();
		expect(executionPersistence.findUnsavedManualExecution).not.toHaveBeenCalled();
	});
});

describe('engine v2 executions', () => {
	const V2_ID = '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa' as ExecutionIdV2;
	const dataPlane = mockInstance(EngineDataPlaneProxyService);
	// The real reader, so the access check runs against the snapshot it reads.
	Container.set(EngineV2ExecutionReader, new EngineV2ExecutionReader(dataPlane));

	const snapshot: ExecutionSnapshot = {
		id: V2_ID,
		workflowId: 'wf-1',
		status: 'running',
		mode: 'manual',
		hostMode: 'manual',
		graph: { nodes: [], edges: [], seeded: [] },
		workflow: { id: 'wf-1', name: 'v2', nodes: [], connections: {} },
		parent: null,
		createdAt: '2026-08-25T10:00:00.000Z',
		updatedAt: '2026-08-25T10:00:00.000Z',
		finishedAt: null,
	};

	beforeEach(() => {
		dataPlane.getExecution.mockResolvedValue(snapshot);
		dataPlane.findLatestExecution.mockResolvedValue(snapshot);
	});

	describe('loadExecutionForViewer', () => {
		it('loads the execution from the data plane when the viewer may read its workflow', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());

			const execution = await loadExecutionForViewer(V2_ID, viewer);

			expect(execution?.id).toBe(V2_ID);
			expect(dataPlane.getExecution).toHaveBeenCalledWith(V2_ID, { includeSteps: true });
			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', viewer, [
				'workflow:read',
				'execution:read',
			]);
			expect(redaction.processExecution).toHaveBeenCalledWith(execution, { user: viewer });
			expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
		});

		it('loads nothing when the viewer may not read the workflow', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(loadExecutionForViewer(V2_ID, viewer)).resolves.toBeUndefined();
			expect(redaction.processExecution).not.toHaveBeenCalled();
		});

		it('loads nothing when the data plane holds no such execution', async () => {
			dataPlane.getExecution.mockResolvedValue(undefined);

			await expect(loadExecutionForViewer(V2_ID, viewer)).resolves.toBeUndefined();
			expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
		});
	});

	describe('loadEngineV2ExecutionMetadataForViewer', () => {
		it('checks the given scopes and reads no steps', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(mock<WorkflowEntity>());

			const execution = await loadEngineV2ExecutionMetadataForViewer(V2_ID, viewer, [
				'workflow:execute',
			]);

			expect(execution).toMatchObject({ id: V2_ID, workflowId: 'wf-1', status: 'running' });
			expect(dataPlane.getExecution).toHaveBeenCalledWith(V2_ID, { includeSteps: false });
			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', viewer, [
				'workflow:execute',
			]);
		});

		it('finds nothing when the viewer lacks the scopes', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(
				loadEngineV2ExecutionMetadataForViewer(V2_ID, viewer, ['workflow:execute']),
			).resolves.toBeUndefined();
		});
	});

	describe('loadLatestEngineV2ExecutionForViewer', () => {
		it('reads the newest execution of the workflow and redacts it', async () => {
			const execution = await loadLatestEngineV2ExecutionForViewer('wf-1', viewer);

			expect(execution?.id).toBe(V2_ID);
			expect(dataPlane.findLatestExecution).toHaveBeenCalledWith(
				expect.objectContaining({ workflowIds: ['wf-1'] }),
			);
			expect(redaction.processExecution).toHaveBeenCalledWith(execution, { user: viewer });
		});

		it('loads nothing when the workflow has no engine v2 execution', async () => {
			dataPlane.findLatestExecution.mockResolvedValue(undefined);

			await expect(loadLatestEngineV2ExecutionForViewer('wf-1', viewer)).resolves.toBeUndefined();
			expect(redaction.processExecution).not.toHaveBeenCalled();
		});
	});
});

describe('findUnsavedManualExecutionForViewer', () => {
	it('finds an unsaved manual execution the viewer started', async () => {
		const unsavedExecution = mock<ExecutionEntity>({ id: 'exec-1', workflowId: 'wf-1' });
		executionRepository.findUnsavedManualExecution.mockResolvedValue(unsavedExecution);

		await expect(findUnsavedManualExecutionForViewer('exec-1', viewer)).resolves.toBe(
			unsavedExecution,
		);
		expect(unsavedManualExecutionService.isStarter).toHaveBeenCalledWith('exec-1', 'user-1');
		expect(executionRepository.findUnsavedManualExecution).toHaveBeenCalledWith('exec-1');
	});

	it('finds nothing for an execution that another user started', async () => {
		unsavedManualExecutionService.isStarter.mockResolvedValue(false);

		await expect(findUnsavedManualExecutionForViewer('exec-1', viewer)).resolves.toBeNull();
		expect(executionRepository.findUnsavedManualExecution).not.toHaveBeenCalled();
	});
});
