import type { StoryFn } from '@storybook/vue3-vite';

import AssistantIcon from './AssistantIcon.vue';

export default {
	title: 'Assistant/AssistantIcon',
	component: AssistantIcon,
	argTypes: {},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		AssistantIcon,
	},
	template: '<div style="background: lightgray;"><AssistantIcon v-bind="args" /></div>',
});

export const Default = Template.bind({});
Default.args = {
	theme: 'default',
};

export const Blank = Template.bind({
	template: '<div style="background=black;"><AssistantIcon v-bind="args" /></div>',
});
Blank.args = {
	theme: 'blank',
};

export const Mini = Template.bind({});
Mini.args = {
	size: 'mini',
};

export const Small = Template.bind({});
Small.args = {
	size: 'small',
};

export const Medium = Template.bind({});
Medium.args = {
	size: 'medium',
};

export const Large = Template.bind({});
Large.args = {
	size: 'large',
};
