import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nDropdown from './ActionToggle.vue';

export default {
	title: 'Core/ActionToggle',
	component: N8nDropdown,
	argTypes: {
		placement: {
			type: 'select',
			options: ['top', 'top-end', 'top-start', 'bottom', 'bottom-end', 'bottom-start'],
		},
		size: {
			type: 'select',
			options: ['mini', 'small', 'medium'],
		},
	},
	parameters: {
		backgrounds: { default: '--color--background--light-2' },
	},
};

const methods = {
	onAction: action('action'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nDropdown,
	},
	template: `<div style="height:300px; width:300px; display:flex; align-items:center; justify-content:center">
			<n8n-dropdown v-bind="args" @action="onAction" />
		</div>`,
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
