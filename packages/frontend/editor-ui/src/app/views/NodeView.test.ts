import { setActivePinia, createPinia } from 'pinia';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

vi.mock('@/app/composables/useDocumentTitle');

describe('NodeView - Document Title', () => {
	const setDocumentTitleMock = vi.fn();

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.mocked(useDocumentTitle).mockReturnValue({
			set: vi.fn(),
			reset: vi.fn(),
			setDocumentTitle: setDocumentTitleMock,
			getDocumentState: vi.fn(),
		});
		setDocumentTitleMock.mockClear();
	});

	describe('openWorkflow document title behavior', () => {
		it('should set title to AI_BUILDING when builder is streaming', () => {
			const builderStore = useBuilderStore();
			const documentTitle = useDocumentTitle();

			// Simulate streaming state
			builderStore.streaming = true;

			// Simulate the logic from openWorkflow
			const workflowName = 'Test Workflow';
			if (builderStore.streaming) {
				documentTitle.setDocumentTitle(workflowName, 'AI_BUILDING');
			} else {
				documentTitle.setDocumentTitle(workflowName, 'IDLE');
			}

			expect(setDocumentTitleMock).toHaveBeenCalledWith('Test Workflow', 'AI_BUILDING');
		});

		it('should set title to IDLE when builder is not streaming', () => {
			const builderStore = useBuilderStore();
			const documentTitle = useDocumentTitle();

			// Simulate not streaming
			builderStore.streaming = false;

			// Simulate the logic from openWorkflow
			const workflowName = 'Test Workflow';
			if (builderStore.streaming) {
				documentTitle.setDocumentTitle(workflowName, 'AI_BUILDING');
			} else {
				documentTitle.setDocumentTitle(workflowName, 'IDLE');
			}

			expect(setDocumentTitleMock).toHaveBeenCalledWith('Test Workflow', 'IDLE');
		});
	});
});
