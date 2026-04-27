<script setup lang="ts">
/**
 * Add trigger modal — lets the user connect/disconnect agent trigger
 * integrations (Slack, Telegram, Linear, …) driven by the backend
 * ChatIntegrationRegistry via useAgentIntegrationsCatalog.
 *
 * Reshape of the pre-deletion AgentIntegrationsPanel (git:716964cb88^), with
 * hardcoded integration metadata replaced by the catalog.
 */
import { ref, computed, onMounted, watch } from 'vue';
import { N8nButton, N8nCard, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import N8nSelect from '@n8n/design-system/components/N8nSelect';
import N8nOption from '@n8n/design-system/components/N8nOption';
import Modal from '@/app/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import { useAgentIntegrationStatus } from '../composables/useAgentIntegrationStatus';
import type { ChatIntegrationDescriptor } from '@n8n/api-types';

interface CredentialOption {
	id: string;
	name: string;
}

const props = defineProps<{
	modalName: string;
	data: {
		projectId: string;
		agentId: string;
		connectedTriggers: string[];
		onConnectedTriggersChange: (triggers: string[]) => void;
		onTriggerAdded: (payload: { triggerType: string; triggers: string[] }) => void;
	};
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const uiStore = useUIStore();
const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();

// Local integration list — populated from catalog on mount
const integrations = ref<ChatIntegrationDescriptor[]>([]);

// Shared integration status — same reactive source as AgentIntegrationsPanel
// so connecting here is instantly reflected in the Triggers section.
const {
	statuses,
	connectedCredentials,
	loadingMap,
	errorMessages,
	errorIsConflict,
	fetchStatus: fetchStatusShared,
	connect,
	disconnect,
	isConnected,
} = useAgentIntegrationStatus(props.data.projectId, props.data.agentId);

// UI-only state — stays local.
const selectedCredentials = ref<Record<string, string>>({});
const credentialsByType = ref<Record<string, CredentialOption[]>>({});
const credentialsLoading = ref(false);

// Linear webhook URL copy state
const linearCopied = ref(false);

// Slack manifest copy state
const manifestCopied = ref(false);
const showManifest = ref(false);

function isLoading(type: string): boolean {
	return loadingMap.value[type] ?? false;
}

function hasCredentials(type: string): boolean {
	return (credentialsByType.value[type] ?? []).length > 0;
}

function hasError(type: string): boolean {
	return (errorMessages.value[type] ?? '').length > 0;
}

// Help / connected copy lives in FE i18n (keyed by integration type) so it can
// be localized — backend ships only stable brand metadata (label, icon).
const HELP_TEXT_KEYS = {
	slack: 'agents.builder.addTrigger.helpText.slack',
	telegram: 'agents.builder.addTrigger.helpText.telegram',
	linear: 'agents.builder.addTrigger.helpText.linear',
} as const;

const CONNECTED_TEXT_KEYS = {
	slack: 'agents.builder.addTrigger.connectedText.slack',
	telegram: 'agents.builder.addTrigger.connectedText.telegram',
	linear: 'agents.builder.addTrigger.connectedText.linear',
} as const;

function integrationHelpText(type: string): string {
	const key = HELP_TEXT_KEYS[type as keyof typeof HELP_TEXT_KEYS];
	return key ? i18n.baseText(key) : '';
}

function integrationConnectedText(type: string): string {
	const key = CONNECTED_TEXT_KEYS[type as keyof typeof CONNECTED_TEXT_KEYS];
	return key ? i18n.baseText(key) : '';
}

function webhookUrlFor(platform: string): string {
	const base = rootStore.urlBaseEditor;
	return `${base}rest/projects/${props.data.projectId}/agents/v2/${props.data.agentId}/webhooks/${platform}`;
}

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

const slackAppManifest = computed(() => {
	const agentName = 'n8n Agent';
	return JSON.stringify(
		{
			display_information: {
				name: agentName,
			},
			features: {
				app_home: {
					home_tab_enabled: true,
					messages_tab_enabled: false,
					messages_tab_read_only_enabled: false,
				},
				bot_user: {
					display_name: agentName,
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
	);
});

async function copyManifest() {
	await navigator.clipboard.writeText(slackAppManifest.value);
	manifestCopied.value = true;
	setTimeout(() => {
		manifestCopied.value = false;
	}, 2000);
}

function computeConnectedTriggers(): string[] {
	return Object.keys(statuses.value)
		.filter((t) => statuses.value[t] === 'connected')
		.sort();
}

function emitConnectedTriggers() {
	props.data.onConnectedTriggersChange(computeConnectedTriggers());
}

async function fetchStatus() {
	await fetchStatusShared(integrations.value.map((i) => i.type));
	emitConnectedTriggers();
}

async function fetchCredentials() {
	credentialsLoading.value = true;
	try {
		const allCredentials = await makeRestApiRequest<
			Array<{ id: string; name: string; type: string }>
		>(rootStore.restApiContext, 'GET', '/credentials');

		for (const integration of integrations.value) {
			credentialsByType.value[integration.type] = allCredentials
				.filter((c) => integration.credentialTypes.includes(c.type))
				.map((c) => ({ id: c.id, name: c.name }));
		}
	} catch {
		for (const integration of integrations.value) {
			credentialsByType.value[integration.type] = [];
		}
	} finally {
		credentialsLoading.value = false;
	}
}

async function onConnect(type: string) {
	const credId = selectedCredentials.value[type];
	if (!credId) return;
	try {
		await connect(type, credId);
		const triggers = computeConnectedTriggers();
		props.data.onTriggerAdded({ triggerType: type, triggers });
		emitConnectedTriggers();
	} catch {
		// Error details already surfaced in the shared state by `connect()`.
	}
}

async function onDisconnect(type: string) {
	const credId = connectedCredentials.value[type] || selectedCredentials.value[type];
	if (!credId) return;
	await disconnect(type, credId);
	selectedCredentials.value[type] = '';
	emitConnectedTriggers();
}

function onCreateCredential(integration: ChatIntegrationDescriptor) {
	const [primaryCredentialType] = integration.credentialTypes;
	if (!primaryCredentialType) return;
	uiStore.openNewCredential(primaryCredentialType);
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
	// Load catalog first, then fetch statuses + credentials in parallel
	const list = await ensureLoaded(props.data.projectId).catch(() => catalog.value ?? []);
	integrations.value = list ?? [];
	await Promise.all([fetchStatus(), fetchCredentials()]);
});
</script>

<template>
	<Modal :name="modalName" width="600px" data-test-id="agent-add-trigger-modal">
		<template #header>
			<N8nHeading tag="h2" size="large">
				{{ i18n.baseText('agents.builder.addTrigger.modal.title') }}
			</N8nHeading>
		</template>

		<template #content>
			<div :class="$style.listWrapper">
				<N8nCard v-for="integration in integrations" :key="integration.type" :class="$style.card">
					<template #header>
						<div :class="$style.cardHeader">
							<div :class="$style.statusRow">
								<span
									:class="[
										$style.statusDot,
										isConnected(integration.type)
											? $style.statusConnected
											: $style.statusDisconnected,
									]"
								/>
								<N8nText bold>{{ integration.label }}</N8nText>
								<N8nText :class="$style.statusLabel" size="small">
									{{
										isConnected(integration.type)
											? i18n.baseText('agents.builder.addTrigger.status.connected')
											: i18n.baseText('agents.builder.addTrigger.status.disconnected')
									}}
								</N8nText>
							</div>
						</div>
					</template>

					<div :class="$style.cardBody">
						<N8nText :class="$style.description" size="small">
							{{ integrationHelpText(integration.type) }}
						</N8nText>

						<!-- Linear webhook URL row — shown regardless of connection state -->
						<div v-if="integration.type === 'linear'" :class="$style.webhookRow">
							<input
								:value="webhookUrlFor('linear')"
								readonly
								:class="$style.webhookInput"
								:data-testid="`${integration.type}-webhook-url`"
								@focus="($event.target as HTMLInputElement).select()"
							/>
							<N8nButton
								type="secondary"
								size="small"
								:data-testid="`${integration.type}-copy-webhook-url`"
								@click="copyLinearWebhookUrl"
							>
								<template #prefix>
									<N8nIcon :icon="linearCopied ? 'check' : 'copy'" size="xsmall" />
								</template>
								{{
									linearCopied
										? i18n.baseText('agents.builder.addTrigger.copied')
										: i18n.baseText('agents.builder.addTrigger.copy')
								}}
							</N8nButton>
						</div>

						<!-- Disconnected state: credential picker or empty state -->
						<div v-if="!isConnected(integration.type)" :class="$style.connectForm">
							<template v-if="hasCredentials(integration.type)">
								<label :class="$style.label">
									<N8nText size="small" bold>
										{{ integration.label }}
										{{ i18n.baseText('agents.builder.addTrigger.credential') }}
									</N8nText>
								</label>
								<div :class="$style.selectRow">
									<N8nSelect
										v-model="selectedCredentials[integration.type]"
										:class="$style.select"
										:placeholder="i18n.baseText('agents.builder.addTrigger.selectCredential')"
										:loading="credentialsLoading"
										:disabled="isLoading(integration.type)"
										size="medium"
										:data-testid="`${integration.type}-credential-select`"
									>
										<N8nOption
											v-for="cred in credentialsByType[integration.type] ?? []"
											:key="cred.id"
											:value="cred.id"
											:label="cred.name"
										/>
									</N8nSelect>
									<N8nButton
										v-if="selectedCredentials[integration.type]"
										type="tertiary"
										size="small"
										icon="pen"
										:aria-label="i18n.baseText('agents.builder.addTrigger.editCredential')"
										:data-testid="`${integration.type}-edit-credential`"
										@click="onEditCredential(integration.type)"
									/>
								</div>
							</template>

							<div v-else-if="!credentialsLoading" :class="$style.emptyCredentials">
								<N8nText size="small">
									{{
										i18n.baseText('agents.builder.addTrigger.noCredentials', {
											interpolate: { label: integration.label },
										})
									}}
								</N8nText>
								<N8nButton
									size="small"
									:data-testid="`${integration.type}-create-credential`"
									@click="onCreateCredential(integration)"
								>
									<template #prefix><N8nIcon icon="plus" size="xsmall" /></template>
									{{
										i18n.baseText('agents.builder.addTrigger.addCredential', {
											interpolate: { label: integration.label },
										})
									}}
								</N8nButton>
							</div>

							<N8nText v-if="hasError(integration.type)" :class="$style.errorText" size="small">
								{{ errorMessages[integration.type] }}
								<a
									v-if="selectedCredentials[integration.type] && !errorIsConflict[integration.type]"
									:class="$style.link"
									href="#"
									@click.prevent="onEditCredential(integration.type)"
									>{{ i18n.baseText('agents.builder.addTrigger.editCredential') }}</a
								>
							</N8nText>

							<div :class="$style.actions">
								<N8nButton
									:disabled="!selectedCredentials[integration.type] || isLoading(integration.type)"
									:loading="isLoading(integration.type)"
									size="small"
									:data-testid="`${integration.type}-connect-button`"
									@click="onConnect(integration.type)"
								>
									<template #prefix><N8nIcon icon="plug" size="xsmall" /></template>
									{{ i18n.baseText('agents.builder.addTrigger.connect') }}
								</N8nButton>
								<N8nButton
									v-if="hasCredentials(integration.type)"
									type="tertiary"
									size="small"
									:data-testid="`${integration.type}-create-another-credential`"
									@click="onCreateCredential(integration)"
								>
									<template #prefix><N8nIcon icon="plus" size="xsmall" /></template>
									{{ i18n.baseText('agents.builder.addTrigger.newCredential') }}
								</N8nButton>
							</div>
						</div>

						<!-- Connected state -->
						<div v-else :class="$style.connectedSection">
							<N8nText size="small">
								{{ integrationConnectedText(integration.type) }}
							</N8nText>

							<!-- Slack App Manifest (Slack only) -->
							<template v-if="integration.type === 'slack'">
								<N8nText :class="$style.manifestHint" size="small">
									{{ i18n.baseText('agents.builder.addTrigger.slack.manifestHint') }}
									<a :class="$style.link" href="#" @click.prevent="showManifest = true">
										{{ i18n.baseText('agents.builder.addTrigger.slack.viewJson') }}
									</a>
								</N8nText>
								<N8nButton type="secondary" size="small" @click="copyManifest">
									<template #prefix>
										<N8nIcon :icon="manifestCopied ? 'check' : 'copy'" size="xsmall" />
									</template>
									{{
										manifestCopied
											? i18n.baseText('agents.builder.addTrigger.copied')
											: i18n.baseText('agents.builder.addTrigger.slack.copyManifest')
									}}
								</N8nButton>
							</template>

							<N8nButton
								:class="$style.actionButton"
								type="secondary"
								:loading="isLoading(integration.type)"
								size="small"
								:data-testid="`${integration.type}-disconnect-button`"
								@click="onDisconnect(integration.type)"
							>
								<template #prefix><N8nIcon icon="unlink" size="xsmall" /></template>
								{{ i18n.baseText('agents.builder.addTrigger.disconnect') }}
							</N8nButton>

							<!-- Manifest inline expand (Slack only) -->
							<div
								v-if="integration.type === 'slack' && showManifest"
								:class="$style.manifestExpanded"
							>
								<pre :class="$style.manifestCode">{{ slackAppManifest }}</pre>
								<N8nButton type="tertiary" size="small" @click="showManifest = false">
									{{ i18n.baseText('agents.builder.addTrigger.slack.hideJson') }}
								</N8nButton>
							</div>
						</div>
					</div>
				</N8nCard>

				<div v-if="integrations.length === 0" :class="$style.emptyState">
					<N8nText color="text-light">
						{{ i18n.baseText('agents.builder.addTrigger.noIntegrations') }}
					</N8nText>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.listWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-height: 60vh;
	overflow-y: auto;
	margin-right: calc(-1 * var(--spacing--lg));
	padding-right: var(--spacing--lg);
	padding-top: var(--spacing--sm);
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

.emptyState {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl);
}

.manifestExpanded {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
