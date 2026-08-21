import type { StoryFn } from '@storybook/vue3-vite';

import TextMessage from './TextMessage.vue';

export default {
	title: 'Areas/Assistant/TextMessage',
	component: TextMessage,
	parameters: {
		docs: {
			description: {
				component: 'A text message in Assistant chat, for both user and assistant roles.',
			},
		},
	},
};

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { TextMessage },
	template: `
		<div style="width: 380px;">
			<TextMessage v-bind="args" />
		</div>
	`,
});

export const Assistant = Template.bind({});
Assistant.args = {
	isFirstOfRole: true,
	user: { firstName: 'Max', lastName: 'Test' },
	message: {
		id: 'text-1',
		role: 'assistant',
		type: 'text',
		content:
			'Hi Max! Here is my top solution to fix the error in your **Transform data** node.\n\n### Next steps\n1. Open the node\n2. Update the expression',
		read: false,
	},
};

export const User = Template.bind({});
User.args = {
	isFirstOfRole: true,
	user: { firstName: 'Max', lastName: 'Test' },
	message: {
		id: 'text-2',
		role: 'user',
		type: 'text',
		content: 'Give it to me **ignore this markdown**',
		read: false,
	},
};

export const WithCodeSnippet = Template.bind({});
WithCodeSnippet.args = {
	isFirstOfRole: true,
	user: { firstName: 'Max', lastName: 'Test' },
	message: {
		id: 'text-3',
		role: 'assistant',
		type: 'text',
		content: 'Use this expression in the node:',
		codeSnippet: '```js\n{{ $json.data }}\n```',
		read: false,
	},
};
