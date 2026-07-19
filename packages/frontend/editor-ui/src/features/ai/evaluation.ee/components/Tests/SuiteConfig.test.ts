import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import SuiteConfig from './SuiteConfig.vue';
import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => 'wf-1'),
		useRouteWorkflowId: () => computed(() => 'wf-1'),
	};
});

const mockSaveConfig = vi.fn().mockResolvedValue('config-1');
vi.mock('../../composables/useTestCasePersistence', () => ({
	useTestCasePersistence: () => ({
		saveConfig: mockSaveConfig,
		persistAndRunCase: vi.fn(),
		runAll: vi.fn(),
		isPersisting: ref(false),
	}),
}));

vi.mock('../../composables/useAiRootNodes', () => ({
	useAiRootNodes: () => ref([{ name: 'Darwin', type: '@n8n/n8n-nodes-langchain.agent' }]),
}));

const renderComponent = createComponentRenderer(SuiteConfig);

function setup() {
	createTestingPinia({ stubActions: false });
	return useEvaluationsWizardSidepanelStore();
}

describe('SuiteConfig', () => {
	beforeEach(() => {
		mockSaveConfig.mockReset().mockResolvedValue('config-1');
	});

	it('renders the suite node selector', () => {
		setup();
		const { getByTestId } = renderComponent();
		expect(getByTestId('tests-suite-config')).toBeInTheDocument();
		expect(getByTestId('tests-suite-config-ai-node-select')).toBeInTheDocument();
	});

	it('shows the default correctness check as a chip using the dropdown option label', () => {
		const store = setup();
		store.selectedMetricKeys = ['correctness'];
		const { getByTestId } = renderComponent();
		const chip = getByTestId('tests-suite-config-metric-correctness');
		expect(chip).toBeInTheDocument();
		// The chip label matches the "Add metric" dropdown option (not the noun label).
		expect(chip).toHaveTextContent('evaluations.tests.metric.correctness.option');
	});

	it('removes a metric from the suite when its chip is clicked', async () => {
		const store = setup();
		store.selectedMetricKeys = ['correctness'];
		const { getByTestId } = renderComponent();
		// The chip is a single removable button: clicking it drops the metric.
		await userEvent.click(getByTestId('tests-suite-config-metric-correctness'));
		expect(store.selectedMetricKeys).not.toContain('correctness');
	});

	it('renders an editable expression for a custom check', () => {
		const store = setup();
		store.customChecks = [{ id: 'c1', name: 'Custom 1', expression: '$json.x > 1' }];
		const { getByTestId } = renderComponent();
		expect(getByTestId('tests-suite-config-custom-c1')).toBeInTheDocument();
	});
});
