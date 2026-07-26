<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import {
	N8nButton,
	N8nCollapsiblePanel,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nText,
} from '@n8n/design-system';
import N8nStepper from '@n8n/design-system/components/N8nStepper/Stepper.vue';
import AgentChannelSlackSetupSnapshots from './AgentChannelSlackSetupSnapshots.vue';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { ChatIntegrationDescriptor } from '@n8n/api-types';
import type { PermissionsRecord } from '@n8n/permissions';
import { getSlackAgentAppManifest } from '../composables/useAgentApi';
import AgentIntegrationCredentialConnection from './AgentIntegrationCredentialConnection.vue';
import type { AgentCredentialOption } from './AgentCredentialSelect.vue';

const credentialId = defineModel<string>({ default: '' });

const props = withDefaults(
	defineProps<{
		connected?: boolean;
		disabled?: boolean;
		mode?: 'setup' | 'edit';
		isPublished?: boolean;
		setupSlackApp?: (appConfigurationToken: string) => Promise<boolean>;
		disconnectSlackApp?: () => Promise<void>;
		projectId?: string;
		agentId?: string;
		integration?: ChatIntegrationDescriptor;
		credentials?: AgentCredentialOption[];
		credentialPermissions?: PermissionsRecord['credential'];
		connectedCredentialId?: string;
		credentialsLoading?: boolean;
		loading?: boolean;
		errorMessage?: string;
		errorIsConflict?: boolean;
		forceNewCredential?: boolean;
		setupMode?: 'simple' | 'advanced';
	}>(),
	{
		connected: false,
		disabled: false,
		mode: 'setup',
		setupMode: 'advanced',
		isPublished: true,
		setupSlackApp: undefined,
		disconnectSlackApp: undefined,
		projectId: undefined,
		agentId: undefined,
		integration: undefined,
		credentials: () => [],
		credentialPermissions: undefined,
		connectedCredentialId: '',
		credentialsLoading: false,
		loading: false,
		errorMessage: '',
		errorIsConflict: false,
		forceNewCredential: false,
	},
);

const emit = defineEmits<{
	create: [];
	edit: [];
	connect: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const appConfigurationToken = shallowRef('');
const showAppConfigurationToken = shallowRef(false);
const setupLoading = shallowRef(false);
const disconnectLoading = shallowRef(false);
const setupError = shallowRef<'invalidToken' | 'generic' | null>(null);
const manualConfigurationOpen = shallowRef(false);
const slackAppManifest = shallowRef('');
const manifestLoading = shallowRef(false);
const manifestError = shallowRef(false);
const manifestCopied = shallowRef(false);

const steps = computed(() => [
	{
		id: 'create-token',
		title: i18n.baseText('agents.channels.slack.setup.createToken.title'),
		description: i18n.baseText('agents.channels.slack.setup.createToken.description'),
	},
	{
		id: 'copy-access-token',
		title: i18n.baseText('agents.channels.slack.setup.copyAccessToken.title'),
		description: i18n.baseText('agents.channels.slack.setup.copyAccessToken.description'),
	},
	{
		id: 'install-app',
		title: i18n.baseText('agents.channels.slack.setup.installApp.title'),
		description: i18n.baseText('agents.channels.slack.setup.installApp.description'),
	},
]);

const canInstallApp = computed(
	() =>
		appConfigurationToken.value.trim().length > 0 &&
		!props.disabled &&
		!setupLoading.value &&
		!props.connected &&
		props.setupSlackApp !== undefined,
);

const appConfigurationTokenInputType = computed(() =>
	showAppConfigurationToken.value ? 'text' : 'password',
);

const appConfigurationTokenVisibilityLabel = computed(() =>
	i18n.baseText(
		showAppConfigurationToken.value
			? 'agents.channels.slack.setup.copyAccessToken.hideToken'
			: 'agents.channels.slack.setup.copyAccessToken.showToken',
	),
);

const showEditConnectButton = computed(
	() => credentialId.value.length > 0 && credentialId.value !== props.connectedCredentialId,
);

function isInvalidSlackTokenError(error: unknown) {
	return error instanceof Error && error.message.includes('invalid_auth');
}

async function copyManifest() {
	if (!slackAppManifest.value) return;

	await navigator.clipboard.writeText(slackAppManifest.value);
	manifestCopied.value = true;
	setTimeout(() => {
		manifestCopied.value = false;
	}, 2000);
}

async function loadSlackAppManifest() {
	if (!props.projectId || !props.agentId) return;

	manifestLoading.value = true;
	manifestError.value = false;
	try {
		const { manifest } = await getSlackAgentAppManifest(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		slackAppManifest.value = JSON.stringify(manifest, null, 2);
	} catch {
		slackAppManifest.value = '';
		manifestError.value = true;
	} finally {
		manifestLoading.value = false;
	}
}

async function installSlackApp() {
	const token = appConfigurationToken.value.trim();
	if (!token || !props.setupSlackApp || props.disabled || props.connected) return;

	setupLoading.value = true;
	setupError.value = null;
	try {
		const completed = await props.setupSlackApp(token);
		if (completed) {
			appConfigurationToken.value = '';
		}
	} catch (error) {
		setupError.value = isInvalidSlackTokenError(error) ? 'invalidToken' : 'generic';
	} finally {
		setupLoading.value = false;
	}
}

async function onDisconnectSlackApp() {
	if (!props.disconnectSlackApp || props.disabled || disconnectLoading.value) return;

	disconnectLoading.value = true;
	try {
		await props.disconnectSlackApp();
	} finally {
		disconnectLoading.value = false;
	}
}

watch(
	() => [props.projectId, props.agentId, props.connected, props.mode] as const,
	() => {
		if (!props.connected && props.mode === 'setup' && props.setupMode === 'advanced') {
			void loadSlackAppManifest();
		}
	},
	{ immediate: true },
);

defineExpose({ credentialId, validationError: null });
</script>

<template>
	<div :class="$style.slackSetup">
		<div v-if="mode === 'edit'" :class="$style.editTokenContainer">
			<AgentIntegrationCredentialConnection
				v-if="integration && credentialPermissions"
				v-model="credentialId"
				:integration-type="integration.type"
				:integration-label="integration.label"
				:credentials="credentials"
				:credential-permissions="credentialPermissions"
				:credentials-loading="credentialsLoading"
				:disabled="disabled || loading"
				:connected="false"
				:show-connect-button="showEditConnectButton"
				:show-disconnect-button="false"
				:loading="loading"
				:error-message="errorMessage"
				:error-is-conflict="errorIsConflict"
				@create="emit('create')"
				@edit="emit('edit')"
				@connect="emit('connect')"
			/>
			<N8nButton
				variant="destructive"
				size="medium"
				:loading="disconnectLoading"
				:disabled="disabled || disconnectLoading"
				data-testid="slack-disconnect-app"
				@click="onDisconnectSlackApp"
			>
				{{ i18n.baseText('generic.disconnect') }}
			</N8nButton>
		</div>
		<N8nStepper v-else :steps="steps">
			<template #default="{ step }">
				<div :class="$style.stepContent">
					<div v-if="step.id === 'create-token'" :class="$style.createTokenContainer">
						<N8nButton
							href="https://api.slack.com/apps"
							target="_blank"
							variant="subtle"
							size="medium"
							icon="slack"
							data-testid="slack-app-configuration-token-link"
						>
							{{ i18n.baseText('agents.channels.slack.setup.createToken.link') }}
						</N8nButton>
						<AgentChannelSlackSetupSnapshots />
					</div>

					<div v-else-if="step.id === 'copy-access-token'" :class="$style.tokenInputContainer">
						<N8nInput
							v-model="appConfigurationToken"
							:type="appConfigurationTokenInputType"
							size="large"
							:placeholder="
								i18n.baseText('agents.channels.slack.setup.copyAccessToken.placeholder')
							"
							data-testid="slack-app-configuration-token"
							:disabled="disabled || setupLoading"
							@keydown.enter.prevent="installSlackApp"
						>
							<template #suffix>
								<N8nIconButton
									variant="ghost"
									size="small"
									:icon="showAppConfigurationToken ? 'eye-off' : 'eye'"
									:class="$style.tokenVisibilityButton"
									:aria-label="appConfigurationTokenVisibilityLabel"
									:disabled="disabled || setupLoading"
									data-testid="slack-app-configuration-token-visibility"
									@click.stop="showAppConfigurationToken = !showAppConfigurationToken"
								/>
							</template>
						</N8nInput>
						<div :class="$style.setupDescriptionContainer">
							<N8nText
								:class="setupError === 'invalidToken' ? $style.setupError : $style.setupDescription"
								size="small"
								data-testid="slack-app-configuration-token-description"
							>
								{{
									i18n.baseText(
										setupError === 'invalidToken'
											? 'agents.channels.slack.setup.copyAccessToken.invalidToken'
											: 'agents.channels.slack.setup.copyAccessToken.hint',
									)
								}}
							</N8nText>
						</div>
					</div>
					<template v-else-if="step.id === 'install-app'">
						<N8nButton
							variant="subtle"
							size="medium"
							:loading="setupLoading"
							:disabled="!canInstallApp"
							data-testid="slack-create-app"
							@click="installSlackApp"
						>
							{{ i18n.baseText('agents.channels.slack.setup.installApp.button') }}
						</N8nButton>
						<N8nText
							v-if="!isPublished"
							:class="$style.publishNotice"
							size="small"
							data-testid="slack-app-publish-notice"
						>
							{{ i18n.baseText('agents.channels.setup.publishNotice') }}
						</N8nText>
						<N8nText
							v-if="setupError === 'generic'"
							:class="$style.setupError"
							size="small"
							data-testid="slack-app-setup-error"
						>
							{{ i18n.baseText('agents.channels.slack.setup.installApp.error') }}
						</N8nText>
					</template>
				</div>
			</template>
		</N8nStepper>

		<N8nCollapsiblePanel
			v-if="mode === 'setup' && setupMode === 'advanced' && !connected"
			v-model="manualConfigurationOpen"
			:class="$style.manualPanel"
			:title="i18n.baseText('agents.channels.slack.manualSetup.title')"
			:show-actions-on-hover="false"
			:disable-animation="true"
			data-testid="slack-manual-configuration"
		>
			<div :class="$style.manualConfiguration">
				<N8nText :class="$style.manualDescription" size="small">
					{{ i18n.baseText('agents.builder.addTrigger.slack.manual.description') }}
				</N8nText>

				<div :class="$style.manifestSection">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.builder.addTrigger.slack.manifestTitle') }}
					</N8nText>
					<N8nText :class="$style.manifestHint" size="small">
						{{ i18n.baseText('agents.builder.addTrigger.slack.manifestHint') }}
						<a
							href="https://docs.slack.dev/app-manifests/configuring-apps-with-app-manifests"
							target="_blank"
							rel="noopener noreferrer"
							:class="$style.docsLink"
						>
							{{ i18n.baseText('agents.builder.addTrigger.slack.docsCalloutLink') }}
						</a>
					</N8nText>
					<N8nText
						v-if="manifestLoading"
						:class="$style.manifestHint"
						size="small"
						data-testid="slack-manifest-loading"
					>
						{{ i18n.baseText('agents.builder.addTrigger.slack.manifestLoading') }}
					</N8nText>
					<N8nText
						v-else-if="manifestError"
						:class="$style.setupError"
						size="small"
						data-testid="slack-manifest-error"
					>
						{{ i18n.baseText('agents.builder.addTrigger.slack.manifestError') }}
					</N8nText>
					<div v-else :class="$style.codeBlock">
						<N8nButton
							variant="outline"
							size="small"
							:class="$style.codeBlockCopy"
							:disabled="!slackAppManifest"
							data-testid="slack-copy-manifest"
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

				<AgentIntegrationCredentialConnection
					v-if="integration && credentialPermissions"
					v-model="credentialId"
					:integration-type="integration.type"
					:integration-label="integration.label"
					:credentials="credentials"
					:credential-permissions="credentialPermissions"
					:credentials-loading="credentialsLoading"
					:disabled="connected || disabled || loading"
					:connected="connected"
					:show-connect-button="!connected"
					:show-disconnect-button="false"
					:loading="loading"
					:error-message="!connected ? errorMessage : ''"
					:error-is-conflict="errorIsConflict"
					:force-new-credential="forceNewCredential"
					@create="emit('create')"
					@edit="emit('edit')"
					@connect="emit('connect')"
				/>
			</div>
		</N8nCollapsiblePanel>
	</div>
</template>

<style module lang="scss">
.slackSetup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.stepContent {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--xs);
	min-width: 0;
}

.setupDescriptionContainer {
	display: flex;
	align-items: center;
	height: var(--height--xs);
}

.setupDescription,
.publishNotice {
	color: var(--text-color--subtler);
}

.setupError {
	color: var(--color--danger);
}

.tokenInputContainer,
.editTokenContainer {
	display: flex;
	width: 100%;
	flex-direction: column;
	width: 100%;
}

.editTokenContainer {
	gap: var(--spacing--sm);
	align-items: flex-start;
}

.tokenVisibilityButton {
	margin-right: calc(var(--spacing--3xs) * -1);
}

.createTokenContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	min-width: 0;
}

.manualPanel {
	background-color: transparent;
}

.manualConfiguration {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0 var(--spacing--xs) var(--spacing--xs);
}

.manualDescription,
.manifestHint {
	color: var(--color--text--tint-1);
}

.manifestSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.docsLink {
	color: var(--color--primary);
	text-decoration: underline;
}

.codeBlock {
	position: relative;
	margin-top: var(--spacing--3xs);
}

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
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
	white-space: pre;
	font-family: monospace;
	color: var(--color--text);
}
</style>
