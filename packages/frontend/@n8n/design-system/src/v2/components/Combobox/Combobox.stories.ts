import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';

import N8nIcon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import type { ComboboxItem as ComboboxItemType, ComboboxListItem } from './Combobox.types';
import Combobox from './Combobox.vue';

type GenericMeta<C> = Omit<Meta<C>, 'component'> & {
	component: Record<keyof C, unknown>;
};

const statusItems = ['Backlog', 'Todo', 'In Progress', 'Done'];

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
	{ type: 'label', label: 'Fruits' },
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
	{ type: 'separator' },
	{ type: 'label', label: 'More Fruits' },
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
];

type ObjectComboboxItem = ComboboxListItem;

const iconItems: ObjectComboboxItem[] = [
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

function getSelectedItemIcon(items: ObjectComboboxItem[], value: unknown) {
	return items.find((item) => item.value === value)?.icon;
}

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
		class: 'custom-class',
	},
	{
		value: 'dark',
		label: 'Dark',
		icon: 'filled-square',
		class: ['custom-class2', 'custom-class3'],
	},
	{
		value: 'dark2',
		label: 'Dark2',
		icon: 'filled-square',
		class: { ['custom-class4']: true },
	},
];

const itemsWithDisabledOption: ComboboxItemType[] = [
	{ label: 'Backlog', value: 'backlog' },
	{ label: 'Todo', value: 'todo' },
	{ label: 'In Progress', value: 'in_progress' },
	{ label: 'Done', value: 'done', disabled: true },
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
	render: (args) => ({
		components: { Combobox },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="${storyContainerStyle}">
			<Combobox :items="args.items" v-model="value" placeholder="Search status..." />
		</div>
		`,
	}),
	args: {
		items: statusItems,
		modelValue: undefined,
	},
} satisfies Story;

export const ItemsObjectArray = {
	render: (args) => ({
		components: { Combobox },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="${storyContainerStyle}">
			<Combobox v-bind="args" v-model="value" />
		</div>
		`,
	}),
	args: {
		items: objectItems,
		modelValue: undefined,
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

export const WithIcons = {
	render: (args) => ({
		components: { Combobox, N8nIcon },
		setup() {
			const value = ref(args.modelValue);
			const icon = computed(() => getSelectedItemIcon(iconItems, value.value));
			return { args, value, icon };
		},
		template: `
		<div style="${storyContainerStyle}; display: flex; gap: 16px; align-items: center;">
			<Combobox v-bind="args" v-model="value" :icon="icon">
				<template #item-leading="{ item }">
					<N8nIcon :icon="item.icon" color="primary" />
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
			const icon = computed(() =>
				getSelectedItemIcon(slotItems as ObjectComboboxItem[], value.value),
			);
			return { args, value, icon };
		},
		template: `
		<div style="${storyContainerStyle}">
			<Combobox v-bind="args" v-model="value" :icon="icon">
				<template #header>
					<div style="padding: var(--spacing--2xs); font-size: var(--font-size--2xs); color: var(--color--text--tint-1); border-bottom: 1px solid var(--border-color);">
						Header slot
					</div>
				</template>

				<template #item-leading="{ item, ui }">
					<N8nIcon :icon="item.icon" color="primary" v-bind="ui" />
				</template>

				<template #item-label="{ item }">
					Custom label: {{ item.label }}
				</template>

				<template #item-trailing="{ item, ui }">
					<N8nIcon :icon="item.icon" color="secondary" v-bind="ui" />
				</template>

				<template #footer>
					<div style="padding: var(--spacing--2xs); font-size: var(--font-size--2xs); color: var(--color--text--tint-1); border-top: 1px solid var(--border-color);">
						Footer slot
					</div>
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
