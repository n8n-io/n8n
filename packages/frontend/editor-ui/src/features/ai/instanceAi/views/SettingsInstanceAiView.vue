<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import {
	N8nBadge,
	N8nButton,
	N8nEmptyState,
	N8nEnterpriseReadinessBadge,
	N8nLoading,
	N8nOption,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nSwitch,
	N8nText,
	type EmptyStateIconCards,
} from '@n8n/design-system';
import {
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	type InstanceAiPermissions,
	type InstanceAiPermissionMode,
} from '@n8n/api-types';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
// Experiment cleanup: remove with openWorkflowInAssistant.
import DefaultEditorSetting from '@/experiments/openWorkflowInAssistant/components/DefaultEditorSetting.vue';
import {
	isContextPreferencesEnabled,
	isContextSkillsEnabled,
} from '@/features/settings/context/context.utils';
import { useInstanceAiConfiguration } from '../composables/useInstanceAiConfiguration';
import { useInstanceCredentialTest } from '../composables/useInstanceCredentialTest';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useSetupPageViewTelemetry } from '../instanceAiSetup.telemetry';
import type { InstanceAiConnectionKind } from '../constants';
import ConnectionDialog from '../components/settings/ConnectionDialog.vue';
import SandboxSettingsRow from '../components/settings/SandboxSettingsRow.vue';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const message = useMessage();
const router = useRouter();
const settingsStore = useSettingsStore();
const credentialsStore = useCredentialsStore();
const store = useInstanceAiSettingsStore();
const { isTestingCredential, testSavedCredential } = useInstanceCredentialTest();
const {
	modelCredential,
	modelConfigured: isModelConfigured,
	sandboxCredentialId,
	sandboxConfigured: isSandboxConfigured,
	searchCredential,
	searchState,
} = useInstanceAiConfiguration();

const DOCS_URL = 'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant';

const isAdmin = computed(() => store.canManage);
const isEnabled = computed(
	() => store.settings?.enabled ?? settingsStore.moduleSettings?.['instance-ai']?.enabled ?? false,
);
const isOff = computed(() => !isEnabled.value);
const isMcpAccessEnabled = computed(() => store.settings?.mcpAccessEnabled ?? true);
const isSelfManaged = computed(() => !store.isProxyEnabled && !store.isCloudManaged);
const showCredentialsRows = computed(() => isAdmin.value && isSelfManaged.value);
const showSandboxRow = computed(() => isAdmin.value && !store.isCloudManaged);
const isModelConnectionEnvManaged = computed(
	() =>
		isSelfManaged.value &&
		(store.settings?.envManaged?.model.provider ?? store.settings?.modelEnvConfigured ?? false),
);
const isModelNameEnvManaged = computed(
	() => isSelfManaged.value && (store.settings?.envManaged?.model.model ?? false),
);
const isModelReadOnly = computed(
	() => isModelConnectionEnvManaged.value && isModelNameEnvManaged.value,
);
const isSandboxEnvManaged = computed(
	() => isSelfManaged.value && (store.settings?.sandboxEnvConfigured ?? false),
);
const isSearchEnvManaged = computed(
	() => isSelfManaged.value && (store.settings?.searchEnvConfigured ?? false),
);

const modelValue = computed(() => {
	if (isModelConnectionEnvManaged.value)
		return i18n.baseText('instanceAi.onboarding.foundOnServer');
	if (store.settings?.modelCredentialId) {
		const typeLabel = modelCredential.value ? credentialTypeLabel(modelCredential.value.type) : '';
		const modelName = store.settings.modelName ?? '';
		return [typeLabel, modelName].filter(Boolean).join(' · ');
	}
	return i18n.baseText('settings.n8nAgent.modelCredential.env.value');
});
const modelDescription = computed<{ key: BaseTextKey; warning: boolean } | null>(() => {
	if (isModelConnectionEnvManaged.value)
		return { key: 'settings.n8nAgent.modelCredential.env.description', warning: false };
	if ((store.settings?.modelCredentialId && store.settings.modelName) || isOff.value) return null;
	return { key: 'settings.n8nAgent.modelCredential.missing.description', warning: true };
});

const searchValue = computed(() => {
	if (isSearchEnvManaged.value) return i18n.baseText('instanceAi.onboarding.foundOnServer');
	if (searchState.value === 'disabled') return i18n.baseText('instanceAi.onboarding.disabled');
	return searchCredential.value ? credentialTypeLabel(searchCredential.value.type) : '';
});

/** Mirrors the backend `setupCompleted`: only a direct self-managed instance needs setup. */
const isSetupComplete = computed(
	() =>
		!showCredentialsRows.value ||
		(isModelConfigured.value && isSandboxConfigured.value && searchState.value !== 'notset'),
);
const neverConfigured = computed(() => {
	if (isEnabled.value) return false;
	if (!isSelfManaged.value || !store.settings) return true;
	return !isModelConfigured.value && !isSandboxConfigured.value && searchState.value === 'notset';
});

const emptyStateIcon: EmptyStateIconCards = {
	type: 'cards',
	center: 'sparkles',
	sides: ['workflow', 'message-square', 'search', 'bot'],
};

const PERMISSION_OPTIONS: InstanceAiPermissionMode[] = [
	'require_approval',
	'always_allow',
	'blocked',
];

const PREFERENCE_PERMISSION_OPTIONS: InstanceAiPermissionMode[] = ['always_allow', 'blocked'];

const PERMISSION_OPTION_LABEL: Record<InstanceAiPermissionMode, BaseTextKey> = {
	require_approval: 'settings.n8nAgent.permissions.needsApproval',
	always_allow: 'settings.n8nAgent.permissions.alwaysAllow',
	blocked: 'settings.n8nAgent.permissions.blocked',
};

interface PermissionGroup {
	id: string;
	labelKey: BaseTextKey;
	descriptionKey?: BaseTextKey;
	keys: Array<keyof InstanceAiPermissions>;
}

const PERMISSION_GROUPS: PermissionGroup[] = [
	{
		id: 'workflows',
		labelKey: 'settings.n8nAgent.permissions.group.workflows',
		keys: [
			'createWorkflow',
			'updateWorkflow',
			'runWorkflow',
			'publishWorkflow',
			'deleteWorkflow',
			'restoreWorkflowVersion',
			'tagWorkflow',
			'moveWorkflowToFolder',
		],
	},
	{
		id: 'nodes',
		labelKey: 'settings.n8nAgent.permissions.group.nodes',
		keys: ['executeNode'],
	},
	{
		id: 'folders',
		labelKey: 'settings.n8nAgent.permissions.group.folders',
		keys: ['createFolder', 'deleteFolder'],
	},
	{
		id: 'dataTables',
		labelKey: 'settings.n8nAgent.permissions.group.dataTables',
		keys: ['createDataTable', 'mutateDataTableSchema', 'mutateDataTableRows'],
	},
	{
		id: 'credentials',
		labelKey: 'settings.n8nAgent.permissions.group.credentials',
		keys: ['createCredential', 'deleteCredential'],
	},
	{
		id: 'system',
		labelKey: 'settings.n8nAgent.permissions.group.system',
		keys: ['cleanupTestExecutions'],
	},
	{
		id: 'web',
		labelKey: 'settings.n8nAgent.permissions.group.web',
		keys: ['fetchUrl', 'webSearch'],
	},
	{
		id: 'mcp',
		labelKey: 'settings.n8nAgent.permissions.group.mcp',
		descriptionKey: 'settings.n8nAgent.permissions.group.mcpDescription',
		keys: ['mcpRead', 'mcpWrite'],
	},
];

const PREFERENCES_PERMISSION_GROUP: PermissionGroup = {
	id: 'preferences',
	labelKey: 'settings.n8nAgent.permissions.group.preferences',
	keys: ['createPreference'],
};

const SKILLS_PERMISSION_GROUP: PermissionGroup = {
	id: 'skills',
	labelKey: 'settings.n8nAgent.permissions.group.skills',
	keys: ['createSkill', 'updateSkill', 'deleteSkill'],
};

const permissionGroups = computed(() => [
	...PERMISSION_GROUPS,
	...(isContextPreferencesEnabled() ? [PREFERENCES_PERMISSION_GROUP] : []),
	...(isContextSkillsEnabled() ? [SKILLS_PERMISSION_GROUP] : []),
]);

const expandedGroups = reactive<Record<string, boolean>>({});

function isGroupLocked(group: PermissionGroup) {
	return isOff.value || (group.id === 'mcp' && !isMcpAccessEnabled.value);
}

function groupSummary(group: PermissionGroup) {
	if (group.id === 'mcp' && !isMcpAccessEnabled.value)
		return i18n.baseText('settings.n8nAgent.permissions.group.mcpDisabled');
	// Each key has its own default, so compare against that one. Comparing
	// against `require_approval` counts an untouched Preferences group, whose
	// default is `always_allow`, as an exception.
	const exceptions = group.keys.filter(
		(key) => store.getPermission(key) !== DEFAULT_INSTANCE_AI_PERMISSIONS[key],
	).length;
	if (exceptions === 0) return i18n.baseText('settings.n8nAgent.permissions.group.default');
	if (exceptions === 1) return i18n.baseText('settings.n8nAgent.permissions.group.exception');
	return i18n.baseText('settings.n8nAgent.permissions.group.exceptions', {
		interpolate: { count: exceptions },
	});
}

function permissionOptionsFor(key: keyof InstanceAiPermissions) {
	if (key === 'createPreference') return PREFERENCE_PERMISSION_OPTIONS;
	return PERMISSION_OPTIONS;
}

/** Exactly one dialog can be active; transitions between steps never observe an all-closed state. */
const activeDialog = ref<InstanceAiConnectionKind | null>(null);
/** True while walking through the missing setup items, so saving one dialog opens the next. */
const setupChain = ref(false);
/** The switch shows on while the walkthrough runs; `enabled` is saved only once setup is complete. */
const isEnabling = ref(false);
const isSwitchOn = computed(() => isEnabled.value || isEnabling.value);
/** Saved credentials that turning on still has to test. Each one is tested at most once. */
let credentialsToTest = new Set<'model' | 'sandbox'>();

function setDialogOpen(kind: InstanceAiConnectionKind, isOpen: boolean) {
	if (isOpen) {
		activeDialog.value = kind;
	} else if (activeDialog.value === kind) {
		// Dialogs in the walkthrough don't close themselves, so this is a cancel.
		activeDialog.value = null;
		setupChain.value = false;
		isEnabling.value = false;
	}
}

function openModelDialog() {
	if (isModelReadOnly.value) return;
	setupChain.value = false;
	activeDialog.value = 'model';
}

function openSandboxDialog() {
	if (isSandboxEnvManaged.value) return;
	setupChain.value = false;
	activeDialog.value = 'sandbox';
}

function openSearchDialog() {
	if (isSearchEnvManaged.value) return;
	setupChain.value = false;
	activeDialog.value = 'search';
}

/** A saved credential can stop working, so turning on tests it once. Other paths skip the test. */
async function savedCredentialWorks(kind: 'model' | 'sandbox'): Promise<boolean> {
	if (!isEnabling.value || !credentialsToTest.delete(kind)) return true;
	if (kind === 'model') {
		const id = store.settings?.modelCredentialId;
		const credential = modelCredential.value;
		if (!id) return true;
		return !!credential && (await testSavedCredential(id, credential.name, credential.type));
	}
	if (!sandboxCredentialId.value) return true;
	const type = store.settings?.sandboxProvider === 'daytona' ? 'daytonaApi' : 'httpHeaderAuth';
	return await testSavedCredential(sandboxCredentialId.value, 'n8n Assistant sandbox', type);
}

async function nextSetupDialog(): Promise<InstanceAiConnectionKind | null> {
	if (
		showCredentialsRows.value &&
		(!isModelConfigured.value || !(await savedCredentialWorks('model')))
	) {
		return 'model';
	}
	// An environment-configured sandbox has no dialog. It only needs to be switched on.
	if (!(await enableEnvironmentSandboxIfNeeded())) return null;
	if (
		showSandboxRow.value &&
		!isSandboxEnvManaged.value &&
		(!isSandboxConfigured.value || !(await savedCredentialWorks('sandbox')))
	) {
		return 'sandbox';
	}
	if (showCredentialsRows.value && searchState.value === 'notset') return 'search';
	return null;
}

/**
 * Opens the dialog for the first missing setup item. When none is left, it closes the
 * walkthrough and saves a pending switch-on.
 */
async function continueSetup() {
	setupChain.value = true;
	const next = await nextSetupDialog();
	if (!setupChain.value) return;
	setupChain.value = next !== null;
	activeDialog.value = next;
	// The admin saves this credential in its dialog, so the walkthrough does not test it again.
	if (next === 'model' || next === 'sandbox') credentialsToTest.delete(next);
	if (next !== null || !isEnabling.value) return;
	if (isSetupComplete.value) await store.persistEnabled(true);
	isEnabling.value = false;
}

async function handleDialogSaved() {
	if (setupChain.value) await continueSetup();
}

function credentialTypeLabel(type: string) {
	return credentialsStore.getCredentialTypeByName(type)?.displayName ?? type;
}

async function enableEnvironmentSandboxIfNeeded(): Promise<boolean> {
	if (!isSandboxEnvManaged.value || isSandboxConfigured.value) return true;
	store.setField('sandboxEnabled', true);
	return await store.save();
}

useSetupPageViewTelemetry('settings');

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.n8nAgent'));
	void store.fetch();
	void credentialsStore.fetchCredentialTypes(false);
});

async function enable() {
	credentialsToTest = new Set(
		showCredentialsRows.value && store.canManageInstanceCredentials ? ['model', 'sandbox'] : [],
	);
	if (isSetupComplete.value && credentialsToTest.size === 0) {
		await store.persistEnabled(true);
		return;
	}
	isEnabling.value = true;
	await continueSetup();
}

async function handleEnabledToggle(value: boolean) {
	if (value) {
		await enable();
		return;
	}

	const confirmed = await message.confirm(
		i18n.baseText('settings.n8nAgent.status.disable.description'),
		{
			title: i18n.baseText('settings.n8nAgent.status.disable.title'),
			confirmButtonText: i18n.baseText('settings.n8nAgent.status.disable'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (confirmed === MODAL_CONFIRM) await store.persistEnabled(false);
}

function handleBrowserUseToggle(value: boolean) {
	store.setField('browserUseEnabled', value);
	void store.save();
}

function handleMcpAccessToggle(value: boolean) {
	store.setField('mcpAccessEnabled', value);
	void store.save();
}

function handlePermissionChange(key: keyof InstanceAiPermissions, value: InstanceAiPermissionMode) {
	store.setPermission(key, value);
	void store.save();
}

function openAiUsageSettings() {
	void router.push({ name: VIEWS.AI_SETTINGS });
}
</script>

<template>
	<N8nSettingsLayout data-test-id="n8n-agent-settings">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.n8nAgent')"
			:description="i18n.baseText('settings.n8nAgent.description')"
			:docs-url="DOCS_URL"
			:docs-label="i18n.baseText('settings.n8nAgent.docsLabel')"
		>
			<template v-if="settingsStore.isEnterprisePlan" #titleTrailing>
				<N8nEnterpriseReadinessBadge
					size="xsmall"
					data-test-id="n8n-agent-enterprise-readiness-badge"
				/>
			</template>
		</N8nSettingsPageHeader>

		<N8nLoading v-if="store.isLoading" :rows="3" :shrink-last="false" />

		<N8nEmptyState
			v-else-if="neverConfigured"
			:icon="emptyStateIcon"
			:heading="i18n.baseText('settings.n8nAgent.empty.title')"
			:description="i18n.baseText('settings.n8nAgent.empty.description')"
			:button-text="isAdmin ? i18n.baseText('settings.n8nAgent.empty.enable') : undefined"
			:button-disabled="store.isSaving || isEnabling || isTestingCredential"
			button-variant="solid"
			@click:button="enable"
		>
			<template v-if="isAdmin" #additionalContent>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.n8nAgent.empty.footnote') }}
				</N8nText>
			</template>
		</N8nEmptyState>

		<template v-else-if="isAdmin">
			<N8nSettingsSection>
				<N8nSettingsRowGroup>
					<N8nSettingsRow
						:title="i18n.baseText('settings.n8nAgent.enable.label')"
						:description="i18n.baseText('settings.n8nAgent.enable.description')"
					>
						<template #action>
							<N8nSwitch
								:model-value="isSwitchOn"
								:disabled="store.isSaving || isEnabling || isTestingCredential"
								:aria-label="i18n.baseText('settings.n8nAgent.enable.label')"
								data-test-id="n8n-agent-enable-toggle"
								@update:model-value="handleEnabledToggle"
							/>
						</template>
					</N8nSettingsRow>

					<N8nSettingsRow
						v-if="showCredentialsRows"
						:class="{ [$style.dim]: isOff }"
						:clickable="!isOff && isModelConfigured && !isModelReadOnly"
						data-test-id="n8n-agent-model-row"
						@click="openModelDialog"
					>
						<template #info>
							<N8nText bold size="medium" color="text-dark">
								{{ i18n.baseText('settings.n8nAgent.modelCredential.label') }}
							</N8nText>
							<N8nText
								v-if="modelDescription"
								size="small"
								:color="modelDescription.warning ? 'warning' : 'text-light'"
							>
								{{ i18n.baseText(modelDescription.key) }}
							</N8nText>
						</template>
						<template v-if="!isOff" #action>
							<N8nButton
								v-if="!isModelConfigured"
								variant="solid"
								size="medium"
								:label="i18n.baseText('settings.n8nAgent.modelCredential.add')"
								:disabled="store.isSaving"
								data-test-id="n8n-agent-model-add"
								@click="continueSetup"
							/>
							<N8nText
								v-else-if="isModelReadOnly"
								size="small"
								color="text-light"
								data-test-id="n8n-agent-model-env-value"
							>
								{{ modelValue }}
							</N8nText>
							<N8nSettingsRowConfigure v-else :value="modelValue" />
						</template>
					</N8nSettingsRow>

					<SandboxSettingsRow
						v-if="showSandboxRow"
						:class="{ [$style.dim]: isOff }"
						:disabled="isOff"
						@configure="openSandboxDialog"
						@enable="enableEnvironmentSandboxIfNeeded"
					/>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>

			<!-- Experiment cleanup: remove with openWorkflowInAssistant. -->
			<DefaultEditorSetting />

			<N8nSettingsSection
				:class="{ [$style.dim]: isOff }"
				:title="i18n.baseText('settings.n8nAgent.capabilities.title')"
				:description="i18n.baseText('settings.n8nAgent.capabilities.description')"
			>
				<N8nSettingsRowGroup>
					<N8nSettingsRow
						v-if="showCredentialsRows"
						:clickable="!isOff && searchState !== 'notset' && !isSearchEnvManaged"
						data-test-id="n8n-agent-search-row"
						@click="openSearchDialog"
					>
						<template #info>
							<span :class="$style.titleWithTag">
								<N8nText bold size="medium" color="text-dark">
									{{ i18n.baseText('settings.n8nAgent.search.label') }}
								</N8nText>
								<N8nBadge variant="success" size="xsmall">
									{{ i18n.baseText('settings.n8nAgent.search.recommended') }}
								</N8nBadge>
							</span>
							<N8nText size="small" color="text-light">
								{{
									searchState === 'env'
										? i18n.baseText('settings.n8nAgent.search.env.description')
										: i18n.baseText('settings.n8nAgent.search.description')
								}}
							</N8nText>
						</template>
						<template v-if="!isOff" #action>
							<N8nButton
								v-if="searchState === 'notset'"
								variant="outline"
								size="medium"
								:label="i18n.baseText('settings.n8nAgent.search.setup')"
								:disabled="store.isSaving"
								data-test-id="n8n-agent-search-setup"
								@click="openSearchDialog"
							/>
							<N8nText
								v-else-if="isSearchEnvManaged"
								size="small"
								color="text-light"
								data-test-id="n8n-agent-search-env-value"
							>
								{{ searchValue }}
							</N8nText>
							<N8nSettingsRowConfigure v-else :value="searchValue" />
						</template>
					</N8nSettingsRow>

					<N8nSettingsRow
						:title="i18n.baseText('settings.n8nAgent.browserUse.label')"
						:description="i18n.baseText('settings.n8nAgent.browserUse.description')"
					>
						<template #action>
							<N8nSwitch
								:model-value="!isOff && (store.settings?.browserUseEnabled ?? true)"
								:disabled="store.isSaving || isOff"
								:aria-label="i18n.baseText('settings.n8nAgent.browserUse.label')"
								data-test-id="n8n-agent-browser-use-toggle"
								@update:model-value="handleBrowserUseToggle"
							/>
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>

			<N8nSettingsSection
				:class="{ [$style.dim]: isOff }"
				:title="i18n.baseText('settings.n8nAgent.mcp.title')"
				:description="i18n.baseText('settings.n8nAgent.mcp.description')"
			>
				<N8nSettingsRowGroup>
					<N8nSettingsRow
						:title="i18n.baseText('settings.n8nAgent.mcpAccess.label')"
						:description="i18n.baseText('settings.n8nAgent.mcpAccess.description')"
					>
						<template #action>
							<N8nSwitch
								:model-value="!isOff && isMcpAccessEnabled"
								:disabled="store.isSaving || isOff"
								:aria-label="i18n.baseText('settings.n8nAgent.mcpAccess.label')"
								data-test-id="n8n-agent-mcp-access-toggle"
								@update:model-value="handleMcpAccessToggle"
							/>
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>

			<N8nSettingsSection
				:class="{ [$style.dim]: isOff }"
				:title="i18n.baseText('settings.n8nAgent.permissions.title')"
				:description="i18n.baseText('settings.n8nAgent.permissions.description')"
			>
				<N8nSettingsRowGroup>
					<N8nSettingsRow
						v-for="group in permissionGroups"
						:key="group.id"
						v-model="expandedGroups[group.id]"
						:class="{ [$style.dim]: !isOff && isGroupLocked(group) }"
						:title="i18n.baseText(group.labelKey)"
						:expandable="!isGroupLocked(group)"
						:expand-label="groupSummary(group)"
						:collapse-label="groupSummary(group)"
						:data-test-id="`n8n-agent-permission-group-${group.id}`"
					>
						<template v-if="isGroupLocked(group)" #action>
							<N8nText size="small" color="text-light">{{ groupSummary(group) }}</N8nText>
						</template>
						<template #expanded>
							<div :class="$style.permissionList">
								<N8nText
									v-if="group.descriptionKey"
									:class="$style.permissionDescription"
									size="small"
									color="text-light"
								>
									{{ i18n.baseText(group.descriptionKey) }}
								</N8nText>
								<div v-for="key in group.keys" :key="key" :class="$style.permissionRow">
									<N8nText size="small" color="text-dark">
										{{ i18n.baseText(`settings.n8nAgent.permissions.${key}` as BaseTextKey) }}
									</N8nText>
									<N8nSelect
										:class="$style.permissionSelect"
										:model-value="store.getPermission(key)"
										size="small"
										:disabled="store.isSaving || isGroupLocked(group)"
										:data-test-id="`n8n-agent-permission-${key}`"
										@update:model-value="
											handlePermissionChange(key, $event as InstanceAiPermissionMode)
										"
									>
										<N8nOption
											v-for="option in permissionOptionsFor(key)"
											:key="option"
											:value="option"
											:label="i18n.baseText(PERMISSION_OPTION_LABEL[option])"
										/>
									</N8nSelect>
								</div>
							</div>
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>

			<N8nSettingsSection
				:class="{ [$style.dim]: isOff }"
				:title="i18n.baseText('settings.n8nAgent.dataSharing.title')"
				:description="i18n.baseText('settings.n8nAgent.dataSharing.description')"
			>
				<N8nSettingsRowGroup>
					<N8nSettingsRow
						:title="i18n.baseText('settings.n8nAgent.dataSharing.manage.label')"
						:description="i18n.baseText('settings.n8nAgent.dataSharing.manage.description')"
						:clickable="!isOff && store.canManageAiUsage"
						data-test-id="n8n-agent-data-sharing-row"
						@click="openAiUsageSettings"
					>
						<template v-if="!isOff && store.canManageAiUsage" #action>
							<N8nSettingsRowConfigure />
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>
		</template>

		<!-- Experiment cleanup: remove with openWorkflowInAssistant. Members see
		none of the admin sections above, so they get the row on its own. -->
		<DefaultEditorSetting v-if="!isAdmin && !store.isLoading && !neverConfigured" />

		<ConnectionDialog
			v-if="showCredentialsRows && !isModelReadOnly"
			kind="model"
			:open="activeDialog === 'model'"
			:setup="setupChain"
			@update:open="setDialogOpen('model', $event)"
			@saved="handleDialogSaved"
		/>
		<ConnectionDialog
			v-if="showSandboxRow && !isSandboxEnvManaged"
			kind="sandbox"
			:open="activeDialog === 'sandbox'"
			:setup="showCredentialsRows && setupChain"
			@update:open="setDialogOpen('sandbox', $event)"
			@saved="handleDialogSaved"
		/>
		<ConnectionDialog
			v-if="showCredentialsRows && !isSearchEnvManaged"
			kind="search"
			:open="activeDialog === 'search'"
			:setup="setupChain"
			@update:open="setDialogOpen('search', $event)"
			@saved="handleDialogSaved"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.titleWithTag {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.dim {
	opacity: 0.5;
	pointer-events: none;
}

.permissionList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
}

.permissionDescription {
	padding-bottom: var(--spacing--2xs);
}

.permissionRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.permissionSelect {
	width: 11rem;
}
</style>
