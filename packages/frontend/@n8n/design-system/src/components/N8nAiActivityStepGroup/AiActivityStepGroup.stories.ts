import type { StoryFn } from '@storybook/vue3-vite';

import N8nAiActivityStepButton from '../N8nAiActivityStepButton';
import N8nAiActivityStepChevron from '../N8nAiActivityStepChevron';
import N8nAiActivityStep from '../N8nAiActivityStep';
import N8nAiActivityStepGroup from './AiActivityStepGroup.vue';

export default {
	title: 'Assistant/AiActivityStep',
	component: N8nAiActivityStepGroup,
	parameters: {
		backgrounds: { default: '--color--background--light-2' },
		docs: {
			description: {
				component:
					'AI activity primitives for rendering tool-call style rows, collapsible groups, and shared activity controls.',
			},
		},
	},
};

const wrapperStyle =
	'max-width: 720px; padding: var(--spacing--m); background: var(--color--background--light-2); display: flex; flex-direction: column; gap: var(--spacing--2xs);';

export const StepButton: StoryFn = () => ({
	components: { N8nAiActivityStepButton, N8nAiActivityStepChevron },
	data() {
		return { open: false };
	},
	template: `
		<div style="${wrapperStyle}">
			<n8n-ai-activity-step-button @click="open = !open">
				Searching available nodes
				<template #suffix>
					<n8n-ai-activity-step-chevron :open="open" />
				</template>
			</n8n-ai-activity-step-button>
			<n8n-ai-activity-step-button loading>
				Running tool call
				<template #suffix>
					<n8n-ai-activity-step-chevron :open="false" />
				</template>
			</n8n-ai-activity-step-button>
		</div>
	`,
});

export const Group: StoryFn = () => ({
	components: { N8nAiActivityStepGroup, N8nAiActivityStep },
	data() {
		return {
			toolCalls: [
				{
					toolCallId: 'tc-search-nodes',
					toolName: 'nodes-search',
					args: { query: 'Slack trigger', limit: 5 },
					result: {
						nodes: [
							{ name: 'Slack Trigger', type: 'n8n-nodes-base.slackTrigger' },
							{ name: 'Slack', type: 'n8n-nodes-base.slack' },
						],
					},
					isLoading: false,
				},
				{
					toolCallId: 'tc-research',
					toolName: 'research',
					args: { action: 'web-search', query: 'n8n Slack OAuth scopes' },
					result: {
						results: [{ title: 'Slack API scopes', url: 'https://api.slack.com/scopes' }],
					},
					isLoading: false,
				},
			],
		};
	},
	template: `
		<div style="${wrapperStyle}">
			<n8n-ai-activity-step-group label="2 tool calls" size="medium">
				<n8n-ai-activity-step
					v-for="toolCall in toolCalls"
					:key="toolCall.toolCallId"
					:tool-call="toolCall"
				/>
			</n8n-ai-activity-step-group>
		</div>
	`,
});
