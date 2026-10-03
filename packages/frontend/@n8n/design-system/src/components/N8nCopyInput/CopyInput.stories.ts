import type { StoryFn } from '@storybook/vue3-vite';

import N8nCopyInput from './CopyInput.vue';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import N8nInputLabel from '../N8nInputLabel';
import N8nText from '../N8nText';

export default {
	title: 'Core/CopyInput',
	component: N8nCopyInput,
	argTypes: {
		size: {
			control: 'select',
			options: ['mini', 'small', 'medium', 'large', 'xlarge'],
		},
		disabled: { control: 'boolean' },
		loading: { control: 'boolean' },
		allowCopy: { control: 'boolean' },
		redact: { control: 'boolean' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'A readonly input with an attached copy button, rendered as one continuous bordered field. ' +
					'Clicking the field selects the whole value; the copy button and Cmd/Ctrl+C both write the ' +
					'full `value` to the clipboard and morph the copy icon into a check mark through the ' +
					'blur-swap motion. Use `displayValue` to show a truncated secret while still copying the ' +
					'full value, `redact` to keep it out of session recordings, and the `actions` slot for ' +
					'extra controls next to the copy button. `label` names the field for assistive tech; ' +
					'compose a visible label and hint at the call site (see "With Label And Hint").',
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
	label: 'API key',
	value: 'n8n_api_3f9d2c1b8a7e6f5d4c3b2a1908f7e6d5c4b3a291',
};

export const TruncatedSecret = Template.bind({});
TruncatedSecret.args = {
	label: 'API key',
	value: 'n8n_api_3f9d2c1b8a7e6f5d4c3b2a1908f7e6d5c4b3a291',
	displayValue: 'n8n_api_3f9d2c1b8a7e...6d5c4b3a291',
	redact: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
	label: 'Webhook URL',
	value: 'https://example.n8n.cloud/webhook/abcd-1234',
	disabled: true,
};

export const Loading = Template.bind({});
Loading.args = {
	label: 'Access token',
	value: '',
	loading: true,
};

export const WithoutCopyButton = Template.bind({});
WithoutCopyButton.args = {
	label: 'Entity ID',
	value: 'https://example.n8n.cloud/rest/sso/saml/metadata',
	allowCopy: false,
};

export const WithActions: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { N8nCopyInput, N8nButton, N8nIcon },
	template: `
		<div style="max-width: 420px;">
			<n8n-copy-input v-bind="args">
				<template #actions>
					<n8n-button variant="ghost" icon-only :size="args.size" aria-label="Rotate token">
						<template #icon>
							<n8n-icon icon="refresh-cw" size="medium" />
						</template>
					</n8n-button>
				</template>
			</n8n-copy-input>
		</div>
	`,
});
WithActions.args = {
	label: 'Access token',
	value: 'n8n_mcp_9f1c2d3e4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d',
	displayValue: 'n8n_mcp_9f1c2d3e4a5b...5f6a7b8c9d',
	size: 'large',
};

export const WithLabelAndHint: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { N8nCopyInput, N8nInputLabel, N8nText },
	template: `
		<div style="max-width: 480px; display: flex; flex-direction: column; gap: var(--spacing--2xs);">
			<n8n-input-label label="OAuth Redirect URL" input-name="oauth-redirect-url" :bold="false" size="small">
				<n8n-copy-input v-bind="args" id="oauth-redirect-url" />
			</n8n-input-label>
			<n8n-text size="small" color="text-light">
				In Google Cloud Console, add this URL to the list of authorised redirect URIs.
			</n8n-text>
		</div>
	`,
});
WithLabelAndHint.args = {
	label: 'OAuth Redirect URL',
	value: 'https://example.n8n.cloud/rest/oauth2-credential/callback',
	redact: true,
	size: 'medium',
};

export const Sizes: StoryFn = () => ({
	components: { N8nCopyInput },
	template: `
		<div style="display: flex; flex-direction: column; gap: 12px; max-width: 420px;">
			<n8n-copy-input label="Webhook URL" value="https://example.n8n.cloud/webhook/abcd-1234" size="mini" />
			<n8n-copy-input label="Webhook URL" value="https://example.n8n.cloud/webhook/abcd-1234" size="small" />
			<n8n-copy-input label="Webhook URL" value="https://example.n8n.cloud/webhook/abcd-1234" size="medium" />
			<n8n-copy-input label="Webhook URL" value="https://example.n8n.cloud/webhook/abcd-1234" size="large" />
			<n8n-copy-input label="Webhook URL" value="https://example.n8n.cloud/webhook/abcd-1234" size="xlarge" />
		</div>
	`,
});
