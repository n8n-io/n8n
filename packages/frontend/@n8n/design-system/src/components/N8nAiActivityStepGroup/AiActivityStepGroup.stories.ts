import type { StoryFn } from '@storybook/vue3-vite';

import N8nAiActivityStep from '../N8nAiActivityStep';
import N8nAiActivityStepButton from '../N8nAiActivityStepButton';
import N8nAiActivityStepChevron from '../N8nAiActivityStepChevron';
import N8nAiActivityStepGroup from './AiActivityStepGroup.vue';

export default {
	title: 'Assistant/AiActivityStep',
	component: N8nAiActivityStepGroup,
	parameters: {
		docs: {
			description: {
				component:
					'AI activity primitives for rendering tool-call style rows, collapsible groups, and shared activity controls.',
			},
		},
	},
};

const wrapperStyle =
	'max-width: 720px; padding: var(--spacing--m); display: flex; flex-direction: column; gap: var(--spacing--2xs);';

const toolCalls = [
	{
		toolCallId: 'tc-thought-1',
		toolName: 'thought',
		args: { content: 'Reviewing the requested Slack automation.' },
		hasContent: false,
		isLoading: false,
	},
	{
		toolCallId: 'tc-load-tools',
		toolName: 'load-tools',
		args: { integration: 'Slack' },
		result: { tools: ['slack_search_messages', 'slack_post_message', 'slack_list_channels'] },
		isLoading: false,
	},
	{
		toolCallId: 'tc-thought-2',
		toolName: 'thought',
		args: { content: 'Looking for the right channel and recent related messages.' },
		hasContent: false,
		isLoading: false,
	},
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
		toolCallId: 'tc-search-slack-1',
		toolName: 'research',
		label: 'Searched Slack',
		args: { action: 'web-search', query: 'Slack channel naming conventions' },
		result: {
			results: [{ title: 'Slack channel naming', url: 'https://slack.com/help' }],
		},
		hasContent: false,
		isLoading: false,
	},
	{
		toolCallId: 'tc-search-slack-2',
		toolName: 'research',
		label: 'Searched Slack',
		args: { action: 'web-search', query: 'Slack OAuth bot scopes' },
		result: {
			results: [{ title: 'Slack API scopes', url: 'https://api.slack.com/scopes' }],
		},
		isLoading: false,
	},
	{
		toolCallId: 'tc-search-slack-3',
		toolName: 'research',
		label: 'Searched Slack',
		args: { action: 'web-search', query: 'n8n Slack node docs' },
		result: {
			results: [
				{
					title: 'n8n Slack node docs',
					url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack/',
				},
			],
		},
		hasContent: false,
		isLoading: false,
	},
	{
		toolCallId: 'tc-thought-3',
		toolName: 'thought',
		args: { content: 'Ready to configure the Slack step.' },
		isLoading: true,
	},
];

export const Group: StoryFn = () => ({
	components: { N8nAiActivityStepGroup, N8nAiActivityStep },
	setup() {
		return { toolCalls };
	},
	template: `
		<div style="${wrapperStyle}">
			<n8n-ai-activity-step-group label="8 activity steps" size="medium">
				<n8n-ai-activity-step
					v-for="toolCall in toolCalls"
					:key="toolCall.toolCallId"
					:tool-call="toolCall"
					:label="toolCall.label"
					:has-content="toolCall.hasContent"
				/>
			</n8n-ai-activity-step-group>
		</div>
	`,
});

const stepWrapper = `
	<div style="max-width: 720px; padding: var(--spacing--m);">
		<n8n-ai-activity-step v-bind="args" />
	</div>
`;

const Template: StoryFn = (args) => ({
	components: { N8nAiActivityStep },
	setup: () => ({ args }),
	template: stepWrapper,
});

export const NodeSearch = Template.bind({});
NodeSearch.args = {
	toolCall: {
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
};

export const DelegateWithBrief = Template.bind({});
DelegateWithBrief.args = {
	toolCall: {
		toolCallId: 'tc-delegate',
		toolName: 'delegate',
		args: { role: 'workflow-builder', task: 'Build the first draft of the workflow' },
		result: {
			summary: 'Created a draft workflow with a Schedule Trigger, HTTP Request, and Slack message.',
			changedFiles: ['workflow.json'],
		},
		isLoading: false,
	},
};

export const ResearchWebSearch = Template.bind({});
ResearchWebSearch.args = {
	toolCall: {
		toolCallId: 'tc-research',
		toolName: 'research',
		args: { action: 'web-search', query: 'n8n Slack OAuth scopes' },
		result: {
			results: [
				{ title: 'Slack API scopes', url: 'https://api.slack.com/scopes' },
				{
					title: 'n8n Slack node docs',
					url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack/',
				},
			],
		},
		isLoading: false,
	},
};

export const FailedToolCall = Template.bind({});
FailedToolCall.args = {
	toolCall: {
		toolCallId: 'tc-error',
		toolName: 'workspace_execute_command',
		args: { command: 'pnpm typecheck' },
		error: 'Command failed with exit code 2. Check the TypeScript errors before continuing.',
		isLoading: false,
	},
};

export const ToggleState: StoryFn = () => ({
	components: { N8nAiActivityStep },
	data() {
		return {
			state: 'loading',
			states: ['loading', 'success', 'error'],
		};
	},
	computed: {
		toolCall() {
			const base = {
				toolCallId: 'tc-toggle',
				toolName: 'workflows',
				args: { action: 'list', projectId: 'Marketing Ops' },
			};

			if (this.state === 'loading') {
				return { ...base, isLoading: true };
			}

			if (this.state === 'error') {
				return {
					...base,
					isLoading: false,
					error: 'Unable to load workflows. Please try again.',
				};
			}

			return {
				...base,
				isLoading: false,
				result: {
					workflows: [
						{ name: 'Daily lead sync', active: true, updatedAt: '2026-07-03T10:15:00Z' },
						{ name: 'Slack incident alert', active: false, updatedAt: '2026-07-02T18:40:00Z' },
					],
				},
			};
		},
	},
	template: `
		<div style="max-width: 720px; padding: var(--spacing--m);">
			<div style="display: flex; gap: var(--spacing--2xs); margin-bottom: var(--spacing--s);">
				<button v-for="item in states" :key="item" type="button" @click="state = item">
					{{ item }}
				</button>
			</div>
			<n8n-ai-activity-step :tool-call="toolCall" />
		</div>
	`,
});

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
