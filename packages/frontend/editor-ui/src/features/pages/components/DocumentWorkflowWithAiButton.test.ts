import userEvent from '@testing-library/user-event';
import { ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';

import DocumentWorkflowWithAiButton from './DocumentWorkflowWithAiButton.vue';

const mocks = vi.hoisted(() => ({
	documentWorkflow: vi.fn(),
	isAvailable: undefined as unknown as { value: boolean },
}));

vi.mock('../composables/useDocumentWorkflowWithAi', () => ({
	useDocumentWorkflowWithAi: () => ({
		isAvailable: mocks.isAvailable,
		isStarting: ref(false),
		documentWorkflow: mocks.documentWorkflow,
	}),
}));

const workflow = { id: 'w1', name: 'Invoice sync' };
const renderComponent = createComponentRenderer(DocumentWorkflowWithAiButton, {
	props: { workflow, projectId: 'p1' },
});

describe('DocumentWorkflowWithAiButton', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.isAvailable = ref(true);
		mocks.documentWorkflow.mockResolvedValue(true);
	});

	it('should show the labelled button when the action is available', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('workflow-pages-document-with-ai')).toHaveTextContent('Document with AI');
	});

	it('should render nothing when the action is not available', () => {
		mocks.isAvailable.value = false;

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('workflow-pages-document-with-ai')).not.toBeInTheDocument();
	});

	it('should hand the workflow and the project to the assistant and emit started', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('workflow-pages-document-with-ai'));

		expect(mocks.documentWorkflow).toHaveBeenCalledExactlyOnceWith(workflow, 'p1');
		expect(emitted('started')).toHaveLength(1);
	});

	it('should not emit started when no thread opened', async () => {
		mocks.documentWorkflow.mockResolvedValue(false);
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('workflow-pages-document-with-ai'));

		expect(emitted('started')).toBeUndefined();
	});
});
