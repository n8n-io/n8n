import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed, ref, nextTick } from 'vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';

const mockAllNodes = ref<Array<{ name: string; type: string }>>([]);
const mockActive = ref(true);
const mockWorkflowId = ref('wf-1');
vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ({
		value: {
			get workflowId() {
				return mockWorkflowId.value;
			},
			get active() {
				return mockActive.value;
			},
			get allNodes() {
				return mockAllNodes.value;
			},
		},
	}),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => `mocked-${key}` }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

// Wizard store: only `open()` is exercised by the CTA.
const wizardOpen = vi.fn();
const wizardIsOpen = ref(false);
vi.mock('../../wizardSidepanel.store', () => ({
	useEvaluationsWizardSidepanelStore: () => ({
		open: wizardOpen,
		get isOpen() {
			return wizardIsOpen.value;
		},
	}),
}));

const isFeatureEnabled = ref(true);
vi.mock('@/experiments/evaluationsWizardSidepanel/useEvaluationsWizardSidepanelExperiment', () => ({
	useEvaluationsWizardSidepanelExperiment: () => ({ isFeatureEnabled }),
}));

const trackMock = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

const mockIsLicensed = ref(true);
const mockEnsureLicenseLoaded = vi.fn().mockResolvedValue(undefined);
vi.mock('../../composables/useEvaluationsLicense', () => ({
	useEvaluationsLicense: () => ({
		isLicensed: computed(() => mockIsLicensed.value),
		isResolved: computed(() => true),
		ensureLicenseLoaded: mockEnsureLicenseLoaded,
	}),
}));

const listEvaluationConfigs = vi.fn();
vi.mock('../../evaluation.api', () => ({
	listEvaluationConfigs: (...args: unknown[]) => listEvaluationConfigs(...args),
}));

import EvaluationsCanvasInfoCard from './EvaluationsCanvasInfoCard.vue';

const renderComponent = createComponentRenderer(EvaluationsCanvasInfoCard);

const AI_NODE = { name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' };
const PLAIN_NODE = { name: 'Set', type: 'n8n-nodes-base.set' };

describe('EvaluationsCanvasInfoCard', () => {
	beforeEach(() => {
		mockAllNodes.value = [PLAIN_NODE, AI_NODE];
		mockActive.value = true;
		mockWorkflowId.value = `wf-${Math.random().toString(36).slice(2, 8)}`;
		isFeatureEnabled.value = true;
		mockIsLicensed.value = true;
		mockEnsureLicenseLoaded.mockReset();
		mockEnsureLicenseLoaded.mockResolvedValue(undefined);
		wizardOpen.mockReset();
		trackMock.mockReset();
		wizardIsOpen.value = false;
		listEvaluationConfigs.mockReset();
		listEvaluationConfigs.mockResolvedValue([]);
		localStorage.clear();
	});

	it('renders when all conditions match (active + AI node + no configs + not dismissed)', async () => {
		const { findByTestId } = renderComponent();
		await findByTestId('evaluations-canvas-info-card');
		expect(listEvaluationConfigs).toHaveBeenCalled();
	});

	it('hides when the experiment flag is off', async () => {
		isFeatureEnabled.value = false;
		const { queryByTestId } = renderComponent();
		await nextTick();
		expect(queryByTestId('evaluations-canvas-info-card')).not.toBeInTheDocument();
		expect(listEvaluationConfigs).not.toHaveBeenCalled();
	});

	it('hides when the workflow is not active', async () => {
		mockActive.value = false;
		const { queryByTestId } = renderComponent();
		await nextTick();
		expect(queryByTestId('evaluations-canvas-info-card')).not.toBeInTheDocument();
		expect(listEvaluationConfigs).not.toHaveBeenCalled();
	});

	it('hides when the workflow has no AI root node', async () => {
		mockAllNodes.value = [PLAIN_NODE];
		const { queryByTestId } = renderComponent();
		await nextTick();
		expect(queryByTestId('evaluations-canvas-info-card')).not.toBeInTheDocument();
		expect(listEvaluationConfigs).not.toHaveBeenCalled();
	});

	it('hides once at least one evaluation config exists', async () => {
		listEvaluationConfigs.mockResolvedValue([{ id: 'c1' }]);
		const { queryByTestId } = renderComponent();
		// Wait for the async fetch + watcher to settle.
		await new Promise((resolve) => setTimeout(resolve, 0));
		await nextTick();
		expect(queryByTestId('evaluations-canvas-info-card')).not.toBeInTheDocument();
	});

	it('dismisses per-workflow and persists across remounts', async () => {
		const wfId = mockWorkflowId.value;
		const { findByTestId, queryByTestId, unmount } = renderComponent();

		const dismissBtn = await findByTestId('evaluations-canvas-info-card-dismiss');
		await userEvent.click(dismissBtn);
		expect(queryByTestId('evaluations-canvas-info-card')).not.toBeInTheDocument();
		unmount();

		// Same workflow id → stays dismissed.
		mockWorkflowId.value = wfId;
		const { queryByTestId: queryByTestIdRetry } = renderComponent();
		await nextTick();
		expect(queryByTestIdRetry('evaluations-canvas-info-card')).not.toBeInTheDocument();
	});

	it('opens the wizard when the setup CTA is clicked', async () => {
		const { findByTestId } = renderComponent();
		const setupBtn = await findByTestId('evaluations-canvas-info-card-setup');
		await userEvent.click(setupBtn);
		expect(wizardOpen).toHaveBeenCalledWith(0);
	});

	it('tracks "User opened evaluations wizard" with the canvas_info_card source on setup CTA', async () => {
		const wfId = mockWorkflowId.value;
		const { findByTestId } = renderComponent();
		const setupBtn = await findByTestId('evaluations-canvas-info-card-setup');
		await userEvent.click(setupBtn);
		expect(trackMock).toHaveBeenCalledWith('User opened evaluations wizard', {
			workflow_id: wfId,
			source: 'canvas_info_card',
		});
	});

	it('hides while the evaluations wizard is already open', async () => {
		wizardIsOpen.value = true;
		const { queryByTestId } = renderComponent();
		await nextTick();
		expect(queryByTestId('evaluations-canvas-info-card')).not.toBeInTheDocument();
	});

	it('re-checks configs when switching to another qualifying workflow', async () => {
		// First workflow has a config → card stays hidden.
		listEvaluationConfigs.mockResolvedValue([{ id: 'c1' }]);
		const { queryByTestId, findByTestId } = renderComponent();
		await new Promise((resolve) => setTimeout(resolve, 0));
		await nextTick();
		expect(queryByTestId('evaluations-canvas-info-card')).not.toBeInTheDocument();

		// Switch to a second qualifying workflow that has no configs. The card
		// must re-fetch and surface, not reuse the first workflow's result.
		listEvaluationConfigs.mockResolvedValue([]);
		mockWorkflowId.value = 'wf-2';
		await findByTestId('evaluations-canvas-info-card');
		expect(listEvaluationConfigs).toHaveBeenCalledWith(expect.anything(), 'wf-2');
	});

	it('re-checks configs when the wizard closes after a successful run', async () => {
		const { findByTestId, queryByTestId } = renderComponent();
		await findByTestId('evaluations-canvas-info-card');

		// Open the wizard — card hides while it's open.
		wizardIsOpen.value = true;
		await nextTick();
		expect(queryByTestId('evaluations-canvas-info-card')).not.toBeInTheDocument();

		// User creates a config inside the wizard, then closes it. The next
		// configs fetch must reflect the new config, otherwise the card pops
		// back up.
		listEvaluationConfigs.mockResolvedValue([{ id: 'c1' }]);
		wizardIsOpen.value = false;
		await new Promise((resolve) => setTimeout(resolve, 0));
		await nextTick();
		expect(queryByTestId('evaluations-canvas-info-card')).not.toBeInTheDocument();
	});

	it('hides when the user is unlicensed (limit 0) even with all other conditions met', async () => {
		mockIsLicensed.value = false;
		const { queryByTestId } = renderComponent();
		await nextTick();
		expect(queryByTestId('evaluations-canvas-info-card')).not.toBeInTheDocument();
		expect(listEvaluationConfigs).not.toHaveBeenCalled();
	});

	it('shows when the user is licensed (limit -1) with all other conditions met', async () => {
		mockIsLicensed.value = true;
		const { findByTestId } = renderComponent();
		await findByTestId('evaluations-canvas-info-card');
	});

	it('calls ensureLicenseLoaded on mount', async () => {
		renderComponent();
		await nextTick();
		expect(mockEnsureLicenseLoaded).toHaveBeenCalled();
	});
});
