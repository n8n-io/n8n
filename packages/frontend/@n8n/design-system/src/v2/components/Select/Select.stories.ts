/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, computed } from 'vue';

import N8nIcon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import type { SelectItem } from './Select.types';
import Select from './Select.vue';

type GenericMeta<C> = Omit<Meta<C>, 'component'> & {
	component: Record<keyof C, unknown>;
};

const meta = {
	title: 'Design system v3/Select',
	component: Select,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
} satisfies GenericMeta<typeof Select<SelectItem[]>>;
export default meta;

type Story = StoryObj<typeof meta>;

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
		<div style="display: flex; gap: 16px; align-items: center; padding: 40px;">
			<h3>Default </h3>
			<Select v-bind="args" v-model="value" />
			<h3>Disabled </h3>
			<Select v-bind="args" v-model="value" disabled/>
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
	/// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { Select },
		setup() {
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="display: flex; gap: 16px; align-items: center; padding: 40px;">
			<h3>xsmall </h3>
			<Select v-bind="args" v-model="value" size="xsmall"/>
			<h3 style="margin-top: 15px;">small (default)</h3>
			<Select v-bind="args" v-model="value" size="small" />
			<h3 style="margin-top: 15px;">medium</h3>
			<Select v-bind="args" v-model="value" size="medium" />
		</div>
		`,
	}),
	args: {
		items: [
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
		],
		modelValue: undefined,
	},
} satisfies Story;

export const WithIcons = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { Select },
		setup() {
			const value = ref(args.modelValue);
			const icon = computed(
				// @ts-expect-error TS2322
				() => (args.items as SelectItem[])?.find((item) => item.value === value.value)?.icon,
			);
			return { args, value, icon };
		},
		template: `
		<div style="display: flex; gap: 16px; align-items: center; padding: 40px;">
			<Select v-bind="args" v-model="value" :icon="icon" />
		</div>
		`,
	}),
	args: {
		items: [
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
		] satisfies SelectItem[],
		modelValue: undefined,
	},
} satisfies Story;

export const WithSlots = {
	// @ts-expect-error generic typed components https://github.com/storybookjs/storybook/issues/24238
	render: (args) => ({
		components: { Select, N8nIcon },
		setup() {
			const value = ref(args.modelValue);
			const icon = computed(
				// @ts-expect-error TS2322
				() => (args.items as SelectItem[])?.find((item) => item.value === value.value)?.icon,
			);
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
			const value = ref(args.modelValue);
			return { args, value };
		},
		template: `
		<div style="padding: 40px;">
			<h3>Default</h3>
			<Select :items="args.items" v-model="value"/>
			<h3 style="margin-top: 15px;">Ghost</h3>
			<Select :items="args.items" v-model="value" variant="ghost"/>
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
			const value = ref(args.modelValue);
			const icon = computed(
				// @ts-expect-error TS2322
				() => (args.items as SelectItem[])?.find((item) => item.value === value.value)?.icon,
			);
			return { args, value, icon };
		},
		template: `
		<div style="padding: 40px;">
			<h3>xsmall </h3>
			<Select :items="args.items" v-model="value" size="xsmall" :icon="icon"/>
			<h3 style="margin-top: 15px;">small (default)</h3>
			<Select :items="args.items" v-model="value" size="small" :icon="icon"/>
			<h3 style="margin-top: 15px;">medium</h3>
			<Select :items="args.items" v-model="value" size="medium" :icon="icon"/>
		</div>
		`,
	}),
	args: {
		items: [
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
		],
		modelValue: undefined,
	},
} satisfies Story;
