import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';

import N8nButton from '@n8n/design-system/components/N8nButton/Button.vue';
import N8nDialog from '@n8n/design-system/components/N8nDialog/Dialog.vue';
import N8nDialogClose from '@n8n/design-system/components/N8nDialog/DialogClose.vue';
import N8nDialogFooter from '@n8n/design-system/components/N8nDialog/DialogFooter.vue';
import N8nIcon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import N8nInput from '@n8n/design-system/components/N8nInput';

import type { ComboboxItem as ComboboxItemType } from './Combobox.types';
import Combobox from './Combobox.vue';

type GenericMeta<C> = Omit<Meta<C>, 'component'> & {
	component: Record<keyof C, unknown>;
};

const statusItems = [
	{ label: 'Backlog', value: 'Backlog' },
	{ label: 'Todo', value: 'Todo' },
	{ label: 'In Progress', value: 'In Progress' },
	{ label: 'Done', value: 'Done' },
];

const objectItems: ComboboxItemType[] = [
	{ label: 'Option 1', value: 'option1' },
	{ label: 'Option 2', value: 'option2' },
	{ label: 'Option 3', value: 'option3' },
];

const controlledDemoItems: ComboboxItemType[] = [
	{ label: 'Workflows', value: 'workflows', icon: 'bolt-filled' },
	{ label: 'Credentials', value: 'credentials', icon: 'lock' },
	{ label: 'Executions', value: 'executions', icon: 'list' },
	{ label: 'Variables', value: 'variables', icon: 'variable' },
];

const fruitItems: ComboboxItemType[] = [
	{
		type: 'group',
		label: 'Fruits',
		items: [
			{ label: 'Apple', value: 'apple' },
			{ label: 'Banana', value: 'banana' },
			{ label: 'Orange', value: 'orange' },
			{ label: 'Grapes', value: 'grapes' },
			{ label: 'Mango', value: 'mango' },
			{ label: 'Pineapple', value: 'pineapple' },
			{ label: 'Strawberry', value: 'strawberry' },
			{ label: 'Blueberry', value: 'blueberry' },
			{ label: 'Watermelon', value: 'watermelon' },
			{ label: 'Papaya', value: 'papaya' },
			{ label: 'Cherry', value: 'cherry' },
			{ label: 'Peach', value: 'peach' },
			{ label: 'Pear', value: 'pear' },
			{ label: 'Plum', value: 'plum' },
			{ label: 'Kiwi', value: 'kiwi' },
			{ label: 'Lemon', value: 'lemon' },
			{ label: 'Lime', value: 'lime' },
			{ label: 'Coconut', value: 'coconut' },
		],
	},
	{ type: 'separator' },
	{
		type: 'group',
		label: 'More Fruits',
		items: [
			{ label: 'Pomegranate', value: 'pomegranate' },
			{ label: 'Guava', value: 'guava' },
			{ label: 'Dragon Fruit', value: 'dragon_fruit' },
			{ label: 'Lychee', value: 'lychee' },
			{ label: 'Fig', value: 'fig' },
			{ label: 'Apricot', value: 'apricot' },
			{ label: 'Raspberry', value: 'raspberry' },
			{ label: 'Blackberry', value: 'blackberry' },
			{ label: 'Cantaloupe', value: 'cantaloupe' },
			{ label: 'Passion Fruit', value: 'passion_fruit' },
			{ label: 'Cranberry', value: 'cranberry' },
			{ label: 'Tangerine', value: 'tangerine' },
		],
	},
];

const iconItems: ComboboxItemType[] = [
	{
		value: 'system',
		label: 'System Default',
		icon: 'settings',
		disabled: true,
	},
	{
		value: 'light',
		label: 'Light',
		icon: 'wrench',
	},
	{
		value: 'dark',
		label: 'Dark',
		icon: 'filled-square',
	},
];

const slotItems: ComboboxItemType[] = [
	{
		value: 'system',
		label: 'System Default',
		icon: 'settings',
		disabled: true,
	},
	{
		value: 'light',
		label: 'Light',
		icon: 'wrench',
	},
	{
		value: 'dark',
		label: 'Dark',
		icon: 'filled-square',
	},
	{
		value: 'dark2',
		label: 'Dark2',
		icon: 'filled-square',
	},
];

const itemsWithDisabledOption: ComboboxItemType[] = [
	{ label: 'Backlog', value: 'backlog' },
	{ label: 'Todo', value: 'todo' },
	{ label: 'In Progress', value: 'in_progress' },
	{ label: 'Done', value: 'done', disabled: true },
];

const itemsWithKeywords: ComboboxItemType[] = [
	{ label: 'Germany', value: 'de', keywords: ['Deutschland', 'DE'] },
	{ label: 'Japan', value: 'jp', keywords: ['Nippon', 'JP'] },
	{ label: 'United Kingdom', value: 'uk', keywords: ['Britain', 'England', 'UK', 'GB'] },
	{ label: 'United States', value: 'us', keywords: ['USA', 'America', 'US'] },
];

const storyContainerStyle = 'padding: 40px; max-width: 400px';

const meta = {
	title: 'Experimental/Combobox',
	component: Combobox,
	tags: ['autodocs'],
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
} satisfies GenericMeta<typeof Combobox>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Items = {
	name: 'Items',
	render: (args) => ({
		components: { Combobox },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="${storyContainerStyle}">
			<Combobox v-bind="args" v-model="value" placeholder="Search status..." />
		</div>
		`,
	}),
	args: {
		items: statusItems,
		modelValue: undefined,
	},
	parameters: {
		docs: {
			description: {
				story:
					'Items as `{ label, value }` objects. The selected model value is the item `value`, while `label` is shown in the list and trigger.',
			},
		},
	},
} satisfies Story;

export const ItemsTypes = {
	render: (args) => ({
		components: { Combobox },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="${storyContainerStyle}">
			<Combobox
				v-bind="args"
				v-model="value"
				placeholder="Select a fruit..."
			/>
		</div>
		`,
	}),
	args: {
		items: fruitItems,
		modelValue: undefined,
	},
} satisfies Story;

export const Sizes = {
	render: (args) => ({
		components: { Combobox },
		setup() {
			const xlargeValue = ref(args.modelValue);
			const largeValue = ref(args.modelValue);
			const mediumValue = ref(args.modelValue);
			const smallValue = ref(args.modelValue);
			const miniValue = ref(args.modelValue);
			const xlargeMultiple = ref(['apple', 'banana', 'orange']);
			const largeMultiple = ref(['apple', 'banana', 'orange']);
			const mediumMultiple = ref(['apple', 'banana', 'orange']);
			const smallMultiple = ref(['apple', 'banana', 'orange']);
			const miniMultiple = ref(['apple', 'banana', 'orange']);
			return {
				args,
				xlargeValue,
				largeValue,
				mediumValue,
				smallValue,
				miniValue,
				xlargeMultiple,
				largeMultiple,
				mediumMultiple,
				smallMultiple,
				miniMultiple,
				fruitItems,
			};
		},
		template: `
		<div style="${storyContainerStyle}; display: flex; flex-direction: column; gap: var(--spacing--xl);">
			<section style="display: flex; flex-direction: column; gap: var(--spacing--md);">
				<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					Single
				</h3>
				<Combobox v-bind="args" v-model="xlargeValue" size="xlarge" placeholder="xlarge (40px)" />
				<Combobox v-bind="args" v-model="largeValue" size="large" placeholder="large (36px, default)" />
				<Combobox v-bind="args" v-model="mediumValue" size="medium" placeholder="medium (32px)" />
				<Combobox v-bind="args" v-model="smallValue" size="small" placeholder="small (28px)" />
				<Combobox v-bind="args" v-model="miniValue" size="mini" placeholder="mini (24px)" />
			</section>
			<section style="display: flex; flex-direction: column; gap: var(--spacing--md);">
				<h3 style="margin: 0; font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					Multiple
				</h3>
				<Combobox :items="fruitItems" v-model="xlargeMultiple" size="xlarge" multiple clearable placeholder="xlarge (40px)" />
				<Combobox :items="fruitItems" v-model="largeMultiple" size="large" multiple clearable placeholder="large (36px, default)" />
				<Combobox :items="fruitItems" v-model="mediumMultiple" size="medium" multiple clearable placeholder="medium (32px)" />
				<Combobox :items="fruitItems" v-model="smallMultiple" size="small" multiple clearable placeholder="small (28px)" />
				<Combobox :items="fruitItems" v-model="miniMultiple" size="mini" multiple clearable placeholder="mini (24px)" />
			</section>
		</div>
		`,
	}),
	args: {
		items: statusItems,
		modelValue: undefined,
	},
} satisfies Story;

export const Disabled = {
	render: (args) => ({
		components: { Combobox },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="${storyContainerStyle}; display: flex; flex-direction: column; gap: var(--spacing--md);">
			<Combobox v-bind="args" v-model="value" disabled placeholder="Search options..." />
		</div>
		`,
	}),
	args: {
		items: objectItems,
		modelValue: undefined,
	},
} satisfies Story;

export const Clearable = {
	render: (args) => ({
		components: { Combobox },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="${storyContainerStyle}">
			<Combobox
				v-bind="args"
				v-model="value"
				clearable
				placeholder="Search status..."
			/>
		</div>
		`,
	}),
	args: {
		items: statusItems,
		modelValue: 'In Progress',
	},
} satisfies Story;

export const Empty = {
	name: 'Empty',
	render: (args) => ({
		components: { Combobox },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="${storyContainerStyle}">
			<Combobox
				v-bind="args"
				v-model="value"
				placeholder="Search options..."
			/>
		</div>
		`,
	}),
	args: {
		items: [],
		emptyText: 'No results found.',
		modelValue: undefined,
	},
	parameters: {
		docs: {
			description: {
				story:
					'Empty list state (`role="status"`) when there are no matching options. Focus or open the combobox to see it.',
			},
		},
	},
} satisfies Story;

export const AsyncItems = {
	name: 'Async Items',
	render: () => ({
		components: { Combobox, N8nButton },
		setup() {
			const value = ref('in_progress');
			const items = ref<ComboboxItemType[]>([]);
			const loading = ref(false);
			const loadCount = ref(0);

			async function loadItems(remount = false) {
				loading.value = true;
				items.value = [];
				if (remount) {
					loadCount.value += 1;
				}

				await new Promise((resolve) => setTimeout(resolve, 1500));
				items.value = itemsWithDisabledOption;
				loading.value = false;
			}

			void loadItems();

			return { value, items, loading, loadCount, loadItems };
		},
		template: `
		<div style="${storyContainerStyle}; display: flex; flex-direction: column; gap: var(--spacing--md);">
			<p style="margin: 0; font-size: var(--font-size--sm); color: var(--text-color--subtle);">
				<code>v-model</code> is already <code>in_progress</code> while <code>items</code> is empty.
				After 1.5s the options arrive and the input should update from the raw id to
				<strong>In Progress</strong>.
			</p>
			<Combobox
				:key="loadCount"
				v-model="value"
				:items="items"
				placeholder="Search status..."
			/>
			<N8nButton
				:label="loading ? 'Loading items…' : 'Reload items'"
				:disabled="loading"
				variant="outline"
				@click="loadItems(true)"
			/>
			<p style="margin: 0; font-size: var(--font-size--sm);">
				Selected: <strong>{{ value }}</strong>
				· Items: <strong>{{ items.length }}</strong>
			</p>
		</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'Simulates a selected value arriving before async options. The input falls back to the raw value until items resolve, then updates to the matching label. Reload remounts the field so you can watch the handoff again.',
			},
		},
	},
} satisfies Story;

export const Multiple = {
	render: (args) => ({
		components: { Combobox },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="${storyContainerStyle}">
			<Combobox
				v-bind="args"
				v-model="value"
				multiple
				clearable
				placeholder="Select fruits..."
			/>
		</div>
		`,
	}),
	args: {
		items: fruitItems,
		modelValue: ['apple', 'banana'],
	},
} satisfies Story;

export const ControlledUncontrolled = {
	name: 'Controlled/Uncontrolled',
	render: () => ({
		components: { Combobox },
		setup() {
			const controlledValue = ref<string | undefined>('workflows');
			const controlledOpen = ref(false);
			const presets = [
				{ label: 'Workflows', value: 'workflows' as string | undefined },
				{ label: 'Credentials', value: 'credentials' as string | undefined },
				{ label: 'Clear', value: undefined },
			];

			return {
				controlledDemoItems,
				controlledValue,
				controlledOpen,
				presets,
			};
		},
		template: `
		<div style="${storyContainerStyle}; display: flex; flex-direction: column; gap: var(--spacing--xl);">
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					Controlled
				</h3>
				<Combobox
					key="controlled"
					:items="controlledDemoItems"
					v-model="controlledValue"
					v-model:open="controlledOpen"
					placeholder="Search..."
				/>
				<div style="display: flex; gap: var(--spacing--2xs); margin-top: var(--spacing--sm); flex-wrap: wrap;">
					<button
						v-for="preset in presets"
						:key="preset.label"
						type="button"
						style="
							padding: var(--spacing--3xs) var(--spacing--xs);
							border: var(--border);
							border-radius: var(--radius--2xs);
							background: var(--background--surface);
							color: var(--text-color);
							cursor: pointer;
							font: inherit;
							font-size: var(--font-size--xs);
						"
						@click="controlledValue = preset.value"
					>
						{{ preset.label }}
					</button>
					<button
						type="button"
						style="
							padding: var(--spacing--3xs) var(--spacing--xs);
							border: var(--border);
							border-radius: var(--radius--2xs);
							background: var(--background--surface);
							color: var(--text-color);
							cursor: pointer;
							font: inherit;
							font-size: var(--font-size--xs);
						"
						@click="controlledOpen = !controlledOpen"
					>
						{{ controlledOpen ? 'Close' : 'Open' }}
					</button>
				</div>
				<p style="margin-top: var(--spacing--sm); font-size: var(--font-size--sm);">
					Selected: <strong>{{ controlledValue ?? '(empty)' }}</strong>
					· Open: <strong>{{ controlledOpen }}</strong>
				</p>
			</section>
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					Uncontrolled
				</h3>
				<Combobox
					key="uncontrolled"
					:items="controlledDemoItems"
					default-value="workflows"
					:default-open="false"
					placeholder="Search..."
				/>
			</section>
		</div>
		`,
	}),
} satisfies Story;

export const WithDisabledItem = {
	render: (args) => ({
		components: { Combobox },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="${storyContainerStyle}">
			<Combobox
				v-bind="args"
				v-model="value"
				placeholder="Select status..."
			/>
		</div>
		`,
	}),
	args: {
		items: itemsWithDisabledOption,
		modelValue: undefined,
	},
} satisfies Story;

export const WithKeywords = {
	name: 'With Keywords',
	render: (args) => ({
		components: { Combobox },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="${storyContainerStyle}">
			<Combobox
				v-bind="args"
				v-model="value"
				placeholder="Try 'America', 'Britain', or 'Deutschland'..."
			/>
		</div>
		`,
	}),
	args: {
		items: itemsWithKeywords,
		modelValue: undefined,
	},
	parameters: {
		docs: {
			description: {
				story:
					'Items can include `keywords` — extra strings matched during filtering (e.g. synonyms) without changing the displayed label. Try searching for "America", "Britain", or "Deutschland".',
			},
		},
	},
} satisfies Story;

export const WithIcons = {
	render: (args) => ({
		components: { Combobox, N8nIcon },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="${storyContainerStyle}; display: flex; gap: 16px; align-items: center;">
			<Combobox v-bind="args" v-model="value">
				<template #item-leading="{ item, ui }">
					<N8nIcon :icon="item.icon" color="primary" v-bind="ui" />
				</template>
			</Combobox>
		</div>
		`,
	}),
	args: {
		items: iconItems,
		modelValue: 'light',
	},
} satisfies Story;

export const WithSlots = {
	render: (args) => ({
		components: { Combobox, N8nIcon },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="${storyContainerStyle}">
			<Combobox v-bind="args" v-model="value">
				<template #item-leading="{ item, ui }">
					<N8nIcon :icon="item.icon" color="primary" v-bind="ui" />
				</template>

				<template #item-label="{ item }">
					Custom label: {{ item.label }}
				</template>

				<template #item-trailing="{ item, ui }">
					<N8nIcon :icon="item.icon" color="secondary" v-bind="ui" />
				</template>
			</Combobox>
		</div>
		`,
	}),
	args: {
		items: slotItems,
		modelValue: undefined,
	},
} satisfies Story;

const CREATE_FRUIT_VALUE = '__create_fruit__';

export const WithHeaderAndFooterActions = {
	name: 'With Header And Footer Actions',
	render: () => ({
		components: { Combobox, N8nDialog, N8nDialogFooter, N8nDialogClose, N8nButton },
		setup() {
			const value = ref<string | undefined>();
			const open = ref(false);
			const createOpen = ref(false);

			const options = [
				{ label: 'Apple', value: 'apple' },
				{ label: 'Banana', value: 'banana' },
				{ label: 'Orange', value: 'orange' },
			];

			const items = computed(() => [
				{
					type: 'group' as const,
					label: 'Suggested',
					items: options,
				},
				{ type: 'separator' as const },
				{
					label: 'Create new fruit',
					value: CREATE_FRUIT_VALUE,
					icon: 'plus' as const,
					onSelect: (event: Event) => {
						event.preventDefault();
						open.value = false;
						createOpen.value = true;
					},
				},
			]);

			return { value, open, createOpen, items };
		},
		template: `
		<div style="${storyContainerStyle}">
			<Combobox
				v-model="value"
				v-model:open="open"
				:items="items"
				placeholder="Select a fruit..."
			/>
			<N8nDialog
				v-model:open="createOpen"
				header="Create new fruit"
				description="This action item uses onSelect with preventDefault so it never becomes the Combobox value."
				size="small"
			>
				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton label="Cancel" variant="outline" />
					</N8nDialogClose>
					<N8nDialogClose as-child>
						<N8nButton label="Create" variant="solid" />
					</N8nDialogClose>
				</N8nDialogFooter>
			</N8nDialog>
		</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'Footer actions stay inside `role="listbox"` as options. Use `onSelect` with `event.preventDefault()` so choosing the action closes/opens a modal without updating `modelValue`.',
			},
		},
	},
} satisfies Story;

export const WithForm = {
	name: 'With Form',
	render: () => ({
		components: { Combobox, N8nButton, N8nInput },
		setup() {
			const name = ref('');
			const status = ref<string | undefined>();
			const fruits = ref<string[]>(['apple', 'banana']);
			const notes = ref('');

			return { name, status, fruits, notes, statusItems, fruitItems };
		},
		template: `
		<form
			style="${storyContainerStyle}; display: flex; flex-direction: column; gap: var(--spacing--md);"
			@submit.prevent
		>
			<label style="display: flex; flex-direction: column; gap: var(--spacing--2xs); font-size: var(--font-size--sm);">
				Name
				<N8nInput v-model="name" placeholder="Enter name..." />
			</label>
			<label style="display: flex; flex-direction: column; gap: var(--spacing--2xs); font-size: var(--font-size--sm);">
				Status
				<Combobox
					:items="statusItems"
					v-model="status"
					placeholder="Search status..."
				/>
			</label>
			<label style="display: flex; flex-direction: column; gap: var(--spacing--2xs); font-size: var(--font-size--sm);">
				Fruits
				<Combobox
					:items="fruitItems"
					v-model="fruits"
					multiple
					clearable
					placeholder="Select fruits..."
				/>
			</label>
			<label style="display: flex; flex-direction: column; gap: var(--spacing--2xs); font-size: var(--font-size--sm);">
				Notes
				<N8nInput v-model="notes" placeholder="Enter notes..." />
			</label>
			<N8nButton type="submit" variant="solid" label="Submit" style="width: 100%;" />
		</form>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'Single and multiple Comboboxes between N8nInput fields. Use Tab / Shift+Tab to verify focus moves correctly into and out of each combobox.',
			},
		},
	},
} satisfies Story;
