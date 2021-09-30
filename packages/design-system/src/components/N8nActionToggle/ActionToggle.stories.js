import N8nActionToggle from './ActionToggle.vue';
import { action } from '@storybook/addon-actions';

export default {
	title: 'Atoms/ActionToggle',
	component: N8nActionToggle,
	argTypes: {
	},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const methods = {
	onAction: action('action'),
};

const Template = (args, { argTypes }) => ({
	props: Object.keys(argTypes),
	components: {
		N8nActionToggle,
	},
	template: '<n8n-action-toggle v-bind="$props" @action="onAction" />',
	methods,
});

export const ActionToggle = Template.bind({});
ActionToggle.args = {
	actions: [
		{
			label: 'Go',
			value: 'go',
		},
		{
			label: 'Stop',
			value: 'stop',
		},
	],
};
