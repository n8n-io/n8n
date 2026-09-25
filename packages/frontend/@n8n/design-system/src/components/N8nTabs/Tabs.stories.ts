import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

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
		{
			label: 'Settings',
			value: 'settings',
			icon: 'cog',
			align: 'right',
		},
	],
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
