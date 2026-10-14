import type { StoryFn } from '@storybook/vue3-vite';

import AssistantAvatar from './AssistantAvatar.vue';

export default {
	title: 'Areas/Assistant/AssistantAvatar',
	component: AssistantAvatar,
	argTypes: {},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		AssistantAvatar,
	},
	template: '<AssistantAvatar v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {};

export const Sizes: StoryFn = () => ({
	components: { AssistantAvatar },
	template: `
		<div style="display: flex; gap: 16px; align-items: center;">
			<AssistantAvatar size="mini" />
			<AssistantAvatar size="small" />
		</div>
	`,
});
