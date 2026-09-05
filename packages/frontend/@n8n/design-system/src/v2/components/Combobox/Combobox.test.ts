import userEvent from '@testing-library/user-event';
import { render, waitFor, within } from '@testing-library/vue';
import { nextTick, ref } from 'vue';

import type { ComboboxItem, ComboboxSizes } from './Combobox.types';
import Combobox from './Combobox.vue';

function options(...labels: string[]) {
	return labels.map((label) => ({ label, value: label }));
}

const sizeCases: Array<[ComboboxSizes | undefined, string]> = [
	[undefined, 'large'],
	['mini', 'mini'],
	['small', 'small'],
	['medium', 'medium'],
	['large', 'large'],
	['xlarge', 'xlarge'],
];

vi.mock('@n8n/design-system/composables/useI18n', () => ({
	useI18n: () => ({
		t: (key: string, options?: Record<string, string>) => {
			const translations = new Map([
				['combobox.clearSelection', 'Clear selection'],
				['combobox.showPopup', 'Show popup'],
				['combobox.placeholder', 'Select an option'],
				['combobox.emptyText', 'No results found.'],
				['tagsInput.removeTag', 'Remove {tag}'],
			]);
			const template = translations.get(key) ?? key;
			if (!options) {
				return template;
			}
			return template.replace(/\{(\w+)\}/g, (_, name: string) => options[name] ?? '');
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
					items: options('Option 1', 'Option 2', 'Option 3'),
					placeholder: 'Search options',
				},
			});
			expect(wrapper.getByPlaceholderText('Search options')).toBeInTheDocument();
		});

		it('should render with icon prop', () => {
			const wrapper = render(Combobox, {
				props: {
					items: options('Option 1', 'Option 2', 'Option 3'),
					icon: 'search',
				},
			});
			expect(wrapper.container.querySelector('svg')).toBeInTheDocument();
		});

		it('should render disabled state', () => {
			const wrapper = render(Combobox, {
				props: {
					items: options('Option 1', 'Option 2', 'Option 3'),
					disabled: true,
				},
			});
			expect(getComboboxInput(wrapper)).toBeDisabled();
			expect(wrapper.getByTestId('combobox')).toHaveAttribute('data-disabled');
		});

		it('should apply the provided id to the input', () => {
			const wrapper = render(Combobox, {
				props: {
					id: 'status-field',
					items: options('Option 1'),
				},
			});

			expect(getComboboxInput(wrapper)).toHaveAttribute('id', 'status-field');
		});
	});

	describe('accessible name', () => {
		it('should not use the placeholder as the input accessible name', () => {
			const wrapper = render(Combobox, {
				props: {
					items: options('Option 1'),
					placeholder: 'Search options',
				},
			});

			const input = getComboboxInput(wrapper);
			expect(input).toHaveAttribute('placeholder', 'Search options');
			expect(input).not.toHaveAttribute('aria-label');
			expect(wrapper.queryByRole('combobox', { name: 'Search options' })).not.toBeInTheDocument();
		});

		it('should forward aria-label to the input, not the anchor', () => {
			const wrapper = render(Combobox, {
				props: {
					items: options('Option 1'),
					placeholder: 'Search options',
				},
				attrs: {
					'aria-label': 'Status',
				},
			});

			expect(getComboboxInput(wrapper)).toHaveAttribute('aria-label', 'Status');
			expect(wrapper.getByTestId('combobox')).not.toHaveAttribute('aria-label');
			expect(wrapper.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();
		});

		it('should forward ARIA attributes to the input, not the anchor', () => {
			const wrapper = render(Combobox, {
				props: {
					items: options('Option 1'),
				},
				attrs: {
					'aria-describedby': 'status-help',
					'aria-errormessage': 'status-error',
					'aria-invalid': 'true',
					'aria-required': 'true',
				},
			});

			const input = getComboboxInput(wrapper);
			const anchor = wrapper.getByTestId('combobox');

			expect(input).toHaveAttribute('aria-describedby', 'status-help');
			expect(input).toHaveAttribute('aria-errormessage', 'status-error');
			expect(input).toHaveAttribute('aria-invalid', 'true');
			expect(input).toHaveAttribute('aria-required', 'true');
			expect(anchor).not.toHaveAttribute('aria-describedby');
			expect(anchor).not.toHaveAttribute('aria-errormessage');
			expect(anchor).not.toHaveAttribute('aria-invalid');
			expect(anchor).not.toHaveAttribute('aria-required');
		});

		test.each([false, true])(
			'should update forwarded ARIA and fallthrough attributes after the first render (multiple: %s)',
			async (multiple) => {
				const ariaInvalid = ref<string | undefined>();
				const ariaDescribedby = ref<string | undefined>();
				const dataTrack = ref('initial');

				const wrapper = render({
					components: { Combobox },
					setup() {
						return {
							ariaInvalid,
							ariaDescribedby,
							dataTrack,
							items: options('Option 1'),
							multiple,
						};
					},
					template: `
						<Combobox
							:items="items"
							:multiple="multiple"
							:aria-invalid="ariaInvalid"
							:aria-describedby="ariaDescribedby"
							:data-track="dataTrack"
						/>
					`,
				});

				const input = getComboboxInput(wrapper);
				const anchor = wrapper.getByTestId('combobox');

				expect(input).not.toHaveAttribute('aria-invalid');
				expect(input).not.toHaveAttribute('aria-describedby');
				expect(anchor).toHaveAttribute('data-track', 'initial');
				expect(anchor).not.toHaveAttribute('aria-invalid');

				ariaInvalid.value = 'true';
				ariaDescribedby.value = 'status-help';
				dataTrack.value = 'updated';
				await nextTick();

				expect(input).toHaveAttribute('aria-invalid', 'true');
				expect(input).toHaveAttribute('aria-describedby', 'status-help');
				expect(anchor).toHaveAttribute('data-track', 'updated');
				expect(anchor).not.toHaveAttribute('aria-invalid');
				expect(anchor).not.toHaveAttribute('aria-describedby');

				ariaInvalid.value = undefined;
				ariaDescribedby.value = undefined;
				await nextTick();

				expect(input).not.toHaveAttribute('aria-invalid');
				expect(input).not.toHaveAttribute('aria-describedby');
			},
		);
	});

	describe('sizes', () => {
		test.each(sizeCases)('size %s should apply %s class', (size, expected) => {
			const wrapper = render(Combobox, {
				props: {
					items: options('Option 1'),
					size,
				},
			});
			expect(wrapper.getByTestId('combobox').className).toContain(expected);
		});
	});

	describe('item types', () => {
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

		it('should render each group label with a unique id and its own group', async () => {
			const items: ComboboxItem[] = [
				{ header: true, label: 'Fruits' },
				{ value: 'apple', label: 'Apple' },
				{ header: true, label: 'More Fruits' },
				{ value: 'mango', label: 'Mango' },
			];
			render(Combobox, {
				props: {
					items,
					defaultOpen: true,
				},
			});

			const { popover } = await getPopoverContainer();

			const fruits = within(popover).getByText('Fruits');
			const moreFruits = within(popover).getByText('More Fruits');
			expect(fruits).toBeVisible();
			expect(moreFruits).toBeVisible();
			expect(fruits.id).toBeTruthy();
			expect(moreFruits.id).toBeTruthy();
			expect(fruits.id).not.toBe(moreFruits.id);

			const groupElements = popover.querySelectorAll('[role="group"]');
			expect(groupElements).toHaveLength(2);
			expect(groupElements[0]).toHaveAttribute('aria-labelledby', fruits.id);
			expect(groupElements[1]).toHaveAttribute('aria-labelledby', moreFruits.id);
		});

		it('should skip headers during keyboard navigation', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: [
						{ header: true, label: 'Fruits' },
						{ value: 'apple', label: 'Apple' },
					],
					defaultOpen: true,
				},
			});

			const input = getComboboxInput(wrapper);
			await userEvent.click(input);
			await userEvent.keyboard('{ArrowDown}{Enter}');

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['apple']);
			});
		});

		it('should render unlabeled groups without a heading', async () => {
			const items: ComboboxItem[] = [
				{ value: 'apple', label: 'Apple' },
				{ header: true, label: 'Vegetables', divided: true },
				{ value: 'carrot', label: 'Carrot' },
			];
			render(Combobox, {
				props: {
					items,
					defaultOpen: true,
				},
			});

			const { popover } = await getPopoverContainer();

			const groupElements = popover.querySelectorAll('[role="group"]');
			expect(groupElements).toHaveLength(2);
			expect(groupElements[0].getAttribute('aria-labelledby')).toBeFalsy();
			expect(within(popover).getByText('Vegetables')).toBeVisible();
			expect(within(popover).getByRole('option', { name: 'Apple' })).toBeVisible();
			expect(within(popover).getByRole('option', { name: 'Carrot' })).toBeVisible();
		});

		it('should split unlabeled options into sibling groups without a separator node', async () => {
			const items: ComboboxItem[] = [
				{ value: '1', label: 'Option 1' },
				{ value: '2', label: 'Option 2', divided: true },
			];
			render(Combobox, {
				props: {
					items,
					defaultOpen: true,
				},
			});

			const { popover } = await getPopoverContainer();
			// Dividers are CSS on sibling groups; a separator node is invalid inside listbox
			// and would remain visible when Reka hides a filtered group.
			expect(popover.querySelectorAll('[role="separator"]')).toHaveLength(0);
			expect(popover.querySelectorAll('[role="group"]')).toHaveLength(2);
			expect(within(popover).getByRole('option', { name: 'Option 1' })).toBeVisible();
			expect(within(popover).getByRole('option', { name: 'Option 2' })).toBeVisible();
		});

		it('should render empty state text when filtering returns no matches', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: options('Apple', 'Banana'),
					defaultOpen: true,
					emptyText: 'Nothing here',
				},
			});

			const input = getComboboxInput(wrapper);
			await userEvent.type(input, 'zzzz');

			await waitFor(() => {
				expect(wrapper.getByRole('status')).toHaveTextContent('Nothing here');
			});
		});

		it('should render empty state when items is an empty array', async () => {
			render(Combobox, {
				props: {
					items: [],
					defaultOpen: true,
					emptyText: 'No options',
				},
			});

			const { popover } = await getPopoverContainer();
			expect(within(popover).getByRole('status')).toHaveTextContent('No options');
			expect(within(popover).queryAllByRole('option')).toHaveLength(0);
		});
	});

	describe('portal', () => {
		it('should keep the popover in-place when teleported is false', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: options('Option 1', 'Option 2'),
					defaultOpen: true,
					teleported: false,
				},
			});

			const { popover } = await getPopoverContainer();
			expect(wrapper.getByTestId('combobox').contains(popover)).toBe(false);
			expect(wrapper.container.contains(popover)).toBe(true);
			expect(document.body.contains(popover)).toBe(true);
			// Not teleported to body as a direct child of body (still under the mount root).
			expect(popover.parentElement).not.toBe(document.body);
		});

		it('should teleport the popover to portalTarget when set', async () => {
			const portalTarget = document.createElement('div');
			portalTarget.id = 'combobox-portal-target';
			document.body.appendChild(portalTarget);

			const wrapper = render(Combobox, {
				props: {
					items: options('Option 1', 'Option 2'),
					defaultOpen: true,
					teleported: false,
					portalTarget,
				},
			});

			try {
				const { popover } = await getPopoverContainer();
				expect(portalTarget.contains(popover)).toBe(true);
			} finally {
				wrapper.unmount();
				portalTarget.remove();
			}
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

		it('should match items via keywords without changing the displayed label', async () => {
			const items: ComboboxItem[] = [
				{ value: 'us', label: 'United States', keywords: ['USA', 'America'] },
				{ value: 'uk', label: 'United Kingdom', keywords: ['Britain', 'England'] },
			];

			const wrapper = render(Combobox, {
				props: { items, defaultOpen: true },
			});

			const input = getComboboxInput(wrapper);
			await userEvent.type(input, 'america');

			await waitFor(() => {
				expect(wrapper.getByText('United States')).toBeVisible();
				expect(wrapper.queryByText('United Kingdom')).not.toBeInTheDocument();
			});
		});

		it('should still match the label when keywords are set', async () => {
			const items: ComboboxItem[] = [
				{ value: 'us', label: 'United States', keywords: ['USA', 'America'] },
				{ value: 'uk', label: 'United Kingdom', keywords: ['Britain'] },
			];

			const wrapper = render(Combobox, {
				props: { items, defaultOpen: true },
			});

			const input = getComboboxInput(wrapper);
			await userEvent.type(input, 'united');

			await waitFor(() => {
				expect(wrapper.getByText('United States')).toBeVisible();
				expect(wrapper.getByText('United Kingdom')).toBeVisible();
			});
		});

		it('should hide groups with no matches without leaving a separator', async () => {
			const items: ComboboxItem[] = [
				{ header: true, label: 'Fruits' },
				{ value: 'apple', label: 'Apple' },
				{ header: true, label: 'Vegetables', divided: true },
				{ value: 'carrot', label: 'Carrot' },
			];

			const wrapper = render(Combobox, {
				props: { items, defaultOpen: true },
			});

			const { popover } = await getPopoverContainer();
			const input = getComboboxInput(wrapper);
			await userEvent.type(input, 'carrot');

			await waitFor(() => {
				expect(within(popover).getByRole('option', { name: 'Carrot' })).toBeVisible();
			});

			expect(within(popover).queryByRole('option', { name: 'Apple' })).not.toBeInTheDocument();
			expect(within(popover).getByText('Fruits')).not.toBeVisible();
			expect(within(popover).getByText('Vegetables')).toBeVisible();
			expect(popover.querySelectorAll('[role="separator"]')).toHaveLength(0);

			const groupElements = popover.querySelectorAll('[role="group"]');
			expect(groupElements).toHaveLength(2);
			expect(groupElements[0]).toHaveAttribute('hidden');
			expect(groupElements[1]).not.toHaveAttribute('hidden');
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

	describe('onSelect', () => {
		it('should not update modelValue when onSelect calls preventDefault', async () => {
			const onSelect = vi.fn((event: Event) => {
				event.preventDefault();
			});
			const items: ComboboxItem[] = [
				{ value: 'apple', label: 'Apple' },
				{ value: '__create__', label: 'Create new fruit', onSelect },
			];

			const wrapper = render(Combobox, {
				props: { items, defaultOpen: true, modelValue: 'apple' },
			});

			const { popover } = await getPopoverContainer();
			await userEvent.click(within(popover).getByRole('option', { name: 'Create new fruit' }));

			await waitFor(() => {
				expect(onSelect).toHaveBeenCalled();
			});
			expect(wrapper.emitted('update:modelValue')).toBeFalsy();
			expect(getComboboxInput(wrapper)).toHaveValue('Apple');
		});
	});

	describe('clearable', () => {
		test.each([
			[{ modelValue: 'Option 1', clearable: true }, true],
			[{ clearable: true }, false],
			[{ modelValue: 'Option 1', clearable: true, disabled: true }, false],
		] as const)('clear button visibility %#', (props, visible) => {
			const wrapper = render(Combobox, {
				props: {
					items: options('Option 1', 'Option 2'),
					...props,
				},
			});

			const clearButton = wrapper.queryByRole('button', { name: 'Clear selection' });
			if (visible) {
				expect(clearButton).toBeVisible();
			} else {
				expect(clearButton).not.toBeInTheDocument();
			}
		});

		it('should emit undefined when clear button is clicked', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: options('Option 1', 'Option 2'),
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
					items: options('Option 1', 'Option 2'),
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
			const items = options('Option 1', 'Option 2', 'Option 3');
			const wrapper = render({
				components: { Combobox },
				setup() {
					const value = ref('Option 1');
					return { value, items };
				},
				template: `
					<Combobox
						v-model="value"
						:items="items"
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
			const items = options('Option 1', 'Option 2');
			const wrapper = render({
				components: { Combobox },
				setup() {
					const value = ref('Option 1');
					return { value, items };
				},
				template: `
					<Combobox
						v-model="value"
						:items="items"
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
		it('should update modelValue and display the label on selection', async () => {
			const value = ref('2');
			const items = [
				{ value: '1', label: 'Option 1' },
				{ value: '2', label: 'Option 2' },
			];

			const wrapper = render({
				components: { Combobox },
				setup() {
					return { value, items };
				},
				template: `
					<Combobox
						v-model="value"
						:items="items"
						:default-open="true"
					/>
				`,
			});

			await waitFor(() => {
				expect(getComboboxInput(wrapper)).toHaveValue('Option 2');
			});

			const { popover } = await getPopoverContainer();
			await userEvent.click(within(popover).getByText('Option 1'));

			await waitFor(() => {
				expect(value.value).toBe('1');
				expect(getComboboxInput(wrapper)).toHaveValue('Option 1');
			});
		});

		it('should resolve the display label when items load after the value is set', async () => {
			const items = ref<ComboboxItem[]>([]);
			const value = ref('in_progress');

			const wrapper = render({
				components: { Combobox },
				setup() {
					return { value, items };
				},
				template: `
					<Combobox
						v-model="value"
						:items="items"
					/>
				`,
			});

			expect(getComboboxInput(wrapper)).toHaveValue('in_progress');

			items.value = [{ value: 'in_progress', label: 'In Progress' }];

			await waitFor(() => {
				expect(getComboboxInput(wrapper)).toHaveValue('In Progress');
			});
		});

		it('should resolve tag labels when items load after values are set', async () => {
			const items = ref<ComboboxItem[]>([]);
			const value = ref(['in_progress']);

			const wrapper = render({
				components: { Combobox },
				setup() {
					return { value, items };
				},
				template: `
					<Combobox
						v-model="value"
						:items="items"
						multiple
					/>
				`,
			});

			expect(wrapper.getByText('in_progress')).toBeVisible();

			items.value = [{ value: 'in_progress', label: 'In Progress' }];

			await waitFor(() => {
				expect(wrapper.getByText('In Progress')).toBeVisible();
			});
		});

		it('should keep the selection when the input is cleared to search again', async () => {
			const value = ref('Apple');
			const items = options('Apple', 'Banana', 'Orange');
			const wrapper = render({
				components: { Combobox },
				setup() {
					return { value, items };
				},
				template: `
					<Combobox
						v-model="value"
						:items="items"
						clearable
					/>
				`,
			});

			const input = getComboboxInput(wrapper);
			input.focus();
			await userEvent.clear(input);
			await userEvent.type(input, 'Ban');

			expect(value.value).toBe('Apple');
			expect(wrapper.emitted('update:modelValue')).toBeFalsy();
			expect(wrapper.queryByRole('button', { name: 'Clear selection' })).toBeInTheDocument();
		});

		it('should restore the committed selection when an abandoned search is dismissed', async () => {
			const value = ref('Apple');
			const items = options('Apple', 'Banana', 'Orange');
			render({
				components: { Combobox },
				setup() {
					return { value, items };
				},
				template: `
					<Combobox
						v-model="value"
						:items="items"
						clearable
					/>
				`,
			});

			const input = document.querySelector('[role="combobox"]');
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Combobox input not found');
			}

			input.focus();
			await userEvent.clear(input);
			await userEvent.type(input, 'Ban');
			await userEvent.keyboard('{Escape}');
			input.blur();

			await waitFor(() => {
				expect(value.value).toBe('Apple');
				expect(input).toHaveValue('Apple');
			});
		});
	});

	describe('defaultValue', () => {
		it('should clear an uncontrolled single selection', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: options('Option 1', 'Option 2'),
					defaultValue: 'Option 1',
					clearable: true,
				},
			});

			expect(getComboboxInput(wrapper)).toHaveValue('Option 1');
			expect(wrapper.getByTestId('combobox')).not.toHaveAttribute('data-empty');

			await userEvent.click(wrapper.getByRole('button', { name: 'Clear selection' }));

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([undefined]);
				expect(getComboboxInput(wrapper)).toHaveValue('');
				expect(wrapper.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
				expect(wrapper.getByTestId('combobox')).toHaveAttribute('data-empty', 'true');
			});
		});

		it('should clear an uncontrolled multiple selection', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: options('Option 1', 'Option 2', 'Option 3'),
					defaultValue: ['Option 1', 'Option 3'],
					multiple: true,
					clearable: true,
				},
			});

			expect(wrapper.getAllByTestId('tags-input-tag')).toHaveLength(2);
			expect(wrapper.getByText('Option 1')).toBeVisible();
			expect(wrapper.getByText('Option 3')).toBeVisible();

			await userEvent.click(wrapper.getByRole('button', { name: 'Clear selection' }));

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[]]);
				expect(wrapper.queryAllByTestId('tags-input-tag')).toHaveLength(0);
				expect(wrapper.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
			});
		});
	});

	describe('multiple selection', () => {
		it('should clear the search input after selecting an option', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: options('Apple', 'Banana'),
					multiple: true,
					defaultOpen: true,
				},
			});

			const input = getComboboxInput(wrapper);
			const { popover } = await getPopoverContainer();
			await userEvent.type(input, 'App');
			await userEvent.click(within(popover).getByRole('option', { name: 'Apple' }));

			await waitFor(() => {
				expect(wrapper.getAllByTestId('tags-input-tag')).toHaveLength(1);
				expect(input).toHaveValue('');
			});
			expect(within(popover).getByRole('option', { name: 'Banana' })).toBeVisible();
		});

		it('should clear the search input after selecting with Enter', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: options('Apple', 'Banana'),
					multiple: true,
					defaultOpen: true,
				},
			});

			const input = getComboboxInput(wrapper);
			await userEvent.type(input, 'Apple{Enter}');

			await waitFor(() => {
				expect(wrapper.getAllByTestId('tags-input-tag')).toHaveLength(1);
				expect(input).toHaveValue('');
			});
		});
	});

	describe('events', () => {
		it('should open on focus, close after selection, and emit update:open', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: options('Option 1', 'Option 2', 'Option 3'),
				},
			});

			getComboboxInput(wrapper).focus();
			const { popover } = await getPopoverContainer();

			await waitFor(() => {
				expect(wrapper.emitted('update:open')).toBeTruthy();
			});

			await userEvent.click(within(popover).getByRole('option', { name: 'Option 1' }));

			await waitFor(() => {
				expect(document.querySelector('[role="listbox"][data-state="open"]')).toBeNull();
			});
		});

		it('should toggle the dropdown when the chevron is clicked', async () => {
			const wrapper = render(Combobox, {
				props: {
					items: options('Option 1', 'Option 2', 'Option 3'),
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

		it('should allow Tab to move focus out while the popup is open', async () => {
			const user = userEvent.setup();
			const items = options('Option 1', 'Option 2');
			const wrapper = render({
				components: { Combobox },
				setup() {
					return { items };
				},
				template: `
					<div>
						<button type="button">Before field</button>
						<Combobox :items="items" :teleported="false" />
						<button type="button">After field</button>
					</div>
				`,
			});

			const input = getComboboxInput(wrapper);
			const after = wrapper.getByRole('button', { name: 'After field' });

			await user.click(input);
			await getPopoverContainer();
			expect(input).toHaveFocus();

			await user.tab();

			await waitFor(() => {
				expect(after).toHaveFocus();
			});
			expect(document.querySelector('[role="listbox"][data-state="open"]')).toBeNull();
		});
	});

	describe('slots', () => {
		it('should render the item slot', async () => {
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

		it('should render item-leading, item-label, and item-trailing slots', async () => {
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
					'item-label': '<span data-test-id="custom-label">any</span>',
					'item-trailing': '<span data-test-id="custom-trailing">any</span>',
				},
			});

			const { popover } = await getPopoverContainer();

			await waitFor(() => {
				expect(within(popover).getAllByTestId('custom-leading')).toHaveLength(2);
				expect(within(popover).getAllByTestId('custom-label')).toHaveLength(2);
				expect(within(popover).getAllByTestId('custom-trailing')).toHaveLength(2);
			});
		});

		it('should render label slot', async () => {
			render(Combobox, {
				props: {
					items: [
						{ header: true, label: 'Group 1' },
						{ value: '1', label: 'Option 1' },
					],
					defaultOpen: true,
				},
				slots: {
					label:
						'<template #label="{ item }"><span data-test-id="custom-label-heading">Custom {{ item.label }}</span></template>',
				},
			});

			const { popover } = await getPopoverContainer();

			await waitFor(() => {
				expect(within(popover).getByTestId('custom-label-heading')).toHaveTextContent(
					'Custom Group 1',
				);
			});
		});
	});

	describe('item validation', () => {
		test.each([
			{
				name: 'empty value',
				items: [
					{ label: 'Alpha', value: '' },
					{ label: 'Beta', value: 'beta' },
				],
				missingName: 'Alpha',
				warnIncludes: 'value',
			},
			{
				name: 'empty label',
				items: [
					{ label: '', value: 'alpha' },
					{ label: 'Beta', value: 'beta' },
				],
				missingName: 'alpha',
				warnIncludes: 'label',
			},
		])(
			'should skip items with an $name and keep the dropdown usable',
			async ({ items, missingName, warnIncludes }) => {
				const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

				render(Combobox, {
					props: {
						items,
						defaultOpen: true,
					},
				});

				const { popover } = await getPopoverContainer();

				await waitFor(() => {
					expect(within(popover).getByRole('option', { name: 'Beta' })).toBeVisible();
				});
				expect(
					within(popover).queryByRole('option', { name: missingName }),
				).not.toBeInTheDocument();
				expect(warnSpy.mock.calls.some((call) => String(call[0]).includes(warnIncludes))).toBe(
					true,
				);

				warnSpy.mockRestore();
			},
		);
	});
});
