import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import InlineAskAssistantButton from './InlineAskAssistantButton.vue';

export default {
	title: 'Assistant/InlineAskAssistantButton',
	component: InlineAskAssistantButton,
	argTypes: {},
};

const methods = {
	onClick: action('click'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		InlineAskAssistantButton,
	},
	template: '<InlineAskAssistantButton v-bind="args" @click="onClick" />',
	methods,
});

export const Default = Template.bind({});

export const AskedButton = Template.bind({});
AskedButton.args = {
	asked: true,
};

export const Small = Template.bind({});
Small.args = { size: 'small' };

export const Static = Template.bind({});
Static.args = { static: true };
