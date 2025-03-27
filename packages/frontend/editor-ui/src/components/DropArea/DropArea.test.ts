import { createComponentRenderer } from '@/__tests__/render';
import { useNDVStore } from '@/stores/ndv.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import DropArea from './DropArea.vue';

const renderComponent = createComponentRenderer(DropArea, {
	pinia: createTestingPinia(),
});

async function fireDrop(dropArea: HTMLElement): Promise<void> {
	useNDVStore().draggableStartDragging({
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

		const { getByTestId, emitted } = renderComponent({ pinia });
		expect(getByTestId('drop-area')).toBeInTheDocument();

		await fireDrop(getByTestId('drop-area'));

		expect(emitted('drop')).toEqual([['{{ $json.something }}']]);
	});
});
