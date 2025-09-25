import type { Meta, StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { ref } from 'vue';

import N8nPromptInput from './N8nPromptInput.vue';

export default {
	title: 'Atoms/PromptInput',
	component: N8nPromptInput,
	argTypes: {
		modelValue: {
			control: 'text',
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
		creditsQuota: {
			control: 'number',
		},
		creditsClaimed: {
			control: 'number',
		},
		onUpgradeClick: {
			action: 'onUpgradeClick',
		},
		showAskOwnerTooltip: {
			control: 'boolean',
		},
	},
	parameters: {
		backgrounds: { default: '--color-background-light' },
	},
} as Meta<typeof N8nPromptInput>;

const methods = {
	onUpdateModelValue: action('update:modelValue'),
	onSubmit: action('submit'),
	onStop: action('stop'),
	onFocus: action('focus'),
	onBlur: action('blur'),
	onUpgradeClick: action('onUpgradeClick'),
};

const Template: StoryFn = (args) => ({
	components: { N8nPromptInput },
	setup() {
		const inputValue = ref(args.modelValue || '');
		return { args, inputValue, ...methods };
	},
	template: `
		<div style="max-width: 600px; margin: 20px;">
			<n8n-prompt-input
				v-bind="args"
				v-model="inputValue"
				@update:modelValue="onUpdateModelValue"
				@submit="onSubmit"
				@stop="onStop"
				@focus="onFocus"
				@blur="onBlur"
				@onUpgradeClick="onUpgradeClick"
			/>
			<div style="margin-top: 20px; color: var(--color-text-base); font-size: var(--font-size-s);">
				Current value: {{ inputValue }}
			</div>
		</div>
	`,
});

export const Default: StoryFn = Template.bind({});
Default.args = {
	placeholder: 'Type your message here...',
	maxLength: 1000,
	maxLinesBeforeScroll: 6,
};

export const WithInitialText: StoryFn = Template.bind({});
WithInitialText.args = {
	modelValue: 'Hello, this is some initial text',
	placeholder: 'Type your message here...',
	maxLength: 1000,
};

export const Streaming: StoryFn = Template.bind({});
Streaming.args = {
	placeholder: 'Streaming in progress...',
	streaming: true,
	maxLength: 1000,
};

export const Disabled: StoryFn = Template.bind({});
Disabled.args = {
	placeholder: 'This input is disabled',
	disabled: true,
	maxLength: 1000,
};

export const LongText: StoryFn = Template.bind({});
LongText.args = {
	modelValue: `This is a very long text that will demonstrate how the component handles multiline input.
When you have multiple lines of text, the component should expand and eventually show a scrollbar.
This helps users write longer messages while maintaining a clean interface.
The component automatically adjusts its height based on the content.
You can continue typing to see how it behaves with even more text.
This is line 6, which should trigger scrolling behavior.
And here's line 7 to show the scroll in action.`,
	placeholder: 'Type your message here...',
	maxLength: 2000,
	maxLinesBeforeScroll: 6,
};

export const AtCharacterLimit: StoryFn = Template.bind({});
AtCharacterLimit.args = {
	modelValue:
		'This text is exactly at the character limit. Try typing more characters to see the warning.',
	placeholder: 'Type your message here...',
	maxLength: 100,
};

export const CustomMaxLines: StoryFn = Template.bind({});
CustomMaxLines.args = {
	placeholder: 'Type multiple lines (max 3 before scroll)',
	maxLength: 1000,
	maxLinesBeforeScroll: 3,
};

export const SmallCharacterLimit: StoryFn = Template.bind({});
SmallCharacterLimit.args = {
	placeholder: 'Short message only (50 chars max)',
	maxLength: 50,
};

const InteractiveTemplate: StoryFn = (args) => ({
	components: { N8nPromptInput },
	setup() {
		const inputValue = ref('');
		const isStreaming = ref(false);
		const messages = ref<string[]>([]);

		const handleSubmit = () => {
			if (inputValue.value.trim()) {
				messages.value.push(inputValue.value);
				inputValue.value = '';
				isStreaming.value = true;

				// Simulate streaming response
				setTimeout(() => {
					isStreaming.value = false;
				}, 2000);
			}
			action('submit')();
		};

		const handleStop = () => {
			isStreaming.value = false;
			action('stop')();
		};

		return {
			args,
			inputValue,
			isStreaming,
			messages,
			handleSubmit,
			handleStop,
			onFocus: methods.onFocus,
			onBlur: methods.onBlur,
		};
	},
	template: `
		<div style="max-width: 600px; margin: 20px;">
			<div style="margin-bottom: 20px; padding: 20px; background: var(--color-background-base); border-radius: var(--border-radius-base); min-height: 200px;">
				<div v-if="messages.length === 0" style="color: var(--color-text-light); font-size: var(--font-size-s);">
					Messages will appear here...
				</div>
				<div v-for="(message, index) in messages" :key="index" style="margin-bottom: 10px; padding: 10px; background: var(--color-background-xlight); border-radius: var(--border-radius-base); color: var(--color-text-dark); font-size: var(--font-size-s);">
					{{ message }}
				</div>
				<div v-if="isStreaming" style="color: var(--color-text-light); font-style: italic; font-size: var(--font-size-s);">
					AI is responding...
				</div>
			</div>
			<n8n-prompt-input
				v-bind="args"
				v-model="inputValue"
				:streaming="isStreaming"
				@submit="handleSubmit"
				@stop="handleStop"
				@focus="onFocus"
				@blur="onBlur"
			/>
		</div>
	`,
});

export const Interactive: StoryFn = InteractiveTemplate.bind({});
Interactive.args = {
	placeholder: 'Type a message and press Enter to send...',
	maxLength: 500,
	maxLinesBeforeScroll: 6,
};
Interactive.storyName = 'Interactive Demo';

const AllStatesTemplate: StoryFn = () => ({
	components: { N8nPromptInput },
	template: `
		<div style="max-width: 600px; margin: 20px;">
			<div style="margin-bottom: 30px;">
				<h3 style="color: var(--color-text-dark); margin-bottom: 10px; font-size: var(--font-size-m);">Default State</h3>
				<n8n-prompt-input placeholder="Default state..." />
			</div>

			<div style="margin-bottom: 30px;">
				<h3 style="color: var(--color-text-dark); margin-bottom: 10px; font-size: var(--font-size-m);">With Text</h3>
				<n8n-prompt-input model-value="Some text content" placeholder="With text..." />
			</div>

			<div style="margin-bottom: 30px;">
				<h3 style="color: var(--color-text-dark); margin-bottom: 10px; font-size: var(--font-size-m);">Multiline Text</h3>
				<n8n-prompt-input
					model-value="Line 1\nLine 2\nLine 3"
					placeholder="Multiline..."
				/>
			</div>

			<div style="margin-bottom: 30px;">
				<h3 style="color: var(--color-text-dark); margin-bottom: 10px; font-size: var(--font-size-m);">Streaming State</h3>
				<n8n-prompt-input
					model-value="Message being processed..."
					placeholder="Streaming..."
					:streaming="true"
				/>
			</div>

			<div style="margin-bottom: 30px;">
				<h3 style="color: var(--color-text-dark); margin-bottom: 10px; font-size: var(--font-size-m);">Disabled State</h3>
				<n8n-prompt-input
					placeholder="Disabled input..."
					:disabled="true"
				/>
			</div>

			<div style="margin-bottom: 30px;">
				<h3 style="color: var(--color-text-dark); margin-bottom: 10px; font-size: var(--font-size-m);">At Character Limit</h3>
				<n8n-prompt-input
					model-value="This text has reached the maximum character limit!"
					placeholder="Limited to 50 chars..."
					:max-length="50"
				/>
			</div>
		</div>
	`,
});

// Credit Tracking Stories
export const WithCreditsAndUpgrade: StoryFn = Template.bind({});
WithCreditsAndUpgrade.args = {
	placeholder: 'Type your message here...',
	creditsQuota: 150,
	creditsClaimed: 31,
	onUpgradeClick: () => {
		action('onUpgradeClick')('Opening n8n pricing page');
		window.open(
			'https://n8n.io/pricing?utm_source=storybook&utm_campaign=ai-builder-credits',
			'_blank',
		);
	},
};
WithCreditsAndUpgrade.storyName = 'With Credits and Upgrade Button';

export const WithCreditsNoUpgrade: StoryFn = Template.bind({});
WithCreditsNoUpgrade.args = {
	placeholder: 'Type your message here...',
	creditsQuota: 150,
	creditsClaimed: 127,
	onUpgradeClick: () => {
		action('onUpgradeClick')('Opening n8n pricing page (non-owner)');
		window.open(
			'https://n8n.io/pricing?utm_source=storybook&utm_campaign=ai-builder-credits',
			'_blank',
		);
	},
	showAskOwnerTooltip: true,
};
WithCreditsNoUpgrade.storyName = 'With Credits (Shows Ask Admin Tooltip)';

export const LowCredits: StoryFn = Template.bind({});
LowCredits.args = {
	placeholder: 'Type your message here...',
	creditsQuota: 150,
	creditsClaimed: 145,
	onUpgradeClick: () => {
		action('onUpgradeClick')('Opening n8n pricing page (low credits)');
		window.open(
			'https://n8n.io/pricing?utm_source=storybook&utm_campaign=ai-builder-credits',
			'_blank',
		);
	},
};
LowCredits.storyName = 'Low Credits Remaining';

export const NoCreditsRemaining: StoryFn = Template.bind({});
NoCreditsRemaining.args = {
	placeholder: 'Type your message here...',
	creditsQuota: 150,
	creditsClaimed: 150,
	onUpgradeClick: () => {
		action('onUpgradeClick')('Opening n8n pricing page (no credits)');
		window.open(
			'https://n8n.io/pricing?utm_source=storybook&utm_campaign=ai-builder-credits',
			'_blank',
		);
	},
};
NoCreditsRemaining.storyName = 'No Credits Remaining';

const CreditsInteractiveTemplate: StoryFn = (args) => ({
	components: { N8nPromptInput },
	setup() {
		const inputValue = ref('');
		const creditsClaimed = ref(args.creditsClaimed || 0);
		const creditsQuota = ref(args.creditsQuota || 150);

		const handleSubmit = () => {
			if (inputValue.value.trim() && creditsClaimed.value < creditsQuota.value) {
				creditsClaimed.value++;
				inputValue.value = '';
			}
			action('submit')();
		};

		return {
			args,
			inputValue,
			creditsClaimed,
			creditsQuota,
			handleSubmit,
			onStop: methods.onStop,
			onFocus: methods.onFocus,
			onBlur: methods.onBlur,
			onUpgradeClick: args.onUpgradeClick || methods.onUpgradeClick,
		};
	},
	template: `
		<div style="max-width: 600px; margin: 20px;">
			<div style="margin-bottom: 20px; padding: 20px; background: var(--color-background-base); border-radius: var(--border-radius-base);">
				<h3 style="color: var(--color-text-dark); margin-bottom: 10px;">Credits Tracking Demo</h3>
				<p style="color: var(--color-text-base); margin-bottom: 10px;">
					Each message consumes 1 credit. Credits renew at the beginning of next month.
				</p>
				<p style="color: var(--color-text-light); font-size: var(--font-size-s);">
					Credits used: {{ creditsClaimed }} / {{ creditsQuota }}
				</p>
			</div>
			<n8n-prompt-input
				v-bind="args"
				v-model="inputValue"
				:credits-quota="creditsQuota"
				:credits-claimed="creditsClaimed"
				@submit="handleSubmit"
				@stop="onStop"
				@focus="onFocus"
				@blur="onBlur"
				@onUpgradeClick="onUpgradeClick"
			/>
		</div>
	`,
});

export const CreditsInteractive: StoryFn = CreditsInteractiveTemplate.bind({});
CreditsInteractive.args = {
	placeholder: 'Type a message (uses 1 credit)...',
	creditsQuota: 150,
	creditsClaimed: 148,
	onUpgradeClick: () => {
		action('onUpgradeClick')('Opening n8n pricing page (interactive demo)');
		window.open(
			'https://n8n.io/pricing?utm_source=storybook&utm_campaign=ai-builder-credits',
			'_blank',
		);
	},
};
CreditsInteractive.storyName = 'Credits Interactive Demo';
