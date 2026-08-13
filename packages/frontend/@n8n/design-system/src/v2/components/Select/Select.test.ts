import userEvent from '@testing-library/user-event';
import { render, waitFor, within } from '@testing-library/vue';
import { h, ref, type Component } from 'vue';

import type { SelectItem, SelectSizes, SelectVariants } from './Select.types';
import Select from './Select.vue';

const sizeCases: Array<[SelectSizes | undefined, string]> = [
	[undefined, 'small'],
	['mini', 'mini'],
	['small', 'small'],
	['medium', 'medium'],
	['large', 'large'],
	['xlarge', 'xlarge'],
];

const variantCases: Array<[SelectVariants | undefined, string | undefined]> = [
	[undefined, undefined],
	['default', undefined],
	['ghost', 'variantGhost'],
	['flush', 'variantFlush'],
];

async function getPopoverContainer(trigger: Element | null) {
	const popoverId = trigger?.getAttribute('aria-controls');
	if (!popoverId) {
		throw new Error('Popover id not found');
	}

	const popover = await waitFor(() => {
		const el = document.getElementById(popoverId);
		if (!el) throw new Error('Popover not found');
		return el;
	});

	expect(popover).toBeVisible();
	return { popover };
}

describe('v2/components/Select', () => {
	describe('rendering', () => {
		it('should render with placeholder text', () => {
			const wrapper = render(Select, {
				props: {
					items: [
						{ value: 'Option 1', label: 'Option 1' },
						{ value: 'Option 2', label: 'Option 2' },
						{ value: 'Option 3', label: 'Option 3' },
					],
					placeholder: 'Choose an option',
				},
			});
			expect(wrapper.getByText('Choose an option')).toBeInTheDocument();
		});

		it('should render with icon prop', () => {
			const wrapper = render(Select, {
				props: {
					items: [
						{ value: 'Option 1', label: 'Option 1' },
						{ value: 'Option 2', label: 'Option 2' },
						{ value: 'Option 3', label: 'Option 3' },
					],
					icon: 'search',
				},
			});
			expect(wrapper.container.querySelector('svg')).toBeInTheDocument();
		});

		it('should render disabled state', () => {
			const wrapper = render(Select, {
				props: {
					items: [
						{ value: 'Option 1', label: 'Option 1' },
						{ value: 'Option 2', label: 'Option 2' },
						{ value: 'Option 3', label: 'Option 3' },
					],
					disabled: true,
				},
			});
			const trigger = wrapper.getByTestId('select-trigger');
			expect(trigger).toHaveAttribute('data-disabled');
		});

		it('should not use placeholder as aria-label', () => {
			const wrapper = render(Select, {
				props: {
					items: [
						{ value: 'Option 1', label: 'Option 1' },
						{ value: 'Option 2', label: 'Option 2' },
					],
					placeholder: 'Choose an option',
					modelValue: 'Option 1',
				},
			});

			const trigger = wrapper.getByTestId('select-trigger');
			expect(trigger).not.toHaveAttribute('aria-label');
			expect(trigger).toHaveTextContent('Option 1');
		});

		it('should forward an explicit aria-label', () => {
			const wrapper = render(Select, {
				props: {
					items: [{ value: 'Option 1', label: 'Option 1' }],
					placeholder: 'Choose an option',
				},
				attrs: {
					'aria-label': 'Status',
				},
			});

			expect(wrapper.getByTestId('select-trigger')).toHaveAttribute('aria-label', 'Status');
		});

		it('should keep trigger attrs in sync after the first render', async () => {
			const describedBy = ref<string | undefined>();
			const invalid = ref<boolean | undefined>();
			const extraClass = ref<string | undefined>();

			const wrapper = render({
				setup() {
					return () =>
						h('div', [
							h(Select as Component, {
								items: [{ value: '1', label: 'Option 1' }],
								class: extraClass.value,
								'aria-describedby': describedBy.value,
								'aria-invalid': invalid.value,
							}),
							h(
								'button',
								{
									type: 'button',
									'data-test-id': 'start-validation',
									onClick: () => {
										describedBy.value = 'select-error';
										invalid.value = true;
										extraClass.value = 'is-invalid';
									},
								},
								'Invalidate',
							),
							h(
								'button',
								{
									type: 'button',
									'data-test-id': 'clear-validation',
									onClick: () => {
										describedBy.value = undefined;
										invalid.value = undefined;
										extraClass.value = undefined;
									},
								},
								'Validate',
							),
						]);
				},
			});
			const trigger = wrapper.getByTestId('select-trigger');

			expect(trigger).not.toHaveAttribute('aria-describedby');
			expect(trigger).not.toHaveAttribute('aria-invalid');
			expect(trigger).not.toHaveClass('is-invalid');

			await userEvent.click(wrapper.getByTestId('start-validation'));

			await waitFor(() => {
				expect(trigger).toHaveAttribute('aria-describedby', 'select-error');
				expect(trigger).toHaveAttribute('aria-invalid', 'true');
				expect(trigger).toHaveClass('is-invalid');
			});

			await userEvent.click(wrapper.getByTestId('clear-validation'));

			await waitFor(() => {
				expect(trigger).not.toHaveAttribute('aria-describedby');
				expect(trigger).not.toHaveAttribute('aria-invalid');
				expect(trigger).not.toHaveClass('is-invalid');
			});
		});
	});

	describe('sizes', () => {
		test.each(sizeCases)('size %s should apply %s class', (size, expected) => {
			const wrapper = render(Select, {
				props: {
					items: [{ value: 'Option 1', label: 'Option 1' }],
					size,
				},
			});
			const trigger = wrapper.getByTestId('select-trigger');
			expect(trigger.className).toContain(expected);
		});
	});

	describe('variants', () => {
		test.each(variantCases)('variant %s should apply %s class', (variant, expected) => {
			const wrapper = render(Select, {
				props: {
					items: [{ value: 'Option 1', label: 'Option 1' }],
					variant,
				},
			});
			const trigger = wrapper.getByTestId('select-trigger');
			if (expected) {
				expect(trigger.className).toContain(expected);
			} else {
				expect(trigger.className).not.toMatch(/variant(Ghost|Flush)/);
			}
		});
	});

	describe('item types', () => {
		it('should render object items with value and label', async () => {
			const items = [
				{ value: '1', label: 'Option 1' },
				{ value: '2', label: 'Option 2' },
			];

			const wrapper = render(Select, {
				props: { items, defaultOpen: true },
			});

			const trigger = wrapper.getByTestId('select-trigger');

			const { popover } = await getPopoverContainer(trigger);
			expect(within(popover).getByText('Option 1')).toBeVisible();
			expect(within(popover).getByText('Option 2')).toBeVisible();
		});

		it('should render items with icons', async () => {
			const items = [
				{ value: '1', label: 'Option 1', icon: 'check' as const },
				{ value: '2', label: 'Option 2', icon: 'users' as const },
			];

			const wrapper = render(Select, {
				props: { items, defaultOpen: true },
			});

			const trigger = wrapper.getByTestId('select-trigger');

			const { popover } = await getPopoverContainer(trigger);
			expect(popover.querySelector('[data-icon="users"]')).toBeVisible();
			expect(popover.querySelector('[data-icon="check"]')).toBeVisible();
		});

		it('should render items with disabled state', async () => {
			const items: SelectItem[] = [
				{ value: '1', label: 'Option 1' },
				{ value: '2', label: 'Option 2', disabled: true },
			];
			const wrapper = render(Select, {
				props: {
					items,
					defaultOpen: true,
				},
			});

			const trigger = wrapper.getByTestId('select-trigger');

			const { popover } = await getPopoverContainer(trigger);

			expect(within(popover).getByRole('option', { name: 'Option 1' })).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
			expect(within(popover).getByRole('option', { name: 'Option 2' })).toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});

		it('should render label items', async () => {
			const items: SelectItem[] = [
				{ label: 'Group 1', type: 'label' },
				{ value: '1', label: 'Option 1' },
			];
			const wrapper = render(Select, {
				props: {
					items,
					defaultOpen: true,
				},
			});
			const trigger = wrapper.getByTestId('select-trigger');

			const { popover } = await getPopoverContainer(trigger);

			expect(within(popover).getByText('Group 1')).toBeVisible();
		});

		it('should render separator items', async () => {
			const items: SelectItem[] = [
				{ value: '1', label: 'Option 1' },
				{ type: 'separator' },
				{ value: '2', label: 'Option 2' },
			];
			const wrapper = render(Select, {
				props: {
					items,
					defaultOpen: true,
				},
			});
			const trigger = wrapper.getByTestId('select-trigger');

			const { popover } = await getPopoverContainer(trigger);
			expect(popover.querySelectorAll('[role="separator"]')).toHaveLength(1);
		});
	});

	describe('typeahead', () => {
		it('should highlight the option whose textValue prefix matches', async () => {
			const wrapper = render(Select, {
				props: {
					items: [
						{ value: 'us', label: 'United States', keywords: ['USA'] },
						{ value: 'de', label: 'Germany', textValue: 'Deutschland' },
					],
					defaultOpen: true,
				},
			});

			const { popover } = await getPopoverContainer(wrapper.getByTestId('select-trigger'));
			await userEvent.keyboard('d');

			await waitFor(() => {
				expect(within(popover).getByRole('option', { name: 'Germany' })).toHaveAttribute(
					'data-highlighted',
				);
			});
		});
	});

	describe('v-model', () => {
		it('should update modelValue on selection', async () => {
			const items = [
				{ value: '1', label: 'Option 1' },
				{ value: '2', label: 'Option 2' },
			];

			const wrapper = render(Select, {
				props: {
					items,
					defaultOpen: true,
					modelValue: '2',
				},
			});

			const trigger = wrapper.getByTestId('select-trigger');
			const { popover } = await getPopoverContainer(trigger);

			const option = within(popover).getByText('Option 1');
			await userEvent.click(option);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['1']);
			});
		});

		it('should display selected value', async () => {
			const wrapper = render(Select, {
				props: {
					items: [
						{ value: 'Option 1', label: 'Option 1' },
						{ value: 'Option 2', label: 'Option 2' },
						{ value: 'Option 3', label: 'Option 3' },
					],
					modelValue: 'Option 2',
				},
			});
			const trigger = wrapper.getByTestId('select-trigger');
			await waitFor(() => {
				expect(trigger).toHaveTextContent('Option 2');
			});
		});

		it('should use defaultValue in uncontrolled mode', async () => {
			const wrapper = render(Select, {
				props: {
					items: [
						{ value: 'Option 1', label: 'Option 1' },
						{ value: 'Option 2', label: 'Option 2' },
						{ value: 'Option 3', label: 'Option 3' },
					],
					defaultValue: 'Option 3',
				},
			});
			const trigger = wrapper.getByTestId('select-trigger');
			await waitFor(() => {
				expect(trigger).toHaveTextContent('Option 3');
			});
		});

		describe('multiple', () => {
			it('should update modelValue on selection', async () => {
				const items = [
					{ value: '1', label: 'Option 1' },
					{ value: '2', label: 'Option 2' },
				];

				const wrapper = render(Select, {
					props: {
						items,
						defaultOpen: true,
						modelValue: ['2'],
						multiple: true,
					},
				});

				const trigger = wrapper.getByTestId('select-trigger');
				const { popover } = await getPopoverContainer(trigger);

				const option = within(popover).getByText('Option 1');
				await userEvent.click(option);

				await waitFor(() => {
					expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
					expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['2', '1']]);
				});
			});

			it('should display selected value', async () => {
				const wrapper = render(Select, {
					props: {
						items: [
							{ value: 'Option 1', label: 'Option 1' },
							{ value: 'Option 2', label: 'Option 2' },
							{ value: 'Option 3', label: 'Option 3' },
						],
						modelValue: ['Option 2', 'Option 1'],
						multiple: true,
					},
				});
				const trigger = wrapper.getByTestId('select-trigger');
				await waitFor(() => {
					expect(trigger).toHaveTextContent('Option 2, Option 1');
				});
			});
		});
	});

	describe('events', () => {
		it('should emit update:open when dropdown opens', async () => {
			const wrapper = render(Select, {
				props: {
					items: [
						{ value: 'Option 1', label: 'Option 1' },
						{ value: 'Option 2', label: 'Option 2' },
						{ value: 'Option 3', label: 'Option 3' },
					],
					open: false,
				},
			});

			const trigger = wrapper.getByTestId('select-trigger');
			await userEvent.click(trigger);

			await waitFor(() => {
				expect(wrapper.emitted('update:open')).toHaveLength(1);
				expect(wrapper.emitted('update:open')?.[0]).toEqual([true]);
			});
		});

		it('should emit update:open once when dropdown closes', async () => {
			const wrapper = render(Select, {
				props: {
					items: [
						{ value: 'Option 1', label: 'Option 1' },
						{ value: 'Option 2', label: 'Option 2' },
						{ value: 'Option 3', label: 'Option 3' },
					],
					open: true,
				},
			});

			const trigger = wrapper.getByTestId('select-trigger');
			await getPopoverContainer(trigger);
			await userEvent.keyboard('{Escape}');

			await waitFor(() => {
				expect(wrapper.emitted('update:open')).toHaveLength(1);
				expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
			});
		});

		it('should not update modelValue when onSelect calls preventDefault', async () => {
			const onSelect = vi.fn((event: Event) => {
				event.preventDefault();
			});
			const items: SelectItem[] = [
				{ value: '1', label: 'Option 1' },
				{ value: '__add_custom_role__', label: 'Add custom role', onSelect },
			];

			const wrapper = render(Select, {
				props: {
					items,
					defaultOpen: true,
					modelValue: '1',
				},
			});

			const { popover } = await getPopoverContainer(wrapper.getByTestId('select-trigger'));
			await userEvent.click(within(popover).getByRole('option', { name: 'Add custom role' }));

			await waitFor(() => {
				expect(onSelect).toHaveBeenCalled();
			});
			expect(wrapper.emitted('update:modelValue')).toBeFalsy();
		});
	});

	describe('slots', () => {
		it('should render default slot with modelValue and open state', () => {
			const wrapper = render(Select, {
				props: {
					items: [
						{ value: 'Option 1', label: 'Option 1' },
						{ value: 'Option 2', label: 'Option 2' },
					],
					modelValue: 'Option 1',
				},
				slots: {
					default:
						'<template #default="{ modelValue, open }">Selected: {{ modelValue }} ({{ open }})</template>',
				},
			});
			expect(wrapper.getByText(/Selected:/)).toBeInTheDocument();
		});

		it('should render item slot', async () => {
			const wrapper = render(Select, {
				props: {
					items: [
						{ value: '1', label: 'Option 1' },
						{ value: '2', label: 'Option 2' },
					],
					defaultOpen: true,
				},
				slots: {
					item: '<span data-test-id="custom-default">any</span>',
				},
			});

			const trigger = wrapper.getByTestId('select-trigger');
			const { popover } = await getPopoverContainer(trigger);

			await waitFor(() => {
				expect(within(popover).getAllByTestId('custom-default')).toHaveLength(2);
			});
		});

		it('should render item-leading on the trigger when the selected item has no icon', () => {
			const wrapper = render(Select, {
				props: {
					items: [{ value: 'todo', label: 'Todo' }],
					modelValue: 'todo',
				},
				slots: {
					'item-leading': '<span data-test-id="custom-leading">dot</span>',
				},
			});

			expect(
				within(wrapper.getByTestId('select-trigger')).getByTestId('custom-leading'),
			).toBeVisible();
		});

		it('should render item-leading slot', async () => {
			const wrapper = render(Select, {
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

			const trigger = wrapper.getByTestId('select-trigger');
			const { popover } = await getPopoverContainer(trigger);

			await waitFor(() => {
				expect(within(popover).getAllByTestId('custom-leading')).toHaveLength(2);
			});
		});

		it('should render item-label slot', async () => {
			const wrapper = render(Select, {
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

			const trigger = wrapper.getByTestId('select-trigger');
			const { popover } = await getPopoverContainer(trigger);

			await waitFor(() => {
				expect(within(popover).getAllByTestId('custom-label')).toHaveLength(2);
			});
		});

		it('should render item-trailing slot', async () => {
			const wrapper = render(Select, {
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

			const trigger = wrapper.getByTestId('select-trigger');
			const { popover } = await getPopoverContainer(trigger);

			await waitFor(() => {
				expect(within(popover).getAllByTestId('custom-trailing')).toHaveLength(2);
			});
		});

		it('should render footer slot', async () => {
			const wrapper = render(Select, {
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

			const trigger = wrapper.getByTestId('select-trigger');
			const { popover } = await getPopoverContainer(trigger);

			await waitFor(() => {
				expect(within(popover).getByTestId('footer-button')).toBeVisible();
			});
		});
	});

	describe('searchable', () => {
		const roleItems: SelectItem[] = [
			{ type: 'label', label: 'System roles' },
			{ value: 'admin', label: 'Admin' },
			{ value: 'member', label: 'Member' },
			{ type: 'label', label: 'Custom roles' },
			{ value: 'developer', label: 'Developer' },
		];

		it('should autofocus the search input when opened', async () => {
			const wrapper = render(Select, {
				props: {
					items: roleItems,
					searchable: true,
				},
			});

			await userEvent.click(wrapper.getByTestId('select-trigger'));
			const { popover } = await getPopoverContainer(wrapper.getByTestId('select-trigger'));
			const searchInput = within(popover).getByRole('textbox');

			await waitFor(() => {
				expect(searchInput).toHaveFocus();
			});
		});

		it('should filter items by label and show empty state when nothing matches', async () => {
			const wrapper = render(Select, {
				props: {
					items: roleItems,
					searchable: true,
				},
			});

			await userEvent.click(wrapper.getByTestId('select-trigger'));
			const { popover } = await getPopoverContainer(wrapper.getByTestId('select-trigger'));
			const searchInput = within(popover).getByRole('textbox');

			await userEvent.type(searchInput, 'dev');

			await waitFor(() => {
				expect(within(popover).getByText('Developer')).toBeInTheDocument();
				expect(within(popover).queryByText('Admin')).not.toBeInTheDocument();
				expect(within(popover).queryByText('Member')).not.toBeInTheDocument();
			});

			await userEvent.clear(searchInput);
			await userEvent.type(searchInput, 'zzzz');

			await waitFor(() => {
				expect(within(popover).getByTestId('select-empty')).toBeInTheDocument();
				expect(within(popover).queryByTestId('select-scroll-up')).not.toBeInTheDocument();
				expect(within(popover).queryByTestId('select-scroll-down')).not.toBeInTheDocument();
			});
		});

		it('should filter items by keywords without replacing label matches', async () => {
			const items: SelectItem[] = [
				{ value: 'us', label: 'United States', keywords: ['USA', 'America'] },
				{ value: 'uk', label: 'United Kingdom' },
				{ value: 'de', label: 'Germany', textValue: 'Deutschland' },
			];

			const wrapper = render(Select, {
				props: {
					items,
					searchable: true,
				},
			});

			await userEvent.click(wrapper.getByTestId('select-trigger'));
			const { popover } = await getPopoverContainer(wrapper.getByTestId('select-trigger'));
			const searchInput = within(popover).getByRole('textbox');

			await userEvent.type(searchInput, 'usa');

			await waitFor(() => {
				expect(within(popover).getByText('United States')).toBeInTheDocument();
				expect(within(popover).queryByText('United Kingdom')).not.toBeInTheDocument();
			});

			await userEvent.clear(searchInput);
			await userEvent.type(searchInput, 'united');

			await waitFor(() => {
				expect(within(popover).getByText('United States')).toBeInTheDocument();
				expect(within(popover).getByText('United Kingdom')).toBeInTheDocument();
			});

			await userEvent.clear(searchInput);
			await userEvent.type(searchInput, 'deutsch');

			await waitFor(() => {
				expect(within(popover).getByText('Germany')).toBeInTheDocument();
				expect(within(popover).queryByText('United States')).not.toBeInTheDocument();
			});
		});

		it('should clear search when the dropdown closes', async () => {
			const wrapper = render(Select, {
				props: {
					items: roleItems,
					searchable: true,
				},
			});

			await userEvent.click(wrapper.getByTestId('select-trigger'));
			const { popover } = await getPopoverContainer(wrapper.getByTestId('select-trigger'));
			const searchInput = within(popover).getByRole('textbox');

			await userEvent.type(searchInput, 'admin');
			expect(searchInput).toHaveValue('admin');

			await userEvent.keyboard('{Escape}');

			await waitFor(() => {
				expect(wrapper.emitted('update:searchQuery')?.at(-1)).toEqual(['']);
			});
		});

		it('should move focus from search to the first option on ArrowDown', async () => {
			const wrapper = render(Select, {
				props: {
					items: roleItems,
					searchable: true,
				},
			});

			await userEvent.click(wrapper.getByTestId('select-trigger'));
			const { popover } = await getPopoverContainer(wrapper.getByTestId('select-trigger'));
			const searchInput = within(popover).getByRole('textbox');

			await waitFor(() => {
				expect(searchInput).toHaveFocus();
			});

			await userEvent.keyboard('{ArrowDown}');

			await waitFor(() => {
				expect(within(popover).getByRole('option', { name: 'Admin' })).toHaveFocus();
			});
		});

		it('should return focus to search on ArrowUp from the first option', async () => {
			const wrapper = render(Select, {
				props: {
					items: roleItems,
					searchable: true,
				},
			});

			await userEvent.click(wrapper.getByTestId('select-trigger'));
			const { popover } = await getPopoverContainer(wrapper.getByTestId('select-trigger'));
			const searchInput = within(popover).getByRole('textbox');

			await waitFor(() => {
				expect(searchInput).toHaveFocus();
			});

			await userEvent.keyboard('{ArrowDown}');

			await waitFor(() => {
				expect(within(popover).getByRole('option', { name: 'Admin' })).toHaveFocus();
			});

			await userEvent.keyboard('{ArrowUp}');

			await waitFor(() => {
				expect(searchInput).toHaveFocus();
			});
		});

		it('should return focus to search and append the character when typing on an option', async () => {
			const wrapper = render(Select, {
				props: {
					items: roleItems,
					searchable: true,
				},
			});

			await userEvent.click(wrapper.getByTestId('select-trigger'));
			const { popover } = await getPopoverContainer(wrapper.getByTestId('select-trigger'));
			const searchInput = within(popover).getByRole('textbox');

			await waitFor(() => {
				expect(searchInput).toHaveFocus();
			});

			await userEvent.keyboard('{ArrowDown}');

			await waitFor(() => {
				expect(within(popover).getByRole('option', { name: 'Admin' })).toHaveFocus();
			});

			await userEvent.keyboard('d');

			await waitFor(() => {
				expect(searchInput).toHaveFocus();
				expect(searchInput).toHaveValue('d');
			});
		});
	});

	describe('clearable', () => {
		test.each([
			[{ modelValue: 'Option 1', clearable: true }, true],
			[{ defaultValue: 'Option 1', clearable: true }, true],
			[{ clearable: true }, false],
			[{ modelValue: 'Option 1', clearable: true, disabled: true }, false],
		] as const)('clear button visibility %#', (props, visible) => {
			const wrapper = render(Select, {
				props: {
					items: [
						{ value: 'Option 1', label: 'Option 1' },
						{ value: 'Option 2', label: 'Option 2' },
					],
					...props,
				},
			});

			const clearButton = wrapper.queryByRole('button', { name: 'Clear selection' });
			if (visible) {
				expect(clearButton).toBeVisible();
				expect(clearButton).toHaveAttribute('type', 'button');
			} else {
				expect(clearButton).not.toBeInTheDocument();
			}
		});

		it('should clear value on clear button click', async () => {
			const wrapper = render(Select, {
				props: {
					items: [
						{ value: 'Option 1', label: 'Option 1' },
						{ value: 'Option 2', label: 'Option 2' },
					],
					modelValue: 'Option 1',
					clearable: true,
				},
			});

			await userEvent.click(wrapper.getByRole('button', { name: 'Clear selection' }));

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([undefined]);
				expect(wrapper.emitted('clear')).toBeTruthy();
			});
		});

		it('should clear an uncontrolled defaultValue', async () => {
			const wrapper = render(Select, {
				props: {
					items: [
						{ value: 'Option 1', label: 'Option 1' },
						{ value: 'Option 2', label: 'Option 2' },
					],
					defaultValue: 'Option 1',
					clearable: true,
					placeholder: 'Choose an option',
				},
			});

			const trigger = wrapper.getByTestId('select-trigger');
			expect(trigger).toHaveTextContent('Option 1');

			await userEvent.click(wrapper.getByRole('button', { name: 'Clear selection' }));

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([undefined]);
				expect(wrapper.emitted('clear')).toBeTruthy();
				expect(trigger).toHaveTextContent('Choose an option');
				expect(wrapper.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
			});
		});

		it('should clear multiple values to empty array', async () => {
			const wrapper = render(Select, {
				props: {
					items: [
						{ value: 'Option 1', label: 'Option 1' },
						{ value: 'Option 2', label: 'Option 2' },
					],
					modelValue: ['Option 1'],
					multiple: true,
					clearable: true,
				},
			});

			await userEvent.click(wrapper.getByRole('button', { name: 'Clear selection' }));

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[]]);
			});
		});
	});
});
