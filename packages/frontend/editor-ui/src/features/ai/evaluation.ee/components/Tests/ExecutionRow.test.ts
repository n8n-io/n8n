import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';

import type { ExecutionSummary } from 'n8n-workflow';

import { createComponentRenderer } from '@/__tests__/render';
import ExecutionRow from './ExecutionRow.vue';
import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () =>
		ref({
			workflowId: 'wf-1',
			allNodes: [{ name: 'Darwin', type: 'trigger' }],
			connectionsBySourceNode: {},
		}),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({ isTriggerNode: () => true }),
}));

const mockFetchExecution = vi.fn();

vi.mock('@/features/execution/executions/executions.store', () => ({
	useExecutionsStore: () => ({ fetchExecution: mockFetchExecution }),
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

const execution = {
	id: 'exec-1',
	mode: 'manual',
	status: 'success',
	workflowId: 'wf-1',
	startedAt: new Date('2026-01-01T10:20:30Z'),
	createdAt: new Date('2026-01-01T10:20:30Z'),
} as unknown as ExecutionSummary;

const renderComponent = createComponentRenderer(ExecutionRow);

function setup() {
	createTestingPinia({ stubActions: false });
	const store = useEvaluationsWizardSidepanelStore();
	store.aiNodeName = 'Darwin';
	return store;
}

describe('ExecutionRow', () => {
	beforeEach(() => {
		mockFetchExecution.mockReset().mockResolvedValue(null);
	});

	it('renders a toggle and create button, collapsed by default', () => {
		setup();
		const { getByTestId, queryByTestId } = renderComponent({ props: { execution } });
		expect(getByTestId('tests-execution-toggle-exec-1')).toBeInTheDocument();
		expect(getByTestId('tests-execution-create-exec-1')).toBeInTheDocument();
		expect(queryByTestId('tests-execution-detail-exec-1')).toBeNull();
	});

	it('shows the manual-execution flask icon only for manual executions', () => {
		setup();
		const manual = renderComponent({ props: { execution } });
		expect(manual.queryByTestId('tests-execution-manual-exec-1')).toBeInTheDocument();

		const triggered = renderComponent({
			props: { execution: { ...execution, id: 'exec-2', mode: 'trigger' } },
		});
		expect(triggered.queryByTestId('tests-execution-manual-exec-2')).toBeNull();
	});

	it('emits create when the create button is clicked', async () => {
		setup();
		const { getByTestId, emitted } = renderComponent({ props: { execution } });
		await userEvent.click(getByTestId('tests-execution-create-exec-1'));
		expect(emitted('create')).toHaveLength(1);
	});

	it('expands and shows input/output from the fetched execution', async () => {
		setup();
		mockFetchExecution.mockResolvedValue({
			id: 'exec-1',
			data: {
				resultData: {
					runData: {
						Darwin: [{ data: { main: [[{ json: { chatInput: 'hello there' } }]] } }],
					},
				},
			},
		});

		const { getByTestId, findByTestId, findAllByText } = renderComponent({ props: { execution } });
		await userEvent.click(getByTestId('tests-execution-toggle-exec-1'));

		expect(mockFetchExecution).toHaveBeenCalledWith('exec-1');
		expect(await findByTestId('tests-execution-detail-exec-1')).toBeInTheDocument();
		// The field name and value render (here in both INPUT and OUTPUT groups,
		// since a trigger node's input item equals its output item).
		expect((await findAllByText('chatInput')).length).toBeGreaterThanOrEqual(1);
		expect((await findAllByText('hello there')).length).toBeGreaterThanOrEqual(1);
	});
});
