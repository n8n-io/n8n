import type { StoryFn } from '@storybook/vue3-vite';

import AssistantText from './AssistantText.vue';

export default {
	title: 'Areas/Assistant/AssistantText',
	component: AssistantText,
	argTypes: {},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		AssistantText,
	},
	template: '<AssistantText v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {
	text: 'Ask me something!!!',
};

export const Sizes: StoryFn = () => ({
	components: { AssistantText },
	template: `
		<div style="display: flex; flex-direction: column; gap: 12px;">
			<AssistantText text="Ask me something!!!" size="small" />
			<AssistantText text="Ask me something!!!" size="medium" />
			<AssistantText text="Ask me something!!!" size="large" />
			<AssistantText text="Ask me something!!!" size="xlarge" />
		</div>
	`,
});
