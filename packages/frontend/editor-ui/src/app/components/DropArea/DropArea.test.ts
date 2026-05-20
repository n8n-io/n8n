import { createComponentRenderer } from '@/__tests__/render';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { NDVStoreKey } from '@/app/constants/injectionKeys';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { shallowRef } from 'vue';
import DropArea from './DropArea.vue';

function setupNdvStore() {
	const workflowsStore = useWorkflowsStore();
	workflowsStore.setWorkflowId('test-workflow');
	const ndvStore = useNDVStore(createWorkflowDocumentId(workflowsStore.workflowId));
	return { ndvStore, ndvStoreRef: shallowRef(ndvStore) };
}

async function fireDrop(
	dropArea: HTMLElement,
	ndvStore: ReturnType<typeof useNDVStore>,
): Promise<void> {
	ndvStore.draggableStartDragging({
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

		const { ndvStore, ndvStoreRef } = setupNdvStore();

		const renderComponent = createComponentRenderer(DropArea, {
			pinia: createTestingPinia(),
			global: {
				provide: {
					[NDVStoreKey as symbol]: ndvStoreRef,
				},
			},
		});

		const { getByTestId, emitted } = renderComponent({ pinia });
		expect(getByTestId('drop-area')).toBeInTheDocument();

		await fireDrop(getByTestId('drop-area'), ndvStore);

		expect(emitted('drop')).toEqual([['{{ $json.something }}']]);
	});
});
