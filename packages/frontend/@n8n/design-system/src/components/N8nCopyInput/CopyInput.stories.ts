import type { StoryFn } from '@storybook/vue3-vite';
import { computed, onBeforeUnmount, ref } from 'vue';

import N8nCopyInput from './CopyInput.vue';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import N8nInputLabel from '../N8nInputLabel';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';

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
		copyLabel: { control: 'text' },
		copiedLabel: { control: 'text' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'A readonly input with an attached copy button, rendered as one continuous bordered field. ' +
					'Clicking the field selects the whole value; the copy button and Cmd/Ctrl+C both write the ' +
					'full `value` to the clipboard and morph the copy icon into a check mark through the ' +
					'blur-swap motion. Hovering the button shows a tooltip naming the action ("Copy" by ' +
					'default; "Copied to clipboard" while the feedback shows); pass `copyLabel` / ' +
					'`copiedLabel` to name the thing being copied, e.g. "Copy token" (see "Custom Copy Label"). ' +
					'Use `displayValue` to show a truncated secret while still copying the ' +
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

export const CustomCopyLabel = Template.bind({});
CustomCopyLabel.args = {
	label: 'Access token',
	value: 'n8n_mcp_9f1c2d3e4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d',
	copyLabel: 'Copy token',
	copiedLabel: 'Token copied',
};
CustomCopyLabel.parameters = {
	docs: {
		description: {
			story:
				'`copyLabel` and `copiedLabel` replace the default tooltip and accessible name of the copy ' +
				'button. Name the thing being copied when the field sits next to other actions or when ' +
				'several copy fields share a view.',
		},
	},
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

const INITIAL_TOKEN = 'n8n_mcp_9f1c2d3e4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d';
const ROTATED_TOKENS = [
	'n8n_mcp_c7e1a94b0d3f6e28a5c1b7d4f0e9a3c6b2d8e15f',
	'n8n_mcp_1b6d4a90e2c7f5a8d3b1e6c4a9f0d2b7e5c8a31c',
	'n8n_mcp_8f0c2e6a1d4b9e7c3a5f0d8b2e6c1a4d7b9e0f3a',
];
// Long enough to see the loading skeleton. Matches `--duration--slow`.
const ROTATE_DELAY_MS = 1000;

function truncateToken(value: string) {
	return `${value.slice(0, 20)}...${value.slice(-10)}`;
}

export const WithActions: StoryFn = (args) => ({
	setup: () => {
		const token = ref(INITIAL_TOKEN);
		const rotating = ref(false);
		const revealed = ref(false);
		const displayValue = computed(() =>
			revealed.value ? token.value : truncateToken(token.value),
		);
		const isLoading = computed(() => rotating.value || Boolean(args.loading));
		const revealLabel = computed(() => (revealed.value ? 'Hide token' : 'Show token'));
		let nextToken = 0;
		let rotateTimer: ReturnType<typeof setTimeout> | undefined;

		onBeforeUnmount(() => clearTimeout(rotateTimer));

		function rotate() {
			if (isLoading.value || args.disabled) return;

			rotating.value = true;
			clearTimeout(rotateTimer);
			rotateTimer = setTimeout(() => {
				token.value = ROTATED_TOKENS[nextToken % ROTATED_TOKENS.length];
				nextToken += 1;
				rotating.value = false;
			}, ROTATE_DELAY_MS);
		}

		function toggleReveal() {
			if (isLoading.value || args.disabled) return;
			revealed.value = !revealed.value;
		}

		return { args, token, displayValue, isLoading, revealLabel, revealed, rotate, toggleReveal };
	},
	components: { N8nCopyInput, N8nButton, N8nIcon, N8nTooltip },
	template: `
		<div style="max-width: 420px;">
			<n8n-copy-input
				v-bind="args"
				:value="token"
				:display-value="displayValue"
				:loading="isLoading"
			>
				<template #actions>
					<n8n-tooltip content="Rotate token" as-child>
						<n8n-button
							variant="ghost"
							icon-only
							:size="args.size"
							:disabled="isLoading || args.disabled"
							aria-label="Rotate token"
							@click="rotate"
						>
							<template #icon>
								<n8n-icon icon="refresh-cw" size="medium" />
							</template>
						</n8n-button>
					</n8n-tooltip>
					<n8n-tooltip :content="revealLabel" as-child>
						<n8n-button
							variant="ghost"
							icon-only
							:size="args.size"
							:disabled="isLoading || args.disabled"
							:aria-label="revealLabel"
							@click="toggleReveal"
						>
							<template #icon>
								<n8n-icon :icon="revealed ? 'eye-off' : 'eye'" size="medium" />
							</template>
						</n8n-button>
					</n8n-tooltip>
				</template>
			</n8n-copy-input>
		</div>
	`,
});
WithActions.args = {
	label: 'Access token',
	size: 'large',
	copyLabel: 'Copy token',
};
WithActions.parameters = {
	docs: {
		description: {
			story:
				'Extra controls go in the `actions` slot, before the copy button. Each one has a tooltip. ' +
				'The field draws the divider on each control. Do not set a border on the slotted control. ' +
				'Rotate token stands in for a key rotation: the field shows its loading skeleton, then the ' +
				'value is replaced. Show token reveals the full value.',
		},
	},
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
