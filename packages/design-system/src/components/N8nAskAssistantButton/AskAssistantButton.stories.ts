import AskAssistantButton from './AskAssistantButton.vue';
import { action } from '@storybook/addon-actions';
import type { StoryFn } from '@storybook/vue3';

export default {
	title: 'Atoms/AskAssistantButton',
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
	template: '<ask-assistant-button v-bind="args" @click="onClick" />',
	methods,
});

export const Button = Template.bind({});
