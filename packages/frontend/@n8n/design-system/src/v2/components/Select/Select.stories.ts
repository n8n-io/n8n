/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { defineComponent, ref, computed } from 'vue';

import N8nButton from '@n8n/design-system/components/N8nButton';
import N8nDialog from '@n8n/design-system/components/N8nDialog/Dialog.vue';
import N8nDialogClose from '@n8n/design-system/components/N8nDialog/DialogClose.vue';
import N8nDialogFooter from '@n8n/design-system/components/N8nDialog/DialogFooter.vue';
import N8nInput from '@n8n/design-system/components/N8nInput';
import N8nInputLabel from '@n8n/design-system/components/N8nInputLabel';
import N8nText from '@n8n/design-system/components/N8nText';

import type {
	SelectItem,
	SelectOptionBase,
	SelectProps,
	SelectSizes,
	SelectValue,
} from './Select.types';
import Select from './Select.vue';
import N8nIcon from '../../../components/N8nIcon/Icon.vue';

type SelectStoryProps = Omit<SelectProps, 'modelValue' | 'defaultValue' | 'multiple'> & {
	multiple?: boolean;
	modelValue?: SelectValue | SelectValue[];
	defaultValue?: SelectValue | SelectValue[];
};

type SelectMeta = Omit<Meta<SelectStoryProps>, 'component'> & {
	component: object;
};

const meta = {
	title: 'Experimental/Select',
	component: Select,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
	argTypes: {
		size: {
			control: 'select',
			options: ['mini', 'small', 'medium', 'large', 'xlarge'],
			description: 'Size of the select trigger (matches N8nInput)',
		},
		variant: {
			control: 'select',
			options: ['default', 'ghost', 'flush'],
			description: 'Visual variant of the select trigger',
		},
		position: {
			control: 'select',
			options: ['item-aligned', 'popper'],
			description:
				'Positioning mode for the dropdown. `item-aligned` aligns the selected item with the trigger (default); `popper` opens below the trigger.',
		},
		clearable: {
			control: 'boolean',
			description: 'Shows a clear button when a value is selected. Hidden when disabled or empty.',
		},
	},
} satisfies SelectMeta;
export default meta;

type Story = StoryObj<SelectStoryProps>;

const fruitItems: SelectItem[] = [
	{
		type: 'group',
		label: 'Fruits',
		items: [
			{ label: 'Apple', value: 'apple' },
			{ label: 'Banana', value: 'banana' },
			{ label: 'Orange', value: 'orange' },
			{ label: 'Grapes', value: 'grapes' },
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
		],
	},
];

const plainItems: SelectItem[] = [
	{ label: 'Option 1', value: 'Option 1' },
	{ label: 'Option 2', value: 'Option 2' },
	{ label: 'Option 3', value: 'Option 3' },
];

const iconItems = [
	{
		value: 'system',
		label: 'System Default',
		icon: 'settings',
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
] satisfies SelectItem[];

export const Items = {
	render: (args) => ({
		components: { Select },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px;">
			<Select v-bind="args" v-model="value"/>
		</div>
		`,
	}),
	args: {
		items: plainItems,
		modelValue: undefined,
	},
} satisfies Story;

export const ItemsObjectArray = {
	render: (args) => ({
		components: { Select },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px;">
			<Select v-bind="args" v-model="value" />
		</div>
		`,
	}),
	args: {
		items: [
			{ label: 'Option 1', value: 'option1' },
			{ label: 'Option 2', value: 'option2' },
			{ label: 'Option 3', value: 'option3' },
		],
		modelValue: undefined,
	},
} satisfies Story;

export const ItemsTypes = {
	render: (args) => ({
		components: { Select },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px;">
			<Select v-bind="args" v-model="value" />
		</div>
		`,
	}),
	args: {
		items: fruitItems,
		modelValue: undefined,
	},
} satisfies Story;

export const WithIcons = {
	render: (args) => ({
		components: { Select },
		setup() {
			const value = ref(args.modelValue);
			const icon = computed(() => iconItems.find((item) => item.value === value.value)?.icon);
			return { args, value, icon };
		},
		template: `
		<div style="display: flex; gap: 16px; align-items: center; padding: 40px;">
			<Select v-bind="args" v-model="value" :icon="icon" />
		</div>
		`,
	}),
	args: {
		items: iconItems,
		modelValue: undefined,
	},
} satisfies Story;

export const WithSlots = {
	render: (args) => ({
		components: { Select, N8nIcon },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="display: flex; gap: 16px; align-items: center; padding: 40px;">
			<Select v-bind="args" v-model="value">
				<template #item-leading="{ item, ui }">
					<N8nIcon :icon="item.icon" color="primary" v-bind="ui" />
				</template>
				<template #item-label="{ item }">
					Custom label: {{ item.label }}
				</template>
				<template #item-trailing="{ item, ui }">
					<N8nIcon :icon="item.icon" color="secondary" v-bind="ui" />
				</template>
			</Select>
		</div>
		`,
	}),
	args: {
		items: [
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
		] satisfies SelectItem[],
		modelValue: undefined,
	},
} satisfies Story;

interface DescribedOption extends SelectOptionBase {
	description: string;
}

const modeItems: DescribedOption[] = [
	{
		value: 'build',
		label: 'Build',
		description: 'Generate a workflow from a prompt',
		icon: 'box',
	},
	{
		value: 'plan',
		label: 'Plan',
		description: 'Draft steps before building',
		icon: 'scroll-text',
	},
];

export const ItemWithDescription = {
	name: 'Item with description',
	parameters: {
		docs: {
			description: {
				story:
					'Extend `SelectOptionBase` with extra fields (here `description`) and render them in `#item-label`.',
			},
		},
	},
	render: (args) => ({
		components: { Select, N8nText },
		setup() {
			const value = ref(args.modelValue);
			const current = computed(
				() => modeItems.find((item) => item.value === value.value) ?? modeItems[0],
			);
			return { args, value, items: modeItems, current };
		},
		template: `
		<div style="padding: 80px 40px 40px; display: flex; flex-direction: column; gap: var(--spacing--md);">
			<Select
				v-bind="args"
				v-model="value"
				:icon="current.icon"
			>
				<template #default>
					{{ current.label }}
				</template>
				<template #item-label="{ item }">
					<span style="display: flex; flex-direction: column; gap: var(--spacing--5xs);">
						<N8nText tag="span" size="medium">{{ item.label }}</N8nText>
						<N8nText tag="span" size="small" color="text-base">
							{{ items.find((option) => option.value === item.value)?.description }}
						</N8nText>
					</span>
				</template>
			</Select>
		</div>
		`,
	}),
	args: {
		items: modeItems,
		modelValue: 'build',
		size: 'medium',
		position: 'popper',
	},
} satisfies Story;

export const Variants = {
	render: (args) => ({
		components: { Select, N8nInputLabel },
		setup() {
			const defaultValue = ref(args.modelValue);
			const ghostValue = ref(args.modelValue);
			const flushValue = ref(args.modelValue);
			return { args, defaultValue, ghostValue, flushValue };
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: var(--spacing--md);">
			<N8nInputLabel label="Default">
				<Select v-bind="args" v-model="defaultValue"/>
			</N8nInputLabel>
			<N8nInputLabel label="Ghost">
				<Select v-bind="args" v-model="ghostValue" variant="ghost"/>
			</N8nInputLabel>
			<N8nInputLabel label="Flush">
				<Select v-bind="args" v-model="flushValue" variant="flush"/>
			</N8nInputLabel>
		</div>
		`,
	}),
	args: {
		items: plainItems,
		modelValue: undefined,
	},
} satisfies Story;

export const Positions = {
	render: (args) => ({
		components: { Select, N8nInputLabel },
		setup() {
			const popperValue = ref(args.modelValue);
			const itemAlignedValue = ref(args.modelValue);
			return { args, popperValue, itemAlignedValue };
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: var(--spacing--lg);">
			<N8nInputLabel label="Popper">
				<Select
					v-bind="args"
					v-model="popperValue"
					position="popper"
					:style="{ width: '220px' }"
				/>
			</N8nInputLabel>
			<N8nInputLabel label="Item-aligned">
				<Select
					v-bind="args"
					v-model="itemAlignedValue"
					position="item-aligned"
					:style="{ width: '220px' }"
				/>
			</N8nInputLabel>
		</div>
		`,
	}),
	args: {
		items: fruitItems,
		modelValue: 'orange',
	},
} satisfies Story;

export const Sizes = {
	render: (args) => ({
		components: { Select, N8nInputLabel },
		setup() {
			const sizes: SelectSizes[] = ['mini', 'small', 'medium', 'large', 'xlarge'];
			const values = Object.fromEntries(sizes.map((size) => [size, ref(args.modelValue)]));

			return { args, sizes, values };
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: var(--spacing--md);">
			<N8nInputLabel v-for="size in sizes" :key="size" :label="size">
				<Select
					v-bind="args"
					v-model="values[size].value"
					:size="size"
					:style="{ width: '220px' }"
				/>
			</N8nInputLabel>
		</div>
		`,
	}),
	args: {
		items: plainItems,
		modelValue: undefined,
	},
} satisfies Story;

const SelectControlledUncontrolledDemo = defineComponent({
	name: 'SelectControlledUncontrolledDemo',
	setup() {
		const value = ref<string | undefined>('option1');
		const items = [
			{ label: 'Option 1', value: 'option1' },
			{ label: 'Option 2', value: 'option2' },
			{ label: 'Option 3', value: 'option3' },
		];
		return { value, items, Select, N8nInputLabel, N8nText, onUpdate: action('update:modelValue') };
	},
	template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: var(--spacing--xl);">
			<section style="display: flex; flex-direction: column; gap: var(--spacing--sm);">
				<N8nInputLabel label="Controlled">
					<component
						:is="Select"
						key="controlled"
						v-model="value"
						:items="items"
						aria-label="Select option (controlled)"
						@update:model-value="onUpdate"
					/>
				</N8nInputLabel>
				<div style="display: flex; gap: var(--spacing--2xs); flex-wrap: wrap;">
					<button
						v-for="item in items"
						:key="item.value"
						type="button"
						style="padding: 4px 12px; font-size: 13px; cursor: pointer;"
						@click="value = item.value"
					>
						Set to "{{ item.label }}"
					</button>
					<button
						type="button"
						style="padding: 4px 12px; font-size: 13px; cursor: pointer;"
						@click="value = undefined"
					>
						Clear
					</button>
				</div>
				<N8nText tag="p" style="margin: 0;">
					Selected: <strong>{{ value ?? '(none)' }}</strong>
				</N8nText>
			</section>
			<section>
				<N8nInputLabel label="Uncontrolled">
					<component
						:is="Select"
						key="uncontrolled"
						:items="items"
						default-value="option2"
						aria-label="Select option (uncontrolled)"
					/>
				</N8nInputLabel>
			</section>
		</div>
	`,
});

export const ControlledUncontrolled: Story = {
	name: 'Controlled/Uncontrolled',
	render: () => ({
		components: { SelectControlledUncontrolledDemo },
		template: '<SelectControlledUncontrolledDemo />',
	}),
};

export const Disabled = {
	render: (args) => ({
		components: { Select, N8nInputLabel },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: var(--spacing--lg);">
			<N8nInputLabel label="Default">
				<Select v-bind="args" v-model="value" disabled />
			</N8nInputLabel>
			<N8nInputLabel label="Ghost">
				<Select v-bind="args" v-model="value" variant="ghost" disabled />
			</N8nInputLabel>
			<N8nInputLabel label="Flush">
				<Select v-bind="args" v-model="value" variant="flush" disabled />
			</N8nInputLabel>
		</div>
		`,
	}),
	args: {
		items: [
			{ label: 'Option 1', value: 'option1' },
			{ label: 'Option 2', value: 'option2' },
			{ label: 'Option 3', value: 'option3' },
		],
		modelValue: 'option2',
	},
} satisfies Story;

export const Multiple = {
	render: (args) => ({
		components: { Select },
		setup() {
			const value = ref(args.modelValue);
			return { args, value, onUpdate: action('update:modelValue') };
		},
		template: `
		<div style="padding: 40px;">
			<Select
				v-bind="args"
				v-model="value"
				multiple
				:style="{ width: '240px' }"
				@update:model-value="onUpdate"
			/>
		</div>
		`,
	}),
	args: {
		items: [
			{ label: 'Backlog', value: 'backlog' },
			{ label: 'Todo', value: 'todo' },
			{ label: 'In Progress', value: 'in_progress' },
			{ label: 'Done', value: 'done' },
			{ label: 'Cancelled', value: 'cancelled' },
		],
		modelValue: ['todo', 'in_progress'],
		placeholder: 'Select statuses',
	},
} satisfies Story;

export const AsyncItems = {
	name: 'Async Items',
	render: () => ({
		components: { Select, N8nButton, N8nText },
		setup() {
			const value = ref('in_progress');
			const items = ref<SelectItem[]>([]);
			const loading = ref(false);
			const loadCount = ref(0);

			const resolvedItems: SelectItem[] = [
				{ label: 'Backlog', value: 'backlog' },
				{ label: 'Todo', value: 'todo' },
				{ label: 'In Progress', value: 'in_progress' },
				{ label: 'Done', value: 'done' },
			];

			async function loadItems(remount = false) {
				loading.value = true;
				items.value = [];
				if (remount) {
					loadCount.value += 1;
				}

				await new Promise((resolve) => setTimeout(resolve, 1500));
				items.value = resolvedItems;
				loading.value = false;
			}

			void loadItems();

			return { value, items, loading, loadCount, loadItems };
		},
		template: `
		<div style="padding: 40px; max-width: 400px; display: flex; flex-direction: column; gap: var(--spacing--md);">
			<N8nText size="small" color="text-light" tag="p" style="margin: 0;">
				<code>v-model</code> is already <code>in_progress</code> while <code>items</code> is empty.
				After 1.5s the options arrive and the trigger should update from the raw id to
				<strong>In Progress</strong>.
			</N8nText>
			<Select
				:key="loadCount"
				v-model="value"
				:items="items"
				placeholder="Select a status"
				:style="{ width: '240px' }"
			/>
			<N8nButton
				:label="loading ? 'Loading items…' : 'Reload items'"
				:disabled="loading"
				variant="outline"
				@click="loadItems(true)"
			/>
			<N8nText size="small" tag="p" style="margin: 0;">
				Selected: <strong>{{ value }}</strong>
				· Items: <strong>{{ items.length }}</strong>
			</N8nText>
		</div>
		`,
	}),
	parameters: {
		docs: {
			description: {
				story:
					'Simulates a selected value arriving before async options. The trigger falls back to the raw value until items resolve, then updates to the matching label. Reload remounts the field so you can watch the handoff again.',
			},
		},
	},
} satisfies Story;

interface StatusOption extends SelectOptionBase {
	color: string;
}

const statusItemsWithSwatches: StatusOption[] = [
	{ label: 'Backlog', value: 'backlog', color: 'var(--color--neutral-400)' },
	{ label: 'Todo', value: 'todo', color: 'var(--color--blue-500)' },
	{ label: 'In Progress', value: 'in_progress', color: 'var(--color--orange-500)' },
	{ label: 'Done', value: 'done', color: 'var(--color--green-500)' },
	{ label: 'Cancelled', value: 'cancelled', color: 'var(--color--red-500)' },
];

export const MultipleWithSwatches = {
	render: (args) => ({
		components: { Select, N8nText },
		setup() {
			const value = ref(Array.isArray(args.modelValue) ? args.modelValue : []);

			const selectedItems = computed(() =>
				value.value.flatMap((entry) => {
					const item = statusItemsWithSwatches.find((option) => option.value === entry);
					return item ? [item] : [];
				}),
			);

			return { args, value, selectedItems, onUpdate: action('update:modelValue') };
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: var(--spacing--md);">
			<N8nText size="small" color="text-light" tag="p" style="margin: 0;">
				Per-value leading visuals in multiple mode via the default slot (and item-leading in the menu).
			</N8nText>
			<Select
				v-bind="args"
				v-model="value"
				multiple
				position="popper"
				:style="{ width: '280px' }"
				@update:model-value="onUpdate"
			>
				<template #default>
					<template v-if="selectedItems.length">
						<span
							v-for="(item, index) in selectedItems"
							:key="item.value"
							style="display: inline-flex; align-items: center; gap: var(--spacing--4xs);"
						>
							<span
								aria-hidden="true"
								:style="{
									display: 'inline-block',
									width: '9px',
									height: '9px',
									borderRadius: 'var(--radius--full)',
									background: item.color,
									flexShrink: 0,
								}"
							/>
							{{ item.label }}<template v-if="index < selectedItems.length - 1">,&nbsp;</template>
						</span>
					</template>
					<template v-else>
						{{ args.placeholder }}
					</template>
				</template>
				<template #item-leading="{ item }">
					<span
						aria-hidden="true"
						:style="{
							display: 'block',
							width: '9px',
							height: '9px',
							borderRadius: 'var(--radius--full)',
							background: item.color,
							flexShrink: 0,
							alignSelf: 'center',
						}"
					/>
				</template>
			</Select>
		</div>
		`,
	}),
	args: {
		items: statusItemsWithSwatches,
		modelValue: ['todo', 'in_progress'],
		placeholder: 'Select statuses',
	},
} satisfies Story;

export const Clearable = {
	render: (args) => ({
		components: { Select, N8nInputLabel, N8nText },
		setup() {
			const value = ref(args.modelValue);
			return { args, value, onUpdate: action('update:modelValue'), onClear: action('clear') };
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: var(--spacing--lg);">
			<N8nInputLabel label="Single">
				<Select
					v-bind="args"
					v-model="value"
					clearable
					@update:model-value="onUpdate"
					@clear="onClear"
				/>
			</N8nInputLabel>
			<N8nText tag="p" style="margin: 0;">
				Selected: <strong>{{ value ?? '(none)' }}</strong>
			</N8nText>
		</div>
		`,
	}),
	args: {
		items: [
			{ label: 'Option 1', value: 'option1' },
			{ label: 'Option 2', value: 'option2' },
			{ label: 'Option 3', value: 'option3' },
		],
		modelValue: 'option2',
	},
} satisfies Story;

export const LongScrollableList = {
	render: (args) => ({
		components: { Select, N8nText },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px;">
			<N8nText size="small" color="text-light" tag="p" style="margin: 0 0 var(--spacing--sm);">
				Open the menu and scroll — arrow buttons appear at the top and bottom when more items are available.
			</N8nText>
			<Select
				v-bind="args"
				v-model="value"
				:style="{ width: '240px' }"
			/>
		</div>
		`,
	}),
	args: {
		items: Array.from({ length: 40 }, (_, index) => ({
			label: `Option ${index + 1}`,
			value: `option-${index + 1}`,
		})),
		modelValue: 'option-1',
		placeholder: 'Select an option',
	},
} satisfies Story;

export const MixedItemLengths = {
	render: (args) => ({
		components: { Select, N8nInputLabel, N8nText },
		setup() {
			const narrowValue = ref(args.modelValue);
			const wideValue = ref(args.modelValue);
			return { args, narrowValue, wideValue };
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: var(--spacing--lg);">
			<N8nText size="small" color="text-light" tag="p" style="margin: 0;">
				Menu is at least as wide as the trigger (popper) or the min-width floor, and grows to fit longer labels.
			</N8nText>
			<N8nInputLabel label="Narrow trigger (160px)">
				<Select
					v-bind="args"
					v-model="narrowValue"
					:style="{ width: '160px' }"
				/>
			</N8nInputLabel>
			<N8nInputLabel label="Wide trigger (320px)">
				<Select
					v-bind="args"
					v-model="wideValue"
					:style="{ width: '320px' }"
				/>
			</N8nInputLabel>
		</div>
		`,
	}),
	args: {
		items: [
			{ label: 'OK', value: 'ok' },
			{ label: 'Done', value: 'done' },
			{
				label: 'Quarterly automation rollout for customer onboarding',
				value: 'long-1',
			},
			{ label: 'Sync', value: 'sync' },
			{
				label: 'Failed to refresh OAuth token for the connected CRM workspace',
				value: 'long-2',
			},
			{ label: 'Archive', value: 'archive' },
		],
		modelValue: undefined,
		placeholder: 'Pick one',
	},
} satisfies Story;

export const ShortItems = {
	render: (args) => ({
		components: { Select, N8nInputLabel, N8nText },
		setup() {
			const popperValue = ref(args.modelValue);
			const itemAlignedValue = ref(args.modelValue);
			return { args, popperValue, itemAlignedValue };
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: var(--spacing--lg);">
			<N8nText size="small" color="text-light" tag="p" style="margin: 0;">
				Very short labels — menus keep a min-width floor; popper also matches the trigger when wider.
			</N8nText>
			<N8nInputLabel label="Popper">
				<Select
					v-bind="args"
					v-model="popperValue"
					position="popper"
					:style="{ width: '240px' }"
				/>
			</N8nInputLabel>
			<N8nInputLabel label="Item-aligned">
				<Select
					v-bind="args"
					v-model="itemAlignedValue"
					position="item-aligned"
					:style="{ width: '240px' }"
				/>
			</N8nInputLabel>
		</div>
		`,
	}),
	args: {
		items: [
			{ label: 'A', value: 'a' },
			{ label: 'B', value: 'b' },
			{ label: 'C', value: 'c' },
			{ label: 'OK', value: 'ok' },
			{ label: 'Yes', value: 'yes' },
			{ label: 'No', value: 'no' },
		],
		modelValue: 'a',
		placeholder: 'Pick one',
	},
} satisfies Story;

const systemRoles = [
	{ value: 'admin', label: 'Admin' },
	{ value: 'member', label: 'Member' },
	{ value: 'viewer', label: 'Viewer' },
];

const customRoles = [
	{ value: 'developer', label: 'Developer' },
	{ value: 'billing-manager', label: 'Billing Manager' },
	{ value: 'support-lead', label: 'Support Lead' },
];

const ADD_CUSTOM_ROLE_VALUE = '__add_custom_role__';

const SelectFooterDemo = defineComponent({
	name: 'SelectFooterDemo',
	setup() {
		const value = ref<string | undefined>('member');
		const open = ref(false);
		const createOpen = ref(false);

		const items = computed<SelectItem[]>(() => [
			{
				type: 'group',
				label: 'System roles',
				items: systemRoles,
			},
			{
				type: 'group',
				label: 'Custom roles',
				items: customRoles,
			},
			{ type: 'separator' },
			{
				value: ADD_CUSTOM_ROLE_VALUE,
				label: 'Add custom role',
				icon: 'plus',
				onSelect: (event: Event) => {
					event.preventDefault();
					open.value = false;
					createOpen.value = true;
					action('add-custom-role')();
				},
			},
		]);

		const selectedLabel = computed(
			() =>
				[...systemRoles, ...customRoles].find((role) => role.value === value.value)?.label ??
				'Select a role',
		);

		return {
			value,
			open,
			createOpen,
			items,
			selectedLabel,
			onUpdate: action('update:modelValue'),
			Select,
			N8nDialog,
			N8nDialogFooter,
			N8nDialogClose,
			N8nButton,
			N8nText,
		};
	},
	template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: var(--spacing--sm);">
			<component :is="N8nText" size="small" color="text-light" tag="p" style="margin: 0;">
				"Add custom role" uses onSelect + preventDefault so it never becomes the value.
			</component>
			<component
				:is="Select"
				v-model="value"
				v-model:open="open"
				:items="items"
				:style="{ width: '220px' }"
				@update:model-value="onUpdate"
			>
				<template #default>
					{{ selectedLabel }}
				</template>
			</component>
			<component
				:is="N8nDialog"
				v-model:open="createOpen"
				header="Add custom role"
				description="This action item uses onSelect with preventDefault so it never becomes the Select value."
				size="small"
			>
				<component :is="N8nDialogFooter">
					<component :is="N8nDialogClose" as-child>
						<component :is="N8nButton" label="Cancel" variant="outline" />
					</component>
					<component :is="N8nDialogClose" as-child>
						<component :is="N8nButton" label="Add role" variant="solid" />
					</component>
				</component>
			</component>
		</div>
	`,
});

export const WithFooter: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Footer actions stay inside the listbox as options — use `onSelect` with `event.preventDefault()` so they do not update `modelValue`.',
			},
		},
	},
	render: () => ({
		components: { SelectFooterDemo },
		template: '<SelectFooterDemo />',
	}),
};

const departmentItems: SelectItem[] = [
	{ label: 'Engineering', value: 'engineering' },
	{ label: 'Product', value: 'product' },
	{ label: 'Design', value: 'design' },
	{ label: 'Marketing', value: 'marketing' },
];

const countryItems: SelectItem[] = [
	{ label: 'United States', value: 'us' },
	{ label: 'United Kingdom', value: 'uk' },
	{ label: 'Germany', value: 'de' },
	{ label: 'France', value: 'fr' },
	{ label: 'Japan', value: 'jp' },
];

const FormExampleDemo = defineComponent({
	name: 'FormExampleDemo',
	setup() {
		const name = ref('');
		const email = ref('');
		const department = ref<string | undefined>();
		const country = ref<string | undefined>();

		function onSubmit(event: Event) {
			event.preventDefault();
			action('submit')({
				name: name.value,
				email: email.value,
				department: department.value,
				country: country.value,
			});
		}

		return {
			name,
			email,
			department,
			country,
			departmentItems,
			countryItems,
			onSubmit,
			Select,
			N8nInput,
			N8nInputLabel,
			N8nButton,
		};
	},
	template: `
		<form
			style="padding: 40px; max-width: 420px; display: flex; flex-direction: column; gap: var(--spacing--md);"
			@submit="onSubmit"
		>
			<N8nInputLabel label="Full name" required>
				<component
					:is="N8nInput"
					v-model="name"
					placeholder="Ada Lovelace"
					size="small"
				/>
			</N8nInputLabel>

			<N8nInputLabel label="Email" required>
				<component
					:is="N8nInput"
					v-model="email"
					type="email"
					placeholder="ada@example.com"
					size="small"
				/>
			</N8nInputLabel>

			<N8nInputLabel label="Department">
				<component
					:is="Select"
					v-model="department"
					:items="departmentItems"
					placeholder="Select a department"
					clearable
				/>
			</N8nInputLabel>

			<N8nInputLabel label="Country">
				<component
					:is="Select"
					v-model="country"
					:items="countryItems"
					placeholder="Select a country"
					clearable
				/>
			</N8nInputLabel>

			<div style="display: flex; justify-content: flex-end; gap: var(--spacing--2xs); margin-top: var(--spacing--2xs);">
				<component :is="N8nButton" type="submit" label="Save" size="small" />
			</div>
		</form>
	`,
});

export const FormExample: Story = {
	name: 'Form example',
	render: () => ({
		components: { FormExampleDemo },
		template: '<FormExampleDemo />',
	}),
};
