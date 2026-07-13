import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import '../../css/_tokens.scss';

import N8nChatInput from './ChatInput.vue';
import type { WorkflowSuggestion } from '../../types/assistant';
import N8nIcon from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';

export default {
	title: 'AI/ChatInput',
	component: N8nChatInput,
	argTypes: {
		modelValue: {
			control: 'text',
		},
		layout: {
			control: 'select',
			options: ['single-line', 'multiline'],
		},
		placeholder: {
			control: 'text',
		},
		maxLength: {
			control: 'number',
		},
		maxLinesBeforeScroll: {
			control: 'number',
		},
		streaming: {
			control: 'boolean',
		},
		disabled: {
			control: 'boolean',
		},
		refocusAfterSend: {
			control: 'boolean',
		},
	},
	parameters: {
		backgrounds: { default: '--color--background--light-2' },
		docs: {
			description: {
				component:
					'A chat input with single-line and multiline layouts, submit/stop actions, and slot-based top and bottom bars.',
			},
		},
	},
};

const methods = {
	onUpdateModelValue: action('update:modelValue'),
	onUpgradeClick: action('upgrade-click'),
	onSubmit: action('submit'),
	onStop: action('stop'),
	onFocus: action('focus'),
	onBlur: action('blur'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nChatInput,
	},
	template: `
		<div style="width: 500px; max-width: 100%;">
			<n8n-chat-input
				v-bind="args"
				:modelValue="val"
				@update:modelValue="handleUpdateModelValue"
				@submit="onSubmit"
				@stop="onStop"
				@focus="onFocus"
				@blur="onBlur"
			/>
		</div>
	`,
	data() {
		return {
			val: this.args.modelValue || '',
		};
	},
	watch: {
		args: {
			handler(newArgs) {
				if (newArgs.modelValue !== undefined) {
					this.val = newArgs.modelValue;
				}
			},
			deep: true,
			immediate: true,
		},
	},
	methods: {
		...methods,
		handleUpdateModelValue(value: string) {
			this.val = value;
			this.onUpdateModelValue(value);
		},
	},
});

export const Default = Template.bind({});
Default.args = {
	placeholder: 'Type your message here...',
	maxLength: 1000,
};

export const SingleLine = Template.bind({});
SingleLine.args = {
	placeholder: 'Type your message here...',
	maxLength: 1000,
	layout: 'single-line',
};

export const MultiLine = Template.bind({});
MultiLine.args = {
	placeholder: 'Type your message here...',
	maxLength: 1000,
};

const workflowSuggestions: WorkflowSuggestion[] = [
	{
		id: 'invoice-pipeline',
		summary: 'Invoice processing pipeline',
		prompt:
			'Create an invoice parsing workflow using n8n forms. Extract key information and store in Airtable.',
	},
	{
		id: 'ai-news-digest',
		summary: 'Daily AI news digest',
		prompt:
			'Create a workflow that fetches the latest AI news every morning at 8 AM and sends a summary via Telegram.',
	},
	{
		id: 'email-summary',
		summary: 'Summarize emails with AI',
		prompt:
			'Build a workflow that retrieves emails, performs AI analysis, and sends a summary to Slack.',
	},
];

interface PromptAttachment {
	name: string;
	type: string;
}

const promptAttachments: PromptAttachment[] = [
	{
		name: 'invoice-screenshot.png',
		type: 'image/png',
	},
	{
		name: 'workflow-notes.pdf',
		type: 'application/pdf',
	},
];

const LeadingTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nIcon,
		N8nChatInput,
	},
	template: `
		<div style="width: 500px; max-width: 100%;">
			<n8n-chat-input v-bind="args" @submit="onSubmit" @stop="onStop">
				<template #leading>
					<div
						style="
							display: flex;
							flex-wrap: wrap;
							gap: var(--spacing--2xs);
						"
					>
						<div
							v-for="attachment in args.attachments"
							:key="attachment.name"
							style="
								position: relative;
								display: flex;
								align-items: center;
								justify-content: center;
								width: 80px;
								height: 80px;
								overflow: hidden;
								border: var(--border);
								border-radius: var(--radius--lg);
								background: var(--color--foreground--tint-2);
								color: var(--color--text--tint-1);
							"
						>
							<N8nIcon icon="file" size="large" />
							<button
								type="button"
								:aria-label="'Remove ' + attachment.name"
								style="
									position: absolute;
									top: var(--spacing--4xs);
									right: var(--spacing--4xs);
									display: flex;
									align-items: center;
									justify-content: center;
									width: 20px;
									height: 20px;
									padding: 0;
									color: white;
									background: color-mix(in srgb, var(--color--foreground--shade-2) 70%, transparent);
									border: none;
									border-radius: 50%;
									cursor: pointer;
								"
								@click.stop="onRemoveAttachment(attachment.name)"
							>
								<N8nIcon icon="x" size="small" />
							</button>
						</div>
					</div>
				</template>
			</n8n-chat-input>
		</div>
	`,
	methods: {
		onSubmit: methods.onSubmit,
		onStop: methods.onStop,
		onRemoveAttachment: action('remove-attachment'),
	},
});

const TrailingTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nChatInput,
	},
	template: `
		<div style="width: 500px; max-width: 100%;">
			<n8n-chat-input v-bind="args" @submit="onSubmit" @stop="onStop">
				<template #trailing>
					<div
						style="
							display: flex;
							flex-wrap: wrap;
							gap: var(--spacing--2xs);
						"
					>
						<button
							v-for="suggestion in args.suggestions"
							:key="suggestion.id"
							type="button"
							style="
								display: inline-flex;
								align-items: center;
								justify-content: center;
								padding: var(--spacing--4xs) var(--spacing--2xs);
								border-radius: 56px;
								border: var(--border);
								background: var(--color--background--light-3);
								font-size: var(--font-size--2xs);
								color: var(--color--text--shade-1);
							"
						>
							{{ suggestion.summary }}
						</button>
					</div>
				</template>
			</n8n-chat-input>
		</div>
	`,
	methods: {
		onSubmit: methods.onSubmit,
		onStop: methods.onStop,
	},
});

const ActionsTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nIconButton,
		N8nChatInput,
		N8nTooltip,
	},
	template: `
		<div style="width: 500px; max-width: 100%;">
			<n8n-chat-input v-bind="args" @submit="onSubmit" @stop="onStop">
				<template #left-actions>
					<n8n-tooltip content="Context">
						<n8n-icon-button
							icon="plus"
							title="Context"
							variant="ghost"
							size="medium"
							@click="onContextClick"
						/>
					</n8n-tooltip>
				</template>
				<template #right-actions>
					<n8n-tooltip content="Voice">
						<n8n-icon-button
							icon="mic"
							title="Voice input"
							variant="ghost"
							size="medium"
							@click="onMicClick"
						/>
					</n8n-tooltip>
				</template>
			</n8n-chat-input>
		</div>
	`,
	methods: {
		onSubmit: methods.onSubmit,
		onStop: methods.onStop,
		onContextClick: action('context-click'),
		onMicClick: action('mic-click'),
	},
});

export const WithLeading = LeadingTemplate.bind({});
WithLeading.args = {
	placeholder: 'Ask about the attached files...',
	maxLength: 1000,
	attachments: promptAttachments,
};

export const WithTrailing = TrailingTemplate.bind({});
WithTrailing.args = {
	placeholder: 'Type your message here...',
	maxLength: 1000,
	suggestions: workflowSuggestions,
};

export const WithActions = ActionsTemplate.bind({});
WithActions.args = {
	placeholder: 'Type your message here...',
	maxLength: 1000,
};

export const Streaming = Template.bind({});
Streaming.args = {
	modelValue: 'This is currently being processed...',
	placeholder: 'Type your message here...',
	streaming: true,
	maxLength: 1000,
};

export const Disabled = Template.bind({});
Disabled.args = {
	placeholder: 'This input is disabled',
	disabled: true,
	maxLength: 1000,
};

export const WithInitialText = Template.bind({});
WithInitialText.args = {
	modelValue:
		'Hello, this is some initial text that spans multiple lines\nto show how the component handles existing content.',
	placeholder: 'Type your message here...',
	maxLength: 1000,
};

export const AtCharacterLimit = Template.bind({});
AtCharacterLimit.args = {
	modelValue: 'This message is exactly at the character limit!!',
	placeholder: 'Type your message here...',
	maxLength: 48,
};

export const WithRefocusAfterSend = Template.bind({});
WithRefocusAfterSend.args = {
	placeholder: 'Input will refocus after send...',
	maxLength: 1000,
	refocusAfterSend: true,
};

const InteractiveTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nChatInput,
	},
	template: `
		<div>
			<div style="width: 500px; max-width: 100%; margin-bottom: 20px;">
				<n8n-chat-input
					v-bind="args"
					:modelValue="val"
					:streaming="streaming"
					@update:modelValue="handleUpdateModelValue"
					@submit="handleSubmit"
					@stop="handleStop"
					@focus="onFocus"
					@blur="onBlur"
				/>
			</div>
			<div style="padding: 10px; background: #f0f0f0; border-radius: 4px;">
				<p><strong>Current value:</strong> {{ val }}</p>
				<p><strong>Character count:</strong> {{ val.length }} / {{ args.maxLength }}</p>
				<p><strong>Streaming:</strong> {{ streaming }}</p>
				<button @click="streaming = !streaming" style="margin-top: 10px;">
					Toggle Streaming (Current: {{ streaming ? 'ON' : 'OFF' }})
				</button>
			</div>
		</div>
	`,
	data() {
		return {
			val: this.args.modelValue || '',
			streaming: false,
		};
	},
	watch: {
		args: {
			handler(newArgs) {
				if (newArgs.modelValue !== undefined) {
					this.val = newArgs.modelValue;
				}
			},
			deep: true,
			immediate: true,
		},
	},
	methods: {
		...methods,
		handleUpdateModelValue(value: string) {
			this.val = value;
			this.onUpdateModelValue(value);
		},
		handleSubmit() {
			this.onSubmit();
			// Simulate processing
			this.streaming = true;
			setTimeout(() => {
				this.streaming = false;
				// Clear after "processing"
				this.val = '';
			}, 2000);
		},
		handleStop() {
			this.onStop();
			this.streaming = false;
		},
	},
});

export const Interactive = InteractiveTemplate.bind({});
Interactive.args = {
	placeholder: 'Type a message and press Enter to send...',
	maxLength: 500,
	refocusAfterSend: true,
};

const MultipleInstancesTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nChatInput,
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: 20px;">
			<div>
				<h3>Single Line layout</h3>
				<div style="width: 500px; max-width: 100%;">
					<n8n-chat-input
						:modelValue="val1"
						@update:modelValue="val1 = $event"
						:placeholder="'Single line input...'"
						:max-length="1000"
					/>
				</div>
			</div>
			<div>
				<h3>Multiline with short text</h3>
				<div style="width: 500px; max-width: 100%;">
					<n8n-chat-input
						:modelValue="val2"
						@update:modelValue="val2 = $event"
						:placeholder="'Two line input...'"
						:max-length="1000"
					/>
				</div>
			</div>
			<div>
				<h3>Multiline with longer text</h3>
				<div style="width: 500px; max-width: 100%;">
					<n8n-chat-input
						:modelValue="val3"
						@update:modelValue="val3 = $event"
						:placeholder="'Three line input...'"
						:max-length="1000"
					/>
				</div>
			</div>
		</div>
	`,
	data() {
		return {
			val1: '',
			val2: '',
			val3: '',
		};
	},
});

export const DifferentSizes = MultipleInstancesTemplate.bind({});
DifferentSizes.args = {};

const SuggestionsTemplate: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: {
		N8nChatInput,
	},
	template: `
		<div style="max-width: 710px; margin: 0 auto; padding: 20px;">
			<div
				style="
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: var(--spacing--md);
					max-width: 710px;
					width: 100%;
				"
			>
				<div style="width: 100%;">
					<N8nChatInput
						placeholder="Describe the workflow you want to build..."
						:streaming="args.streaming"
						:disabled="args.disabled"
						:credits-quota="args.creditsQuota"
						:credits-remaining="args.creditsRemaining"
						:show-ask-owner-tooltip="args.showAskOwnerTooltip"
						@submit="onSubmit"
						@upgrade-click="onUpgradeClick"
					/>
				</div>
				<div
					v-if="args.suggestions.length > 0 && !args.streaming"
					style="
						display: flex;
						justify-content: center;
						align-items: flex-start;
						flex-wrap: wrap;
						gap: var(--spacing--2xs);
						width: 100%;
					"
				>
					<button
						v-for="suggestion in args.suggestions"
						:key="suggestion.id"
						type="button"
						:disabled="args.disabled"
						style="
							display: inline-flex;
							align-items: center;
							justify-content: center;
							padding: var(--spacing--4xs) var(--spacing--2xs);
							border-radius: 56px;
							border: var(--border);
							background: var(--color--background--light-3);
							font-size: var(--font-size--2xs);
							color: var(--color--text--shade-1);
						"
					>
						{{ suggestion.summary }}
					</button>
				</div>
			</div>
		</div>
	`,
	methods: {
		onSubmit: methods.onSubmit,
		onUpgradeClick: methods.onUpgradeClick,
	},
});

export const WithWorkflowSuggestions = SuggestionsTemplate.bind({});
WithWorkflowSuggestions.args = {
	suggestions: workflowSuggestions,
};

export const SuggestionsDisabled = SuggestionsTemplate.bind({});
SuggestionsDisabled.args = {
	suggestions: workflowSuggestions,
	disabled: true,
};
