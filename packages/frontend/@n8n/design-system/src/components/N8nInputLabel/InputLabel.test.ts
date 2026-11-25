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

	describe('Label suffix slot', () => {
		const labelSuffix = '<span data-test-id="suffix">New</span>';

		it('renders the suffix inside the title, after the label text', () => {
			const { getByTestId, getByText } = render(InputLabel, {
				props: { label: 'a label' },
				slots: { labelSuffix },
			});

			const wrapper = getByTestId('suffix').parentElement;
			expect(wrapper).toHaveClass('labelSuffix');
			expect(wrapper?.previousElementSibling).toBe(getByText('a label'));
		});

		it('does not render the suffix when there is no label', () => {
			const { queryByTestId } = render(InputLabel, {
				props: { label: '' },
				slots: { labelSuffix, options: '<button>options</button>' },
			});

			expect(queryByTestId('suffix')).not.toBeInTheDocument();
		});

		it('keeps the wrapper empty when the slot content renders nothing', () => {
			const { container } = render(InputLabel, {
				props: { label: 'a label' },
				slots: { labelSuffix: '<span v-if="false" />' },
			});

			// The style hides the wrapper with `:empty`. jsdom does not ignore the empty text
			// nodes that Vue adds, so check the two conditions of `:empty` directly.
			const wrapper = container.querySelector('.labelSuffix');
			expect(wrapper?.childElementCount).toBe(0);
			expect(wrapper?.textContent).toBe('');
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
