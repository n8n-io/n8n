import { createComponentRenderer } from '@/__tests__/render';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import DropArea from './DropArea.vue';

const renderComponent = createComponentRenderer(DropArea, {
	pinia: createTestingPinia(),
});

async function fireDrop(dropArea: HTMLElement, workflowId: string): Promise<void> {
	useNDVStore(createWorkflowDocumentId(workflowId)).draggableStartDragging({
		type: 'mapping',
		data: '{{ $json.something }}',
		dimensions: null,
	});

	await userEvent.hover(dropArea);
	await fireEvent.mouseUp(dropArea);
}

describe('DropArea.vue', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders default state correctly and emits drop events', async () => {
		const pinia = createPinia();
		setActivePinia(pinia);
		const workflowsStore = useWorkflowsStore();
		workflowsStore.setWorkflowId('test-workflow-id');

		const { getByTestId, emitted } = renderComponent({ pinia });
		expect(getByTestId('drop-area')).toBeInTheDocument();

		await fireDrop(getByTestId('drop-area'), workflowsStore.workflowId);

		expect(emitted('drop')).toEqual([['{{ $json.something }}']]);
	});
});
