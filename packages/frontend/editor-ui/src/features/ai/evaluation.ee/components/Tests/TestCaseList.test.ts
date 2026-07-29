import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';

import type { ExecutionSummary } from 'n8n-workflow';

import { createComponentRenderer } from '@/__tests__/render';
import TestCaseList from './TestCaseList.vue';
import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ref({ workflowId: 'wf-1', allNodes: [] }),
	createWorkflowDocumentId: (id: string) => id,
	useWorkflowDocumentStore: () => ({}),
}));

vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		useRouter: () => ({ push: vi.fn() }),
		useRoute: () => ({ name: 'NodeView', params: { workflowId: 'wf-1' } }),
	};
});

vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => 'wf-1'),
		useRouteWorkflowId: () => computed(() => 'wf-1'),
	};
});

vi.mock('../../composables/useAiRootNodes', () => ({
	useAiRootNodes: () => ref([{ name: 'Darwin', type: '@n8n/n8n-nodes-langchain.agent' }]),
}));

const mockFetchExecutions = vi.fn().mockResolvedValue({ results: [] });
const mockFetchExecution = vi.fn().mockResolvedValue(null);

vi.mock('@/features/execution/executions/executions.store', () => ({
	useExecutionsStore: () => ({
		fetchExecutions: mockFetchExecutions,
		fetchExecution: mockFetchExecution,
	}),
}));

// Stub ExecutionRow — emits `create` via a button so we can test the parent's
// create handler without the row's own fetch/preview logic.
vi.mock('./ExecutionRow.vue', () => ({
	default: {
		name: 'ExecutionRow',
		props: ['execution', 'alt'],
		emits: ['create'],
		template:
			'<button :data-test-id="`exec-row-${execution.id}`" @click="$emit(\'create\')">row</button>',
	},
}));

// ─── Test setup ──────────────────────────────────────────────────────────────

const renderComponent = createComponentRenderer(TestCaseList);

function setup() {
	createTestingPinia({ stubActions: false });
	return useEvaluationsWizardSidepanelStore();
}

const successExecution = {
	id: 'exec-1',
	mode: 'manual',
	status: 'success',
	workflowId: 'wf-1',
	startedAt: new Date('2026-01-01T00:00:00Z'),
	createdAt: new Date('2026-01-01T00:00:00Z'),
} as unknown as ExecutionSummary;

describe('TestCaseList', () => {
	beforeEach(() => {
		mockFetchExecutions.mockReset().mockResolvedValue({ results: [] });
		mockFetchExecution.mockReset().mockResolvedValue(null);
	});

	it('renders the root and the manual-creation option', () => {
		setup();
		const { getByTestId } = renderComponent();
		expect(getByTestId('tests-list')).toBeInTheDocument();
		expect(getByTestId('tests-list-create-manual')).toBeInTheDocument();
	});

	it('renders an ExecutionRow per successful non-eval execution', async () => {
		setup();
		mockFetchExecutions.mockResolvedValue({
			results: [successExecution, { ...successExecution, id: 'exec-2' }],
		});

		const { findByTestId } = renderComponent();
		expect(await findByTestId('exec-row-exec-1')).toBeInTheDocument();
		expect(await findByTestId('exec-row-exec-2')).toBeInTheDocument();
	});

	it('filters out evaluation-mode executions', async () => {
		setup();
		mockFetchExecutions.mockResolvedValue({
			results: [successExecution, { ...successExecution, id: 'exec-eval', mode: 'evaluation' }],
		});

		const { findByTestId, queryByTestId } = renderComponent();
		await findByTestId('exec-row-exec-1');
		expect(queryByTestId('exec-row-exec-eval')).toBeNull();
	});

	it('shows the empty hint when there are no executions', async () => {
		setup();
		mockFetchExecutions.mockResolvedValue({ results: [] });

		const { getByText } = renderComponent();
		await new Promise((r) => setTimeout(r, 0));
		expect(getByText('evaluations.tests.executions.empty')).toBeInTheDocument();
	});

	it('seeds and opens a new case when a row emits create', async () => {
		const store = setup();
		mockFetchExecutions.mockResolvedValue({ results: [successExecution] });
		mockFetchExecution.mockResolvedValue({ id: 'exec-1', data: { resultData: { runData: {} } } });
		const openDetailSpy = vi.spyOn(store, 'openDetail');
		const setSeedSpy = vi.spyOn(store, 'setSeedExecution');

		const { findByTestId } = renderComponent();
		await userEvent.click(await findByTestId('exec-row-exec-1'));

		expect(mockFetchExecution).toHaveBeenCalledWith('exec-1');
		expect(setSeedSpy).toHaveBeenCalled();
		expect(openDetailSpy).toHaveBeenCalledWith(null);
	});
});
