import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';

import N8nColorPicker from './ColorPicker.vue';

describe('components', () => {
	describe('N8nColorPicker', () => {
		it('renders a text field by default', () => {
			const { getByTestId, queryByTestId } = render(N8nColorPicker, {
				props: { name: 'color-picker', modelValue: '#FF0000' },
			});

			expect(getByTestId('color-picker-trigger')).toBeInTheDocument();
			expect(getByTestId('color-picker-input')).toHaveValue('#FF0000');
			expect(queryByTestId('color-picker-panel')).not.toBeInTheDocument();
		});

		it('hides the text field when showInput is false', () => {
			const { queryByTestId } = render(N8nColorPicker, {
				props: { name: 'color-picker', showInput: false },
			});

			expect(queryByTestId('color-picker-input')).not.toBeInTheDocument();
		});

		it('commits a predefined swatch when the user presses OK', async () => {
			const { getByTestId, emitted } = render(N8nColorPicker, {
				props: {
					modelValue: '#000000',
					predefine: ['#FF0000', '#00FF00'],
				},
			});

			await userEvent.click(getByTestId('color-picker-trigger'));
			await userEvent.click(getByTestId('color-picker-swatch-0'));
			await userEvent.click(getByTestId('color-picker-confirm'));

			expect(emitted('update:modelValue')[0]).toEqual(['#FF0000']);
			expect(emitted('change')[0]).toEqual(['#FF0000']);
			expect(emitted('active-change')[0]).toEqual(['#FF0000']);
		});

		it('writes rgba when alpha is enabled and the format is omitted', async () => {
			const { getByTestId, emitted } = render(N8nColorPicker, {
				props: {
					showAlpha: true,
					predefine: ['rgba(255, 0, 0, 0.5)'],
				},
			});

			await userEvent.click(getByTestId('color-picker-trigger'));
			await userEvent.click(getByTestId('color-picker-swatch-0'));
			await userEvent.click(getByTestId('color-picker-confirm'));

			expect(emitted('update:modelValue')[0]).toEqual(['rgba(255, 0, 0, 0.5)']);
		});

		it('clears the color', async () => {
			const { getByTestId, emitted } = render(N8nColorPicker, {
				props: { modelValue: '#FF0000' },
			});

			await userEvent.click(getByTestId('color-picker-trigger'));
			await userEvent.click(getByTestId('color-picker-clear'));

			expect(emitted('update:modelValue')[0]).toEqual([null]);
			expect(emitted('change')[0]).toEqual([null]);
		});

		it('does not open when it is disabled', async () => {
			const { getByTestId, queryByTestId } = render(N8nColorPicker, {
				props: { disabled: true },
			});

			await userEvent.click(getByTestId('color-picker-trigger'));

			expect(queryByTestId('color-picker-panel')).not.toBeInTheDocument();
		});

		it('commits a hex value typed in the text field', async () => {
			const { getByTestId, emitted } = render(N8nColorPicker, {
				props: { modelValue: '' },
			});

			await userEvent.click(getByTestId('color-picker-input'));
			await userEvent.paste('#00FF00');

			expect(emitted('update:modelValue').at(-1)).toEqual(['#00FF00']);
		});
	});
});
