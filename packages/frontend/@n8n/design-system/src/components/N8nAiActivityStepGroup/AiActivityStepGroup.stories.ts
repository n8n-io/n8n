import type { StoryFn } from '@storybook/vue3-vite';
import { defineComponent } from 'vue';

import ReasoningBlock from '../../../../../editor-ui/src/features/ai/instanceAi/components/ReasoningBlock.vue';
import N8nAiActivityStep from '../N8nAiActivityStep';
import N8nAiActivityStepButton from '../N8nAiActivityStepButton';
import N8nAiActivityStepChevron from '../N8nAiActivityStepChevron';
import N8nAiActivityStepResultSection from '../N8nAiActivityStepResultSection';
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
		toolName: 'nodes',
		args: { action: 'search', query: 'Slack trigger', limit: 5 },
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
		toolName: 'workflows',
		args: { action: 'get-as-code' },
		result: { code: 'const workflow = {\n  nodes: [scheduleTrigger, slackMessage],\n};' },
	},
	{
		id: 'workflows-list',
		label: 'Listed workflows',
		toolName: 'workflows',
		args: { action: 'list' },
		result: {
			workflows: [
				{ name: 'Daily lead sync', active: true, updated: 'Today' },
				{ name: 'Slack incident alert', active: false, updated: 'Yesterday' },
			],
		},
	},
	{
		id: 'failed',
		label: 'Run command',
		error: 'Command failed with exit code 2. Check the TypeScript errors before continuing.',
		toolName: 'terminal',
		args: { command: 'pnpm typecheck' },
	},
];

const baseResultTextStyle = [
	'font-family: monospace',
	'line-height: var(--line-height--xl)',
	'white-space: pre-wrap',
	'word-break: break-word',
	'margin: 0',
	'color: var(--color--text--tint-1)',
];

const jsonTextStyle = [...baseResultTextStyle, 'font-size: var(--font-size--xs)'].join('; ');
const codeTextStyle = [
	...baseResultTextStyle,
	'font-size: var(--font-size--2xs)',
	'padding: var(--spacing--xs)',
].join('; ');

const StoryToolResultJson = defineComponent({
	components: { N8nAiActivityStepResultSection },
	props: {
		value: { type: null, required: true },
	},
	computed: {
		json(): string {
			return JSON.stringify(this.value, null, 2);
		},
	},
	setup() {
		return { jsonTextStyle };
	},
	template: `
		<n8n-ai-activity-step-result-section>
			<pre :style="jsonTextStyle">{{ json }}</pre>
		</n8n-ai-activity-step-result-section>
	`,
});

const StoryToolResultRenderer = defineComponent({
	components: { N8nAiActivityStepResultSection, StoryToolResultJson },
	props: {
		result: { type: null, required: true },
		toolName: { type: String, required: true },
		toolArgs: { type: Object, default: undefined },
	},
	computed: {
		code(): string | undefined {
			const result = this.result as { code?: unknown };
			const toolArgs = this.toolArgs as { action?: unknown } | undefined;
			return this.toolName === 'workflows' && toolArgs?.action === 'get-as-code'
				? typeof result.code === 'string'
					? result.code
					: undefined
				: undefined;
		},
	},
	setup() {
		return { codeTextStyle };
	},
	template: `
		<n8n-ai-activity-step-result-section v-if="code">
			<pre :style="codeTextStyle">{{ code }}</pre>
		</n8n-ai-activity-step-result-section>
		<story-tool-result-json v-else :value="result" />
	`,
});

const storyComponents = {
	N8nAiActivityStepResultSection,
	ToolResultJson: StoryToolResultJson,
	ToolResultRenderer: StoryToolResultRenderer,
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
					>
						<tool-result-json v-if="step.args" :value="step.args" />
						<tool-result-renderer
							v-if="step.result !== undefined"
							:result="step.result"
							:tool-name="step.toolName"
							:tool-args="step.args"
						/>
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
			<n8n-ai-activity-step v-else v-bind="args">
				<tool-result-renderer
					:result="args.result"
					:tool-name="args.toolName ?? 'unknown'"
					:tool-args="args.toolArgs"
				/>
			</n8n-ai-activity-step>
		</div>
	`,
});

export const NodeSearch = Template.bind({});
NodeSearch.args = {
	label: 'Search nodes',
	toolName: 'nodes',
	toolArgs: { action: 'search', query: 'Slack trigger', limit: 5 },
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
	result: { content: 'Thinking through the workflow shape before creating nodes.' },
};

export const CodeResult = Template.bind({});
CodeResult.args = {
	label: 'Generated workflow code',
	toolName: 'workflows',
	toolArgs: { action: 'get-as-code' },
	result: {
		code: `const workflow = {
  nodes: [
    { name: 'Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger' },
    { name: 'Post Slack Message', type: 'n8n-nodes-base.slack' },
  ],
};`,
	},
};

export const TableResult = Template.bind({});
TableResult.args = {
	label: 'Listed workflows',
	toolName: 'workflows',
	toolArgs: { action: 'list' },
	result: {
		workflows: [
			{ name: 'Daily lead sync', active: true, updated: 'Today' },
			{ name: 'Slack incident alert', active: false, updated: 'Yesterday' },
			{ name: 'Weekly digest', active: true, updated: 'Last week' },
		],
	},
};

export const TextResult = Template.bind({});
TextResult.args = {
	label: 'Fetched page content',
	toolName: 'docs',
	result: {
		content: [
			{
				type: 'text',
				text: 'Slack Trigger node\n\nStarts a workflow when a new message is posted to a selected channel.',
			},
		],
	},
};

export const ImageResult = Template.bind({});
ImageResult.args = {
	label: 'Generated preview image',
	toolName: 'image-generator',
	result: {
		content: [
			{
				type: 'image',
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
		],
	},
};

export const FileResult = Template.bind({});
FileResult.args = {
	label: 'Fetched PDF file',
	toolName: 'files',
	result: {
		content: [
			{
				type: 'file-data',
				mediaType: 'application/pdf',
				data: 'JVBERi0xLjQKJcfs',
			},
		],
	},
};

export const FailedActivity = Template.bind({});
FailedActivity.args = {
	label: 'Run command',
	error: 'Command failed with exit code 2. Check the TypeScript errors before continuing.',
	toolName: 'terminal',
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
