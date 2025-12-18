import type { StoryFn } from '@storybook/vue3-vite';
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
		minLines: {
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
	minLines: 1,
};

export const MultiLine = Template.bind({});
MultiLine.args = {
	placeholder: 'Type your message here...',
	maxLength: 1000,
	minLines: 3,
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
				<h3>Single Line (minLines: 1)</h3>
				<div style="width: 500px; max-width: 100%;">
					<n8n-prompt-input
						:modelValue="val1"
						@update:modelValue="val1 = $event"
						:placeholder="'Single line input...'"
						:min-lines="1"
						:max-length="1000"
					/>
				</div>
			</div>
			<div>
				<h3>Two Lines (minLines: 2)</h3>
				<div style="width: 500px; max-width: 100%;">
					<n8n-prompt-input
						:modelValue="val2"
						@update:modelValue="val2 = $event"
						:placeholder="'Two line input...'"
						:min-lines="2"
						:max-length="1000"
					/>
				</div>
			</div>
			<div>
				<h3>Three Lines (minLines: 3)</h3>
				<div style="width: 500px; max-width: 100%;">
					<n8n-prompt-input
						:modelValue="val3"
						@update:modelValue="val3 = $event"
						:placeholder="'Three line input...'"
						:min-lines="3"
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

// Credit Tracking Stories
export const WithCreditsAndUpgrade: StoryFn = Template.bind({});
WithCreditsAndUpgrade.args = {
	placeholder: 'Type your message here...',
	creditsQuota: 150,
	creditsRemaining: 119,
};
WithCreditsAndUpgrade.storyName = 'With Credits and Upgrade Button';

export const WithCreditsNoUpgrade: StoryFn = Template.bind({});
WithCreditsNoUpgrade.args = {
	placeholder: 'Type your message here...',
	creditsQuota: 150,
	creditsRemaining: 23,
	showAskOwnerTooltip: true,
};
WithCreditsNoUpgrade.storyName = 'With Credits (Shows Ask Admin Tooltip)';

export const LowCredits: StoryFn = Template.bind({});
LowCredits.args = {
	placeholder: 'Type your message here...',
	creditsQuota: 150,
	creditsRemaining: 5,
};
LowCredits.storyName = 'Low Credits Remaining';

export const NoCreditsRemaining: StoryFn = Template.bind({});
NoCreditsRemaining.args = {
	placeholder: 'Type your message here...',
	creditsQuota: 150,
	creditsRemaining: 0,
};
NoCreditsRemaining.storyName = 'No Credits Remaining';

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
				:credits-quota="creditsQuota"
				:credits-remaining="creditsRemaining"
				@submit="handleSubmit"
				@stop="onStop"
				@focus="onFocus"
				@blur="onBlur"
				@upgrade-click="onUpgradeClick"
			/>
		</div>
	`,
});

export const CreditsInteractive: StoryFn = CreditsInteractiveTemplate.bind({});
CreditsInteractive.args = {
	placeholder: 'Type a message (uses 1 credit)...',
	creditsQuota: 150,
	creditsRemaining: 2,
};
CreditsInteractive.storyName = 'Credits Interactive Demo';
