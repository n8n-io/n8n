<script lang="ts" setup>
import { onMounted, computed, watch } from 'vue';
import {
	N8nActionDropdown,
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useInstanceAiMcpConnectionsExperiment } from '@/experiments/instanceAiMcpConnections';
import { useInstanceAiBrowserUseExperiment } from '@/experiments/instanceAiBrowserUse';
import { useInstanceAiComputerUseExperiment } from '@/experiments/instanceAiComputerUse';
import type { InstanceAiPermissions, InstanceAiPermissionMode } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const store = useInstanceAiSettingsStore();

const { isFeatureEnabled: isMcpConnectionsExperimentEnabled } =
	useInstanceAiMcpConnectionsExperiment();
const { isFeatureEnabled: isBrowserUseEnabled } = useInstanceAiBrowserUseExperiment();
const { isFeatureEnabled: isComputerUseExperimentEnabled } = useInstanceAiComputerUseExperiment();

const isAdmin = computed(() => store.canManage);

const PERMISSION_OPTIONS: InstanceAiPermissionMode[] = [
	'require_approval',
	'always_allow',
	'blocked',
];

const MCP_TOOL_PERMISSION_OPTIONS: InstanceAiPermissionMode[] = [
	'require_approval',
	'always_allow',
];

const PERMISSION_OPTION_LABEL: Record<InstanceAiPermissionMode, BaseTextKey> = {
	require_approval: 'settings.n8nAgent.permissions.needsApproval',
	always_allow: 'settings.n8nAgent.permissions.alwaysAllow',
	blocked: 'settings.n8nAgent.permissions.blocked',
};

const permissionKeys: Array<{
	key: keyof InstanceAiPermissions;
	labelKey: BaseTextKey;
}> = [
	{ key: 'createWorkflow', labelKey: 'settings.n8nAgent.permissions.createWorkflow' },
	{ key: 'updateWorkflow', labelKey: 'settings.n8nAgent.permissions.updateWorkflow' },
	{ key: 'runWorkflow', labelKey: 'settings.n8nAgent.permissions.runWorkflow' },
	{ key: 'publishWorkflow', labelKey: 'settings.n8nAgent.permissions.publishWorkflow' },
	{ key: 'deleteWorkflow', labelKey: 'settings.n8nAgent.permissions.deleteWorkflow' },
	{ key: 'deleteCredential', labelKey: 'settings.n8nAgent.permissions.deleteCredential' },
	{ key: 'createFolder', labelKey: 'settings.n8nAgent.permissions.createFolder' },
	{ key: 'deleteFolder', labelKey: 'settings.n8nAgent.permissions.deleteFolder' },
	{ key: 'moveWorkflowToFolder', labelKey: 'settings.n8nAgent.permissions.moveWorkflowToFolder' },
	{ key: 'tagWorkflow', labelKey: 'settings.n8nAgent.permissions.tagWorkflow' },
	{ key: 'createDataTable', labelKey: 'settings.n8nAgent.permissions.createDataTable' },
	{ key: 'mutateDataTableSchema', labelKey: 'settings.n8nAgent.permissions.mutateDataTableSchema' },
	{ key: 'mutateDataTableRows', labelKey: 'settings.n8nAgent.permissions.mutateDataTableRows' },
	{
		key: 'cleanupTestExecutions',
		labelKey: 'settings.n8nAgent.permissions.cleanupTestExecutions',
	},
	{ key: 'readFilesystem', labelKey: 'settings.n8nAgent.permissions.readFilesystem' },
	{ key: 'fetchUrl', labelKey: 'settings.n8nAgent.permissions.fetchUrl' },
	{ key: 'webSearch', labelKey: 'settings.n8nAgent.permissions.webSearch' },
	{
		key: 'restoreWorkflowVersion',
		labelKey: 'settings.n8nAgent.permissions.restoreWorkflowVersion',
	},
];

const isMcpAccessEnabled = computed(() => store.settings?.mcpAccessEnabled ?? true);

// LLM credential types the backend accepts as instance model credentials.
// Labels are provider brand names, not translatable UI text.
const INSTANCE_MODEL_CREDENTIAL_TYPES: Array<{ type: string; label: string }> = [
	{ type: 'openAiApi', label: 'OpenAI' },
	{ type: 'anthropicApi', label: 'Anthropic' },
	{ type: 'googlePalmApi', label: 'Google Gemini' },
	{ type: 'ollamaApi', label: 'Ollama' },
	{ type: 'groqApi', label: 'Groq' },
	{ type: 'deepSeekApi', label: 'DeepSeek' },
	{ type: 'mistralCloudApi', label: 'Mistral' },
	{ type: 'xAiApi', label: 'xAI' },
	{ type: 'openRouterApi', label: 'OpenRouter' },
	{ type: 'cohereApi', label: 'Cohere' },
];

const showModelCredentialSection = computed(() => isAdmin.value && !store.isProxyEnabled);

const selectedModelCredentialId = computed(() => {
	if (store.draft.modelCredentialId !== undefined) return store.draft.modelCredentialId ?? '';
	return store.settings?.modelCredentialId ?? '';
});

const createModelCredentialItems = computed<Array<ActionDropdownItem<string>>>(() =>
	INSTANCE_MODEL_CREDENTIAL_TYPES.map(({ type, label }) => ({ id: type, label })),
);

let creatingModelCredential = false;

function handleModelCredentialChange(value: string | number | boolean | null) {
	store.setField('modelCredentialId', value ? String(value) : null);
	void store.save();
}

function handleCreateModelCredential(credentialType: string) {
	creatingModelCredential = true;
	uiStore.openNewCredential(
		credentialType,
		false,
		false,
		undefined,
		undefined,
		undefined,
		undefined,
		{ availability: 'instance' },
	);
}

// Re-fetch the instance model credentials when the credential edit modal closes;
// auto-select the credential the admin just created.
watch(
	() => uiStore.isModalActiveById[CREDENTIAL_EDIT_MODAL_KEY],
	async (isOpen, wasOpen) => {
		if (!wasOpen || isOpen || !showModelCredentialSection.value) return;
		const previousIds = new Set(store.instanceModelCredentials.map((c) => c.id));
		await store.refreshInstanceModelCredentials();
		if (creatingModelCredential) {
			creatingModelCredential = false;
			const newCred = store.instanceModelCredentials.find((c) => !previousIds.has(c.id));
			if (newCred) {
				store.setField('modelCredentialId', newCred.id);
				void store.save();
			}
		}
	},
);

const isEnabled = computed(
	() => store.settings?.enabled ?? settingsStore.moduleSettings?.['instance-ai']?.enabled ?? false,
);

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.n8nAgent'));
	void store.fetch();
});

function handleEnabledToggle(value: string | number | boolean) {
	store.setField('enabled', Boolean(value));
	void store.save();
}

function handleComputerUseToggle(value: string | number | boolean) {
	store.setField('localGatewayDisabled', !Boolean(value));
	void store.save();
}

function handleBrowserUseToggle(value: string | number | boolean) {
	store.setField('browserUseEnabled', Boolean(value));
	void store.save();
}

function handleMcpAccessToggle(value: string | number | boolean) {
	store.setField('mcpAccessEnabled', Boolean(value));
	void store.save();
}

function handlePermissionChange(key: keyof InstanceAiPermissions, value: InstanceAiPermissionMode) {
	store.setPermission(key, value);
	void store.save();
}
</script>

<template>
	<div :class="$style.container" data-test-id="n8n-agent-settings">
		<header :class="$style.header">
			<N8nHeading :class="$style.pageTitle" size="xlarge" class="mb-2xs">
				{{ i18n.baseText('settings.n8nAgent') }}
			</N8nHeading>
			<N8nText size="medium" color="text-light">
				{{ i18n.baseText('settings.n8nAgent.description') }}
			</N8nText>
		</header>

		<div v-if="store.isLoading" :class="$style.loading">
			<N8nIcon icon="spinner" spin />
		</div>

		<template v-else>
			<template v-if="isAdmin">
				<div :class="$style.card">
					<div :class="$style.sectionBlock">
						<div :class="$style.enableSection">
							<N8nHeading tag="h2" size="small">
								{{ i18n.baseText('settings.n8nAgent.enable.label') }}
							</N8nHeading>
							<div :class="$style.switchRow">
								<span :class="$style.switchDescription">
									{{ i18n.baseText('settings.n8nAgent.enable.description') }}
								</span>
								<ElSwitch
									:model-value="isEnabled"
									:disabled="store.isSaving"
									data-test-id="n8n-agent-enable-toggle"
									@update:model-value="handleEnabledToggle"
								/>
							</div>
						</div>
					</div>
				</div>
			</template>

			<template v-if="isEnabled">
				<div v-if="showModelCredentialSection" :class="$style.card">
					<div :class="$style.settingsRow">
						<div :class="$style.settingsRowLeft">
							<span :class="$style.settingsRowLabel">
								{{ i18n.baseText('settings.n8nAgent.modelCredential.label') }}
							</span>
							<span :class="$style.settingsRowDescription">
								{{ i18n.baseText('settings.n8nAgent.modelCredential.description') }}
							</span>
							<N8nLink
								:class="$style.manageInstanceCredentialsLink"
								size="small"
								:to="{ name: VIEWS.INSTANCE_CREDENTIALS_SETTINGS }"
								data-test-id="n8n-agent-manage-instance-credentials-link"
							>
								{{ i18n.baseText('settings.n8nAgent.modelCredential.manage') }}
							</N8nLink>
						</div>
						<div :class="$style.modelCredentialControls">
							<N8nSelect
								:class="$style.modelCredentialSelect"
								:model-value="selectedModelCredentialId"
								size="small"
								:disabled="store.isSaving"
								:placeholder="i18n.baseText('settings.n8nAgent.modelCredential.placeholder')"
								data-test-id="n8n-agent-model-credential-select"
								@update:model-value="handleModelCredentialChange"
							>
								<N8nOption
									value=""
									:label="i18n.baseText('settings.n8nAgent.modelCredential.none')"
								/>
								<N8nOption
									v-for="cred in store.instanceModelCredentials"
									:key="cred.id"
									:value="cred.id"
									:label="`${cred.name} (${cred.provider})`"
								/>
							</N8nSelect>
							<N8nActionDropdown
								:items="createModelCredentialItems"
								placement="bottom-end"
								data-test-id="n8n-agent-model-credential-create"
								@select="handleCreateModelCredential"
							>
								<template #activator>
									<N8nButton
										variant="subtle"
										size="small"
										:disabled="store.isSaving"
										data-test-id="n8n-agent-model-credential-create-button"
									>
										{{ i18n.baseText('settings.n8nAgent.modelCredential.createNew') }}
										<N8nIcon icon="chevron-down" size="xsmall" />
									</N8nButton>
								</template>
							</N8nActionDropdown>
						</div>
					</div>
				</div>

				<div v-if="isAdmin && isComputerUseExperimentEnabled" :class="$style.card">
					<div :class="$style.settingsRow">
						<div :class="$style.settingsRowLeft">
							<span :class="$style.settingsRowLabel">
								{{ i18n.baseText('settings.n8nAgent.computerUse.label') }}
							</span>
							<span :class="$style.settingsRowDescription">
								{{ i18n.baseText('settings.n8nAgent.computerUse.description') }}
							</span>
						</div>
						<ElSwitch
							:model-value="!(store.settings?.localGatewayDisabled ?? false)"
							:disabled="store.isSaving"
							data-test-id="n8n-agent-computer-use-toggle"
							@update:model-value="handleComputerUseToggle"
						/>
					</div>
				</div>

				<div v-if="isAdmin && isBrowserUseEnabled" :class="$style.card">
					<div :class="$style.settingsRow">
						<div :class="$style.settingsRowLeft">
							<span :class="$style.settingsRowLabel">
								{{ i18n.baseText('settings.n8nAgent.browserUse.label') }}
							</span>
							<span :class="$style.settingsRowDescription">
								{{ i18n.baseText('settings.n8nAgent.browserUse.description') }}
							</span>
						</div>
						<ElSwitch
							:model-value="store.settings?.browserUseEnabled ?? true"
							:disabled="store.isSaving"
							data-test-id="n8n-agent-browser-use-toggle"
							@update:model-value="handleBrowserUseToggle"
						/>
					</div>
				</div>

				<div v-if="isAdmin && isMcpConnectionsExperimentEnabled" :class="$style.card">
					<div :class="[$style.settingsRow, { [$style.settingsRowBorder]: isMcpAccessEnabled }]">
						<div :class="$style.settingsRowLeft">
							<span :class="$style.settingsRowLabel">
								{{ i18n.baseText('settings.n8nAgent.mcpAccess.label') }}
							</span>
							<span :class="$style.settingsRowDescription">
								{{ i18n.baseText('settings.n8nAgent.mcpAccess.description') }}
							</span>
						</div>
						<ElSwitch
							:model-value="isMcpAccessEnabled"
							:disabled="store.isSaving"
							data-test-id="n8n-agent-mcp-access-toggle"
							@update:model-value="handleMcpAccessToggle"
						/>
					</div>
					<div v-if="isMcpAccessEnabled" :class="$style.settingsRow">
						<div :class="$style.settingsRowLeft">
							<span :class="$style.settingsRowLabel">
								{{ i18n.baseText('settings.n8nAgent.permissions.executeMcpTool') }}
							</span>
						</div>
						<N8nSelect
							:class="$style.permissionSelect"
							:model-value="store.getPermission('executeMcpTool')"
							size="small"
							:disabled="store.isSaving"
							data-test-id="n8n-agent-permission-executeMcpTool"
							@update:model-value="
								handlePermissionChange('executeMcpTool', $event as InstanceAiPermissionMode)
							"
						>
							<N8nOption
								v-for="option in MCP_TOOL_PERMISSION_OPTIONS"
								:key="option"
								:value="option"
								:label="i18n.baseText(PERMISSION_OPTION_LABEL[option])"
							/>
						</N8nSelect>
					</div>
				</div>

				<template v-if="isAdmin">
					<div :class="$style.permissionsHeader">
						<N8nHeading :class="$style.sectionTitle" tag="h3" size="medium">
							{{ i18n.baseText('settings.n8nAgent.permissions.title') }}
						</N8nHeading>
						<N8nText size="medium" color="text-light">
							{{ i18n.baseText('settings.n8nAgent.permissions.description') }}
						</N8nText>
					</div>

					<div :class="$style.card">
						<div
							v-for="(perm, index) in permissionKeys"
							:key="perm.key"
							:class="[
								$style.settingsRow,
								{ [$style.settingsRowBorder]: index < permissionKeys.length - 1 },
							]"
						>
							<div :class="$style.settingsRowLeft">
								<span :class="$style.settingsRowLabel">
									{{ i18n.baseText(perm.labelKey) }}
								</span>
							</div>
							<N8nSelect
								:class="$style.permissionSelect"
								:model-value="store.getPermission(perm.key)"
								size="small"
								:disabled="store.isSaving"
								:data-test-id="`n8n-agent-permission-${perm.key}`"
								@update:model-value="
									handlePermissionChange(perm.key, $event as InstanceAiPermissionMode)
								"
							>
								<N8nOption
									v-for="option in PERMISSION_OPTIONS"
									:key="option"
									:value="option"
									:label="i18n.baseText(PERMISSION_OPTION_LABEL[option])"
								/>
							</N8nSelect>
						</div>
					</div>
				</template>
			</template>

			<div v-if="store.isDirty" :class="$style.footer">
				<N8nButton
					type="secondary"
					:label="i18n.baseText('generic.cancel')"
					@click="store.reset()"
				/>
				<N8nButton
					:label="i18n.baseText('settings.personal.save')"
					:loading="store.isSaving"
					@click="store.save()"
				/>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-width: 720px;
	margin: 0 auto;
	padding-bottom: var(--spacing--2xl);
}

.pageTitle {
	font-weight: var(--font-weight--medium);
	line-height: 26px;
	color: var(--color--text--shade-1);
}

.header {
	display: flex;
	flex-direction: column;
	margin-bottom: var(--spacing--xs);
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl);
	color: var(--color--text--tint-1);
}

.card {
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}

.sectionBlock {
	padding: var(--spacing--sm);
	background: var(--color--background--light-3);
}

.settingsRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
	padding: var(--spacing--xs) var(--spacing--sm);
	min-height: 64px;
	background: var(--color--background--light-3);
}

.settingsRowBorder {
	position: relative;

	&::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: var(--spacing--sm);
		right: var(--spacing--sm);
		height: 1px;
		background: var(--color--foreground);
	}
}

.settingsRowLeft {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	// Let the text column shrink and wrap instead of running under the controls
	flex: 1;
	min-width: 0;
}

.settingsRowLabel {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: 20px;
	color: var(--color--text--shade-1);
}

.settingsRowDescription {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.sectionTitle {
	font-weight: var(--font-weight--medium);
	line-height: 24px;
	color: var(--color--text--shade-1);
}

.permissionsHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--xs);
}

.permissionSelect {
	width: 178px;
	flex-shrink: 0;
}

.modelCredentialControls {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.modelCredentialSelect {
	width: 240px;
}

.manageInstanceCredentialsLink {
	margin-top: var(--spacing--3xs);
	align-self: flex-start;
}

.enableSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.switchRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--4xs) 0;
}

.switchDescription {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--sm);
}
</style>
