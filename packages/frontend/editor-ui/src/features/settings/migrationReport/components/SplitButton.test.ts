import { screen } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import SplitButton from './SplitButton.vue';

const renderComponent = createComponentRenderer(SplitButton, {
	props: {
		label: "Mark won't fix",
		actions: [{ label: "Mark won't fix and archive", value: 'wontFixAndArchive' }],
	},
});

describe('SplitButton', () => {
	it('should disable the toggle together with the main button', () => {
		renderComponent({ props: { disabled: true } });

		expect(screen.getByRole('button', { name: "Mark won't fix" })).toBeDisabled();
		expect(screen.getByTestId('split-button-toggle')).toBeDisabled();
	});

	it('should enable the toggle when the main button is enabled', () => {
		renderComponent();

		expect(screen.getByRole('button', { name: "Mark won't fix" })).toBeEnabled();
		expect(screen.getByTestId('split-button-toggle')).toBeEnabled();
	});
});
