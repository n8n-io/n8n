import { describe, it, expect, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { createRunExecutionData } from 'n8n-workflow';
import type { ExecutionError } from 'n8n-workflow';
import type { Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { executionRecovered } from './executionRecovered';
import type { IWorkflowDb } from '@/Interface';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import type { PushHandlerOptions } from './types';

vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

const mockShowMessage = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: mockShowMessage }),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ setDocumentTitle: vi.fn() }),
}));

vi.mock('@/app/composables/useRunWorkflow', () => ({
	useRunWorkflow: vi.fn(() => ({ runWorkflow: vi.fn() })),
}));

const documentId = createWorkflowDocumentId('1');
const opts: PushHandlerOptions = { router: mock<Router>(), documentId };

describe('executionRecovered', () => {
	it('shows the error toast when the recovered execution crashed', async () => {
		setActivePinia(createTestingPinia({ stubActions: false }));

		const executionId = 'crashed-exec';
		useWorkflowExecutionStateStore(documentId).setActiveExecutionId(executionId);
		const error = { message: 'Workflow crashed', name: 'WorkflowCrashedError' } as ExecutionError;
		vi.spyOn(useWorkflowsStore(), 'fetchExecutionDataById').mockResolvedValue({
			id: executionId,
			workflowId: '1',
			finished: false,
			mode: 'manual',
			status: 'crashed',
			startedAt: new Date(),
			createdAt: new Date(),
			workflowData: mock<IWorkflowDb>({ id: '1', nodes: [], connections: {} }),
			data: createRunExecutionData({ resultData: { runData: {}, error } }),
		});

		await executionRecovered({ type: 'executionRecovered', data: { executionId } }, opts);

		expect(mockShowMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
	});
});
