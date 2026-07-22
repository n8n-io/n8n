import userEvent from '@testing-library/user-event';
import { render, waitFor, within } from '@testing-library/vue';
import { ref } from 'vue';

import type { ComboboxItem } from './Combobox.types';
import Combobox from './Combobox.vue';

vi.mock('@n8n/design-system/composables/useI18n', () => ({
	useI18n: () => ({
		t: (key: string) => {
			const translations: Record<string, string> = {
				'combobox.clearSelection': 'Clear selection',
			};
			return translations[key] ?? key;
		},
	}),
}));

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

		it('should render the selected item icon in the trigger', async () => {
			const items = [
				{ value: '1', label: 'Option 1', icon: 'check' as const },
				{ value: '2', label: 'Option 2', icon: 'users' as const },
			];

			const wrapper = render(Combobox, {
				props: { items, modelValue: '2' },
			});

			await waitFor(() => {
				const trigger = wrapper.getByTestId('combobox');
				expect(trigger.querySelector('[data-icon="users"]')).toBeVisible();
			});
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

	describe('clearable', () => {
		it('should show clear button when clearable and a value is selected', () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1', 'Option 2'],
					modelValue: 'Option 1',
					clearable: true,
				},
			});

			expect(wrapper.getByRole('button', { name: 'Clear selection' })).toBeVisible();
		});

		it('should not show clear button when no value is selected', () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1', 'Option 2'],
					clearable: true,
				},
			});

			expect(wrapper.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
		});

		it('should not show clear button when disabled', () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1', 'Option 2'],
					modelValue: 'Option 1',
					clearable: true,
					disabled: true,
				},
			});

			expect(wrapper.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
		});

		it('should emit undefined when clear button is clicked', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1', 'Option 2'],
					modelValue: 'Option 1',
					clearable: true,
				},
			});

			await userEvent.click(wrapper.getByRole('button', { name: 'Clear selection' }));

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([undefined]);
			});
		});

		it('should emit an empty array when clearing a multiple selection', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1', 'Option 2'],
					modelValue: ['Option 1', 'Option 2'],
					multiple: true,
					clearable: true,
				},
			});

			await userEvent.click(wrapper.getByRole('button', { name: 'Clear selection' }));

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[]]);
			});
		});

		it('should clear the value and close the menu when clear is clicked while open', async () => {
			const wrapper = render({
				components: { Combobox },
				setup() {
					const value = ref('Option 1');
					return { value };
				},
				template: `
					<Combobox
						v-model="value"
						:items="['Option 1', 'Option 2', 'Option 3']"
						clearable
						:default-open="true"
					/>
				`,
			});

			const input = getComboboxInput(wrapper);
			input.focus();

			const { popover } = await getPopoverContainer();
			expect(popover).toBeVisible();
			expect(input).toHaveValue('Option 1');

			await userEvent.click(wrapper.getByRole('button', { name: 'Clear selection' }));

			await waitFor(() => {
				expect(input).toHaveValue('');
				expect(document.querySelector('[role="listbox"][data-state="open"]')).toBeNull();
			});
		});

		it('should refocus the input after clearing with the keyboard', async () => {
			const wrapper = render({
				components: { Combobox },
				setup() {
					const value = ref('Option 1');
					return { value };
				},
				template: `
					<Combobox
						v-model="value"
						:items="['Option 1', 'Option 2']"
						clearable
					/>
				`,
			});

			const input = getComboboxInput(wrapper);
			const clearButton = wrapper.getByRole('button', { name: 'Clear selection' });

			input.focus();
			await userEvent.keyboard('{Escape}');
			clearButton.focus();
			expect(clearButton).toHaveFocus();

			await userEvent.keyboard('{Enter}');

			await waitFor(() => {
				expect(input).toHaveValue('');
				expect(input).toHaveFocus();
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

		it('should clear the selection when the input value is deleted', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1', 'Option 2'],
					modelValue: 'Option 1',
				},
			});

			await userEvent.clear(getComboboxInput(wrapper));

			expect(wrapper.emitted('update:modelValue')).toContainEqual([undefined]);
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

			it('should display selected values as tags', async () => {
				const wrapper = render(Combobox, {
					props: {
						items: ['Option 1', 'Option 2', 'Option 3'],
						modelValue: ['Option 2', 'Option 1'],
						multiple: true,
					},
				});

				await waitFor(() => {
					const tags = wrapper.getAllByTestId('tags-input-tag');
					expect(tags).toHaveLength(2);
					expect(tags[0]).toHaveTextContent('Option 2');
					expect(tags[1]).toHaveTextContent('Option 1');
					expect(getComboboxInput(wrapper)).toHaveValue('');
				});
			});

			it('should remove a tag and emit the updated selection', async () => {
				const wrapper = render(Combobox, {
					props: {
						items: ['Option 1', 'Option 2', 'Option 3'],
						modelValue: ['Option 2', 'Option 1'],
						multiple: true,
					},
				});

				const tags = wrapper.getAllByTestId('tags-input-tag');
				const removeButton = within(tags[0]).getByRole('button');
				await userEvent.click(removeButton);

				await waitFor(() => {
					expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['Option 1']]);
				});
			});

			it('should not focus the input or open when removing a tag while unfocused', async () => {
				const wrapper = render(Combobox, {
					props: {
						items: ['Option 1', 'Option 2', 'Option 3'],
						modelValue: ['Option 2', 'Option 1'],
						multiple: true,
					},
				});

				const input = getComboboxInput(wrapper);
				expect(input).not.toHaveFocus();

				const tags = wrapper.getAllByTestId('tags-input-tag');
				await userEvent.click(within(tags[0]).getByRole('button'));

				await waitFor(() => {
					expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['Option 1']]);
				});

				expect(input).not.toHaveFocus();
				expect(document.querySelector('[role="listbox"][data-state="open"]')).toBeNull();
			});
		});
	});

	describe('events', () => {
		it('should open when the input receives focus', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1', 'Option 2', 'Option 3'],
				},
			});

			getComboboxInput(wrapper).focus();

			await getPopoverContainer();
		});

		it('should close after selecting an item when opened on focus', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1', 'Option 2', 'Option 3'],
				},
			});

			getComboboxInput(wrapper).focus();
			const { popover } = await getPopoverContainer();
			await userEvent.click(within(popover).getByRole('option', { name: 'Option 1' }));

			await waitFor(() => {
				expect(document.querySelector('[role="listbox"][data-state="open"]')).toBeNull();
			});
		});

		it('should toggle the dropdown when the chevron is clicked', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: ['Option 1', 'Option 2', 'Option 3'],
				},
			});

			const trigger = wrapper.getByRole('button', { name: 'Show popup' });
			await userEvent.click(trigger);
			await getPopoverContainer();

			await userEvent.click(trigger);
			await waitFor(() => {
				expect(document.querySelector('[role="listbox"][data-state="open"]')).toBeNull();
			});
		});

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
