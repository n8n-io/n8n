<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { N8nButton, N8nCard, N8nDialog, N8nIcon, N8nText } from '@n8n/design-system';
import N8nSelect from '@n8n/design-system/components/N8nSelect';
import N8nOption from '@n8n/design-system/components/N8nOption';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { makeRestApiRequest, ResponseError } from '@n8n/rest-api-client';
import {
	connectIntegration,
	disconnectIntegration,
	getIntegrationStatus,
} from '../composables/useAgentApi';
const props = defineProps<{
	projectId: string;
	agentId: string;
	agentName: string;
}>();

const emit = defineEmits<{
	'update:connected-triggers': [triggers: string[]];
	'trigger-added': [payload: { triggerType: string; triggers: string[] }];
}>();

const rootStore = useRootStore();
const uiStore = useUIStore();

interface CredentialOption {
	id: string;
	name: string;
}

interface IntegrationConfig {
	type: string;
	label: string;
	icon: string;
	description: string;
	connectedDescription: string;
	credentialTypes: string[];
	noCredentialsMessage: string;
}

const integrationConfigs: IntegrationConfig[] = [
	{
		type: 'slack',
		label: 'Slack',
		icon: 'hashtag',
		description:
			'Connect a Slack bot credential to allow this agent to receive and respond to Slack messages.',
		connectedDescription: 'Your agent is connected to Slack and can receive messages.',
		credentialTypes: ['slackApi', 'slackOAuth2Api'],
		noCredentialsMessage: 'No Slack credentials found.',
	},
	{
		type: 'telegram',
		label: 'Telegram',
		icon: 'paper-plane',
		description:
			'Connect a Telegram bot credential to allow this agent to receive and respond to Telegram messages.',
		connectedDescription: 'Your agent is connected to Telegram and can receive messages.',
		credentialTypes: ['telegramApi'],
		noCredentialsMessage: 'No Telegram API credentials found.',
	},
	{
		type: 'linear',
		label: 'Linear',
		icon: 'list-checks',
		description:
			'Connect a Linear API credential to let this agent respond to comments in Linear issues. ' +
			'Point a Linear webhook at the URL below and paste its signing secret into the credential',
		connectedDescription: 'Your agent is connected to Linear and can reply to @-mentions',
		credentialTypes: ['linearApi', 'linearOAuth2Api'],
		noCredentialsMessage: 'No Linear credentials found.',
	},
];

// Per-integration state
const statuses = ref<Record<string, string>>({});
const connectedCredentials = ref<Record<string, string>>({});
const selectedCredentials = ref<Record<string, string>>({});
const credentialsByType = ref<Record<string, CredentialOption[]>>({});
const loadingMap = ref<Record<string, boolean>>({});
const errorMessages = ref<Record<string, string>>({});
const errorIsConflict = ref<Record<string, boolean>>({});
const credentialsLoading = ref(false);
const copied = ref(false);
const showManifest = ref(false);

function isConnected(type: string): boolean {
	return statuses.value[type] === 'connected';
}

function isLoading(type: string): boolean {
	return loadingMap.value[type] ?? false;
}

function hasCredentials(type: string): boolean {
	return (credentialsByType.value[type] ?? []).length > 0;
}

function hasError(type: string): boolean {
	return (errorMessages.value[type] ?? '').length > 0;
}

function webhookUrlFor(platform: string): string {
	const base = rootStore.urlBaseEditor;
	return `${base}rest/projects/${props.projectId}/agents/v2/${props.agentId}/webhooks/${platform}`;
}

const linearCopied = ref(false);

async function copyLinearWebhookUrl() {
	await navigator.clipboard.writeText(webhookUrlFor('linear'));
	linearCopied.value = true;
	setTimeout(() => {
		linearCopied.value = false;
	}, 2000);
}

const oauthCallbackUrl = computed(
	() => (rootStore.OAuthCallbackUrls as { oauth2?: string }).oauth2 ?? '',
);

const slackAppManifest = computed(() =>
	JSON.stringify(
		{
			display_information: {
				name: props.agentName || 'n8n Agent',
			},
			features: {
				app_home: {
					home_tab_enabled: true,
					messages_tab_enabled: false,
					messages_tab_read_only_enabled: false,
				},
				bot_user: {
					display_name: props.agentName || 'n8n Agent',
					always_online: true,
				},
			},
			oauth_config: {
				redirect_urls: [oauthCallbackUrl.value],
				scopes: {
					bot: [
						'app_mentions:read',
						'assistant:write',
						'channels:join',
						'channels:manage',
						'channels:read',
						'chat:write',
						'chat:write.customize',
						'files:read',
						'files:write',
						'im:history',
						'im:read',
						'im:write',
						'mpim:read',
						'mpim:write',
						'users:read',
					],
				},
				pkce_enabled: false,
			},
			settings: {
				event_subscriptions: {
					request_url: webhookUrlFor('slack'),
					bot_events: ['app_mention', 'assistant_thread_context_changed', 'message.im'],
				},
				interactivity: {
					is_enabled: true,
					request_url: webhookUrlFor('slack'),
				},
				org_deploy_enabled: false,
				socket_mode_enabled: false,
				token_rotation_enabled: false,
			},
		},
		null,
		2,
	),
);

async function copyManifest() {
	await navigator.clipboard.writeText(slackAppManifest.value);
	copied.value = true;
	setTimeout(() => {
		copied.value = false;
	}, 2000);
}

function computeConnectedTriggers(): string[] {
	return Object.keys(statuses.value)
		.filter((t) => statuses.value[t] === 'connected')
		.sort();
}

function emitConnectedTriggers() {
	emit('update:connected-triggers', computeConnectedTriggers());
}

async function fetchStatus() {
	try {
		const result = await getIntegrationStatus(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		for (const config of integrationConfigs) {
			statuses.value[config.type] = 'disconnected';
			connectedCredentials.value[config.type] = '';
		}
		for (const integration of result.integrations ?? []) {
			statuses.value[integration.type] = 'connected';
			connectedCredentials.value[integration.type] = integration.credentialId;
		}
	} catch {
		for (const config of integrationConfigs) {
			statuses.value[config.type] = 'disconnected';
			connectedCredentials.value[config.type] = '';
		}
	}
	emitConnectedTriggers();
}

async function fetchCredentials() {
	credentialsLoading.value = true;
	try {
		const allCredentials = await makeRestApiRequest<
			Array<{ id: string; name: string; type: string }>
		>(rootStore.restApiContext, 'GET', '/credentials');

		for (const config of integrationConfigs) {
			credentialsByType.value[config.type] = allCredentials
				.filter((c) => config.credentialTypes.includes(c.type))
				.map((c) => ({ id: c.id, name: c.name }));
		}
	} catch {
		for (const config of integrationConfigs) {
			credentialsByType.value[config.type] = [];
		}
	} finally {
		credentialsLoading.value = false;
	}
}

async function onConnect(type: string) {
	const credId = selectedCredentials.value[type];
	if (!credId) return;
	loadingMap.value[type] = true;
	errorMessages.value[type] = '';
	errorIsConflict.value[type] = false;
	try {
		await connectIntegration(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			type,
			credId,
		);

		// Optimistically mark as connected before fetchStatus() reconciles
		// so the telemetry payload reflects the just-connected trigger.
		statuses.value[type] = 'connected';
		const triggers = computeConnectedTriggers();
		emit('trigger-added', { triggerType: type, triggers });

		await fetchStatus();
	} catch (e: unknown) {
		const msg =
			e instanceof Error
				? e.message
				: typeof e === 'object' && e !== null && 'message' in e
					? String((e as { message: unknown }).message)
					: 'Failed to connect';
		errorMessages.value[type] = msg;
		errorIsConflict.value[type] = e instanceof ResponseError && e.httpStatusCode === 409;
	} finally {
		loadingMap.value[type] = false;
	}
}

async function onDisconnect(type: string) {
	const credId = connectedCredentials.value[type] || selectedCredentials.value[type];
	if (!credId) return;
	loadingMap.value[type] = true;
	try {
		await disconnectIntegration(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			type,
			credId,
		);
		await fetchStatus();
		selectedCredentials.value[type] = '';
	} finally {
		loadingMap.value[type] = false;
	}
}

function onCreateCredential(type: string) {
	const config = integrationConfigs.find((c) => c.type === type);
	if (config) {
		uiStore.openNewCredential(config.credentialTypes[0]);
	}
}

function onEditCredential(type: string) {
	const credId = selectedCredentials.value[type];
	if (credId) {
		uiStore.openExistingCredential(credId);
	}
}

// Re-fetch credentials when the credential edit modal closes
const credentialModalOpen = computed(
	() => uiStore.isModalActiveById[CREDENTIAL_EDIT_MODAL_KEY] ?? false,
);

watch(credentialModalOpen, (isOpen, wasOpen) => {
	if (wasOpen && !isOpen) {
		void fetchCredentials();
	}
});

onMounted(async () => {
	await Promise.all([fetchStatus(), fetchCredentials()]);
});
</script>

<template>
	<div :class="$style.panel">
		<N8nCard v-for="config in integrationConfigs" :key="config.type" :class="$style.card">
			<template #header>
				<div :class="$style.cardHeader">
					<div :class="$style.statusRow">
						<span
							:class="[
								$style.statusDot,
								isConnected(config.type) ? $style.statusConnected : $style.statusDisconnected,
							]"
						/>
						<N8nText bold>{{ config.label }}</N8nText>
						<N8nText :class="$style.statusLabel" size="small">
							{{ isConnected(config.type) ? 'Connected' : 'Disconnected' }}
						</N8nText>
					</div>
				</div>
			</template>

			<div :class="$style.cardBody">
				<N8nText :class="$style.description" size="small">
					{{ config.description }}
				</N8nText>

				<!-- Linear webhook URL — shown regardless of connection state so users can
				     configure Linear *before* creating a credential (the signing secret is
				     only revealed after the webhook is saved). -->
				<div v-if="config.type === 'linear'" :class="$style.webhookRow">
					<input
						:value="webhookUrlFor('linear')"
						readonly
						:class="$style.webhookInput"
						:data-testid="`${config.type}-webhook-url`"
						@focus="($event.target as HTMLInputElement).select()"
					/>
					<N8nButton
						variant="outline"
						size="small"
						:data-testid="`${config.type}-copy-webhook-url`"
						@click="copyLinearWebhookUrl"
					>
						<N8nIcon :icon="linearCopied ? 'check' : 'copy'" :size="14" />
						{{ linearCopied ? 'Copied' : 'Copy' }}
					</N8nButton>
				</div>

				<div v-if="!isConnected(config.type)" :class="$style.connectForm">
					<template v-if="hasCredentials(config.type)">
						<label :class="$style.label">
							<N8nText size="small" bold>{{ config.label }} Credential</N8nText>
						</label>
						<div :class="$style.selectRow">
							<N8nSelect
								v-model="selectedCredentials[config.type]"
								:class="$style.select"
								placeholder="Select a credential..."
								:loading="credentialsLoading"
								:disabled="isLoading(config.type)"
								size="medium"
								:data-testid="`${config.type}-credential-select`"
							>
								<N8nOption
									v-for="cred in credentialsByType[config.type] ?? []"
									:key="cred.id"
									:value="cred.id"
									:label="cred.name"
								/>
							</N8nSelect>
							<N8nButton
								v-if="selectedCredentials[config.type]"
								type="tertiary"
								size="small"
								icon="pen"
								aria-label="Edit credential"
								:data-testid="`${config.type}-edit-credential`"
								@click="onEditCredential(config.type)"
							/>
						</div>
					</template>

					<div v-else-if="!credentialsLoading" :class="$style.emptyCredentials">
						<N8nText size="small">{{ config.noCredentialsMessage }}</N8nText>
						<N8nButton
							size="small"
							:data-testid="`${config.type}-create-credential`"
							@click="onCreateCredential(config.type)"
						>
							<N8nIcon icon="plus" :size="14" />
							Add {{ config.label }} credential
						</N8nButton>
					</div>

					<N8nText v-if="hasError(config.type)" :class="$style.errorText" size="small">
						{{ errorMessages[config.type] }}
						<a
							v-if="selectedCredentials[config.type] && !errorIsConflict[config.type]"
							:class="$style.link"
							href="#"
							@click.prevent="onEditCredential(config.type)"
							>Edit credential</a
						>
					</N8nText>

					<div :class="$style.actions">
						<N8nButton
							:disabled="!selectedCredentials[config.type] || isLoading(config.type)"
							:loading="isLoading(config.type)"
							size="small"
							:data-testid="`${config.type}-connect-button`"
							@click="onConnect(config.type)"
						>
							<N8nIcon icon="plug" :size="14" />
							Connect
						</N8nButton>
						<N8nButton
							v-if="hasCredentials(config.type)"
							type="tertiary"
							size="small"
							:data-testid="`${config.type}-create-another-credential`"
							@click="onCreateCredential(config.type)"
						>
							<N8nIcon icon="plus" :size="14" />
							New credential
						</N8nButton>
					</div>
				</div>

				<div v-else :class="$style.connectedSection">
					<N8nText size="small">
						{{ config.connectedDescription }}
					</N8nText>

					<!-- Slack App Manifest (Slack only) -->
					<template v-if="config.type === 'slack'">
						<N8nText :class="$style.manifestHint" size="small">
							Copy the app manifest and paste it into your Slack app's settings to configure events,
							scopes, and interactivity.
							<a :class="$style.link" href="#" @click.prevent="showManifest = true">View JSON</a>
						</N8nText>
						<N8nButton variant="outline" size="small" @click="copyManifest">
							<N8nIcon :icon="copied ? 'check' : 'copy'" :size="14" />
							{{ copied ? 'Copied' : 'Copy manifest' }}
						</N8nButton>
					</template>

					<N8nButton
						:class="$style.actionButton"
						variant="destructive"
						:loading="isLoading(config.type)"
						size="small"
						:data-testid="`${config.type}-disconnect-button`"
						@click="onDisconnect(config.type)"
					>
						<N8nIcon icon="unlink" :size="14" />
						Disconnect
					</N8nButton>

					<!-- Manifest modal (Slack only) -->
					<N8nDialog
						v-if="config.type === 'slack'"
						:open="showManifest"
						header="Slack App Manifest"
						size="medium"
						@update:open="showManifest = $event"
					>
						<pre :class="$style.manifestCode">{{ slackAppManifest }}</pre>
					</N8nDialog>
				</div>
			</div>
		</N8nCard>
	</div>
</template>

<style module>
.panel {
	overflow-y: auto;
}

.card {
	width: 100%;
}

.card + .card {
	margin-top: var(--spacing--sm);
}

.cardHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.statusRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.statusDot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
}

.statusConnected {
	background-color: var(--color--success);
}

.statusDisconnected {
	background-color: var(--color--foreground--shade-1);
}

.statusLabel {
	color: var(--color--text--tint-2);
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.description {
	color: var(--color--text--tint-1);
}

.connectForm {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.label {
	display: block;
}

.selectRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.select {
	flex: 1;
	min-width: 0;
}

.emptyCredentials {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	align-items: flex-start;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.connectedSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.manifestHint {
	color: var(--color--text--tint-1);
}

.manifestCode {
	margin: 0;
	padding: var(--spacing--xs);
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	overflow-x: auto;
	max-height: 300px;
	overflow-y: auto;
	white-space: pre;
	font-family: monospace;
	color: var(--color--text);
}

.errorText {
	color: var(--color--danger);
}

.link {
	color: var(--color--primary);
	text-decoration: underline;
	cursor: pointer;
	margin-left: var(--spacing--4xs);
}

.actionButton {
	align-self: flex-start;
}

.webhookRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.webhookInput {
	flex: 1;
	min-width: 0;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	background-color: var(--color--foreground--tint-2);
	border: var(--border);
	border-radius: var(--radius);
	font-family: monospace;
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	text-overflow: ellipsis;
	white-space: nowrap;
	overflow: hidden;
}

.webhookInput:focus {
	outline: none;
	border-color: var(--color--primary);
}
</style>
