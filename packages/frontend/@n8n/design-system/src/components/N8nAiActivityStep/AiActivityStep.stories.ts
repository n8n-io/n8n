import type { StoryFn } from '@storybook/vue3-vite';

import N8nAiActivityStep from './AiActivityStep.vue';

export default {
	title: 'Assistant/AiActivityStep',
	component: N8nAiActivityStep,
	parameters: {
		backgrounds: { default: '--color--background--light-2' },
		docs: {
			description: {
				component:
					'A collapsible AI activity row for showing a tool call, its input data, result, and errors.',
			},
		},
	},
};

const storyWrapper = `
	<div style="max-width: 720px; padding: var(--spacing--m); background: var(--color--background--light-2);">
		<n8n-ai-activity-step v-bind="args" />
	</div>
`;

const Template: StoryFn = (args) => ({
	components: { N8nAiActivityStep },
	setup: () => ({ args }),
	template: storyWrapper,
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
		<div style="max-width: 720px; padding: var(--spacing--m); background: var(--color--background--light-2);">
			<div style="display: flex; gap: var(--spacing--2xs); margin-bottom: var(--spacing--s);">
				<button v-for="item in states" :key="item" type="button" @click="state = item">
					{{ item }}
				</button>
			</div>
			<n8n-ai-activity-step :tool-call="toolCall" />
		</div>
	`,
});
