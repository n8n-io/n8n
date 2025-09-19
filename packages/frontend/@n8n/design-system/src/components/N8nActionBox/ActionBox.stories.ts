import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nActionBox from './ActionBox.vue';

export default {
	title: 'Atoms/ActionBox',
	component: N8nActionBox,
	argTypes: {
		calloutTheme: {
			control: {
				type: 'select',
			},
			options: ['info', 'success', 'warning', 'danger', 'custom'],
		},
	},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
};

const methods = {
	onClick: action('click'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nActionBox,
	},
	template: '<n8n-action-box v-bind="args" @click="onClick" />',
	methods,
});

export const ActionBox = Template.bind({});
ActionBox.args = {
	emoji: '😿',
	heading: 'Headline you need to know',
	description:
		'Long description that you should know something is the way it is because of how it is. ',
	buttonText: 'Do something',
};
