import type { StoryFn } from '@storybook/vue3-vite';

import '../../css/_tokens.scss';

import N8nChatMessage from './ChatMessage.vue';
import N8nIconButton from '../N8nIconButton';

export default {
	title: 'Areas/Assistant/ChatMessage',
	component: N8nChatMessage,
	argTypes: {
		role: {
			control: 'select',
			options: ['assistant', 'user'],
		},
	},
	parameters: {
		docs: {
			description: {
				component:
					'A presentational shell for role-based chat message alignment, user bubbles, and optional assistant actions.',
			},
		},
	},
};

const Template: StoryFn = (args) => ({
	components: { N8nChatMessage, N8nIconButton },
	setup: () => ({ args }),
	template: `
		<div style="width: 500px; max-width: 100%;">
			<N8nChatMessage v-bind="args">
				<p style="margin: 0;">Build a workflow that summarizes new support tickets.</p>
				<template v-if="args.role === 'assistant'" #actions>
					<N8nIconButton icon="copy" variant="ghost" size="xsmall" aria-label="Copy message" />
				</template>
			</N8nChatMessage>
		</div>
	`,
});

export const User = Template.bind({});
User.args = { role: 'user' };

export const Assistant = Template.bind({});
Assistant.args = { role: 'assistant' };
