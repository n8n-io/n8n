import { ExecutionRedactionServiceProxy } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import type { ExecutionEntity, IExecutionResponse, User, WorkflowEntity } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { UnsavedManualExecutionService } from '@/execution-lifecycle/unsaved-manual-execution.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import {
	findUnsavedManualExecutionForViewer,
	loadExecutionForViewer,
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
