import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';

import N8nSendStopButton from './N8nSendStopButton.vue';

export default {
	title: 'Atoms/SendStopButton',
	component: N8nSendStopButton,
	argTypes: {
		streaming: {
			control: 'boolean',
		},
		disabled: {
			control: 'boolean',
		},
		size: {
			control: {
				type: 'select',
				options: ['mini', 'small', 'medium', 'large'],
			},
		},
	},
	parameters: {
		backgrounds: { default: '--color--background--light-2' },
	},
};

const methods = {
	onSend: action('send'),
	onStop: action('stop'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nSendStopButton,
	},
	template: `
		<div style="display: flex; align-items: center; gap: 20px;">
			<n8n-send-stop-button
				v-bind="args"
				@send="onSend"
				@stop="onStop"
			/>
		</div>
	`,
	methods,
});

export const SendButton = Template.bind({});
SendButton.args = {
	streaming: false,
	disabled: false,
	size: 'small',
};

export const SendButtonDisabled = Template.bind({});
SendButtonDisabled.args = {
	streaming: false,
	disabled: true,
	size: 'small',
};

export const StopButton = Template.bind({});
StopButton.args = {
	streaming: true,
	disabled: false,
	size: 'small',
};

export const SmallSize = Template.bind({});
SmallSize.args = {
	streaming: false,
	disabled: false,
	size: 'small',
};

export const MediumSize = Template.bind({});
MediumSize.args = {
	streaming: false,
	disabled: false,
	size: 'medium',
};

export const LargeSize = Template.bind({});
LargeSize.args = {
	streaming: false,
	disabled: false,
	size: 'large',
};

const AllSizesTemplate: StoryFn = () => ({
	components: {
		N8nSendStopButton,
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: 20px;">
			<div style="display: flex; align-items: center; gap: 20px;">
				<n8n-send-stop-button size="mini" @send="onSend" />
				<span style="color: var(--color--text)">Mini</span>
			</div>
			<div style="display: flex; align-items: center; gap: 20px;">
				<n8n-send-stop-button size="small" @send="onSend" />
				<span style="color: var(--color--text)">Small</span>
			</div>
			<div style="display: flex; align-items: center; gap: 20px;">
				<n8n-send-stop-button size="medium" @send="onSend" />
				<span style="color: var(--color--text)">Medium</span>
			</div>
			<div style="display: flex; align-items: center; gap: 20px;">
				<n8n-send-stop-button size="large" @send="onSend" />
				<span style="color: var(--color--text)">Large</span>
			</div>
		</div>
	`,
	methods,
});

export const AllSizes = AllSizesTemplate.bind({});

const InteractiveTemplate: StoryFn = () => ({
	components: {
		N8nSendStopButton,
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: 30px;">
			<div>
				<h3 style="margin-bottom: 15px; color: var(--color--text--shade-1);">Interactive Demo</h3>
				<div style="display: flex; align-items: center; gap: 20px;">
					<n8n-send-stop-button
						:streaming="streaming"
						:disabled="disabled"
						:size="size"
						@send="handleSend"
						@stop="handleStop"
					/>
					<span style="color: var(--color--text)">
						{{ streaming ? 'Click to stop' : 'Click to send' }}
					</span>
				</div>
			</div>

			<div style="display: flex; flex-direction: column; gap: 10px;">
				<label style="color: var(--color--text);">
					<input type="checkbox" v-model="streaming" />
					Streaming ({{ streaming ? 'ON' : 'OFF' }})
				</label>
				<label style="color: var(--color--text);">
					<input type="checkbox" v-model="disabled" />
					Disabled ({{ disabled ? 'ON' : 'OFF' }})
				</label>
				<label style="color: var(--color--text);">
					Size:
					<select v-model="size" style="margin-left: 10px;">
						<option value="mini">Mini</option>
						<option value="small">Small</option>
						<option value="medium">Medium</option>
						<option value="large">Large</option>
					</select>
				</label>
			</div>

			<div style="padding: 10px; background: var(--color--background--light-3); border-radius: 4px;">
				<p style="color: var(--color--text); margin: 0;">Last action: {{ lastAction }}</p>
			</div>
		</div>
	`,
	data() {
		return {
			streaming: false,
			disabled: false,
			size: 'small' as const,
			lastAction: 'None',
		};
	},
	methods: {
		handleSend() {
			this.lastAction = 'Send clicked';
			// Simulate starting streaming
			this.streaming = true;
			// Auto-stop after 2 seconds for demo
			setTimeout(() => {
				this.streaming = false;
				this.lastAction = 'Auto-stopped after 2s';
			}, 2000);
		},
		handleStop() {
			this.lastAction = 'Stop clicked';
			this.streaming = false;
		},
	},
});

export const Interactive = InteractiveTemplate.bind({});

const StatesTemplate: StoryFn = () => ({
	components: {
		N8nSendStopButton,
	},
	template: `
		<div style="display: grid; grid-template-columns: repeat(2, 200px); gap: 20px;">
			<div style="text-align: center;">
				<n8n-send-stop-button :streaming="false" :disabled="false" />
				<p style="color: var(--color--text); margin-top: 10px;">Send (Enabled)</p>
			</div>
			<div style="text-align: center;">
				<n8n-send-stop-button :streaming="false" :disabled="true" />
				<p style="color: var(--color--text); margin-top: 10px;">Send (Disabled)</p>
			</div>
			<div style="text-align: center;">
				<n8n-send-stop-button :streaming="true" :disabled="false" />
				<p style="color: var(--color--text); margin-top: 10px;">Stop (Streaming)</p>
			</div>
			<div style="text-align: center;">
				<div style="background: var(--color--background--shade-2); padding: 20px; border-radius: 4px;">
					<n8n-send-stop-button :streaming="false" :disabled="false" />
				</div>
				<p style="color: var(--color--text); margin-top: 10px;">On Dark Background</p>
			</div>
		</div>
	`,
});

export const AllStates = StatesTemplate.bind({});

const UsageExampleTemplate: StoryFn = () => ({
	components: {
		N8nSendStopButton,
	},
	template: `
		<div style="width: 400px;">
			<h3 style="margin-bottom: 15px; color: var(--color--text--shade-1);">Chat Input Example</h3>
			<div style="
				display: flex;
				align-items: center;
				gap: 8px;
				padding: 8px;
				background: var(--color--background--light-3);
				border: 1px solid var(--color--foreground);
				border-radius: var(--radius--lg);
			">
				<input
					v-model="message"
					type="text"
					placeholder="Type a message..."
					:disabled="streaming"
					@keydown.enter="handleSend"
					style="
						flex: 1;
						border: none;
						background: transparent;
						outline: none;
						padding: 4px 8px;
						font-size: 14px;
					"
				/>
				<n8n-send-stop-button
					:streaming="streaming"
					:disabled="!message.trim() && !streaming"
					@send="handleSend"
					@stop="handleStop"
				/>
			</div>
			<div v-if="response" style="margin-top: 15px; padding: 10px; background: var(--color--background--light-2); border-radius: 4px;">
				<p style="color: var(--color--text); margin: 0;">{{ response }}</p>
			</div>
		</div>
	`,
	data() {
		return {
			message: '',
			streaming: false,
			response: '',
		};
	},
	methods: {
		handleSend() {
			if (!this.message.trim()) return;

			this.response = 'Processing: "' + this.message + '"...';
			this.streaming = true;
			const msg = this.message;
			this.message = '';

			// Simulate response
			setTimeout(() => {
				this.response = 'Response to: "' + msg + '"';
				this.streaming = false;
			}, 2000);
		},
		handleStop() {
			this.response = 'Stopped!';
			this.streaming = false;
		},
	},
});

export const UsageExample = UsageExampleTemplate.bind({});
