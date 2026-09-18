import { useTextMention } from '@n8n/composables/useTextMention';
import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { expect, userEvent, within } from 'storybook/test';
import { computed, nextTick, ref, watch } from 'vue';

import '../../css/_tokens.scss';

import N8nChatInput from './ChatInput.vue';
import type { WorkflowSuggestion } from '../../types/assistant';
import N8nIcon from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';

export default {
	title: 'Areas/Assistant/ChatInput',
	component: N8nChatInput,
	argTypes: {
		modelValue: {
			control: 'text',
		},
		layout: {
			control: 'select',
			options: ['single-line', 'multiline', 'adaptive'],
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
		mentionSuggestions: {
			control: 'object',
			table: { category: 'Story mock data' },
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

interface MentionAdapterSuggestion {
	id: string;
	label: string;
	type: 'Workflow' | 'Node';
	parentLabel?: string;
}

interface MentionAdapterStoryArgs {
	modelValue?: string;
	placeholder?: string;
	maxLength?: number;
	mentionSuggestions: MentionAdapterSuggestion[];
}

const mentionAdapterSuggestions: MentionAdapterSuggestion[] = [
	{ id: 'workflow-daily-sales', label: 'Daily sales report', type: 'Workflow' },
	{ id: 'workflow-support-triage', label: 'Customer support triage', type: 'Workflow' },
	{
		id: 'node-send-summary',
		label: 'Send summary email',
		type: 'Node',
		parentLabel: 'Daily sales report',
	},
];

const MentionAdapterTemplate: StoryFn<MentionAdapterStoryArgs> = (args) => ({
	components: { N8nChatInput },
	setup() {
		const inputRef = ref<InstanceType<typeof N8nChatInput>>();
		const value = ref(args.modelValue ?? '');
		const visibleSuggestions = ref<MentionAdapterSuggestion[]>([]);
		const mention = useTextMention({
			results: visibleSuggestions,
			getResultId: (suggestion) => suggestion.id,
		});

		watch(
			[() => args.mentionSuggestions, mention.query],
			([suggestions, query]) => {
				const normalizedQuery = query.trim().toLowerCase();
				visibleSuggestions.value = normalizedQuery
					? suggestions.filter((suggestion) =>
							suggestion.label.toLowerCase().includes(normalizedQuery),
						)
					: [...suggestions];
			},
			{ immediate: true, deep: true },
		);
		watch(
			() => args.modelValue,
			(modelValue) => {
				if (modelValue !== undefined) value.value = modelValue;
			},
		);

		const textareaAttributes = computed(() => ({
			role: 'combobox' as const,
			'aria-expanded': mention.isOpen.value,
			'aria-controls': 'mention-adapter-listbox',
			...(mention.highlightedId.value
				? { 'aria-activedescendant': optionId(mention.highlightedId.value) }
				: {}),
		}));

		function optionId(id: string): string {
			return `mention-adapter-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
		}

		function updateValue(nextValue: string): void {
			value.value = nextValue;
			methods.onUpdateModelValue(nextValue);
		}

		function handleInput(event: Event): void {
			const target = event.target;
			if (!(target instanceof HTMLTextAreaElement)) return;
			mention.handleTextInput(target.value, target.selectionStart, target.selectionEnd);
		}

		function handleSelectionChange(selection: { start: number; end: number }): void {
			mention.handleSelectionChange(value.value, selection.start, selection.end);
		}

		function handleCompositionEnd(event: CompositionEvent): void {
			const target = event.target;
			if (!(target instanceof HTMLTextAreaElement)) return;
			mention.endComposition(target.value, target.selectionStart, target.selectionEnd);
		}

		async function selectSuggestion(suggestion: MentionAdapterSuggestion): Promise<void> {
			const edit = mention.applySelection(value.value, suggestion.label);
			if (!edit) return;

			value.value = edit.value;
			await nextTick();
			inputRef.value?.setSelection(edit.selectionStart, edit.selectionEnd);
			inputRef.value?.focusInput();
		}

		function handleKeydown(event: KeyboardEvent): void {
			const result = mention.handleKeydown(event);
			if (result?.type === 'select') void selectSuggestion(result.result);
		}

		return {
			args,
			highlightedId: mention.highlightedId,
			handleCompositionEnd,
			handleInput,
			handleKeydown,
			handleSelectionChange,
			inputRef,
			isOpen: mention.isOpen,
			optionId,
			selectSuggestion,
			setHighlightedId: mention.setHighlightedId,
			startComposition: mention.startComposition,
			textareaAttributes,
			updateValue,
			value,
			visibleSuggestions,
		};
	},
	template: `
		<div style="width: 500px; max-width: 100%;">
			<N8nChatInput
				ref="inputRef"
				:model-value="value"
				:placeholder="args.placeholder"
				:max-length="args.maxLength"
				:textarea-attributes="textareaAttributes"
				@update:model-value="updateValue"
				@input="handleInput"
				@keydown="handleKeydown"
				@compositionstart="startComposition"
				@compositionend="handleCompositionEnd"
				@selection-change="handleSelectionChange"
			/>
			<div
				v-if="isOpen && visibleSuggestions.length > 0"
				id="mention-adapter-listbox"
				role="listbox"
				aria-label="Mention suggestions"
				style="
					margin-top: var(--spacing--2xs);
					overflow: hidden;
					background: var(--background--surface);
					border: var(--border);
					border-radius: var(--radius--lg);
					box-shadow: var(--shadow--sm);
				"
			>
				<div
					v-for="suggestion in visibleSuggestions"
					:id="optionId(suggestion.id)"
					:key="suggestion.id"
					role="option"
					:aria-selected="highlightedId === suggestion.id"
					:style="{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 'var(--spacing--xs)',
						padding: 'var(--spacing--2xs) var(--spacing--xs)',
						color: 'var(--text-color)',
						background:
							highlightedId === suggestion.id
								? 'var(--background--active)'
								: 'var(--background--surface)',
						cursor: 'pointer',
					}"
					@mouseenter="setHighlightedId(suggestion.id)"
					@mousedown.prevent
					@click="selectSuggestion(suggestion)"
				>
					<span>{{ suggestion.label }}</span>
					<span style="color: var(--text-color--subtle); font-size: var(--font-size--2xs);">
						{{ suggestion.type }}<template v-if="suggestion.parentLabel"> - {{ suggestion.parentLabel }}</template>
					</span>
				</div>
			</div>
		</div>
	`,
});

export const InteractiveMentionAdapter = MentionAdapterTemplate.bind({});
InteractiveMentionAdapter.args = {
	placeholder: 'Type @ to reference a workflow...',
	maxLength: 1000,
	mentionSuggestions: mentionAdapterSuggestions,
};
InteractiveMentionAdapter.parameters = {
	docs: {
		description: {
			story:
				'Uses mock story data and the shared mention composable to demonstrate the textarea adapter interaction.',
		},
	},
};

export const Adaptive = Template.bind({});
Adaptive.args = {
	placeholder: 'Starts as one line and grows with your text...',
	maxLength: 1000,
	layout: 'adaptive',
};
Adaptive.parameters = {
	docs: {
		description: {
			story:
				'Adaptive supports the default icon-only send/stop button. A custom button label or action slot falls back to the multiline layout.',
		},
	},
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
			<div style="width: 500px; max-width: 100%; margin-bottom: var(--spacing--md);">
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
			<div
				style="
					padding: var(--spacing--xs);
					background: var(--background--subtle);
					color: var(--text-color);
					border: var(--border);
					border-radius: var(--radius);
				"
			>
				<p><strong>Current value:</strong> {{ val }}</p>
				<p><strong>Character count:</strong> {{ val.length }} / {{ args.maxLength }}</p>
				<p><strong>Streaming:</strong> {{ streaming }}</p>
				<button
					style="
						margin-top: var(--spacing--xs);
						padding: var(--spacing--3xs) var(--spacing--xs);
						color: var(--text-color);
						background: var(--background--surface);
						border: var(--border);
						border-radius: var(--radius);
						cursor: pointer;
					"
					@click="streaming = !streaming"
				>
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
		<div style="max-width: 710px; margin: 0 auto;">
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
