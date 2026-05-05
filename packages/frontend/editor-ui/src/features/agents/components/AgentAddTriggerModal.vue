<script setup lang="ts">
/**
 * Add trigger modal — a single dropdown picker (with icons) at the top, and
 * the selected trigger's configuration rendered inline below. One config is
 * visible at a time so the modal doesn't need to scroll.
 */
import { ref, computed, onMounted, watch } from 'vue';
import { N8nButton, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import N8nSelect from '@n8n/design-system/components/N8nSelect';
import N8nOption from '@n8n/design-system/components/N8nOption';
import Modal from '@/app/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { AGENT_SCHEDULE_TRIGGER_TYPE, type ChatIntegrationDescriptor } from '@n8n/api-types';
import { MODAL_CONFIRM } from '@/app/constants';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import { useAgentIntegrationStatus } from '../composables/useAgentIntegrationStatus';
import { useAgentPublish } from '../composables/useAgentPublish';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import type { AgentResource } from '../types';
import AgentScheduleTriggerCard from './AgentScheduleTriggerCard.vue';

interface CredentialOption {
	id: string;
	name: string;
}

const props = defineProps<{
	modalName: string;
	data: {
		projectId: string;
		agentId: string;
		agentName: string;
		isPublished: boolean;
		initialTriggerType?: string;
		connectedTriggers: string[];
		onConnectedTriggersChange: (triggers: string[]) => void;
		onTriggerAdded: (payload: { triggerType: string; triggers: string[] }) => void;
		onAgentPublished?: (agent: AgentResource) => void;
	};
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const uiStore = useUIStore();
const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();
const { publish, publishing } = useAgentPublish();
const { openAgentConfirmationModal } = useAgentConfirmationModal();

// Track in-modal publish so the same session reflects a publish-and-connect
// performed from the confirmation popout. The base value still tracks
// `props.data.isPublished` reactively — a `ref` snapshot would silently go
// stale if the prop is updated (or the modal is ever switched to keep-alive).
const publishedDuringSession = ref(false);
const isPublishedLocal = computed(() => publishedDuringSession.value || props.data.isPublished);

const integrations = ref<ChatIntegrationDescriptor[]>([]);
const selectedTriggerType = ref<string>(props.data.initialTriggerType ?? '');

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

const selectedCredentials = ref<Record<string, string>>({});
const credentialsByType = ref<Record<string, CredentialOption[]>>({});
const credentialsLoading = ref(false);

// Track credentials that existed before the user opened the "new credential"
// modal, keyed by trigger type. After the modal closes we diff against the
// fresh list to detect the just-created credential and auto-select it.
const credentialIdsBeforeNew = ref<Record<string, Set<string>>>({});
const pendingNewCredentialType = ref<string | null>(null);

const linearCopied = ref(false);
const manifestCopied = ref(false);

const SCHEDULE_ICON: IconName = 'clock';

const currentIntegration = computed<ChatIntegrationDescriptor | null>(
	() => integrations.value.find((i) => i.type === selectedTriggerType.value) ?? null,
);

// Backend integration descriptors ship icon names that may include legacy
// aliases (e.g. `hashtag`, `paper-plane`); N8nIcon resolves them at runtime
// but the static `IconName` union doesn't enumerate them.
function toIconName(icon: string): IconName {
	return icon as IconName;
}

const selectedIcon = computed<IconName | null>(() => {
	if (!selectedTriggerType.value) return null;
	if (selectedTriggerType.value === AGENT_SCHEDULE_TRIGGER_TYPE) return SCHEDULE_ICON;
	const icon = currentIntegration.value?.icon;
	return icon ? toIconName(icon) : null;
});

function isLoading(type: string): boolean {
	return loadingMap.value[type] ?? false;
}

function hasError(type: string): boolean {
	return (errorMessages.value[type] ?? '').length > 0;
}

const CONNECTED_TEXT_KEYS = {
	slack: 'agents.builder.addTrigger.connectedText.slack',
	telegram: 'agents.builder.addTrigger.connectedText.telegram',
	linear: 'agents.builder.addTrigger.connectedText.linear',
} as const;

function integrationConnectedText(type: string): string {
	const key = CONNECTED_TEXT_KEYS[type as keyof typeof CONNECTED_TEXT_KEYS];
	return key ? i18n.baseText(key) : '';
}

// Use the browser origin (rather than the configured `urlBaseEditor`) so the
// generated URLs match whichever host the user is currently viewing the UI
// from — e.g. an ngrok tunnel or a reverse-proxy port. The instance's
// configured editor URL might be `http://localhost:5678` while the user is
// actually serving Slack the URL via `https://<id>.ngrok.app`.
function browserOrigin(): string {
	return typeof window !== 'undefined' ? window.location.origin : rootStore.urlBaseEditor;
}

function webhookUrlFor(platform: string): string {
	return `${browserOrigin()}/rest/projects/${props.data.projectId}/agents/v2/${props.data.agentId}/webhooks/${platform}`;
}

async function copyLinearWebhookUrl() {
	await navigator.clipboard.writeText(webhookUrlFor('linear'));
	linearCopied.value = true;
	setTimeout(() => {
		linearCopied.value = false;
	}, 2000);
}

const oauthCallbackUrl = computed(() => {
	const configured = (rootStore.OAuthCallbackUrls as { oauth2?: string }).oauth2 ?? '';
	if (!configured) return '';
	try {
		// Preserve the configured path (which may include a custom rest endpoint
		// or base path) but rebase onto the current browser origin.
		const parsed = new URL(configured);
		return `${browserOrigin()}${parsed.pathname}${parsed.search}`;
	} catch {
		return configured;
	}
});

const DEFAULT_SLACK_APP_NAME = 'n8n Agent';

// Slack app names accept letters, digits, spaces, periods, hyphens and
// underscores (max 35 chars per Slack's submission guidelines). Strip anything
// else and fall back to a sensible default if the agent name is empty after
// sanitisation, so the manifest always validates on Slack's side.
function sanitiseSlackAppName(raw: string): string {
	const cleaned = raw
		.replace(/[^a-zA-Z0-9 ._-]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 35);
	return cleaned.length > 0 ? cleaned : DEFAULT_SLACK_APP_NAME;
}

const slackAppManifest = computed(() => {
	const agentName = sanitiseSlackAppName(props.data.agentName);
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
	await fetchStatusShared([
		...integrations.value.map((integration) => integration.type),
		AGENT_SCHEDULE_TRIGGER_TYPE,
	]);
	if (props.data.connectedTriggers.includes(AGENT_SCHEDULE_TRIGGER_TYPE)) {
		statuses.value[AGENT_SCHEDULE_TRIGGER_TYPE] = 'connected';
		connectedCredentials.value[AGENT_SCHEDULE_TRIGGER_TYPE] = '';
	}
	emitConnectedTriggers();
}

function onScheduleStatusChange(configured: boolean) {
	statuses.value[AGENT_SCHEDULE_TRIGGER_TYPE] = configured ? 'connected' : 'disconnected';
	connectedCredentials.value[AGENT_SCHEDULE_TRIGGER_TYPE] = '';
	emitConnectedTriggers();
}

function onScheduleTriggerAdded() {
	props.data.onTriggerAdded({
		triggerType: AGENT_SCHEDULE_TRIGGER_TYPE,
		triggers: computeConnectedTriggers(),
	});
}

function closeModal() {
	uiStore.closeModal(props.modalName);
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

async function ensurePublished(): Promise<boolean> {
	if (isPublishedLocal.value) return true;

	const confirmed = await openAgentConfirmationModal({
		title: i18n.baseText('agents.builder.addTrigger.publishPrompt.title'),
		description: i18n.baseText('agents.builder.addTrigger.publishPrompt.description'),
		confirmButtonText: i18n.baseText('agents.builder.addTrigger.publishPrompt.confirm'),
		cancelButtonText: i18n.baseText('generic.cancel'),
	});
	if (confirmed !== MODAL_CONFIRM) return false;

	const updated = await publish(props.data.projectId, props.data.agentId);
	if (!updated) return false;
	publishedDuringSession.value = true;
	props.data.onAgentPublished?.(updated);
	return true;
}

async function onConnect(type: string) {
	const credId = selectedCredentials.value[type];
	if (!credId) return;
	const published = await ensurePublished();
	if (!published) return;
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
	const existing = credentialsByType.value[integration.type] ?? [];
	credentialIdsBeforeNew.value[integration.type] = new Set(existing.map((c) => c.id));
	pendingNewCredentialType.value = integration.type;
	uiStore.openNewCredential(primaryCredentialType, false, false, undefined, undefined, undefined, {
		hideAskAssistant: true,
	});
}

function onEditCredential(type: string) {
	const credId = selectedCredentials.value[type];
	if (credId) {
		uiStore.openExistingCredential(credId, { hideAskAssistant: true });
	}
}

const credentialModalOpen = computed(
	() => uiStore.isModalActiveById[CREDENTIAL_EDIT_MODAL_KEY] ?? false,
);

watch(credentialModalOpen, async (isOpen, wasOpen) => {
	if (!wasOpen || isOpen) return;
	const type = pendingNewCredentialType.value;
	pendingNewCredentialType.value = null;
	await fetchCredentials();
	if (!type) return;

	const before = credentialIdsBeforeNew.value[type];
	const after = credentialsByType.value[type] ?? [];
	const newCred = before ? after.find((c) => !before.has(c.id)) : undefined;
	if (newCred) {
		selectedCredentials.value[type] = newCred.id;
	}
	delete credentialIdsBeforeNew.value[type];
});

onMounted(async () => {
	// Connect errors live in the shared integration-status cache so they
	// survive remounts. Clear them whenever the modal opens so a stale
	// "agent must be published" message from a previous attempt doesn't
	// reappear on the next open.
	for (const key of Object.keys(errorMessages.value)) {
		errorMessages.value[key] = '';
		errorIsConflict.value[key] = false;
	}

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
			<div :class="$style.body">
				<N8nText :class="$style.modalDescription" size="small">
					{{ i18n.baseText('agents.builder.addTrigger.modal.description') }}
				</N8nText>
				<div :class="$style.pickerRow">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.builder.addTrigger.picker.label') }}
					</N8nText>
					<N8nSelect
						v-model="selectedTriggerType"
						:class="[$style.triggerPicker, selectedIcon ? $style.triggerPickerWithIcon : undefined]"
						:placeholder="i18n.baseText('agents.builder.addTrigger.picker.placeholder')"
						size="medium"
						data-testid="agent-add-trigger-picker"
					>
						<template v-if="selectedIcon" #prefix>
							<N8nIcon :icon="selectedIcon" :size="16" />
						</template>
						<N8nOption
							:value="AGENT_SCHEDULE_TRIGGER_TYPE"
							:label="i18n.baseText('agents.schedule.title')"
						>
							<span :class="$style.optionRow">
								<N8nIcon :icon="SCHEDULE_ICON" :size="16" :class="$style.optionIcon" />
								<span :class="$style.optionLabel">
									{{ i18n.baseText('agents.schedule.title') }}
								</span>
							</span>
						</N8nOption>
						<N8nOption
							v-for="integration in integrations"
							:key="integration.type"
							:value="integration.type"
							:label="integration.label"
						>
							<span :class="$style.optionRow">
								<N8nIcon
									:icon="toIconName(integration.icon)"
									:size="16"
									:class="$style.optionIcon"
								/>
								<span :class="$style.optionLabel">{{ integration.label }}</span>
							</span>
						</N8nOption>
					</N8nSelect>
				</div>

				<div v-if="!selectedTriggerType" :class="$style.placeholderState">
					<N8nText color="text-light" size="small">
						{{ i18n.baseText('agents.builder.addTrigger.picker.empty') }}
					</N8nText>
				</div>

				<AgentScheduleTriggerCard
					v-else-if="selectedTriggerType === AGENT_SCHEDULE_TRIGGER_TYPE"
					:project-id="data.projectId"
					:agent-id="data.agentId"
					:is-published="isPublishedLocal"
					:flat="true"
					@status-change="onScheduleStatusChange"
					@trigger-added="onScheduleTriggerAdded"
					@saved="closeModal"
				/>

				<div v-else-if="currentIntegration" :class="$style.integrationConfig">
					<!-- Linear webhook URL — always visible so the URL can be configured before the credential -->
					<div v-if="currentIntegration.type === 'linear'" :class="$style.webhookRow">
						<input
							:value="webhookUrlFor('linear')"
							readonly
							:class="$style.webhookInput"
							:data-testid="`${currentIntegration.type}-webhook-url`"
							@focus="($event.target as HTMLInputElement).select()"
						/>
						<N8nButton
							variant="outline"
							size="small"
							:data-testid="`${currentIntegration.type}-copy-webhook-url`"
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

					<div v-if="!isConnected(currentIntegration.type)" :class="$style.connectForm">
						<label :class="$style.label">
							<N8nText size="small" bold>
								{{ currentIntegration.label }}
								{{ i18n.baseText('agents.builder.addTrigger.credential') }}
							</N8nText>
						</label>
						<div :class="$style.selectRow">
							<N8nSelect
								v-model="selectedCredentials[currentIntegration.type]"
								:class="$style.select"
								:placeholder="i18n.baseText('agents.builder.addTrigger.selectCredential')"
								:loading="credentialsLoading"
								:disabled="isLoading(currentIntegration.type)"
								size="medium"
								:data-testid="`${currentIntegration.type}-credential-select`"
							>
								<N8nOption
									v-for="cred in credentialsByType[currentIntegration.type] ?? []"
									:key="cred.id"
									:value="cred.id"
									:label="cred.name"
								/>
							</N8nSelect>
							<N8nButton
								v-if="selectedCredentials[currentIntegration.type]"
								variant="outline"
								size="small"
								icon="pen"
								:aria-label="i18n.baseText('agents.builder.addTrigger.editCredential')"
								:data-testid="`${currentIntegration.type}-edit-credential`"
								@click="onEditCredential(currentIntegration.type)"
							/>
						</div>

						<N8nText
							v-if="hasError(currentIntegration.type)"
							:class="$style.errorText"
							size="small"
						>
							{{ errorMessages[currentIntegration.type] }}
							<a
								v-if="
									selectedCredentials[currentIntegration.type] &&
									!errorIsConflict[currentIntegration.type]
								"
								:class="$style.link"
								href="#"
								@click.prevent="onEditCredential(currentIntegration.type)"
								>{{ i18n.baseText('agents.builder.addTrigger.editCredential') }}</a
							>
						</N8nText>
					</div>

					<div v-else :class="$style.connectedSection">
						<N8nText size="small">
							{{ integrationConnectedText(currentIntegration.type) }}
						</N8nText>
					</div>

					<!-- Slack manifest reference material. Integration actions live
						 in the modal footer so they stay aligned with other modals. -->
					<div v-if="currentIntegration.type === 'slack'" :class="$style.manifestSection">
						<N8nText size="small" bold>
							{{ i18n.baseText('agents.builder.addTrigger.slack.manifestTitle') }}
						</N8nText>
						<N8nText :class="$style.manifestHint" size="small">
							{{ i18n.baseText('agents.builder.addTrigger.slack.manifestHint') }}
						</N8nText>
						<div :class="$style.codeBlock">
							<N8nButton
								variant="outline"
								size="small"
								:class="$style.codeBlockCopy"
								:data-testid="`${currentIntegration.type}-copy-manifest`"
								@click="copyManifest"
							>
								<template #prefix>
									<N8nIcon :icon="manifestCopied ? 'check' : 'copy'" size="xsmall" />
								</template>
								{{
									manifestCopied
										? i18n.baseText('agents.builder.addTrigger.copied')
										: i18n.baseText('agents.builder.addTrigger.copy')
								}}
							</N8nButton>
							<pre :class="$style.manifestCode">{{ slackAppManifest }}</pre>
						</div>
					</div>
				</div>
			</div>
		</template>

		<template v-if="currentIntegration" #footer>
			<div :class="$style.footer">
				<div :class="$style.footerActions">
					<template v-if="!isConnected(currentIntegration.type)">
						<N8nButton
							variant="outline"
							size="small"
							:data-testid="`${currentIntegration.type}-create-another-credential`"
							@click="onCreateCredential(currentIntegration)"
						>
							<template #prefix><N8nIcon icon="plus" size="xsmall" /></template>
							{{ i18n.baseText('agents.builder.addTrigger.newCredential') }}
						</N8nButton>
						<N8nButton
							variant="solid"
							:disabled="
								!selectedCredentials[currentIntegration.type] ||
								isLoading(currentIntegration.type) ||
								publishing
							"
							:loading="isLoading(currentIntegration.type) || publishing"
							size="small"
							:data-testid="`${currentIntegration.type}-connect-button`"
							@click="onConnect(currentIntegration.type)"
						>
							<template #prefix><N8nIcon icon="plug" size="xsmall" /></template>
							{{ i18n.baseText('agents.builder.addTrigger.connect') }}
						</N8nButton>
					</template>
					<N8nButton
						v-else
						variant="destructive"
						:loading="isLoading(currentIntegration.type)"
						size="small"
						:data-testid="`${currentIntegration.type}-disconnect-button`"
						@click="onDisconnect(currentIntegration.type)"
					>
						<template #prefix><N8nIcon icon="unlink" size="xsmall" /></template>
						{{ i18n.baseText('agents.builder.addTrigger.disconnect') }}
					</N8nButton>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--xs);
}

.pickerRow {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.triggerPicker :global(.el-input .el-input__prefix) {
	display: flex;
	align-items: center;
	left: var(--spacing--xs);
}

.triggerPicker.triggerPickerWithIcon :global(.el-input .el-input__inner) {
	padding-left: calc(var(--spacing--xl) + var(--spacing--2xs));
}

.optionRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: 0 var(--spacing--3xs);
}

.optionIcon {
	flex: 0 0 auto;
}

.optionLabel {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.placeholderState {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl) var(--spacing--lg);
	border: 1px dashed var(--color--foreground);
	border-radius: var(--radius);
	text-align: center;
}

.integrationConfig {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.modalDescription {
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

.footer {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: space-between;
}

.footerActions {
	display: flex;
	gap: var(--spacing--2xs);
	margin-left: auto;
}

.connectedSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.manifestSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.manifestHint {
	color: var(--color--text--tint-1);
}

.codeBlock {
	position: relative;
	margin-top: var(--spacing--3xs);
}

/* Sit on top of the rounded container itself rather than inside the scrolling
   <pre>, so the button stays put as the user scrolls and never collides with
   the scrollbar groove. The right offset clears typical macOS / overlay
   scrollbars (~14px) plus our normal inner padding. */
.codeBlockCopy {
	position: absolute;
	top: var(--spacing--2xs);
	right: var(--spacing--lg);
	z-index: 1;
}

.manifestCode {
	margin: 0;
	padding: var(--spacing--xs);
	padding-right: calc(var(--spacing--2xl) + var(--spacing--lg));
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	overflow-x: auto;
	max-height: 240px;
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
