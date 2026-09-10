import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';

import N8nSelect from '../../v2/components/Select/Select.vue';
import N8nButton from '../N8nButton';
import N8nCopyInput from '../N8nCopyInput';
import N8nIcon from '../N8nIcon';
import N8nInput from '../N8nInput';
import N8nSegmentControl from '../N8nSegmentControl';
import N8nText from '../N8nText';
import N8nSetupPanel from './SetupPanel.vue';
import N8nSetupConnection from '../N8nSetupConnection/SetupConnection.vue';

const meta = {
	title: 'Areas/Assistant/SetupPanel',
	component: N8nSetupPanel,
	parameters: { layout: 'centered' },
} satisfies Meta<typeof N8nSetupPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Checklist: Story = {
	args: {
		items: [
			{ id: 'granola', title: 'Granola', completed: true },
			{ id: 'slack', title: 'Slack', subtitle: 'Add connection, channel', completed: false },
			{ id: 'details', title: 'Details', subtitle: 'Add summary length', completed: false },
		],
	},
	render: (args) => ({
		components: { N8nSetupPanel, N8nIcon, N8nInput },
		setup: () => ({ args, active: ref<string>() }),
		template: `
			<div style="width: min(28rem, 90vw); min-height: 75vh; display: flex; flex-direction: column; justify-content: end; gap: var(--spacing--xs)">
				<N8nSetupPanel v-bind="args" v-model:active-item-id="active">
					<template #icon><N8nIcon icon="plug" size="small" /></template>
					<template #detail="{ item }">{{ item.title }}</template>
				</N8nSetupPanel>
				<N8nInput type="textarea" aria-label="Chat" placeholder="Ask anything..." />
			</div>
		`,
	}),
};

type Example = {
	service: string;
	method: 'oauth' | 'key' | 'selfHosted' | 'gateway' | 'details';
	connected?: boolean;
	confirmed?: boolean;
	field?: string;
	custom?: boolean;
	useOwnKey?: boolean;
};

function example(state: Example): Story {
	return {
		args: { items: [] },
		// @ts-expect-error Storybook cannot type generic Select components.
		render: () => ({
			components: {
				N8nSetupPanel,
				N8nSetupConnection,
				N8nButton,
				N8nCopyInput,
				N8nInput,
				N8nIcon,
				N8nSegmentControl,
				N8nText,
				N8nSelect,
			},
			setup() {
				const active = ref<string | undefined>(
					state.method === 'oauth' && !state.connected ? undefined : 'service',
				);
				const connected = ref(state.connected ?? false);
				const confirmed = ref(state.confirmed ?? false);
				const mode = ref(state.useOwnKey ? 'key' : 'credits');
				const key = ref('');
				const clientId = ref('');
				const clientSecret = ref('');
				const fieldValue = ref('suggested');
				const savedField = ref(state.confirmed ? 'suggested' : undefined);
				const completed = computed(
					() =>
						(state.method === 'details' || connected.value) && (!state.field || confirmed.value),
				);
				const items = computed(() => [
					{
						id: 'service',
						title: state.service,
						completed: completed.value,
						hasAction: state.method === 'oauth' && !connected.value,
						subtitle: `Add ${!connected.value && state.method !== 'details' ? 'connection' : state.field}`,
					},
				]);
				const actionLabel = computed(() => {
					if (state.method === 'gateway') return mode.value === 'credits' ? 'Use credits' : 'Save';
					return state.method === 'selfHosted'
						? 'Save and sign in'
						: state.method === 'key'
							? 'Save'
							: 'Connect';
				});
				const actions = computed(() => {
					if (!connected.value && state.method === 'gateway' && mode.value === 'credits') return [];
					if (!connected.value) return [{ id: 'advanced', label: 'Advanced setup' }];
					if (state.method === 'gateway' && mode.value === 'credits')
						return [
							{ id: 'replace', label: 'Use my API key' },
							{ id: 'manage', label: 'Manage Gateway credits' },
						];
					if (state.custom)
						return [
							{ id: 'edit', label: 'Edit credential' },
							{ id: 'switch', label: 'Connect with OAuth instead' },
						];
					return [
						{
							id: 'replace',
							label:
								state.method === 'key' || state.method === 'gateway'
									? 'Replace key'
									: 'Switch account',
						},
						{ id: 'edit', label: 'Edit credential' },
					];
				});
				const value = computed(() => {
					if (state.method === 'gateway' && mode.value === 'credits') return 'Gateway credits';
					if (state.custom || state.method === 'key' || state.method === 'gateway')
						return '••••••••';
					return 'demo@example.com';
				});
				return {
					state,
					active,
					connected,
					confirmed,
					mode,
					key,
					clientId,
					clientSecret,
					fieldValue,
					savedField,
					items,
					actions,
					actionLabel,
					value,
					valueLabel: state.method === 'key' || state.method === 'gateway' ? 'API key' : 'Account',
					actionDisabled: computed(() =>
						state.method === 'selfHosted'
							? !clientId.value || !clientSecret.value
							: (state.method === 'key' || (state.method === 'gateway' && mode.value === 'key')) &&
								!key.value,
					),
					onMenuAction: (id: string) => {
						if (id === 'replace' || id === 'switch') {
							connected.value = false;
							mode.value = 'key';
						}
					},
					modeOptions: [
						{ value: 'credits', label: 'Gateway credits' },
						{ value: 'key', label: 'Use my API key' },
					],
					fieldOptions: [
						{
							value: 'suggested',
							label: state.field === 'channel' ? '#design-team' : 'Suggested value',
						},
						{ value: 'other', label: 'Another value' },
					],
				};
			},
			template: `
				<div style="width: min(28rem, 90vw); min-height: 75vh; display: flex; flex-direction: column; justify-content: end; gap: var(--spacing--xs)">
					<N8nSetupPanel :items="items" v-model:active-item-id="active">
						<template #icon><N8nIcon icon="plug" size="small" /></template>
						<template #action>
							<N8nSetupConnection :connected="false" action-label="Connect" action-variant="subtle"
								:actions="actions" @action="connected = true; active = state.field ? 'service' : undefined" />
						</template>
						<template #detail>
							<div style="display: flex; flex-direction: column; gap: var(--spacing--xs)">
								<N8nSetupConnection
									v-if="state.method !== 'details'"
									:connected="connected" :value="value" :value-label="valueLabel"
									:action-label="actionLabel" :actions="actions"
									:action-disabled="actionDisabled"
									@action="connected = true" @select="onMenuAction"
								>
									<N8nSegmentControl v-if="state.method === 'gateway'" v-model="mode" :options="modeOptions" />
									<template v-if="state.method === 'gateway' && mode === 'credits'">
										<N8nText size="small" style="color: var(--text-color--subtle)">Use Gateway credits without adding an API key.</N8nText>
									</template>
									<template v-if="state.method === 'gateway' && mode === 'credits'" #action-leading>
										<N8nText step="xs">$2.00 left</N8nText>
									</template>
									<label v-if="state.method === 'key' || (state.method === 'gateway' && mode === 'key')">
										<N8nInput v-model="key" size="small" aria-label="API key" placeholder="API key" type="password" autocomplete="new-password" />
									</label>
									<template v-if="state.method === 'selfHosted'">
										<label style="display: flex; flex-direction: column; gap: var(--spacing--3xs); color: var(--text-color--subtle)">
											Redirect URL
											<N8nCopyInput size="small" style="font-family: var(--font-family--monospace); --input--font-size: var(--font-size--2xs)" value="https://example.com/rest/oauth2-credential/callback" />
										</label>
										<N8nInput v-model="clientId" size="small" aria-label="Client ID" placeholder="Client ID" />
										<N8nInput v-model="clientSecret" size="small" aria-label="Client Secret" placeholder="Client Secret" type="password" autocomplete="new-password" />
									</template>
								</N8nSetupConnection>
								<template v-if="state.field && (connected || state.method === 'details')">
									<div style="display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--spacing--2xs); align-items: end">
										<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs)">
											<span>{{ state.field }}</span>
											<N8nSelect v-model="fieldValue" :items="fieldOptions" :aria-label="state.field" />
										</div>
										<N8nButton size="medium" :disabled="savedField === fieldValue" @click="confirmed = true; savedField = fieldValue">{{ confirmed ? 'Update' : 'Confirm' }}</N8nButton>
									</div>
								</template>
							</div>
						</template>
					</N8nSetupPanel>
				<N8nInput type="textarea" aria-label="Chat" placeholder="Ask anything..." />
				</div>
			`,
		}),
	};
}

export const ManagedOAuth = example({ service: 'Granola', method: 'oauth' });
export const ManagedOAuthConnected = example({
	service: 'Granola',
	method: 'oauth',
	connected: true,
});
export const AdvancedSetupConnected = example({
	service: 'Granola',
	method: 'oauth',
	connected: true,
	custom: true,
});
export const ManagedOAuthWithDetails = example({
	service: 'Slack',
	method: 'oauth',
	field: 'channel',
});
export const ConnectedWithDetailsPending = example({
	service: 'Slack',
	method: 'oauth',
	connected: true,
	field: 'channel',
});
export const ServiceComplete = example({
	service: 'Slack',
	method: 'oauth',
	connected: true,
	field: 'channel',
	confirmed: true,
});
export const ApiKey = example({ service: 'Clearbit', method: 'key' });
export const ApiKeyConnected = example({ service: 'Clearbit', method: 'key', connected: true });
export const GatewayCredits = example({ service: 'OpenAI', method: 'gateway' });
export const GatewayOwnKey = example({ service: 'OpenAI', method: 'gateway', useOwnKey: true });
export const GatewayCreditsConnected = example({
	service: 'OpenAI',
	method: 'gateway',
	connected: true,
});
export const GatewayOwnKeyConnected = example({
	service: 'OpenAI',
	method: 'gateway',
	connected: true,
	useOwnKey: true,
});
export const SelfHostedOAuth = example({
	service: 'LinkedIn',
	method: 'selfHosted',
	field: 'Post as',
});
export const SelfHostedDetailsPending = example({
	service: 'LinkedIn',
	method: 'selfHosted',
	connected: true,
	field: 'Post as',
});
export const SelfHostedComplete = example({
	service: 'LinkedIn',
	method: 'selfHosted',
	connected: true,
	field: 'Post as',
	confirmed: true,
});
export const Details = example({ service: 'Details', method: 'details', field: 'Summary length' });
export const DetailsComplete = example({
	service: 'Details',
	method: 'details',
	field: 'Summary length',
	confirmed: true,
});
