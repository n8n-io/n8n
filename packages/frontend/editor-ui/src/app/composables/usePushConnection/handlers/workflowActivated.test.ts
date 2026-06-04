import { workflowActivated } from './workflowActivated';
import type { WorkflowActivated } from '@n8n/api-types/push/workflow';
import * as activationConfirmation from '@/app/composables/useWorkflowActivateConfirmation';

const mockInitializeWorkspace = vi.fn();
vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations: vi.fn(() => ({
		initializeWorkspace: mockInitializeWorkspace,
	})),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		workflowId: 'wf-1',
	})),
}));

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: vi.fn(() => ({
		fetchWorkflow: vi.fn(),
	})),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: vi.fn(() => ({
		value: { activeVersionId: 'old-version' },
	})),
}));

vi.mock('@/features/shared/banners/banners.store', () => ({
	useBannersStore: vi.fn(() => ({
		removeBannerFromStack: vi.fn(),
	})),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: vi.fn(() => ({
		stateIsDirty: true, // Prevent fetchWorkflow from being called
	})),
}));

vi.mock('@/app/composables/useWorkflowActivateConfirmation');

describe('workflowActivated', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should resolve pending activation confirmation with workflowId and activeVersionId', async () => {
		const event: WorkflowActivated = {
			type: 'workflowActivated',
			data: { workflowId: 'wf-1', activeVersionId: 'v-1' },
		};

		await workflowActivated(event);

		expect(activationConfirmation.resolveActivationConfirmation).toHaveBeenCalledWith(
			'wf-1',
			'v-1',
		);
	});

	it('should resolve confirmation even for a different workflow', async () => {
		const event: WorkflowActivated = {
			type: 'workflowActivated',
			data: { workflowId: 'wf-other', activeVersionId: 'v-2' },
		};

		await workflowActivated(event);

		expect(activationConfirmation.resolveActivationConfirmation).toHaveBeenCalledWith(
			'wf-other',
			'v-2',
		);
	});
});
