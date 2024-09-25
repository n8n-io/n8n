import type { StoryFn } from '@storybook/vue3';

import AssistantLoadingMessage from './AssistantLoadingMessage.vue';

export default {
	title: 'Assistant/AskAssistantLoadingMessage',
	component: AssistantLoadingMessage,
	argTypes: {},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		AssistantLoadingMessage,
	},
	template: `<div class="p-xs" style="width: ${args.templateWidth || 'auto'}"><AssistantLoadingMessage v-bind="args" /></div>`,
});

export const Default = Template.bind({});
Default.args = {
	message: 'Searching n8n documentation for the best possible answer...',
};

export const NarrowContainer = Template.bind({});
NarrowContainer.args = {
	...Default.args,
	templateWidth: '200px',
};
