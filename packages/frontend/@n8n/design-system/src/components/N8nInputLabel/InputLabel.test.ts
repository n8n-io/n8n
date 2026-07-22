import { fireEvent, render } from '@testing-library/vue';

import InputLabel from './InputLabel.vue';

describe('component', () => {
	describe('Label click behavior', () => {
		it('does not activate a button in the options slot when the label is clicked', async () => {
			const { getByText, getByTestId } = render(InputLabel, {
				props: {
					label: 'a label',
				},
				slots: {
					options: '<button data-test-id="focus-button">focus</button>',
				},
			});

			const onButtonClick = vi.fn();
			getByTestId('focus-button').addEventListener('click', onButtonClick);

			await fireEvent.click(getByText('a label'));

			// clicking a label without `for` must not forward the click
			// to the first labelable element (the options slot button)
			expect(onButtonClick).not.toHaveBeenCalled();
		});

		it('activates the associated input when the label has a `for` target', async () => {
			const { getByText, getByTestId } = render(InputLabel, {
				props: {
					label: 'a label',
					inputName: 'my-input',
				},
				slots: {
					options: '<button data-test-id="focus-button">focus</button>',
					default: '<input id="my-input" data-test-id="the-input" />',
				},
			});

			const onInputClick = vi.fn();
			const onButtonClick = vi.fn();
			getByTestId('the-input').addEventListener('click', onInputClick);
			getByTestId('focus-button').addEventListener('click', onButtonClick);

			await fireEvent.click(getByText('a label'));

			// with a `for` target the label activation stays intact and never
			// leaks to the options slot
			expect(onInputClick).toHaveBeenCalledTimes(1);
			expect(onButtonClick).not.toHaveBeenCalled();
		});

		it('activates a button in the options slot when the button itself is clicked', async () => {
			const { getByTestId } = render(InputLabel, {
				props: {
					label: 'a label',
				},
				slots: {
					options: '<button data-test-id="focus-button">focus</button>',
				},
			});

			const onButtonClick = vi.fn();
			getByTestId('focus-button').addEventListener('click', onButtonClick);

			await fireEvent.click(getByTestId('focus-button'));

			expect(onButtonClick).toHaveBeenCalledTimes(1);
		});
	});

	describe('Text overflow behavior', () => {
		it('displays full text without options', () => {
			const { container } = render(InputLabel, {
				props: {
					label: 'a label',
				},
			});

			expect(container.querySelectorAll('.textEllipses').length).eq(0);

			expect(container).toMatchSnapshot();
		});

		it('displays ellipsis with options', () => {
			const { container } = render(InputLabel, {
				props: {
					label: 'a label',
					showOptions: true,
				},
			});

			expect(container.querySelectorAll('.textEllipses').length).eq(1);

			expect(container).toMatchSnapshot();
		});
	});
});
