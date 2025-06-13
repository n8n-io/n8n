import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import TypeSelect from './TypeSelect.vue';

const DEFAULT_SETUP = {
	pinia: createTestingPinia(),
	props: {
		modelValue: 'boolean',
	},
};

const renderComponent = createComponentRenderer(TypeSelect, DEFAULT_SETUP);

describe('TypeSelect.vue', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders default state correctly and emit events', async () => {
		const { getByTestId, baseElement, emitted } = renderComponent();
		expect(getByTestId('assignment-type-select')).toBeInTheDocument();

		await userEvent.click(
			getByTestId('assignment-type-select').querySelector('.select-trigger') as HTMLElement,
		);

		const options = baseElement.querySelectorAll('.option');
		expect(options.length).toEqual(5);

		expect(options[0]).toHaveTextContent('String');
		expect(options[1]).toHaveTextContent('Number');
		expect(options[2]).toHaveTextContent('Boolean');
		expect(options[3]).toHaveTextContent('Array');
		expect(options[4]).toHaveTextContent('Object');

		await userEvent.click(options[2]);

		expect(emitted('update:model-value')).toEqual([['boolean']]);
	});
});
