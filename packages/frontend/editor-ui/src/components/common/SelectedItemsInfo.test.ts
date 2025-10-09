import { createComponentRenderer } from '@/__tests__/render';
import SelectedItemsInfo from '@/components/common/SelectedItemsInfo.vue';

const renderComponent = createComponentRenderer(SelectedItemsInfo);

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

describe('SelectedItemsInfo', () => {
	it('should not render when selectedCount is 0', () => {
		const { queryByTestId } = renderComponent({
			props: {
				selectedCount: 0,
			},
		});

		expect(queryByTestId('selected-items-info')).not.toBeInTheDocument();
	});

	it('should render when selectedCount is greater than 0', () => {
		const { getByTestId } = renderComponent({
			props: {
				selectedCount: 3,
			},
		});

		expect(getByTestId('selected-items-info')).toBeInTheDocument();
		expect(getByTestId('delete-selected-button')).toBeInTheDocument();
		expect(getByTestId('clear-selection-button')).toBeInTheDocument();
	});

	it('should emit deleteSelected event when delete button is clicked', () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				selectedCount: 1,
			},
		});

		getByTestId('delete-selected-button').click();

		expect(emitted().deleteSelected).toBeTruthy();
		expect(emitted().deleteSelected).toHaveLength(1);
	});

	it('should emit clearSelection event when clear button is clicked', () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				selectedCount: 5,
			},
		});

		getByTestId('clear-selection-button').click();

		expect(emitted().clearSelection).toBeTruthy();
		expect(emitted().clearSelection).toHaveLength(1);
	});
});
