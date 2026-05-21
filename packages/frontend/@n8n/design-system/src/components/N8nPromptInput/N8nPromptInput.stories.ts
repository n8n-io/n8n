import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { ref } from 'vue';

import '../../css/_tokens.scss';

import N8nPromptInput from './N8nPromptInput.vue';
import type { WorkflowSuggestion } from '../../types/assistant';
import N8nButton from '../N8nButton/Button.vue';
import N8nCard from '../N8nCard/Card.vue';
import N8nHeading from '../N8nHeading/Heading.vue';
import N8nIconButton from '../N8nIconButton';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';

export default {
	title: 'Core/PromptInput',
	component: N8nPromptInput,
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
					'A prompt input with single-line and multiline layouts, submit/stop actions, and slot-based top and bottom bars.',
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
		N8nPromptInput,
	},
	template: `
		<div style="width: 500px; max-width: 100%;">
			<n8n-prompt-input
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

const LeadingTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nButton,
		N8nCard,
		N8nHeading,
		N8nPromptInput,
	},
	template: `
		<div style="width: 500px; max-width: 100%;">
			<n8n-prompt-input v-bind="args" @submit="onSubmit" @stop="onStop">
				<template #leading>
					<n8n-card
						style="
							--card--padding: var(--spacing--sm);
							background: var(--color--background--light);
							border-color: var(--border-color);
							box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
						"
					>
						<div
							style="
								display: flex;
								flex-direction: column;
								gap: var(--spacing--sm);
								width: 100%;
							"
						>
							<n8n-heading tag="div" size="small" bold color="text-dark">
								Allow AI Assistant to archive workflow?
							</n8n-heading>
							<div
								style="
									display: flex;
									justify-content: space-between;
									align-items: center;
									gap: var(--spacing--sm);
									padding-top: var(--spacing--xs);
								"
							>
								<n8n-button type="button" variant="secondary" size="medium">
									Deny
								</n8n-button>
								<div style="display: flex; gap: var(--spacing--xs);">
									<n8n-button type="button" variant="secondary" size="medium">
										Allow once
									</n8n-button>
									<n8n-button type="button" variant="solid" size="medium">
										Always allow
									</n8n-button>
								</div>
							</div>
						</div>
					</n8n-card>
				</template>
			</n8n-prompt-input>
		</div>
	`,
	methods: {
		onSubmit: methods.onSubmit,
		onStop: methods.onStop,
	},
});

const TrailingTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nPromptInput,
	},
	template: `
		<div style="width: 500px; max-width: 100%;">
			<n8n-prompt-input v-bind="args" @submit="onSubmit" @stop="onStop">
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
			</n8n-prompt-input>
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
		N8nPromptInput,
		N8nTooltip,
	},
	template: `
		<div style="width: 500px; max-width: 100%;">
			<n8n-prompt-input v-bind="args" @submit="onSubmit" @stop="onStop">
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
			</n8n-prompt-input>
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
	placeholder: 'Type your message here...',
	maxLength: 1000,
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
		N8nPromptInput,
	},
	template: `
		<div>
			<div style="width: 500px; max-width: 100%; margin-bottom: 20px;">
				<n8n-prompt-input
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
		N8nPromptInput,
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: 20px;">
			<div>
				<h3>Single Line layout</h3>
				<div style="width: 500px; max-width: 100%;">
					<n8n-prompt-input
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
					<n8n-prompt-input
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
					<n8n-prompt-input
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

const CreditsTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: { N8nPromptInput },
	template: `
		<div style="width: 500px; max-width: 100%;">
			<n8n-prompt-input v-bind="args" @submit="onSubmit" @stop="onStop">
				<template #leading>
					<div
						style="display: flex; align-items: center; justify-content: space-between; gap: var(--spacing--2xs); color: var(--color--text--tint-1); font-size: var(--font-size--2xs);"
					>
						<span>{{ args.leadingMessage }}</span>
						<button
							v-if="args.leadingActionLabel"
							type="button"
							style="border: none; background: transparent; color: var(--color--primary); padding: 0; cursor: pointer;"
							@click="onUpgradeClick"
						>
							{{ args.leadingActionLabel }}
						</button>
					</div>
				</template>
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
			</n8n-prompt-input>
		</div>
	`,
	methods: {
		onSubmit: methods.onSubmit,
		onStop: methods.onStop,
		onUpgradeClick: methods.onUpgradeClick,
	},
});

export const WithCreditsAndUpgrade: StoryFn = CreditsTemplate.bind({});
WithCreditsAndUpgrade.args = {
	placeholder: 'Type your message here...',
	leadingMessage: 'Credits remaining',
	leadingActionLabel: 'Upgrade',
	suggestions: workflowSuggestions,
};
WithCreditsAndUpgrade.storyName = 'With Leading and Trailing Upgrade';

export const WithCreditsNoUpgrade: StoryFn = CreditsTemplate.bind({});
WithCreditsNoUpgrade.args = {
	placeholder: 'Type your message here...',
	leadingMessage: 'Credits remaining',
	leadingActionLabel: 'Ask admin',
	suggestions: workflowSuggestions,
};
WithCreditsNoUpgrade.storyName = 'With Leading Ask Admin Action';

export const LowCredits: StoryFn = CreditsTemplate.bind({});
LowCredits.args = {
	placeholder: 'Type your message here...',
	leadingMessage: 'Low credit balance',
	leadingActionLabel: 'Upgrade',
	suggestions: workflowSuggestions,
};
LowCredits.storyName = 'Low Credits Leading and Trailing';

export const NoCreditsRemaining: StoryFn = CreditsTemplate.bind({});
NoCreditsRemaining.args = {
	placeholder: 'Type your message here...',
	disabled: true,
	disabledTooltip: 'No credits remaining. Ask an owner to add credits.',
	leadingMessage: 'No credits remaining',
	leadingActionLabel: 'Ask owner',
	suggestions: workflowSuggestions,
};
NoCreditsRemaining.storyName = 'No Credits Leading and Trailing';

const CreditsInteractiveTemplate: StoryFn = (args) => ({
	components: { N8nPromptInput },
	setup() {
		const inputValue = ref('');
		const creditsRemaining = ref(args.creditsRemaining || 150);
		const creditsQuota = ref(args.creditsQuota || 150);

		const handleSubmit = () => {
			if (inputValue.value.trim() && creditsRemaining.value > 0) {
				creditsRemaining.value--;
				inputValue.value = '';
			}
			action('submit')();
		};

		return {
			args,
			inputValue,
			creditsRemaining,
			creditsQuota,
			handleSubmit,
			onStop: methods.onStop,
			onFocus: methods.onFocus,
			onBlur: methods.onBlur,
			onUpgradeClick: methods.onUpgradeClick,
		};
	},
	template: `
		<div style="max-width: 600px; margin: 20px;">
			<div style="margin-bottom: 20px; padding: 20px; background: var(--color--background); border-radius: var(--radius);">
				<h3 style="color: var(--color--text--shade-1); margin-bottom: 10px;">Credits Tracking Demo</h3>
				<p style="color: var(--color--text); margin-bottom: 10px;">
					Each message consumes 1 credit. Credits renew at the beginning of next month.
				</p>
				<p style="color: var(--color--text--tint-1); font-size: var(--font-size--sm);">
					Credits remaining: {{ creditsRemaining }} / {{ creditsQuota }}
				</p>
			</div>
			<n8n-prompt-input
				v-bind="args"
				v-model="inputValue"
				:disabled="creditsRemaining === 0"
				:disabled-tooltip="
					creditsRemaining === 0 ? 'No credits remaining. Ask an owner to add credits.' : undefined
				"
				@submit="handleSubmit"
				@stop="onStop"
				@focus="onFocus"
				@blur="onBlur"
			>
				<template #leading>
					<div
						style="display: flex; align-items: center; justify-content: space-between; gap: var(--spacing--2xs); color: var(--color--text--tint-1); font-size: var(--font-size--2xs);"
					>
						<span>
							{{ creditsRemaining === 0 ? 'No credits remaining' : 'Credits remaining' }}
						</span>
						<button
							type="button"
							style="border: none; background: transparent; color: var(--color--primary); padding: 0; cursor: pointer;"
							@click="onUpgradeClick"
						>
							{{ creditsRemaining === 0 ? 'Ask owner' : 'Upgrade' }}
						</button>
					</div>
				</template>
				<template #trailing>
					<div
						style="
							display: flex;
							flex-wrap: wrap;
							gap: var(--spacing--2xs);
							opacity: creditsRemaining === 0 ? 0.6 : 1;
						"
					>
						<button
							v-for="suggestion in args.suggestions"
							:key="suggestion.id"
							type="button"
							:disabled="creditsRemaining === 0"
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
			</n8n-prompt-input>
		</div>
	`,
});

export const CreditsInteractive: StoryFn = CreditsInteractiveTemplate.bind({});
CreditsInteractive.args = {
	placeholder: 'Type a message (uses 1 credit)...',
	creditsQuota: 150,
	creditsRemaining: 2,
	suggestions: workflowSuggestions,
};
CreditsInteractive.storyName = 'Credits Interactive Demo';

const SuggestionsTemplate: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: {
		N8nPromptInput,
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
					<N8nPromptInput
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
