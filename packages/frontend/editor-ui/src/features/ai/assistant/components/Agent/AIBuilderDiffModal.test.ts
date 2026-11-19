import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, h } from 'vue';
import { within } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { createEventBus } from '@n8n/utils/event-bus';
import { AI_BUILDER_DIFF_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import AIBuilderDiffModal from './AIBuilderDiffModal.vue';
import type { IWorkflowDb } from '@/Interface';

// Mock WorkflowDiffView component
vi.mock('@/features/workflows/workflowDiff/WorkflowDiffView.vue', () => ({
	default: defineComponent({
		name: 'WorkflowDiffView',
		props: ['sourceWorkflow', 'targetWorkflow', 'sourceLabel', 'targetLabel'],
		setup(props) {
			return () =>
				h('div', {
					'data-test-id': 'workflow-diff-view',
					'data-source-label': props.sourceLabel,
					'data-target-label': props.targetLabel,
				});
		},
	}),
}));

// Mock telemetry
const trackMock = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: trackMock,
	}),
}));

// Mock vue-router
vi.mock('vue-router', () => ({
	useRoute: vi.fn(() => ({ path: '/', params: {}, name: 'NodeViewNew' })),
	useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
	RouterLink: vi.fn(),
}));

// Mock useI18n
vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

// Mock useWorkflowSaving
vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: () => ({
		saveCurrentWorkflow: vi.fn(),
	}),
}));

// Mock useDocumentTitle
vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({
		set: vi.fn(),
		reset: vi.fn(),
		setDocumentTitle: vi.fn(),
		getDocumentState: vi.fn(),
	}),
}));

// Mock useBrowserNotifications
vi.mock('@/app/composables/useBrowserNotifications', () => ({
	useBrowserNotifications: () => ({
		showNotification: vi.fn(),
		isEnabled: { value: false },
		canPrompt: { value: false },
		requestPermission: vi.fn(),
	}),
}));

// Mock useToast
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({
		showMessage: vi.fn(),
		showError: vi.fn(),
	}),
}));

// Mock workflowHistory API
vi.mock('@n8n/rest-api-client/api/workflowHistory', () => ({
	getWorkflowVersionsByIds: vi.fn(),
}));

const sourceWorkflow = {
	id: 'wf-1',
	name: 'Test Workflow',
	nodes: [],
	connections: {},
} as unknown as IWorkflowDb;

const targetWorkflow = {
	id: 'wf-1',
	name: 'Test Workflow',
	nodes: [
		{
			id: 'node-1',
			name: 'New Node',
			type: 'n8n-nodes-base.httpRequest',
			position: [0, 0],
			parameters: {},
			typeVersion: 1,
		},
	],
	connections: {},
} as unknown as IWorkflowDb;

describe('AIBuilderDiffModal', () => {
	const renderComponent = createComponentRenderer(AIBuilderDiffModal);

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		useUIStore().openModal(AI_BUILDER_DIFF_MODAL_KEY);
	});

	const getDefaultProps = () => ({
		props: {
			data: {
				eventBus: createEventBus(),
				sourceWorkflow,
				targetWorkflow,
				sourceLabel: 'Previous version',
				targetLabel: 'Current version',
			},
		},
	});

	it('renders WorkflowDiffView with correct props', async () => {
		renderComponent(getDefaultProps());
		const diffView = await within(document.body).findByTestId('workflow-diff-view');

		expect(diffView).toBeInTheDocument();
		expect(diffView.getAttribute('data-source-label')).toBe('Previous version');
		expect(diffView.getAttribute('data-target-label')).toBe('Current version');
	});

	it('tracks telemetry on mount with source ai-builder-review', () => {
		renderComponent(getDefaultProps());

		expect(trackMock).toHaveBeenCalledWith('Workflow diff view opened', {
			source: 'ai-builder-review',
		});
	});

	it('tracks telemetry on close', async () => {
		renderComponent(getDefaultProps());

		expect(await within(document.body).findByTestId('workflow-diff-view')).toBeInTheDocument();

		trackMock.mockClear();

		expect(trackMock).not.toHaveBeenCalledWith('Workflow diff view closed', {
			source: 'ai-builder-review',
		});
	});
});
