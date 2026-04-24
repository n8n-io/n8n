import { createComponentRenderer } from '@/__tests__/render';
import { injectNDVStore, useNDVStore, type NDVStoreId } from '@/features/ndv/shared/ndv.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import DropArea from './DropArea.vue';

vi.mock('@/features/ndv/shared/ndv.store', async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const original = await importOriginal<typeof import('@/features/ndv/shared/ndv.store')>();
	return { ...original, injectNDVStore: vi.fn() };
});

const TEST_NDV_STORE_ID = 'test-wf@latest' as NDVStoreId;

const renderComponent = createComponentRenderer(DropArea, {
	pinia: createTestingPinia(),
});

async function fireDrop(dropArea: HTMLElement): Promise<void> {
	useNDVStore(TEST_NDV_STORE_ID).draggableStartDragging({
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
		vi.mocked(injectNDVStore).mockReturnValue(useNDVStore(TEST_NDV_STORE_ID));

		const { getByTestId, emitted } = renderComponent({ pinia });
		expect(getByTestId('drop-area')).toBeInTheDocument();

		await fireDrop(getByTestId('drop-area'));

		expect(emitted('drop')).toEqual([['{{ $json.something }}']]);
	});
});
