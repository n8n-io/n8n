import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, within } from '@testing-library/vue';
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

	it('uses the medium-height token for the trigger container', () => {
		const { getByTestId } = renderComponent();
		const triggerContainer = getByTestId('assignment-type-select').querySelector('span');

		expect(triggerContainer).toHaveStyle({ height: 'var(--height--md)' });
	});

	it('renders default state correctly and emit events', async () => {
		const { getByTestId, emitted } = renderComponent();
		const typeSelect = getByTestId('assignment-type-select');
		expect(typeSelect).toBeInTheDocument();

		await userEvent.click(within(typeSelect).getByRole('button'));

		const options = screen.getAllByRole('menuitem');
		expect(options.length).toEqual(6);

		expect(options[0]).toHaveTextContent('String');
		expect(options[1]).toHaveTextContent('Number');
		expect(options[2]).toHaveTextContent('Boolean');
		expect(options[3]).toHaveTextContent('Array');
		expect(options[4]).toHaveTextContent('Object');

		await userEvent.click(screen.getByRole('menuitem', { name: 'Boolean' }));

		expect(emitted('update:model-value')).toEqual([['boolean']]);
	});
});
