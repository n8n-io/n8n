import type { StoryFn } from '@storybook/vue3-vite';

import N8nCopyInput from './CopyInput.vue';

export default {
	title: 'Core/CopyInput',
	component: N8nCopyInput,
	argTypes: {
		size: {
			control: 'select',
			options: ['mini', 'small', 'medium', 'large', 'xlarge'],
		},
	},
	parameters: {
		docs: {
			description: {
				component:
					'A readonly input with an attached copy button, rendered as one continuous bordered field. ' +
					'Clicking the button writes the full value to the clipboard and morphs the copy icon into a ' +
					'check mark through the blur-swap motion. Use `displayValue` to show a truncated secret ' +
					'while still copying the full value.',
			},
		},
	},
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nCopyInput,
	},
	template: '<n8n-copy-input v-bind="args" />',
});

export const Default = Template.bind({});
Default.args = {
	value: 'n8n_api_3f9d2c1b8a7e6f5d4c3b2a1908f7e6d5c4b3a291',
};

export const TruncatedSecret = Template.bind({});
TruncatedSecret.args = {
	value: 'n8n_api_3f9d2c1b8a7e6f5d4c3b2a1908f7e6d5c4b3a291',
	displayValue: 'n8n_api_3f9d2c1b8a7e...6d5c4b3a291',
};

export const Sizes: StoryFn = () => ({
	components: { N8nCopyInput },
	template: `
		<div style="display: flex; flex-direction: column; gap: 12px; max-width: 420px;">
			<n8n-copy-input value="https://example.n8n.cloud/webhook/abcd-1234" size="mini" />
			<n8n-copy-input value="https://example.n8n.cloud/webhook/abcd-1234" size="small" />
			<n8n-copy-input value="https://example.n8n.cloud/webhook/abcd-1234" size="medium" />
			<n8n-copy-input value="https://example.n8n.cloud/webhook/abcd-1234" size="large" />
			<n8n-copy-input value="https://example.n8n.cloud/webhook/abcd-1234" size="xlarge" />
		</div>
	`,
});
