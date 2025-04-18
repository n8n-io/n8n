import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue3';

import AskAssistantButton from './AskAssistantButton.vue';

export default {
	title: 'Assistant/AskAssistantButton',
	component: AskAssistantButton,
	argTypes: {},
};

const methods = {
	onClick: action('click'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		AskAssistantButton,
	},
	template:
		'<div style="display: flex; height: 50px; width: 300px; align-items: center; justify-content: center"><AskAssistantButton v-bind="args" @click="onClick" /></div>',
	methods,
});

export const Button = Template.bind({});

export const Notifications = Template.bind({});
Notifications.args = {
	unreadCount: 1,
};
