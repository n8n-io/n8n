import type { StoryFn } from '@storybook/vue3-vite';

import BlockMessage from './BlockMessage.vue';

export default {
	title: 'Areas/Assistant/BlockMessage',
	component: BlockMessage,
	parameters: {
		docs: {
			description: {
				component: 'A titled summary block in Assistant chat, with markdown body content.',
			},
		},
	},
};

const Template: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { BlockMessage },
	template: `
		<div style="width: 380px;">
			<BlockMessage v-bind="args" />
		</div>
	`,
});

export const Default = Template.bind({});
Default.args = {
	isFirstOfRole: true,
	user: { firstName: 'Max', lastName: 'Test' },
	message: {
		id: 'block-1',
		role: 'assistant',
		type: 'block',
		title: "Credential doesn't have correct permissions to send a message",
		content:
			'### Solution steps\n1. Check the credential **scopes**\n2. Reconnect the account\n3. Retry the node\n\n- Unordered item 1\n- Unordered item 2',
		read: false,
	},
};
