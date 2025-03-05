import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue3';

import N8nTabs from './Tabs.vue';

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
