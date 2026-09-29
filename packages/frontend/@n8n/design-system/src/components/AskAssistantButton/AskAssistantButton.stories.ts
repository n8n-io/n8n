import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import AskAssistantButton from './AskAssistantButton.vue';

export default {
	title: 'Areas/Assistant/AskAssistantButton',
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
	template: '<AskAssistantButton v-bind="args" @click="onClick" />',
	methods,
});

export const Default = Template.bind({});

export const Notifications = Template.bind({});
Notifications.args = {
	unreadCount: 1,
};
