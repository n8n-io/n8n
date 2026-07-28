/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { defineComponent, ref, computed } from 'vue';

import N8nIcon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import type { SelectItem } from './Select.types';
import Select from './Select.vue';

type GenericMeta<C> = Omit<Meta<C>, 'component'> & {
	component: Record<keyof C, unknown>;
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
			options: ['mini', 'default', 'medium', 'large', 'xlarge'],
			description: 'Size of the select trigger (default maps to small input tokens)',
		},
		variant: {
			control: 'select',
			options: ['default', 'ghost', 'flush'],
			description: 'Visual variant of the select trigger',
		},
	},
} satisfies GenericMeta<typeof Select<SelectItem[]>>;
export default meta;

type Story = StoryObj<typeof meta>;

const fruitItems: SelectItem[] = [
	{ type: 'label', label: 'Fruits' },
	{ label: 'Apple', value: 'apple' },
	{ label: 'Banana', value: 'banana' },
	{ label: 'Orange', value: 'orange' },
	{ label: 'Grapes', value: 'grapes' },
	{ type: 'separator' },
	{ type: 'label', label: 'More Fruits' },
	{ label: 'Pomegranate', value: 'pomegranate' },
	{ label: 'Guava', value: 'guava' },
	{ label: 'Dragon Fruit', value: 'dragon_fruit' },
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
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { Select },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px;">
			<Select :items="args.items" v-model="value"/>
		</div>
		`,
	}),
	args: {
		items: ['Option 1', 'Option 2', 'Option 3'],
		modelValue: undefined,
	},
} satisfies Story;

export const ItemsObjectArray = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
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
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
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
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
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

function findItemIcon(items: SelectItem[] | undefined, selected: unknown) {
	if (!items) {
		return undefined;
	}

	for (const item of items) {
		if (typeof item === 'object' && item !== null && 'value' in item && item.value === selected) {
			return 'icon' in item ? item.icon : undefined;
		}
	}

	return undefined;
}

export const WithSlots = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { Select, N8nIcon },
		setup() {
			const value = ref(args.modelValue);
			const icon = computed(() => findItemIcon(args.items, value.value));
			return { args, value, icon };
		},
		template: `
		<div style="display: flex; gap: 16px; align-items: center; padding: 40px;">
			<Select v-bind="args" v-model="value" :icon="icon" >
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
		] satisfies SelectItem[],
		modelValue: undefined,
	},
} satisfies Story;

export const Variants = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { Select },
		setup() {
			const defaultValue = ref(args.modelValue);
			const ghostValue = ref(args.modelValue);
			const flushValue = ref(args.modelValue);
			return { args, defaultValue, ghostValue, flushValue };
		},
		template: `
		<div style="padding: 40px;">
			<h3>Default</h3>
			<Select :items="args.items" v-model="defaultValue"/>
			<h3 style="margin-top: 15px;">Ghost</h3>
			<Select :items="args.items" v-model="ghostValue" variant="ghost"/>
			<h3 style="margin-top: 15px;">Flush</h3>
			<p style="margin: 0 0 8px; font-size: 14px; color: var(--text-color--subtle);">
				No padding — for table cells and other dense layouts.
			</p>
			<Select :items="args.items" v-model="flushValue" variant="flush"/>
		</div>
		`,
	}),
	args: {
		items: ['Option 1', 'Option 2', 'Option 3'],
		modelValue: undefined,
	},
} satisfies Story;

export const Sizes = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { Select },
		setup() {
			const sizes = ['mini', 'default', 'medium', 'large', 'xlarge'] as const;
			const plainValues = Object.fromEntries(sizes.map((size) => [size, ref(args.modelValue)]));
			const iconValues = Object.fromEntries(sizes.map((size) => [size, ref(iconItems[0]?.value)]));

			function iconFor(selected: unknown) {
				return iconItems.find((item) => item.value === selected)?.icon;
			}

			return {
				args,
				sizes,
				plainValues,
				iconValues,
				iconFor,
				plainItems: [
					{ label: 'Option 1', value: 'option1' },
					{ label: 'Option 2', value: 'option2' },
					{ label: 'Option 3', value: 'option3' },
				],
			};
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: 24px;">
			<div
				v-for="size in sizes"
				:key="size"
				style="display: grid; grid-template-columns: 120px 1fr 1fr; gap: 16px; align-items: center;"
			>
				<h3 style="margin: 0; font-size: 14px; font-weight: 600;">{{ size }}</h3>
				<div>
					<p style="margin: 0 0 8px; font-size: 12px; color: var(--text-color--subtle);">Without icons</p>
					<Select
						:items="plainItems"
						v-model="plainValues[size].value"
						:size="size"
						:style="{ width: '220px' }"
					/>
				</div>
				<div>
					<p style="margin: 0 0 8px; font-size: 12px; color: var(--text-color--subtle);">With icons</p>
					<Select
						:items="args.items"
						v-model="iconValues[size].value"
						:size="size"
						:icon="iconFor(iconValues[size].value)"
						:style="{ width: '220px' }"
					/>
				</div>
			</div>
		</div>
		`,
	}),
	args: {
		items: iconItems,
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
		return { value, items, Select, onUpdate: action('update:modelValue') };
	},
	template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: 32px;">
			<section>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Controlled</h3>
				<p style="margin: 0 0 16px; font-size: 14px; color: var(--text-color--subtle);">
					Parent-controlled selection via <code>v-model</code>. Use the buttons below to set the value externally.
				</p>
				<component
					:is="Select"
					key="controlled"
					v-model="value"
					:items="items"
					aria-label="Select option (controlled)"
					@update:model-value="onUpdate"
				/>
				<div style="display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;">
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
				<p style="margin-top: 16px; font-size: 14px;">Selected: <strong>{{ value ?? '(none)' }}</strong></p>
			</section>
			<section>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Uncontrolled</h3>
				<p style="margin: 0 0 16px; font-size: 14px; color: var(--text-color--subtle);">
					Uses <code>defaultValue</code> only. Parent does not track changes.
				</p>
				<component
					:is="Select"
					key="uncontrolled"
					:items="items"
					default-value="option2"
					aria-label="Select option (uncontrolled)"
				/>
			</section>
		</div>
	`,
});

export const ControlledUncontrolled: Story = {
	render: () => ({
		components: { SelectControlledUncontrolledDemo },
		template: '<SelectControlledUncontrolledDemo />',
	}),
};

export const Disabled = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { Select },
		setup() {
			const value = ref(args.modelValue);
			const emptyValue = ref(undefined);
			return { args, value, emptyValue };
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: 24px;">
			<div>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Disabled with value</h3>
				<Select v-bind="args" v-model="value" disabled />
			</div>
			<div>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Disabled with placeholder</h3>
				<Select v-bind="args" v-model="emptyValue" disabled />
			</div>
			<div>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Disabled ghost</h3>
				<Select v-bind="args" v-model="value" variant="ghost" disabled />
			</div>
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
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { Select },
		setup() {
			const value = ref(args.modelValue);
			return { args, value, onUpdate: action('update:modelValue') };
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: 16px;">
			<Select
				v-bind="args"
				v-model="value"
				multiple
				:style="{ width: '240px' }"
				@update:model-value="onUpdate"
			/>
			<p style="margin: 0; font-size: 14px;">
				Selected: <strong>{{ value?.length ? value.join(', ') : '(none)' }}</strong>
			</p>
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

export const Clearable = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { Select },
		setup() {
			const value = ref(args.modelValue);
			return { args, value, onUpdate: action('update:modelValue'), onClear: action('clear') };
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: 24px;">
			<div>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Single</h3>
				<Select
					v-bind="args"
					v-model="value"
					clearable
					@update:model-value="onUpdate"
					@clear="onClear"
				/>
			</div>
			<p style="margin: 0; font-size: 14px;">
				Selected: <strong>{{ value ?? '(none)' }}</strong>
			</p>
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
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { Select },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px;">
			<p style="margin: 0 0 12px; font-size: 14px; color: var(--text-color--subtle);">
				Open the menu and scroll — arrow buttons appear at the top and bottom when more items are available.
			</p>
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
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { Select },
		setup() {
			const narrowValue = ref(args.modelValue);
			const wideValue = ref(args.modelValue);
			return { args, narrowValue, wideValue };
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: 24px;">
			<p style="margin: 0; font-size: 14px; color: var(--text-color--subtle);">
				Menu is at least as wide as the trigger, and grows to fit longer labels.
			</p>
			<div>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Narrow trigger (160px)</h3>
				<Select
					v-bind="args"
					v-model="narrowValue"
					:style="{ width: '160px' }"
				/>
			</div>
			<div>
				<h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">Wide trigger (320px)</h3>
				<Select
					v-bind="args"
					v-model="wideValue"
					:style="{ width: '320px' }"
				/>
			</div>
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

const SelectSearchAndFooterDemo = defineComponent({
	name: 'SelectSearchAndFooterDemo',
	components: { Select, N8nIcon },
	setup() {
		const value = ref<string | undefined>('member');
		const open = ref(false);

		const items = computed<SelectItem[]>(() => {
			const result: SelectItem[] = [];

			result.push({ type: 'label', label: 'System roles' });
			result.push(...systemRoles);

			result.push({ type: 'label', label: 'Custom roles' });
			result.push(...customRoles);

			return result;
		});

		const selectedLabel = computed(
			() =>
				[...systemRoles, ...customRoles].find((role) => role.value === value.value)?.label ??
				'Select a role',
		);

		function onAddCustomRole() {
			open.value = false;
			action('add-custom-role')();
		}

		return {
			value,
			open,
			items,
			selectedLabel,
			onAddCustomRole,
			onUpdate: action('update:modelValue'),
		};
	},
	template: `
		<div style="padding: 40px;">
			<p style="margin: 0 0 12px; font-size: 14px; color: var(--text-color--subtle);">
				Role-dropdown style example with built-in search and a footer action.
			</p>
			<Select
				v-model="value"
				v-model:open="open"
				:items="items"
				variant="flush"
				searchable
				:style="{ width: '220px' }"
				@update:model-value="onUpdate"
			>
				<template #default>
					{{ selectedLabel }}
				</template>

				<template #footer>
					<button
						type="button"
						style="display: flex; align-items: center; gap: 8px; width: 100%; min-height: var(--height--xl); padding: 0 12px; border: none; background: transparent; cursor: pointer; color: var(--color--primary);"
						@click.stop="onAddCustomRole"
					>
						<N8nIcon icon="plus" size="small" />
						<span style="font-size: 13px;">Add custom role</span>
					</button>
				</template>
			</Select>
		</div>
	`,
});

export const WithSearchAndFooter: Story = {
	render: () => ({
		components: { SelectSearchAndFooterDemo },
		template: '<SelectSearchAndFooterDemo />',
	}),
};
