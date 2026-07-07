import type { StoryFn } from '@storybook/vue3-vite';

import { defineComponent } from 'vue';

import ReasoningBlock from '../../../../../editor-ui/src/features/ai/instanceAi/components/ReasoningBlock.vue';
import ToolResultFile from '../../../../../editor-ui/src/features/ai/instanceAi/components/ToolResultFile.vue';
import ToolResultImage from '../../../../../editor-ui/src/features/ai/instanceAi/components/ToolResultImage.vue';
import ToolResultJson from '../../../../../editor-ui/src/features/ai/instanceAi/components/ToolResultJson.vue';
import ToolResultTable from '../../../../../editor-ui/src/features/ai/instanceAi/components/ToolResultTable.vue';
import ToolResultText from '../../../../../editor-ui/src/features/ai/instanceAi/components/ToolResultText.vue';
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
					'AI activity primitives for rendering generic activity rows, collapsible groups, and shared activity controls.',
			},
		},
	},
};

const wrapperStyle =
	'max-width: 720px; padding: var(--spacing--m); display: flex; flex-direction: column; gap: var(--spacing--2xs);';

const steps = [
	{
		id: 'nodes-search',
		label: 'Search nodes',
		type: 'json',
		args: { query: 'Slack trigger', limit: 5 },
		result: {
			nodes: [
				{ name: 'Slack Trigger', type: 'n8n-nodes-base.slackTrigger' },
				{ name: 'Slack', type: 'n8n-nodes-base.slack' },
			],
		},
	},
	{
		id: 'workflow-code',
		label: 'Generated workflow code',
		type: 'code',
		result: 'const workflow = {\n  nodes: [scheduleTrigger, slackMessage],\n};',
	},
	{
		id: 'workflows-list',
		label: 'Listed workflows',
		type: 'table',
		result: [
			{ name: 'Daily lead sync', active: true, updated: 'Today' },
			{ name: 'Slack incident alert', active: false, updated: 'Yesterday' },
		],
	},
	{
		id: 'failed',
		label: 'Run command',
		error: 'Command failed with exit code 2. Check the TypeScript errors before continuing.',
		type: 'json',
		args: { command: 'pnpm typecheck' },
	},
];

const StoryToolResultCode = defineComponent({
	props: {
		code: { type: String, required: true },
	},
	template:
		'<pre style="font-family: monospace; font-size: var(--font-size--3xs); line-height: var(--line-height--xl); white-space: pre-wrap; word-break: break-word; margin: 0; color: var(--color--text--tint-1);">{{ code }}</pre>',
});

const storyComponents = {
	ToolResultCode: StoryToolResultCode,
	ToolResultFile,
	ToolResultImage,
	ToolResultJson,
	ToolResultTable,
	ToolResultText,
	ReasoningBlock,
};

const slotStyles = '';

export const Group: StoryFn = () => ({
	components: { N8nAiActivityStepGroup, N8nAiActivityStep, ...storyComponents },
	setup() {
		return { steps };
	},
	template: `
		<style>${slotStyles}</style>
		<div style="${wrapperStyle}">
			<n8n-ai-activity-step-group label="4 activity steps" size="medium" loading>
				<template v-for="step in steps" :key="step.id">
					<n8n-ai-activity-step
						:label="step.label"
						:loading="step.loading"
						:error="step.error"
						wrap-content
					>
						<tool-result-json v-if="step.args" :value="step.args" />
						<tool-result-json v-if="step.result && step.type === 'json'" :value="step.result" />
						<tool-result-code v-if="step.type === 'code'" :code="step.result" />
						<tool-result-table v-if="step.type === 'table'" :rows="step.result" />
						<tool-result-text v-if="step.type === 'text'" :text="step.result" />
						<tool-result-image v-if="step.type === 'image'" :data="step.result.data" :mime-type="step.result.mimeType" />
						<tool-result-file v-if="step.type === 'file'" :data="step.result.data" :mime-type="step.result.mimeType" />
					</n8n-ai-activity-step>
				</template>
			</n8n-ai-activity-step-group>
		</div>
	`,
});

const Template: StoryFn = (args) => ({
	components: { N8nAiActivityStep, ...storyComponents },
	setup: () => ({ args }),
	template: `
		<style>${slotStyles}</style>
		<div style="max-width: 720px; padding: var(--spacing--m);">
			<reasoning-block
				v-if="args.type === 'reasoning'"
				:entry="{ content: args.result.content }"
				:streaming="args.loading"
			/>
			<n8n-ai-activity-step v-else v-bind="args" :wrap-content="args.wrapContent">
				<tool-result-code v-if="args.type === 'code'" :code="args.result" />
				<tool-result-table v-else-if="args.type === 'table'" :rows="args.result" />
				<tool-result-text v-else-if="args.type === 'text'" :text="args.result" />
				<tool-result-image v-else-if="args.type === 'image'" :data="args.result.data" :mime-type="args.result.mimeType" />
				<tool-result-file v-else-if="args.type === 'file'" :data="args.result.data" :mime-type="args.result.mimeType" />
				<tool-result-json v-else :value="args.result" />
			</n8n-ai-activity-step>
		</div>
	`,
});

export const NodeSearch = Template.bind({});
NodeSearch.args = {
	label: 'Search nodes',
	wrapContent: true,
	result: {
		nodes: [
			{ name: 'Slack Trigger', type: 'n8n-nodes-base.slackTrigger' },
			{ name: 'Slack', type: 'n8n-nodes-base.slack' },
		],
	},
};

export const Reasoning = Template.bind({});
Reasoning.args = {
	label: 'Reasoning',
	loading: true,
	type: 'reasoning',
	wrapContent: false,
	result: { content: 'Thinking through the workflow shape before creating nodes.' },
};

export const CodeResult = Template.bind({});
CodeResult.args = {
	label: 'Generated workflow code',
	type: 'code',
	wrapContent: true,
	result: `const workflow = {
  nodes: [
    { name: 'Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger' },
    { name: 'Post Slack Message', type: 'n8n-nodes-base.slack' },
  ],
};`,
};

export const TableResult = Template.bind({});
TableResult.args = {
	label: 'Listed workflows',
	type: 'table',
	wrapContent: true,
	result: [
		{ name: 'Daily lead sync', active: true, updated: 'Today' },
		{ name: 'Slack incident alert', active: false, updated: 'Yesterday' },
		{ name: 'Weekly digest', active: true, updated: 'Last week' },
	],
};

export const TextResult = Template.bind({});
TextResult.args = {
	label: 'Fetched page content',
	type: 'text',
	wrapContent: true,
	result:
		'Slack Trigger node\n\nStarts a workflow when a new message is posted to a selected channel.',
};

export const ImageResult = Template.bind({});
ImageResult.args = {
	label: 'Generated preview image',
	type: 'image',
	wrapContent: true,
	result: {
		mimeType: 'image/svg+xml',
		data: btoa(`
			<svg xmlns="http://www.w3.org/2000/svg" width="360" height="160" viewBox="0 0 360 160">
				<rect width="360" height="160" rx="12" fill="#f6f7fb"/>
				<circle cx="80" cy="80" r="28" fill="#ff6d5a"/>
				<rect x="132" y="55" width="150" height="12" rx="6" fill="#8b90a0"/>
				<rect x="132" y="82" width="100" height="12" rx="6" fill="#b5bac8"/>
			</svg>
		`),
	},
};

export const FileResult = Template.bind({});
FileResult.args = {
	label: 'Fetched PDF file',
	type: 'file',
	wrapContent: true,
	result: {
		mimeType: 'application/pdf',
		data: 'JVBERi0xLjQKJcfs',
	},
};

export const FailedActivity = Template.bind({});
FailedActivity.args = {
	label: 'Run command',
	error: 'Command failed with exit code 2. Check the TypeScript errors before continuing.',
	wrapContent: true,
	result: { command: 'pnpm typecheck' },
};

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
				Running activity
				<template #suffix>
					<n8n-ai-activity-step-chevron :open="false" />
				</template>
			</n8n-ai-activity-step-button>
		</div>
	`,
});
