import N8nTabs from './Tabs.vue';

import { action } from '@storybook/addon-actions';

export default {
	title: 'Atoms/Tabs',
	component: N8nTabs,
	argTypes: {},
	parameters: {
		backgrounds: { default: '--color-background-xlight' },
	},
};

const methods = {
	onInput: action('input'),
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nTabs,
	},
	template: `<n8n-tabs v-model="val" v-bind="$props" @input="onInput">
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
			label: 'Test',
			value: 'test',
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
