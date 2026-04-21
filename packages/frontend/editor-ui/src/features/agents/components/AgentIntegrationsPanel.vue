<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { N8nButton, N8nCard, N8nDialog, N8nIcon, N8nText } from '@n8n/design-system';
import N8nSelect from '@n8n/design-system/components/N8nSelect';
import N8nOption from '@n8n/design-system/components/N8nOption';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { connectSlack, disconnectSlack, getSlackStatus } from '../composables/useAgentApi';

const props = defineProps<{
	projectId: string;
	agentId: string;
	agentName: string;
}>();

const rootStore = useRootStore();
const uiStore = useUIStore();

interface CredentialOption {
	id: string;
	name: string;
}

const slackStatus = ref('disconnected');
const connectedCredentialId = ref('');
const selectedCredentialId = ref('');
const loading = ref(false);
const errorMessage = ref('');
const credentials = ref<CredentialOption[]>([]);
const credentialsLoading = ref(false);
const copied = ref(false);
const showManifest = ref(false);

const hasCredentials = computed(() => credentials.value.length > 0);
const hasError = computed(() => errorMessage.value.length > 0);

const webhookUrl = computed(() => {
	const base = rootStore.urlBaseEditor;
	return `${base}rest/projects/${props.projectId}/agents/v2/${props.agentId}/webhooks/slack`;
});

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
						'channels:history',
						'channels:join',
						'channels:manage',
						'channels:read',
						'chat:write',
						'chat:write.customize',
						'files:read',
						'files:write',
						'groups:read',
						'im:history',
						'im:read',
						'im:write',
						'mpim:read',
						'mpim:write',
						'search:read.public',
						'users:read',
						'users:read.email',
					],
				},
				pkce_enabled: false,
			},
			settings: {
				event_subscriptions: {
					request_url: webhookUrl.value,
					bot_events: ['app_mention', 'assistant_thread_context_changed', 'message.im'],
				},
				interactivity: {
					is_enabled: true,
					request_url: webhookUrl.value,
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

async function fetchSlackStatus() {
	try {
		const result = await getSlackStatus(rootStore.restApiContext, props.projectId, props.agentId);
		slackStatus.value = result.status;
		const slackIntegration = (result.integrations ?? []).find(
			(i: { type: string }) => i.type === 'slack',
		);
		if (slackIntegration) {
			connectedCredentialId.value = slackIntegration.credentialId;
		} else {
			connectedCredentialId.value = '';
		}
	} catch {
		slackStatus.value = 'disconnected';
		connectedCredentialId.value = '';
	}
}

async function fetchCredentials() {
	credentialsLoading.value = true;
	try {
		const allCredentials = await makeRestApiRequest<
			Array<{ id: string; name: string; type: string }>
		>(rootStore.restApiContext, 'GET', '/credentials');
		credentials.value = allCredentials
			.filter((c) => c.type === 'slackApi' || c.type === 'slackOAuth2Api')
			.map((c) => ({ id: c.id, name: c.name }));
	} catch {
		credentials.value = [];
	} finally {
		credentialsLoading.value = false;
	}
}

async function onConnect() {
	if (!selectedCredentialId.value) return;
	loading.value = true;
	errorMessage.value = '';
	try {
		await connectSlack(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			selectedCredentialId.value,
		);
		await fetchSlackStatus();
	} catch (e: unknown) {
		const msg =
			e instanceof Error
				? e.message
				: typeof e === 'object' && e !== null && 'message' in e
					? String((e as { message: unknown }).message)
					: 'Failed to connect';
		errorMessage.value = msg;
	} finally {
		loading.value = false;
	}
}

async function onDisconnect() {
	const credId = connectedCredentialId.value || selectedCredentialId.value;
	if (!credId) return;
	loading.value = true;
	try {
		await disconnectSlack(rootStore.restApiContext, props.projectId, props.agentId, credId);
		await fetchSlackStatus();
		selectedCredentialId.value = '';
	} finally {
		loading.value = false;
	}
}

function onCreateCredential() {
	uiStore.openNewCredential('slackApi');
}

function onEditCredential() {
	if (selectedCredentialId.value) {
		uiStore.openExistingCredential(selectedCredentialId.value);
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
	await Promise.all([fetchSlackStatus(), fetchCredentials()]);
});
</script>

<template>
	<div :class="$style.panel">
		<N8nCard :class="$style.card">
			<template #header>
				<div :class="$style.cardHeader">
					<div :class="$style.statusRow">
						<span
							:class="[
								$style.statusDot,
								slackStatus === 'connected' ? $style.statusConnected : $style.statusDisconnected,
							]"
						/>
						<N8nText bold>Slack</N8nText>
						<N8nText :class="$style.statusLabel" size="small">
							{{ slackStatus === 'connected' ? 'Connected' : 'Disconnected' }}
						</N8nText>
					</div>
				</div>
			</template>

			<div :class="$style.cardBody">
				<N8nText :class="$style.description" size="small">
					Connect a Slack bot credential to allow this agent to receive and respond to Slack
					messages.
				</N8nText>

				<div v-if="slackStatus !== 'connected'" :class="$style.connectForm">
					<template v-if="hasCredentials">
						<label :class="$style.label">
							<N8nText size="small" bold>Slack Credential</N8nText>
						</label>
						<div :class="$style.selectRow">
							<N8nSelect
								v-model="selectedCredentialId"
								:class="$style.select"
								placeholder="Select a credential..."
								:loading="credentialsLoading"
								:disabled="loading"
								size="medium"
								data-testid="slack-credential-select"
							>
								<N8nOption
									v-for="cred in credentials"
									:key="cred.id"
									:value="cred.id"
									:label="cred.name"
								/>
							</N8nSelect>
							<N8nButton
								v-if="selectedCredentialId"
								type="tertiary"
								size="small"
								icon="pen"
								aria-label="Edit credential"
								data-testid="slack-edit-credential"
								@click="onEditCredential"
							/>
						</div>
					</template>

					<div v-else-if="!credentialsLoading" :class="$style.emptyCredentials">
						<N8nText size="small"> No Slack credentials found. </N8nText>
						<N8nButton
							size="small"
							data-testid="slack-create-credential"
							@click="onCreateCredential"
						>
							<N8nIcon icon="plus" :size="14" />
							Add Slack credential
						</N8nButton>
					</div>

					<N8nText v-if="hasError" :class="$style.errorText" size="small">
						{{ errorMessage }}
						<a
							v-if="selectedCredentialId"
							:class="$style.link"
							href="#"
							@click.prevent="onEditCredential"
							>Edit credential</a
						>
					</N8nText>

					<div :class="$style.actions">
						<N8nButton
							:disabled="!selectedCredentialId || loading"
							:loading="loading"
							size="small"
							data-testid="slack-connect-button"
							@click="onConnect"
						>
							<N8nIcon icon="plug" :size="14" />
							Connect
						</N8nButton>
						<N8nButton
							v-if="hasCredentials"
							type="tertiary"
							size="small"
							data-testid="slack-create-another-credential"
							@click="onCreateCredential"
						>
							<N8nIcon icon="plus" :size="14" />
							New credential
						</N8nButton>
					</div>
				</div>

				<div v-else :class="$style.connectedSection">
					<N8nText size="small">
						Your agent is connected to Slack and can receive messages.
					</N8nText>

					<!-- Slack App Manifest -->
					<N8nText :class="$style.manifestHint" size="small">
						Copy the app manifest and paste it into your Slack app's settings to configure events,
						scopes, and interactivity.
						<a :class="$style.link" href="#" @click.prevent="showManifest = true">View JSON</a>
					</N8nText>
					<N8nButton variant="outline" size="small" @click="copyManifest">
						<N8nIcon :icon="copied ? 'check' : 'copy'" :size="14" />
						{{ copied ? 'Copied' : 'Copy manifest' }}
					</N8nButton>

					<N8nButton
						:class="$style.actionButton"
						variant="destructive"
						:loading="loading"
						size="small"
						data-testid="slack-disconnect-button"
						@click="onDisconnect"
					>
						<N8nIcon icon="unlink" :size="14" />
						Disconnect
					</N8nButton>

					<!-- Manifest modal -->
					<N8nDialog
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
</style>
