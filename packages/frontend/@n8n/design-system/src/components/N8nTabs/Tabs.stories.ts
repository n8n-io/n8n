import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue3';

import N8nTabs from './Tabs.vue';
import type { TabOptions } from '../../types/tabs';

export default {
	title: 'Atoms/Tabs',
	component: N8nTabs,
	argTypes: {},
	parameters: {
		backgrounds: { default: '--color-background-xlight' },
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

export const Example = Template.bind({});
Example.args = {
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
		label: 'Settings',
		value: 'settings',
		icon: 'cog',
		align: 'right',
	},
];

export const TabVariants = Template.bind({});
TabVariants.args = {
	options,
};

export const WithSmallSize = Template.bind({});
WithSmallSize.args = {
	options,
	size: 'small',
};

export const WithModernVariant = Template.bind({});
WithModernVariant.args = {
	variant: 'modern',
	options,
};

export const WithSmallAndModern = Template.bind({});
WithSmallAndModern.args = {
	variant: 'modern',
	options,
	size: 'small',
};
