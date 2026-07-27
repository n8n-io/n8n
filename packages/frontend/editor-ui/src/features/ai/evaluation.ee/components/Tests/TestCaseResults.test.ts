import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import TestCaseResults from './TestCaseResults.vue';
import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ref({ workflowId: 'wf-1' }),
}));

vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => 'wf-1'),
		useRouteWorkflowId: () => computed(() => 'wf-1'),
	};
});

const mockRunAll = vi.fn().mockResolvedValue(true);
vi.mock('../../composables/useTestCasePersistence', () => ({
	useTestCasePersistence: () => ({
		runAll: mockRunAll,
		isPersisting: ref(false),
		persistAndRunCase: vi.fn(),
	}),
}));

const mockHydrate = vi.fn().mockResolvedValue(undefined);
vi.mock('../WizardSidepanel/useWizardHydration', () => ({
	useWizardHydration: () => ({ hydrate: mockHydrate, isHydrating: ref(false) }),
}));

// Stub the suite-config editor; covered by its own spec.
vi.mock('./SuiteConfig.vue', () => ({
	default: { name: 'SuiteConfig', template: '<div data-test-id="suite-config-stub" />' },
}));

// Stub the card so this test only covers the list shell.
vi.mock('./TestCaseResultCard.vue', () => ({
	default: {
		name: 'TestCaseResultCard',
		props: ['index'],
		template: '<div :data-test-id="`result-card-${index}`" />',
	},
}));

const renderComponent = createComponentRenderer(TestCaseResults);

function setup() {
	createTestingPinia({ stubActions: false });
	return useEvaluationsWizardSidepanelStore();
}

describe('TestCaseResults', () => {
	beforeEach(() => {
		mockRunAll.mockReset().mockResolvedValue(true);
		mockHydrate.mockClear();
	});

	it('re-hydrates on mount so cases created in the detail view appear', () => {
		setup();
		renderComponent();
		expect(mockHydrate).toHaveBeenCalled();
	});

	it('renders the Create case and Run all actions', () => {
		setup();
		const { getByTestId } = renderComponent();
		expect(getByTestId('tests-results-create-case')).toBeInTheDocument();
		expect(getByTestId('tests-results-run-all')).toBeInTheDocument();
	});

	it('switches to the create view when Create case is clicked', async () => {
		const store = setup();
		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('tests-results-create-case'));
		expect(store.viewMode).toBe('create');
	});

	it('renders a result card per test case row', () => {
		const store = setup();
		store.datasetInputsByRow = [{ q: 'a' }, { q: 'b' }];
		const { getByTestId } = renderComponent();
		expect(getByTestId('result-card-0')).toBeInTheDocument();
		expect(getByTestId('result-card-1')).toBeInTheDocument();
	});

	it('runs all cases when Run all is clicked', async () => {
		const store = setup();
		store.datasetInputsByRow = [{ q: 'a' }];
		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('tests-results-run-all'));
		expect(mockRunAll).toHaveBeenCalledTimes(1);
	});

	it('shows an empty state when there are no test cases', () => {
		setup();
		const { getByText } = renderComponent();
		expect(getByText('evaluations.tests.results.empty')).toBeInTheDocument();
	});
});
