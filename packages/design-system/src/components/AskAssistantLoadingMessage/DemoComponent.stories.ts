import DemoComponent from './DemoComponent.vue';
import type { StoryFn } from '@storybook/vue3';

export default {
	title: 'Assistant/AskAssistantLoadingMessageTransitions',
	component: DemoComponent,
	argTypes: {},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		DemoComponent,
	},
	template: '<DemoComponent v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};

export const Horizontal = Template.bind({});
Horizontal.args = {
	animationType: 'slide-horizontal',
};

export const Fade = Template.bind({});
Fade.args = {
	animationType: 'fade',
};
