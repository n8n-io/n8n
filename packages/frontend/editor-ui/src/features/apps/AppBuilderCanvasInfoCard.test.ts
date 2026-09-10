import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, nextTick } from 'vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';

const mockWorkflowId = ref('wf-1');
const mockWorkflowName = ref<string | undefined>('My workflow');
const mockActive = ref(true);
vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ({
		value: {
			get workflowId() {
				return mockWorkflowId.value;
			},
			get name() {
				return mockWorkflowName.value;
			},
			get active() {
				return mockActive.value;
			},
		},
	}),
}));

const mockIsCandidate = ref(true);
vi.mock('./useWebAppCandidateWorkflow', () => ({
	useWebAppCandidateWorkflow: () => ({ value: mockIsCandidate.value }),
}));

const mockInstanceAiReady = ref(true);
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', () => ({
	useInstanceAiReady: () => ({ value: mockInstanceAiReady.value }),
}));

const ensurePersonalProjectId = vi.fn().mockResolvedValue('project-1');
const startThread = vi.fn().mockResolvedValue(undefined);
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', () => ({
	ensurePersonalProjectId: (...args: unknown[]) => ensurePersonalProjectId(...args),
	useInstanceAiHandoff: () => ({ startThread }),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => `mocked-${key}` }),
}));

const trackMock = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

import AppBuilderCanvasInfoCard from './AppBuilderCanvasInfoCard.vue';

const renderComponent = createComponentRenderer(AppBuilderCanvasInfoCard);

describe('AppBuilderCanvasInfoCard', () => {
	beforeEach(() => {
		mockWorkflowId.value = `wf-${Math.random().toString(36).slice(2, 8)}`;
		mockWorkflowName.value = 'My workflow';
		mockActive.value = true;
		mockIsCandidate.value = true;
		mockInstanceAiReady.value = true;
		ensurePersonalProjectId.mockClear();
		startThread.mockClear();
		trackMock.mockClear();
		localStorage.clear();
	});

	it('renders when Instance AI is ready, the workflow is active and matches the candidate heuristic', async () => {
		const { findByTestId } = renderComponent();
		await findByTestId('app-builder-canvas-info-card');
	});

	it('hides when Instance AI is not ready', async () => {
		mockInstanceAiReady.value = false;
		const { queryByTestId } = renderComponent();
		await nextTick();
		expect(queryByTestId('app-builder-canvas-info-card')).not.toBeInTheDocument();
	});

	it('hides when the workflow is not active', async () => {
		mockActive.value = false;
		const { queryByTestId } = renderComponent();
		await nextTick();
		expect(queryByTestId('app-builder-canvas-info-card')).not.toBeInTheDocument();
	});

	it('hides when the workflow does not match the candidate heuristic', async () => {
		mockIsCandidate.value = false;
		const { queryByTestId } = renderComponent();
		await nextTick();
		expect(queryByTestId('app-builder-canvas-info-card')).not.toBeInTheDocument();
	});

	it('dismisses per-workflow and persists across remounts', async () => {
		const wfId = mockWorkflowId.value;
		const { findByTestId, queryByTestId, unmount } = renderComponent();

		const dismissBtn = await findByTestId('app-builder-canvas-info-card-dismiss');
		await userEvent.click(dismissBtn);
		expect(queryByTestId('app-builder-canvas-info-card')).not.toBeInTheDocument();
		unmount();

		mockWorkflowId.value = wfId;
		const { queryByTestId: queryByTestIdRetry } = renderComponent();
		await nextTick();
		expect(queryByTestIdRetry('app-builder-canvas-info-card')).not.toBeInTheDocument();
	});

	it('opens an Instance AI thread bound to the workflow when the CTA is clicked', async () => {
		const wfId = mockWorkflowId.value;
		const { findByTestId } = renderComponent();
		const cta = await findByTestId('app-builder-canvas-info-card-cta');
		await userEvent.click(cta);

		expect(ensurePersonalProjectId).toHaveBeenCalled();
		expect(startThread).toHaveBeenCalledWith(
			'project-1',
			'mocked-apps.canvasInfoCard.prompt',
			{ source: 'app_builder_canvas_info_card', origin: 'internal' },
			[{ type: 'workflow', id: wfId, name: 'My workflow' }],
		);
	});
});
