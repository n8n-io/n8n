import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useCreateCaseFromExecution } from './useCreateCaseFromExecution';
import { useEvaluationsWizardSidepanelStore } from '../wizardSidepanel.store';

const mockFetchExecution = vi.fn();
const mockFetchExecutions = vi.fn();
const mockTrack = vi.fn();

vi.mock('@/features/execution/executions/executions.store', () => ({
	useExecutionsStore: () => ({
		fetchExecution: mockFetchExecution,
		fetchExecutions: mockFetchExecutions,
	}),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ({ value: { workflowId: 'wf-1' } }),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mockTrack }),
}));

vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => 'wf-1'),
		useRouteWorkflowId: () => computed(() => 'wf-1'),
	};
});

const execution = {
	id: 'exec-1',
	data: {
		resultData: {
			runData: {
				Darwin: [{ data: { main: [[{ json: { response: 'the answer' } }]] } }],
			},
		},
	},
} as never;

describe('useCreateCaseFromExecution', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		mockFetchExecution.mockReset().mockResolvedValue(execution);
		mockFetchExecutions.mockReset().mockResolvedValue({ results: [] });
		mockTrack.mockReset();
	});

	it('seeds a new case from an execution and opens the detail', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.aiNodeName = 'Darwin';
		const { createFromExecution } = useCreateCaseFromExecution();

		createFromExecution(execution);

		expect(store.seedExecution).toEqual(execution);
		expect(store.expectedValues.expectedAnswer).toBe('the answer');
		expect(store.viewMode).toBe('detail');
		expect(store.activeRowIndex).toBeNull();
		expect(mockTrack).toHaveBeenCalledWith('User created evaluation test case', {
			workflow_id: 'wf-1',
			source: 'execution',
			execution_id: 'exec-1',
		});
	});

	it('fetches the execution by id then seeds', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.aiNodeName = 'Darwin';
		const { createFromExecutionId } = useCreateCaseFromExecution();

		const ok = await createFromExecutionId('exec-1');

		expect(ok).toBe(true);
		expect(mockFetchExecution).toHaveBeenCalledWith('exec-1');
		expect(store.seedExecution).toEqual(execution);
		expect(store.viewMode).toBe('detail');
	});

	it('returns false when the execution cannot be loaded', async () => {
		mockFetchExecution.mockResolvedValue(null);
		const { createFromExecutionId } = useCreateCaseFromExecution();
		expect(await createFromExecutionId('missing')).toBe(false);
	});

	it('start-from-scratch resolves the last non-eval execution for the field shape without prefilling values', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		mockFetchExecutions.mockResolvedValue({
			results: [
				{ id: 'exec-eval', mode: 'evaluation' },
				{ id: 'exec-1', mode: 'manual' },
			],
		});
		const { createManualCase } = useCreateCaseFromExecution();

		await createManualCase();

		// The newest real (non-eval) run is resolved and used for the field shape.
		expect(mockFetchExecution).toHaveBeenCalledWith('exec-1');
		expect(store.seedExecution).toEqual(execution);
		// Values stay blank — only the shape is borrowed.
		expect(store.prefillInputsFromExecution).toBe(false);
		expect(store.inputs).toEqual({});
		expect(store.expectedValues).toEqual({});
		expect(store.viewMode).toBe('detail');
		expect(store.activeRowIndex).toBeNull();
		expect(mockTrack).toHaveBeenCalledWith('User created evaluation test case', {
			workflow_id: 'wf-1',
			source: 'manual',
		});
	});

	it('start-from-scratch still opens a blank case when there is no prior run', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		mockFetchExecutions.mockResolvedValue({ results: [] });
		const { createManualCase } = useCreateCaseFromExecution();

		await createManualCase();

		expect(store.seedExecution).toBeNull();
		expect(store.prefillInputsFromExecution).toBe(false);
		expect(store.viewMode).toBe('detail');
	});
});
