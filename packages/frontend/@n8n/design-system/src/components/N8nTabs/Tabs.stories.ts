import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { ref, watch } from 'vue';

import N8nTabs from './Tabs.vue';
import type { TabOptions } from '../../types/tabs';

export default {
	title: 'Core/Tabs',
	component: N8nTabs,
	argTypes: {},
	parameters: {
		docs: {
			description: {
				component: 'A tab navigation component for switching between content panels.',
			},
		},
		backgrounds: { default: '--color--background--light-3' },
	},
};

const methods = {
	onUpdateModelValue: action('update:modelValue'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nTabs,
	},
	template: `<n8n-tabs v-model="val" v-bind="args" @update:modelValue="onUpdateModelValue">
		</n8n-tabs>`,
	methods,
	data() {
		return {
			val: '',
		};
	},
});

export const Default = Template.bind({});
Default.args = {
	modelValue: 'first',
	options: [
		{
			label: 'First',
			value: 'first',
		},
		{
			label: 'Second',
			value: 'second',
		},
		{
			label: 'Github',
			value: 'github',
			href: 'https://github.com/',
		},
	],
};

const playgroundItemCounts = [2, 3, 4, 5] as const;
type PlaygroundItemCount = (typeof playgroundItemCounts)[number];

const playgroundOptionsByCount: Record<PlaygroundItemCount, Array<TabOptions<string>>> = {
	2: [
		{ label: 'Item 1', value: '1' },
		{ label: 'Item 2', value: '2' },
	],
	3: [
		{ label: 'Item 1', value: '1' },
		{ label: 'Item 2', value: '2' },
		{ label: 'Item 3', value: '3' },
	],
	4: [
		{ label: 'Item 1', value: '1' },
		{ label: 'Item 2', value: '2' },
		{ label: 'Item 3', value: '3' },
		{ label: 'Item 4', value: '4' },
	],
	5: [
		{ label: 'Item 1', value: '1' },
		{ label: 'Item 2', value: '2' },
		{ label: 'Item 3', value: '3' },
		{ label: 'Item 4', value: '4' },
		{ label: 'Item 5', value: '5' },
	],
};

type PlaygroundArgs = {
	itemCount: PlaygroundItemCount;
	size: 'small' | 'medium';
	variant: 'modern' | 'legacy';
};

export const Playground: StoryFn<PlaygroundArgs> = (args) => ({
	components: { N8nTabs },
	setup() {
		const value = ref('1');

		watch(
			() => args.itemCount,
			(itemCount) => {
				const next = playgroundOptionsByCount[itemCount];
				if (!next.some((option) => option.value === value.value)) {
					value.value = next[0]?.value ?? '1';
				}
			},
		);

		return {
			args,
			value,
			playgroundOptionsByCount,
			onUpdateModelValue: action('update:modelValue'),
		};
	},
	template: `
		<N8nTabs
			v-model="value"
			:options="playgroundOptionsByCount[args.itemCount]"
			:size="args.size"
			:variant="args.variant"
			@update:model-value="onUpdateModelValue"
		/>
	`,
});
Playground.args = {
	itemCount: 3,
	size: 'medium',
	variant: 'legacy',
};
Playground.argTypes = {
	itemCount: {
		control: 'radio',
		options: [...playgroundItemCounts],
		description: 'Number of tabs. Map to the Figma "number of items" property.',
	},
	options: { table: { disable: true } },
	modelValue: { table: { disable: true } },
	justified: { table: { disable: true } },
};

const options: Array<TabOptions<string>> = [
	{
		label: 'First',
		value: 'first',
	},
	{
		label: 'Second',
		value: 'second',
	},
	{
		label: 'External Link',
		value: 'external',
		href: 'https://github.com/',
	},
	{
		label: 'Danger',
		value: 'danger',
		variant: 'danger',
		icon: 'triangle-alert',
	},
	{
		label: 'Right Icon',
		value: 'rightIcon',
		icon: 'circle',
		iconPosition: 'right',
	},
	{
		value: 'iconOnly',
		tooltip: 'Icon only tab',
		icon: 'circle',
	},
	{
		label: 'Notification',
		value: 'notification',
		notification: true,
	},
	{
		label: 'Count',
		value: 'count',
		tag: '2',
	},
	{
		label: 'Settings',
		value: 'settings',
		icon: 'cog',
		align: 'right',
	},
];

export const Variants = Template.bind({});
Variants.args = {
	modelValue: 'first',
	options,
};

export const Sizes: StoryFn = () => ({
	components: { N8nTabs },
	data() {
		return {
			val: 'first',
			options,
		};
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: 24px;">
			<n8n-tabs v-model="val" size="medium" :options="options" />
			<n8n-tabs v-model="val" size="small" :options="options" />
			<n8n-tabs v-model="val" variant="modern" size="medium" :options="options" />
			<n8n-tabs v-model="val" variant="modern" size="small" :options="options" />
		</div>
	`,
});
