import userEvent from '@testing-library/user-event';
import { render, waitFor, within } from '@testing-library/vue';

import type { ComboboxItem, ComboboxSizes } from './Combobox.types';
import Combobox from './Combobox.vue';

const sizeCases: Array<[ComboboxSizes | undefined, string]> = [
	[undefined, 'large'],
	['mini', 'mini'],
	['small', 'small'],
	['medium', 'medium'],
	['large', 'large'],
	['xlarge', 'xlarge'],
];

beforeAll(() => {
	Element.prototype.scrollIntoView = vi.fn();
});

function getComboboxInput(wrapper: ReturnType<typeof render>) {
	return wrapper.getByRole('combobox');
}

async function getPopoverContainer() {
	// Combobox leaves aria-controls empty on the input; locate the portaled listbox directly.
	const popover = await waitFor(() => {
		const el = document.querySelector('[role="listbox"][data-state="open"]');
		if (!(el instanceof HTMLElement)) throw new Error('Popover not found');
		return el;
	});

	expect(popover).toBeVisible();
	return { popover };
}

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
			expect(getComboboxInput(wrapper)).toBeDisabled();
			expect(wrapper.getByTestId('combobox')).toHaveAttribute('data-disabled');
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
				render(Combobox, {
					props: {
						items: ['Option 1', 'Option 2'],
						size,
						defaultOpen: true,
					},
				});

				const { popover } = await getPopoverContainer();
				const item = within(popover).getByText('Option 1').closest('[role="option"]');
				expect(item?.className).toContain(expected);
			},
		);
	});

	describe('item types', () => {
		it('should render object items with value and label', async () => {
			const items = [
				{ value: '1', label: 'Option 1' },
				{ value: '2', label: 'Option 2' },
			];

			render(Combobox, {
				props: { items, defaultOpen: true },
			});

			const { popover } = await getPopoverContainer();
			expect(within(popover).getByText('Option 1')).toBeVisible();
			expect(within(popover).getByText('Option 2')).toBeVisible();
		});

		it('should render items with icons', async () => {
			const items = [
				{ value: '1', label: 'Option 1', icon: 'check' as const },
				{ value: '2', label: 'Option 2', icon: 'users' as const },
			];

			render(Combobox, {
				props: { items, defaultOpen: true },
			});

			const { popover } = await getPopoverContainer();
			expect(popover.querySelector('[data-icon="users"]')).toBeVisible();
			expect(popover.querySelector('[data-icon="check"]')).toBeVisible();
		});

		it('should render items with disabled state', async () => {
			const items: ComboboxItem[] = [
				{ value: '1', label: 'Option 1' },
				{ value: '2', label: 'Option 2', disabled: true },
			];
			render(Combobox, {
				props: {
					items,
					defaultOpen: true,
				},
			});

			const { popover } = await getPopoverContainer();

			expect(within(popover).getByRole('option', { name: 'Option 1' })).not.toHaveAttribute(
				'data-disabled',
			);
			expect(within(popover).getByRole('option', { name: 'Option 2' })).toHaveAttribute(
				'data-disabled',
			);
		});

		it('should render label items', async () => {
			const items: ComboboxItem[] = [
				{ label: 'Group 1', type: 'label' },
				{ value: '1', label: 'Option 1' },
			];
			render(Combobox, {
				props: {
					items,
					defaultOpen: true,
				},
			});

			const { popover } = await getPopoverContainer();

			expect(within(popover).getByText('Group 1')).toBeVisible();
		});

		it('should render separator items', async () => {
			const items: ComboboxItem[] = [
				{ value: '1', label: 'Option 1' },
				{ type: 'separator' },
				{ value: '2', label: 'Option 2' },
			];
			render(Combobox, {
				props: {
					items,
					defaultOpen: true,
				},
			});

			const { popover } = await getPopoverContainer();
			expect(popover.querySelectorAll('[role="separator"]')).toHaveLength(1);
		});

		it('should render empty state text when filtering returns no matches', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Apple', 'Banana'],
					defaultOpen: true,
					emptyText: 'Nothing here',
				},
			});

			const input = getComboboxInput(wrapper);
			await userEvent.type(input, 'zzzz');

			await waitFor(() => {
				expect(wrapper.getByText('Nothing here')).toBeVisible();
			});
		});

		it('should render default empty state text', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Apple', 'Banana'],
					defaultOpen: true,
				},
			});

			const input = getComboboxInput(wrapper);
			await userEvent.type(input, 'zzzz');

			await waitFor(() => {
				expect(wrapper.getByText('No results found.')).toBeVisible();
			});
		});
	});

	describe('filtering', () => {
		it('should filter items when typing in the input', async () => {
			const items: ComboboxItem[] = [
				{ value: 'apple', label: 'Apple' },
				{ value: 'banana', label: 'Banana' },
				{ value: 'apricot', label: 'Apricot' },
			];

			const wrapper = render(Combobox, {
				props: { items, defaultOpen: true },
			});

			const input = getComboboxInput(wrapper);
			await userEvent.type(input, 'ap');

			await waitFor(() => {
				expect(wrapper.getByText('Apple')).toBeVisible();
				expect(wrapper.getByText('Apricot')).toBeVisible();
				expect(wrapper.queryByText('Banana')).not.toBeInTheDocument();
			});
		});

		it('should not filter items when ignoreFilter is true', async () => {
			const items: ComboboxItem[] = [
				{ value: 'apple', label: 'Apple' },
				{ value: 'banana', label: 'Banana' },
			];

			const wrapper = render(Combobox, {
				props: { items, defaultOpen: true, ignoreFilter: true },
			});

			const input = getComboboxInput(wrapper);
			await userEvent.type(input, 'ap');

			await waitFor(() => {
				expect(wrapper.getByText('Apple')).toBeVisible();
				expect(wrapper.getByText('Banana')).toBeVisible();
			});
		});
	});

	describe('v-model', () => {
		it('should update modelValue on selection', async () => {
			const items = [
				{ value: '1', label: 'Option 1' },
				{ value: '2', label: 'Option 2' },
			];

			const wrapper = render(Combobox, {
				props: {
					items,
					defaultOpen: true,
					modelValue: '2',
				},
			});

			const { popover } = await getPopoverContainer();

			const option = within(popover).getByText('Option 1');
			await userEvent.click(option);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['1']);
			});
		});

		it('should display selected value for string items', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1', 'Option 2', 'Option 3'],
					modelValue: 'Option 2',
				},
			});

			await waitFor(() => {
				expect(getComboboxInput(wrapper)).toHaveValue('Option 2');
			});
		});

		it('should display the label for object items after selection', async () => {
			const items: ComboboxItem[] = [
				{ value: 'option1', label: 'Option 1' },
				{ value: 'option2', label: 'Option 2' },
			];

			const wrapper = render(Combobox, {
				props: { items, defaultOpen: true },
			});

			const { popover } = await getPopoverContainer();
			await userEvent.click(within(popover).getByText('Option 2'));

			await waitFor(() => {
				expect(getComboboxInput(wrapper)).toHaveValue('Option 2');
			});
		});

		describe('multiple', () => {
			it('should update modelValue on selection', async () => {
				const items = [
					{ value: '1', label: 'Option 1' },
					{ value: '2', label: 'Option 2' },
				];

				const wrapper = render(Combobox, {
					props: {
						items,
						defaultOpen: true,
						modelValue: ['2'],
						multiple: true,
					},
				});

				const { popover } = await getPopoverContainer();

				const option = within(popover).getByText('Option 1');
				await userEvent.click(option);

				await waitFor(() => {
					expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['2', '1']]);
				});
			});

			it('should display selected values', async () => {
				const wrapper = render(Combobox, {
					props: {
						items: ['Option 1', 'Option 2', 'Option 3'],
						modelValue: ['Option 2', 'Option 1'],
						multiple: true,
					},
				});

				await waitFor(() => {
					expect(getComboboxInput(wrapper)).toHaveValue('Option 2, Option 1');
				});
			});
		});
	});

	describe('events', () => {
		it('should emit update:open when dropdown opens', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1', 'Option 2', 'Option 3'],
					open: false,
					openOnClick: true,
				},
			});

			const input = getComboboxInput(wrapper);
			await userEvent.click(input);

			await waitFor(() => {
				expect(wrapper.emitted('update:open')).toBeTruthy();
			});
		});
	});

	describe('slots', () => {
		it('should render item slot', async () => {
			render(Combobox, {
				props: {
					items: [
						{ value: '1', label: 'Option 1' },
						{ value: '2', label: 'Option 2' },
					],
					defaultOpen: true,
				},
				slots: {
					item: '<span data-test-id="custom-item">any</span>',
				},
			});

			const { popover } = await getPopoverContainer();

			await waitFor(() => {
				expect(within(popover).getAllByTestId('custom-item')).toHaveLength(2);
			});
		});

		it('should render item-leading slot', async () => {
			render(Combobox, {
				props: {
					items: [
						{ value: '1', label: 'Option 1' },
						{ value: '2', label: 'Option 2' },
					],
					defaultOpen: true,
				},
				slots: {
					'item-leading': '<span data-test-id="custom-leading">any</span>',
				},
			});

			const { popover } = await getPopoverContainer();

			await waitFor(() => {
				expect(within(popover).getAllByTestId('custom-leading')).toHaveLength(2);
			});
		});

		it('should render item-label slot', async () => {
			render(Combobox, {
				props: {
					items: [
						{ value: '1', label: 'Option 1' },
						{ value: '2', label: 'Option 2' },
					],
					defaultOpen: true,
				},
				slots: {
					'item-label': '<span data-test-id="custom-label">any</span>',
				},
			});

			const { popover } = await getPopoverContainer();

			await waitFor(() => {
				expect(within(popover).getAllByTestId('custom-label')).toHaveLength(2);
			});
		});

		it('should render item-trailing slot', async () => {
			render(Combobox, {
				props: {
					items: [
						{ value: '1', label: 'Option 1' },
						{ value: '2', label: 'Option 2' },
					],
					defaultOpen: true,
				},
				slots: {
					'item-trailing': '<span data-test-id="custom-trailing">any</span>',
				},
			});

			const { popover } = await getPopoverContainer();

			await waitFor(() => {
				expect(within(popover).getAllByTestId('custom-trailing')).toHaveLength(2);
			});
		});

		it('should render label slot', async () => {
			render(Combobox, {
				props: {
					items: [
						{ label: 'Group 1', type: 'label' },
						{ value: '1', label: 'Option 1' },
					],
					defaultOpen: true,
				},
				slots: {
					label: '<span data-test-id="custom-label-heading">any</span>',
				},
			});

			const { popover } = await getPopoverContainer();

			await waitFor(() => {
				expect(within(popover).getByTestId('custom-label-heading')).toBeVisible();
			});
		});

		it('should render header slot', async () => {
			render(Combobox, {
				props: {
					items: [
						{ value: '1', label: 'Option 1' },
						{ value: '2', label: 'Option 2' },
					],
					defaultOpen: true,
				},
				slots: {
					header: '<div data-test-id="header-content">Header</div>',
				},
			});

			const { popover } = await getPopoverContainer();

			await waitFor(() => {
				expect(within(popover).getByTestId('header-content')).toBeVisible();
			});
		});

		it('should render footer slot', async () => {
			render(Combobox, {
				props: {
					items: [
						{ value: '1', label: 'Option 1' },
						{ value: '2', label: 'Option 2' },
					],
					defaultOpen: true,
				},
				slots: {
					footer: '<button data-test-id="footer-button">Add custom role</button>',
				},
			});

			const { popover } = await getPopoverContainer();

			await waitFor(() => {
				expect(within(popover).getByTestId('footer-button')).toBeVisible();
			});
		});
	});

	describe('custom keys', () => {
		it('should use custom valueKey and labelKey for display', async () => {
			const items = [
				{ id: '1', name: 'Option 1' },
				{ id: '2', name: 'Option 2' },
			];
			const wrapper = render(Combobox, {
				props: {
					items,
					valueKey: 'id',
					labelKey: 'name',
					modelValue: '1',
				},
			});

			await waitFor(() => {
				expect(getComboboxInput(wrapper)).toHaveValue('Option 1');
			});
		});

		it('should emit custom valueKey on selection', async () => {
			const items = [
				{ id: '1', name: 'Option 1' },
				{ id: '2', name: 'Option 2' },
			];
			const wrapper = render(Combobox, {
				props: {
					items,
					valueKey: 'id',
					labelKey: 'name',
					defaultOpen: true,
				},
			});

			const { popover } = await getPopoverContainer();
			await userEvent.click(within(popover).getByText('Option 2'));

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['2']);
			});
		});
	});
});
