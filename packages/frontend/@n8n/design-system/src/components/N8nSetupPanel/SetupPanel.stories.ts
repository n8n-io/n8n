import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { usePreferredReducedMotion, useTimeoutFn } from '@vueuse/core';
import { computed, ref, watch } from 'vue';

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

export const SetupComplete: Story = {
	...Checklist,
	args: {
		items: [
			{ id: 'slack', title: 'Slack', completed: true },
			{ id: 'details', title: 'Details', completed: true },
		],
		status: 'complete',
	},
};

export const Validating: Story = {
	...SetupComplete,
	args: { ...SetupComplete.args, status: 'validating' },
};
export const Executing: Story = {
	...SetupComplete,
	args: { ...SetupComplete.args, status: 'executing' },
};
export const ExecuteUnavailable: Story = {
	...SetupComplete,
	args: { ...SetupComplete.args, executeDisabled: true },
};

type Example = {
	service: string;
	method: 'oauth' | 'key' | 'selfHosted' | 'gateway' | 'details';
	connected?: boolean;
	confirmed?: boolean;
	field?: string;
	custom?: boolean;
	useOwnKey?: boolean;
	/** Show the full completion flow instead of a static state example. */
	interactive?: boolean;
};

function example(state: Example): Story {
	return {
		args: { items: [] },
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
				const menuFeedback = ref('');
				const completed = computed(
					() =>
						(state.method === 'details' || connected.value) && (!state.field || confirmed.value),
				);
				const reducedMotion = usePreferredReducedMotion();
				const { start: returnToChecklist, stop: cancelReturn } = useTimeoutFn(
					() => {
						active.value = undefined;
					},
					computed(() => (reducedMotion.value === 'reduce' ? 0 : 650)),
					{ immediate: false },
				);
				watch([active, fieldValue], cancelReturn);
				function confirmField() {
					confirmed.value = true;
					savedField.value = fieldValue.value;
					if (state.interactive) returnToChecklist();
				}
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
									? 'Create new credential'
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
					menuFeedback,
					confirmField,
					status: computed(() =>
						state.interactive
							? completed.value && savedField.value === fieldValue.value
								? 'complete'
								: 'incomplete'
							: undefined,
					),
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
						menuFeedback.value = actions.value.find((action) => action.id === id)?.label ?? '';
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
					<N8nSetupPanel :items="items" :status="status" v-model:active-item-id="active">
						<template #icon><N8nIcon icon="plug" size="small" /></template>
						<template #action>
								<N8nButton size="small" variant="subtle" @click="connected = true; active = state.field ? 'service' : undefined">Connect</N8nButton>
						</template>
						<template #detail>
								<div style="display: flex; flex-direction: column; gap: var(--spacing--xs)">
									<N8nText v-if="menuFeedback" role="status" size="small">Selected: {{ menuFeedback }}</N8nText>
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
										<N8nButton size="medium" :disabled="savedField === fieldValue" @click="confirmField">{{ confirmed ? 'Update' : 'Confirm' }}</N8nButton>
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
export const StateTransitions = example({
	service: 'Example service',
	method: 'gateway',
	field: 'Notification channel',
	interactive: true,
});
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
