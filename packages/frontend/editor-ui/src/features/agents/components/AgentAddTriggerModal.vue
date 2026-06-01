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
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { getResourcePermissions } from '@n8n/permissions';
import { AGENT_SCHEDULE_TRIGGER_TYPE, type ChatIntegrationDescriptor } from '@n8n/api-types';
import { MODAL_CONFIRM } from '@/app/constants';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import { useAgentIntegrationStatus } from '../composables/useAgentIntegrationStatus';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { createSlackAgentApp, publishAgent } from '../composables/useAgentApi';
import type { AgentResource } from '../types';
import AgentScheduleTriggerCard from './AgentScheduleTriggerCard.vue';
import type { AgentCredentialOption } from './AgentCredentialSelect.vue';
import AgentIntegrationCredentialConnection from './AgentIntegrationCredentialConnection.vue';
import AgentIntegrationSettingsForm from './AgentIntegrationSettingsForm.vue';

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
		onAgentChanged?: () => Promise<void> | void;
	};
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();
const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();
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
	integrationSettings,
	loadingMap,
	errorMessages,
	errorIsConflict,
	fetchStatus: fetchStatusShared,
	connect,
	disconnect,
	isConnected,
} = useAgentIntegrationStatus(props.data.projectId, props.data.agentId);

const selectedCredentials = ref<Record<string, string>>({});
const credentialsByType = ref<Record<string, AgentCredentialOption[]>>({});
const credentialsLoading = ref(false);
const publishing = ref(false);
const settingsFormRef = ref<InstanceType<typeof AgentIntegrationSettingsForm>>();

// Track credentials that existed before the user opened the "new credential"
// modal, keyed by trigger type. After the modal closes we diff against the
// fresh list to detect the just-created credential and auto-select it.
const credentialIdsBeforeNew = ref<Record<string, Set<string>>>({});
const pendingNewCredentialType = ref<string | null>(null);

const linearCopiedField = ref<'oauthCallback' | 'webhook' | null>(null);

const SCHEDULE_ICON: IconName = 'clock';
const LINEAR_APP_SETUP_URL = 'https://linear.app/settings/api/applications/new';
const SLACK_APP_SETUP_POLL_INTERVAL_MS = 2000;
const SLACK_APP_SETUP_TIMEOUT_MS = 2 * 60 * 1000;

const currentIntegration = computed<ChatIntegrationDescriptor | null>(
	() => integrations.value.find((i) => i.type === selectedTriggerType.value) ?? null,
);

const projectForPermissions = computed(() => {
	if (projectsStore.currentProject?.id === props.data.projectId)
		return projectsStore.currentProject;
	if (projectsStore.personalProject?.id === props.data.projectId)
		return projectsStore.personalProject;
	return projectsStore.myProjects.find((project) => project.id === props.data.projectId) ?? null;
});

const credentialPermissions = computed(() => {
	const permissions = getResourcePermissions(projectForPermissions.value?.scopes).credential;
	return { ...permissions, create: !!permissions.create };
});

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

// URLs in integration setup instructions must use the instance's configured
// `WEBHOOK_URL` (`urlBaseWebhook`), not the browser origin: in production the
// editor and webhook receiver may be on different hosts, and the chat platform
// (Slack, Linear) needs a publicly reachable host.
function webhookUrlFor(platform: string): string {
	const base = rootStore.urlBaseWebhook.replace(/\/$/, '');
	return `${base}/rest/projects/${props.data.projectId}/agents/v2/${props.data.agentId}/webhooks/${platform}`;
}

function oauthCallbackUrl(): string {
	return (rootStore.OAuthCallbackUrls as { oauth2?: string } | undefined)?.oauth2 ?? '';
}

function linearUrlFor(field: 'oauthCallback' | 'webhook'): string {
	return field === 'oauthCallback' ? oauthCallbackUrl() : webhookUrlFor('linear');
}

async function copyLinearUrl(field: 'oauthCallback' | 'webhook') {
	await navigator.clipboard.writeText(linearUrlFor(field));
	linearCopiedField.value = field;
	setTimeout(() => {
		if (linearCopiedField.value === field) {
			linearCopiedField.value = null;
		}
	}, 2000);
}

function linearCopyLabel(field: 'oauthCallback' | 'webhook'): string {
	return linearCopiedField.value === field
		? i18n.baseText('agents.builder.addTrigger.copied')
		: i18n.baseText('agents.builder.addTrigger.copy');
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

async function onScheduleSaved() {
	await props.data.onAgentChanged?.();
	closeModal();
}

function closeModal() {
	uiStore.closeModal(props.modalName);
}

async function fetchCredentials() {
	credentialsLoading.value = true;
	try {
		credentialsStore.setCredentials([]);
		const allCredentials = await credentialsStore.fetchAllCredentialsForWorkflow({
			projectId: props.data.projectId,
		});

		for (const integration of integrations.value) {
			credentialsByType.value[integration.type] = allCredentials
				.filter((c) => integration.credentialTypes.includes(c.type))
				.map((c) => ({
					id: c.id,
					name: c.name,
					typeDisplayName: credentialsStore.getCredentialTypeByName(c.type)?.displayName,
					homeProject: c.homeProject,
				}));
		}
	} catch {
		for (const integration of integrations.value) {
			credentialsByType.value[integration.type] = [];
		}
	} finally {
		credentialsLoading.value = false;
	}
}

async function confirmPublishIfNeeded(): Promise<boolean> {
	if (isPublishedLocal.value) return true;

	const confirmed = await openAgentConfirmationModal({
		title: i18n.baseText('agents.builder.addTrigger.publishPrompt.title'),
		description: i18n.baseText('agents.builder.addTrigger.publishPrompt.description'),
		confirmButtonText: i18n.baseText('agents.builder.addTrigger.publishPrompt.confirm'),
		cancelButtonText: i18n.baseText('generic.cancel'),
	});
	return confirmed === MODAL_CONFIRM;
}

async function ensurePublished(): Promise<boolean> {
	if (isPublishedLocal.value) return true;
	const confirmed = await confirmPublishIfNeeded();
	if (!confirmed) return false;

	publishing.value = true;
	try {
		const updated = await publishAgent(
			rootStore.restApiContext,
			props.data.projectId,
			props.data.agentId,
		);
		publishedDuringSession.value = true;
		props.data.onAgentPublished?.(updated);
		return true;
	} finally {
		publishing.value = false;
	}
}

async function onConnect(type: string) {
	const credId = selectedCredentials.value[type];
	if (!credId) return;
	if (settingsFormRef.value?.validationError) return;
	const settings = settingsFormRef.value?.currentSettings;
	const needsPublish = !isPublishedLocal.value;
	const confirmed = await confirmPublishIfNeeded();
	if (!confirmed) return;
	let connected = false;
	try {
		const result = await connect(type, credId, settings);
		connected = true;
		if (needsPublish && result.agent) {
			publishedDuringSession.value = true;
			props.data.onAgentPublished?.(result.agent);
		}
		const triggers = computeConnectedTriggers();
		props.data.onTriggerAdded({ triggerType: type, triggers });
		emitConnectedTriggers();
	} catch {
		// Error details already surfaced in the shared state by `connect()`.
	}
	if (connected) await props.data.onAgentChanged?.();
}

function openSlackAppAuthorizationPopup(installUrl: string): Window | null {
	const parsedUrl = new URL(installUrl);
	if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
		throw new Error('Invalid Slack installation URL');
	}

	const params =
		'scrollbars=no,resizable=yes,status=no,titlebar=no,location=no,toolbar=no,menubar=no,width=500,height=700,noopener';
	return window.open(parsedUrl.toString(), 'Slack App Authorization', params);
}

async function waitForSlackAppSetupCompletion(popup: Window | null): Promise<boolean> {
	return await new Promise((resolve) => {
		const oauthChannel = new BroadcastChannel('oauth-callback');
		let pollInFlight = false;
		let settled = false;

		const closePopup = () => {
			if (!popup) return;
			try {
				popup.close();
			} catch {
				// Some cross-origin popup transitions can block close(); the callback result is still valid.
			}
		};

		const settle = (success: boolean) => {
			if (settled) return;
			settled = true;
			window.clearInterval(pollInterval);
			window.clearTimeout(timeout);
			oauthChannel.close();
			if (success) closePopup();
			resolve(success);
		};

		const pollStatus = async () => {
			if (pollInFlight || settled) return;
			pollInFlight = true;
			try {
				await fetchStatus();
				if (isConnected('slack')) settle(true);
			} finally {
				pollInFlight = false;
			}
		};

		const pollInterval = window.setInterval(
			() => void pollStatus(),
			SLACK_APP_SETUP_POLL_INTERVAL_MS,
		);
		const timeout = window.setTimeout(() => settle(false), SLACK_APP_SETUP_TIMEOUT_MS);

		oauthChannel.addEventListener('message', (event: MessageEvent) => {
			settle(event.data === 'success');
		});

		void pollStatus();
	});
}

async function onSetupSlackApp(appConfigurationToken: string): Promise<boolean> {
	const published = await ensurePublished();
	if (!published) return false;

	const { installUrl } = await createSlackAgentApp(
		rootStore.restApiContext,
		props.data.projectId,
		props.data.agentId,
		appConfigurationToken,
	);
	const popup = openSlackAppAuthorizationPopup(installUrl);
	const connected = await waitForSlackAppSetupCompletion(popup);
	if (!connected) {
		throw new Error('Slack app installation was not completed');
	}

	await Promise.all([fetchStatus(), fetchCredentials()]);
	props.data.onTriggerAdded({
		triggerType: 'slack',
		triggers: computeConnectedTriggers(),
	});
	await props.data.onAgentChanged?.();
	return true;
}

async function onDisconnect(type: string) {
	const credId = connectedCredentials.value[type] || selectedCredentials.value[type];
	if (!credId) return;
	await disconnect(type, credId);
	selectedCredentials.value[type] = '';
	emitConnectedTriggers();
	await props.data.onAgentChanged?.();
}

function onCreateCredential(integration: ChatIntegrationDescriptor) {
	const [primaryCredentialType] = integration.credentialTypes;
	if (!primaryCredentialType) return;
	const existing = credentialsByType.value[integration.type] ?? [];
	credentialIdsBeforeNew.value[integration.type] = new Set(existing.map((c) => c.id));
	pendingNewCredentialType.value = integration.type;
	uiStore.openNewCredential(
		primaryCredentialType,
		false,
		false,
		props.data.projectId,
		undefined,
		undefined,
		undefined,
		{
			hideAskAssistant: true,
		},
	);
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
					@canceled="closeModal"
					@saved="onScheduleSaved"
				/>

				<div v-else-if="currentIntegration" :class="$style.integrationConfig">
					<div v-if="currentIntegration.type === 'linear'" :class="$style.linearSetup">
						<N8nText size="small" bold>
							{{ i18n.baseText('agents.builder.addTrigger.linear.setup.title') }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.addTrigger.linear.setup.description') }}
							<a
								:href="LINEAR_APP_SETUP_URL"
								target="_blank"
								rel="noopener noreferrer"
								:class="$style.link"
								data-testid="linear-app-setup-link"
							>
								{{ i18n.baseText('agents.builder.addTrigger.linear.setup.link') }}
							</a>
						</N8nText>

						<div :class="$style.urlField">
							<label for="linear-oauth-callback-url" :class="$style.urlLabel">
								<N8nText size="small" bold>
									{{ i18n.baseText('agents.builder.addTrigger.linear.oauthCallbackUrl.label') }}
								</N8nText>
							</label>
							<div :class="$style.urlRow">
								<input
									id="linear-oauth-callback-url"
									:value="oauthCallbackUrl()"
									readonly
									:class="$style.urlInput"
									data-testid="linear-oauth-callback-url"
									@focus="($event.target as HTMLInputElement).select()"
								/>
								<N8nButton
									variant="outline"
									size="small"
									data-testid="linear-copy-oauth-callback-url"
									@click="copyLinearUrl('oauthCallback')"
								>
									<template #prefix>
										<N8nIcon
											:icon="linearCopiedField === 'oauthCallback' ? 'check' : 'copy'"
											size="xsmall"
										/>
									</template>
									{{ linearCopyLabel('oauthCallback') }}
								</N8nButton>
							</div>
						</div>

						<div :class="$style.urlField">
							<label for="linear-webhook-url" :class="$style.urlLabel">
								<N8nText size="small" bold>
									{{ i18n.baseText('agents.builder.addTrigger.linear.webhookUrl.label') }}
								</N8nText>
							</label>
							<div :class="$style.urlRow">
								<input
									id="linear-webhook-url"
									:value="webhookUrlFor('linear')"
									readonly
									:class="$style.urlInput"
									data-testid="linear-webhook-url"
									@focus="($event.target as HTMLInputElement).select()"
								/>
								<N8nButton
									variant="outline"
									size="small"
									data-testid="linear-copy-webhook-url"
									@click="copyLinearUrl('webhook')"
								>
									<template #prefix>
										<N8nIcon
											:icon="linearCopiedField === 'webhook' ? 'check' : 'copy'"
											size="xsmall"
										/>
									</template>
									{{ linearCopyLabel('webhook') }}
								</N8nButton>
							</div>
						</div>
					</div>

					<AgentIntegrationCredentialConnection
						v-if="!isConnected(currentIntegration.type) && currentIntegration.type !== 'slack'"
						v-model="selectedCredentials[currentIntegration.type]"
						:integration-type="currentIntegration.type"
						:integration-label="currentIntegration.label"
						:credentials="credentialsByType[currentIntegration.type] ?? []"
						:credential-permissions="credentialPermissions"
						:credentials-loading="credentialsLoading"
						:disabled="isLoading(currentIntegration.type)"
						@create="onCreateCredential(currentIntegration)"
						@edit="onEditCredential(currentIntegration.type)"
					/>

					<AgentIntegrationCredentialConnection
						v-else-if="isConnected(currentIntegration.type) && currentIntegration.type === 'slack'"
						:model-value="connectedCredentials[currentIntegration.type]"
						:integration-type="currentIntegration.type"
						:integration-label="currentIntegration.label"
						:credentials="credentialsByType[currentIntegration.type] ?? []"
						:credential-permissions="credentialPermissions"
						:credentials-loading="credentialsLoading"
						:disabled="true"
						:connected="true"
						:connected-description="integrationConnectedText(currentIntegration.type)"
						:show-disconnect-button="true"
						:loading="isLoading(currentIntegration.type)"
						@create="onCreateCredential(currentIntegration)"
						@disconnect="onDisconnect(currentIntegration.type)"
					/>

					<div
						v-else-if="isConnected(currentIntegration.type) && currentIntegration.type !== 'slack'"
						:class="$style.connectedSection"
					>
						<N8nText size="small">
							{{ integrationConnectedText(currentIntegration.type) }}
						</N8nText>
					</div>

					<AgentIntegrationSettingsForm
						v-if="currentIntegration.type !== 'slack' || !isConnected(currentIntegration.type)"
						ref="settingsFormRef"
						:type="currentIntegration.type"
						:disabled="isConnected(currentIntegration.type) || isLoading(currentIntegration.type)"
						:connected="isConnected(currentIntegration.type)"
						:saved-settings="integrationSettings[currentIntegration.type]"
						:agent-name="data.agentName"
						:project-id="data.projectId"
						:agent-id="data.agentId"
						:setup-slack-app="onSetupSlackApp"
					>
						<template v-if="currentIntegration.type === 'slack'" #manualConfiguration>
							<AgentIntegrationCredentialConnection
								:model-value="
									selectedCredentials[currentIntegration.type] ||
									connectedCredentials[currentIntegration.type]
								"
								:integration-type="currentIntegration.type"
								:integration-label="currentIntegration.label"
								:credentials="credentialsByType[currentIntegration.type] ?? []"
								:credential-permissions="credentialPermissions"
								:credentials-loading="credentialsLoading"
								:disabled="
									isConnected(currentIntegration.type) || isLoading(currentIntegration.type)
								"
								:connected="isConnected(currentIntegration.type)"
								:show-connect-button="!isConnected(currentIntegration.type)"
								:show-disconnect-button="isConnected(currentIntegration.type)"
								:loading="isLoading(currentIntegration.type)"
								:publishing="publishing"
								:error-message="
									!isConnected(currentIntegration.type) && hasError(currentIntegration.type)
										? errorMessages[currentIntegration.type]
										: ''
								"
								:error-is-conflict="errorIsConflict[currentIntegration.type]"
								@update:model-value="selectedCredentials[currentIntegration.type] = $event"
								@create="onCreateCredential(currentIntegration)"
								@edit="onEditCredential(currentIntegration.type)"
								@connect="onConnect(currentIntegration.type)"
								@disconnect="onDisconnect(currentIntegration.type)"
							/>
						</template>
					</AgentIntegrationSettingsForm>

					<N8nText
						v-if="
							currentIntegration.type !== 'slack' &&
							!isConnected(currentIntegration.type) &&
							hasError(currentIntegration.type)
						"
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
			</div>
		</template>

		<template v-if="currentIntegration && currentIntegration.type !== 'slack'" #footer>
			<div :class="$style.footer">
				<div :class="$style.footerActions">
					<template v-if="!isConnected(currentIntegration.type)">
						<N8nButton
							variant="solid"
							:disabled="
								!selectedCredentials[currentIntegration.type] ||
								isLoading(currentIntegration.type) ||
								!!settingsFormRef?.validationError
							"
							:loading="isLoading(currentIntegration.type)"
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

.errorText {
	color: var(--color--danger);
}

.link {
	color: var(--color--primary);
	text-decoration: underline;
	cursor: pointer;
	margin-left: var(--spacing--4xs);
}

.linearSetup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.urlField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.urlLabel {
	display: block;
}

.urlRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.urlInput {
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

.urlInput:focus {
	outline: none;
	border-color: var(--color--primary);
}
</style>
