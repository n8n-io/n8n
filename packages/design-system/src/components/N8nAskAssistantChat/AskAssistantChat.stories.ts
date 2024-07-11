import AskAssistantChat from './AskAssistantChat.vue';
import type { StoryFn } from '@storybook/vue3';
import type { AssistantMessage } from './types';

export default {
	title: 'Atoms/AskAssistantChat',
	component: AskAssistantChat,
	argTypes: {},
};

const methods = {};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		AskAssistantChat,
	},
	template: '<div style="width:275px; height:100%"><ask-assistant-chat v-bind="args" /></div>',
	methods,
});

export const DefaultPlaceholderChat = Template.bind({});
DefaultPlaceholderChat.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
};

const messages: AssistantMessage[] = [
	{
		type: 'text',
		role: 'assistant',
		content: 'Hi Max! Here is my top solution to fix the error in your **Transform data** node👇',
	},
	{
		type: 'code-diff',
		role: 'assistant',
		description: 'Short solution description here that can spill over to two lines',
		// codeDiff:
		// '--- original.js\n+++ modified.js\n- cons a = 1\n+ const a = 1\n\n+for (const item of items) {\n+  item.json.myNewField = 1;\n+}\n\n+return items;',
		codeDiff: `@@ -1,7 +1,6 @@
-The Way that can be told of is not the eternal Way;
-The name that can be named is not the eternal name.
 The Nameless is the origin of Heaven and Earth;
-The Named is the mother of all things.
+The named is the mother of all things.
+
 Therefore let there always be non-being,
   so we may see their subtlety,
 And let there always be being,
@@ -9,3 +8,6 @@
 The two are the same,
 But after they are produced,
   they have different names.
+They both may be called deep and profound.
+Deeper and more profound,
+The door of all subtleties!`,
		quickReplies: [
			{
				type: 'new-suggestion',
				label: 'Give me another solution',
			},
			{
				type: 'resolved',
				label: 'All good',
			},
		],
	},
	{
		type: 'text',
		role: 'user',
		content: 'Give it to me **ignore this markdown**',
	},
	{
		type: 'text',
		role: 'assistant',
		title: 'Credential doesn’t have correct permissions to send a message',
		content:
			'Solution steps:\n1. Lorem ipsum dolor sit amet, consectetur **adipiscing** elit. Proin id nulla placerat, tristique ex at, euismod dui.\n2. Copy this into somewhere\n3. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin id nulla placerat, tristique ex at, euismod dui.\n4. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin id nulla placerat, tristique ex at, euismod dui. \n Testing more code',
	},
	{
		type: 'code-diff',
		role: 'assistant',
		description: 'Short solution with min height',
		// codeDiff:
		// '--- original.js\n+++ modified.js\n- cons a = 1\n+ const a = 1\n\n+for (const item of items) {\n+  item.json.myNewField = 1;\n+}\n\n+return items;',
		codeDiff: `@@ -1,7 +1,6 @@
-The Way that can be told of is not the eternal Way;
-The name that can be named is not the eternal name.
+The door of all subtleties!`,
		quickReplies: [
			{
				type: 'new-suggestion',
				label: 'Give me another solution',
			},
			{
				type: 'resolved',
				label: 'All good',
			},
		],
	},
];
export const Chat = Template.bind({});
Chat.args = {
	user: {
		firstName: 'Max',
		lastName: 'Test',
	},
	messages,
};
