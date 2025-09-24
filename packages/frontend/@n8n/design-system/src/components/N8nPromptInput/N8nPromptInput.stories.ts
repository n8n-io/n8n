import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nPromptInput from './N8nPromptInput.vue';

export default {
	title: 'Atoms/PromptInput',
	component: N8nPromptInput,
	argTypes: {
		modelValue: {
			control: 'text',
		},
		inputPlaceholder: {
			control: 'text',
		},
		maxInputCharacterLength: {
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
		backgrounds: { default: '--color-background-light' },
	},
};

const methods = {
	onUpdateModelValue: action('update:modelValue'),
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
				v-model="val"
				@update:modelValue="onUpdateModelValue"
				@submit="onSubmit"
				@stop="onStop"
				@focus="onFocus"
				@blur="onBlur"
			/>
		</div>
	`,
	data() {
		return {
			val: this.modelValue || '',
		};
	},
	watch: {
		modelValue(newVal) {
			this.val = newVal;
		},
	},
	methods,
});

export const Default = Template.bind({});
Default.args = {
	inputPlaceholder: 'Type your message here...',
	maxInputCharacterLength: 1000,
};

export const SingleLine = Template.bind({});
SingleLine.args = {
	inputPlaceholder: 'Type your message here...',
	maxInputCharacterLength: 1000,
	minLines: 1,
};

export const MultiLine = Template.bind({});
MultiLine.args = {
	inputPlaceholder: 'Type your message here...',
	maxInputCharacterLength: 1000,
	minLines: 3,
};

export const Streaming = Template.bind({});
Streaming.args = {
	modelValue: 'This is currently being processed...',
	inputPlaceholder: 'Type your message here...',
	streaming: true,
	maxInputCharacterLength: 1000,
};

export const Disabled = Template.bind({});
Disabled.args = {
	inputPlaceholder: 'This input is disabled',
	disabled: true,
	maxInputCharacterLength: 1000,
};

export const WithInitialText = Template.bind({});
WithInitialText.args = {
	modelValue:
		'Hello, this is some initial text that spans multiple lines\nto show how the component handles existing content.',
	inputPlaceholder: 'Type your message here...',
	maxInputCharacterLength: 1000,
};

export const AtCharacterLimit = Template.bind({});
AtCharacterLimit.args = {
	modelValue: 'This message is exactly at the character limit!',
	inputPlaceholder: 'Type your message here...',
	maxInputCharacterLength: 48,
};

export const WithShortLimit = Template.bind({});
WithShortLimit.args = {
	inputPlaceholder: 'Max 50 characters...',
	maxInputCharacterLength: 50,
};

export const WithRefocusAfterSend = Template.bind({});
WithRefocusAfterSend.args = {
	inputPlaceholder: 'Input will refocus after send...',
	maxInputCharacterLength: 1000,
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
					v-model="val"
					:streaming="streaming"
					@update:modelValue="onUpdateModelValue"
					@submit="handleSubmit"
					@stop="handleStop"
					@focus="onFocus"
					@blur="onBlur"
				/>
			</div>
			<div style="padding: 10px; background: #f0f0f0; border-radius: 4px;">
				<p><strong>Current value:</strong> {{ val }}</p>
				<p><strong>Character count:</strong> {{ val.length }} / {{ args.maxInputCharacterLength }}</p>
				<p><strong>Streaming:</strong> {{ streaming }}</p>
				<button @click="streaming = !streaming" style="margin-top: 10px;">
					Toggle Streaming (Current: {{ streaming ? 'ON' : 'OFF' }})
				</button>
			</div>
		</div>
	`,
	data() {
		return {
			val: this.modelValue || '',
			streaming: false,
		};
	},
	watch: {
		modelValue(newVal) {
			this.val = newVal;
		},
	},
	methods: {
		...methods,
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
	inputPlaceholder: 'Type a message and press Enter to send...',
	maxInputCharacterLength: 500,
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
						v-model="val1"
						:input-placeholder="'Single line input...'"
						:min-lines="1"
						:max-input-character-length="1000"
					/>
				</div>
			</div>
			<div>
				<h3>Two Lines (minLines: 2)</h3>
				<div style="width: 500px; max-width: 100%;">
					<n8n-prompt-input
						v-model="val2"
						:input-placeholder="'Two line input...'"
						:min-lines="2"
						:max-input-character-length="1000"
					/>
				</div>
			</div>
			<div>
				<h3>Three Lines (minLines: 3)</h3>
				<div style="width: 500px; max-width: 100%;">
					<n8n-prompt-input
						v-model="val3"
						:input-placeholder="'Three line input...'"
						:min-lines="3"
						:max-input-character-length="1000"
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
