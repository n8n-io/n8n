import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import type { ComboboxItem, ComboboxSizes, ComboboxVariants } from './Combobox.types';
import Combobox from './Combobox.vue';

const sizeCases: Array<[ComboboxSizes | undefined, string]> = [
	[undefined, 'large'],
	['mini', 'mini'],
	['small', 'small'],
	['medium', 'medium'],
	['large', 'large'],
	['xlarge', 'xlarge'],
];

const variantCases: Array<[ComboboxVariants | undefined, string]> = [
	[undefined, 'default'],
	['default', 'default'],
	['ghost', 'ghost'],
];

beforeAll(() => {
	Element.prototype.scrollIntoView = vi.fn();
});

describe('v2/components/Combobox', () => {
	describe('rendering', () => {
		it('should render with placeholder text', () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1', 'Option 2', 'Option 3'],
					placeholder: 'Search options',
				},
			});
			expect(wrapper.getByPlaceholderText('Search options')).toBeInTheDocument();
		});

		it('should render with icon prop', () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1', 'Option 2', 'Option 3'],
					icon: 'search',
				},
			});
			expect(wrapper.container.querySelector('svg')).toBeInTheDocument();
		});

		it('should render disabled state', () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1', 'Option 2', 'Option 3'],
					disabled: true,
				},
			});
			const input = wrapper.getByRole('combobox');
			expect(input).toBeDisabled();
		});

		it('should render data-test-id on anchor', () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1'],
				},
			});
			expect(wrapper.getByTestId('combobox')).toBeInTheDocument();
		});
	});

	describe('sizes', () => {
		test.each(sizeCases)('size %s should apply %s class', (size, expected) => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1'],
					size,
				},
			});
			const anchor = wrapper.getByTestId('combobox');
			expect(anchor.className).toContain(expected);
		});

		test.each(sizeCases)(
			'size %s should apply %s class on dropdown items',
			async (size, expected) => {
				const wrapper = render(Combobox, {
					props: {
						items: ['Option 1', 'Option 2'],
						size,
						defaultOpen: true,
					},
				});

				await waitFor(() => {
					const item = wrapper.getByText('Option 1').closest('[role="option"]');
					expect(item?.className).toContain(expected);
				});
			},
		);
	});

	describe('variants', () => {
		test.each(variantCases)('variant %s should apply %s class', (variant, expected) => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1'],
					variant,
				},
			});
			const anchor = wrapper.getByTestId('combobox');
			expect(anchor.className).toContain(expected);
		});
	});

	describe('item types', () => {
		it('should render object items with value and label', async () => {
			const items = [
				{ value: '1', label: 'Option 1' },
				{ value: '2', label: 'Option 2' },
			];

			const wrapper = render(Combobox, {
				props: { items, defaultOpen: true },
			});

			await waitFor(() => {
				expect(wrapper.getByText('Option 1')).toBeVisible();
				expect(wrapper.getByText('Option 2')).toBeVisible();
			});
		});

		it('should render item icons without a custom item-leading slot', async () => {
			const items = [
				{ value: 'workflows', label: 'Workflows', icon: 'bolt-filled' as const },
				{ value: 'credentials', label: 'Credentials', icon: 'lock' as const },
			];

			const wrapper = render(Combobox, {
				props: { items, defaultOpen: true },
			});

			await waitFor(() => {
				const option = wrapper.getByText('Workflows').closest('[role="option"]');
				expect(option?.querySelector('svg')).toBeInTheDocument();
			});
		});

		it('should render empty state text', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Apple', 'Banana'],
					defaultOpen: true,
					emptyText: 'Nothing here',
				},
			});

			const input = wrapper.getByRole('combobox');
			await userEvent.type(input, 'zzzz');

			await waitFor(() => {
				expect(wrapper.getByText('Nothing here')).toBeVisible();
			});
		});
	});

	describe('selection', () => {
		it('should emit update:modelValue when an item is selected', async () => {
			const onUpdate = vi.fn();
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1', 'Option 2'],
					defaultOpen: true,
					'onUpdate:modelValue': onUpdate,
				},
			});

			await waitFor(() => {
				expect(wrapper.getByText('Option 2')).toBeVisible();
			});
			await userEvent.click(wrapper.getByText('Option 2'));

			expect(onUpdate).toHaveBeenCalledWith('Option 2');
		});

		it('should filter items when typing in the input', async () => {
			const items: ComboboxItem[] = [
				{ value: 'apple', label: 'Apple' },
				{ value: 'banana', label: 'Banana' },
				{ value: 'apricot', label: 'Apricot' },
			];

			const wrapper = render(Combobox, {
				props: { items, defaultOpen: true },
			});

			const input = wrapper.getByRole('combobox');
			await userEvent.type(input, 'ap');

			await waitFor(() => {
				expect(wrapper.getByText('Apple')).toBeVisible();
				expect(wrapper.getByText('Apricot')).toBeVisible();
				expect(wrapper.queryByText('Banana')).not.toBeInTheDocument();
			});
		});
	});
});
