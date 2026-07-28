<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
	N8nBadge,
	N8nButton,
	N8nDropdownMenu,
	N8nEmptyState,
	N8nIcon,
	N8nLoading,
	N8nOption,
	N8nPreviewTag,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nSwitch,
	N8nText,
	type DropdownMenuItemProps,
	type EmptyStateIconCards,
} from '@n8n/design-system';
import type { InstanceAiPermissions, InstanceAiPermissionMode } from '@n8n/api-types';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useInstanceAiBrowserUseExperiment } from '@/experiments/instanceAiBrowserUse';
import { useInstanceAiComputerUseExperiment } from '@/experiments/instanceAiComputerUse';
import { useInstanceAiMcpConnectionsExperiment } from '@/experiments/instanceAiMcpConnections';
import { useInstanceCredentialTest } from '../composables/useInstanceCredentialTest';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { SANDBOX_PROVIDER_LABELS, type InstanceAiConnectionKind } from '../constants';
import ConnectionDialog from '../components/settings/ConnectionDialog.vue';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const message = useMessage();
const router = useRouter();
const settingsStore = useSettingsStore();
const credentialsStore = useCredentialsStore();
const store = useInstanceAiSettingsStore();
const { isTestingCredential, testSavedCredential } = useInstanceCredentialTest();

const { isFeatureEnabled: isMcpConnectionsExperimentEnabled } =
	useInstanceAiMcpConnectionsExperiment();
const { isFeatureEnabled: isBrowserUseEnabled } = useInstanceAiBrowserUseExperiment();
const { isFeatureEnabled: isComputerUseExperimentEnabled } = useInstanceAiComputerUseExperiment();

const DOCS_URL = 'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-ai-assistant-preview';

const isAdmin = computed(() => store.canManage);
const isEnabled = computed(
	() => store.settings?.enabled ?? settingsStore.moduleSettings?.['instance-ai']?.enabled ?? false,
);
const isOff = computed(() => !isEnabled.value);
const isMcpAccessEnabled = computed(() => store.settings?.mcpAccessEnabled ?? true);
const isSelfManaged = computed(() => !store.isProxyEnabled && !store.isCloudManaged);
const showCredentialsRows = computed(() => isAdmin.value && isSelfManaged.value);

const modelCredential = computed(() =>
	store.instanceModelCredentials.find(
		(credential) => credential.id === store.settings?.modelCredentialId,
	),
);
const isModelConfigured = computed(() =>
	Boolean(
		store.settings?.modelEnvConfigured ||
			(store.settings?.modelCredentialId && store.settings.modelName),
	),
);
const modelValue = computed(() => {
	if (store.settings?.modelCredentialId) {
		const typeLabel = modelCredential.value ? credentialTypeLabel(modelCredential.value.type) : '';
		const modelName = store.settings.modelName ?? '';
		return [typeLabel, modelName].filter(Boolean).join(' · ');
	}
	return i18n.baseText('settings.n8nAgent.modelCredential.env.value');
});
const modelDescription = computed<{ key: BaseTextKey; warning: boolean } | null>(() => {
	if (store.settings?.modelCredentialId && store.settings.modelName) return null;
	if (store.settings?.modelEnvConfigured)
		return { key: 'settings.n8nAgent.modelCredential.env.description', warning: false };
	return { key: 'settings.n8nAgent.modelCredential.missing.description', warning: !isOff.value };
});

const sandboxCredentialId = computed(() =>
	store.settings?.sandboxProvider === 'daytona'
		? store.settings?.daytonaCredentialId
		: store.settings?.n8nSandboxCredentialId,
);
const isSandboxConfigured = computed(() =>
	Boolean(sandboxCredentialId.value ?? store.settings?.sandboxEnvConfigured),
);
const sandboxValue = computed(() => {
	if (sandboxCredentialId.value) {
		return store.settings?.sandboxProvider === 'daytona'
			? SANDBOX_PROVIDER_LABELS.daytona
			: SANDBOX_PROVIDER_LABELS['n8n-sandbox'];
	}
	return i18n.baseText('settings.n8nAgent.sandbox.env.value');
});
const sandboxDescription = computed<{ key: BaseTextKey; warning: boolean }>(() => {
	if (sandboxCredentialId.value)
		return { key: 'settings.n8nAgent.sandbox.set.description', warning: false };
	if (store.settings?.sandboxEnvConfigured)
		return { key: 'settings.n8nAgent.sandbox.env.description', warning: false };
	return { key: 'settings.n8nAgent.sandbox.missing.description', warning: !isOff.value };
});

const searchCredential = computed(() =>
	store.serviceCredentials.find(
		(credential) => credential.id === store.settings?.searchCredentialId,
	),
);
const searchState = computed<'set' | 'env' | 'notset'>(() => {
	if (store.settings?.searchCredentialId) return 'set';
	if (store.settings?.searchEnvConfigured) return 'env';
	return 'notset';
});
const searchValue = computed(() => {
	if (searchState.value === 'env') return i18n.baseText('settings.n8nAgent.search.env.value');
	return searchCredential.value ? credentialTypeLabel(searchCredential.value.type) : '';
});

const isSetupRequired = computed(
	() =>
		isEnabled.value &&
		showCredentialsRows.value &&
		(!isModelConfigured.value || !isSandboxConfigured.value),
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

const disableMenuItems: Array<DropdownMenuItemProps<string>> = [
	{
		id: 'disable',
		label: i18n.baseText('settings.n8nAgent.status.disable'),
		icon: { type: 'icon', value: 'power' },
	},
];

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

interface PermissionGroup {
	id: string;
	labelKey: BaseTextKey;
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
		keys: ['deleteCredential'],
	},
	{
		id: 'system',
		labelKey: 'settings.n8nAgent.permissions.group.system',
		keys: ['readFilesystem', 'cleanupTestExecutions'],
	},
	{
		id: 'web',
		labelKey: 'settings.n8nAgent.permissions.group.web',
		keys: ['fetchUrl', 'webSearch'],
	},
];

const MCP_PERMISSION_GROUP: PermissionGroup = {
	id: 'mcp',
	labelKey: 'settings.n8nAgent.permissions.group.mcp',
	keys: ['executeMcpTool'],
};

const permissionGroups = computed(() =>
	isMcpConnectionsExperimentEnabled.value
		? [...PERMISSION_GROUPS, MCP_PERMISSION_GROUP]
		: PERMISSION_GROUPS,
);

const expandedGroups = reactive<Record<string, boolean>>({});

function isGroupLocked(group: PermissionGroup) {
	return isOff.value || (group.id === 'mcp' && !isMcpAccessEnabled.value);
}

function groupSummary(group: PermissionGroup) {
	if (group.id === 'mcp' && !isMcpAccessEnabled.value)
		return i18n.baseText('settings.n8nAgent.permissions.group.mcpDisabled');
	const exceptions = group.keys.filter(
		(key) => store.getPermission(key) !== 'require_approval',
	).length;
	if (exceptions === 0) return i18n.baseText('settings.n8nAgent.permissions.group.default');
	if (exceptions === 1) return i18n.baseText('settings.n8nAgent.permissions.group.exception');
	return i18n.baseText('settings.n8nAgent.permissions.group.exceptions', {
		interpolate: { count: exceptions },
	});
}

function permissionOptionsFor(key: keyof InstanceAiPermissions) {
	return key === 'executeMcpTool' ? MCP_TOOL_PERMISSION_OPTIONS : PERMISSION_OPTIONS;
}

/** Exactly one dialog can be active; transitions between steps never observe an all-closed state. */
const activeDialog = ref<InstanceAiConnectionKind | null>(null);
const setupChain = ref(false);
const enableAfterSetup = ref(false);

watch(activeDialog, (dialog) => {
	if (dialog !== null) return;
	setupChain.value = false;
	enableAfterSetup.value = false;
});

function setDialogOpen(kind: InstanceAiConnectionKind, isOpen: boolean) {
	if (isOpen) activeDialog.value = kind;
	else if (activeDialog.value === kind) activeDialog.value = null;
}

function openModelDialog() {
	setupChain.value = false;
	activeDialog.value = 'model';
}

function openModelSetup() {
	setupChain.value = !isSandboxConfigured.value;
	activeDialog.value = 'model';
}

function openSandboxDialog() {
	setupChain.value = false;
	activeDialog.value = 'sandbox';
}

/** Returns whether the chain may continue (false only when enabling failed). */
async function finishSetup(): Promise<boolean> {
	setupChain.value = false;
	if (!enableAfterSetup.value) return true;

	enableAfterSetup.value = false;
	return await store.persistEnabled(true);
}

async function handleModelSaved() {
	if (setupChain.value) {
		activeDialog.value = 'sandbox';
		return;
	}
	await finishSetup();
}

async function handleSandboxSaved() {
	// The optional search step never gates enablement; enable first, then offer it.
	const chainSearch = setupChain.value && searchState.value === 'notset';
	if (!(await finishSetup())) return;
	if (chainSearch) {
		setupChain.value = true;
		activeDialog.value = 'search';
	}
}

function credentialTypeLabel(type: string) {
	return credentialsStore.getCredentialTypeByName(type)?.displayName ?? type;
}

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.n8nAgent'));
	void store.fetch();
	void credentialsStore.fetchCredentialTypes(false);
});

async function handleEnable() {
	if (!showCredentialsRows.value) {
		await store.persistEnabled(true);
		return;
	}

	enableAfterSetup.value = true;
	if (!isModelConfigured.value) {
		openModelSetup();
		return;
	}

	const modelCredentialId = store.settings?.modelCredentialId;
	if (
		modelCredentialId &&
		store.canManageInstanceCredentials &&
		(!modelCredential.value ||
			!(await testSavedCredential(
				modelCredentialId,
				modelCredential.value.name,
				modelCredential.value.type,
			)))
	) {
		openModelSetup();
		return;
	}

	if (!isSandboxConfigured.value) {
		openSandboxDialog();
		return;
	}

	if (sandboxCredentialId.value && store.canManageInstanceCredentials) {
		const isDaytona = store.settings?.sandboxProvider === 'daytona';
		if (
			!(await testSavedCredential(
				sandboxCredentialId.value,
				'AI Assistant sandbox',
				isDaytona ? 'daytonaApi' : 'httpHeaderAuth',
			))
		) {
			openSandboxDialog();
			return;
		}
	}

	await finishSetup();
}

async function handleStatusAction(action: string) {
	if (action !== 'disable') return;

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

function handleComputerUseToggle(value: boolean) {
	store.setField('localGatewayDisabled', !value);
	void store.save();
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
			<template #titleTrailing>
				<N8nPreviewTag size="medium" />
			</template>
		</N8nSettingsPageHeader>

		<N8nLoading v-if="store.isLoading" :rows="3" :shrink-last="false" />

		<N8nEmptyState
			v-else-if="neverConfigured"
			:icon="emptyStateIcon"
			:heading="i18n.baseText('settings.n8nAgent.empty.title')"
			:description="i18n.baseText('settings.n8nAgent.empty.description')"
			:button-text="isAdmin ? i18n.baseText('settings.n8nAgent.empty.enable') : undefined"
			:button-disabled="store.isSaving || isTestingCredential"
			button-variant="solid"
			@click:button="handleEnable"
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
							<N8nButton
								v-if="isOff"
								variant="solid"
								size="medium"
								:label="i18n.baseText('settings.n8nAgent.status.enable')"
								:disabled="store.isSaving || isTestingCredential"
								data-test-id="n8n-agent-enable-button"
								@click="handleEnable"
							/>
							<N8nDropdownMenu
								v-else
								:items="disableMenuItems"
								placement="bottom-end"
								data-test-id="n8n-agent-status-menu"
								@select="handleStatusAction"
							>
								<template #trigger>
									<N8nButton
										variant="outline"
										size="medium"
										:disabled="store.isSaving"
										:aria-label="i18n.baseText('settings.n8nAgent.status.manage')"
									>
										<span :class="$style.statusLabel">
											<span
												:class="[
													$style.statusDot,
													isSetupRequired ? $style.statusDotWarning : $style.statusDotSuccess,
												]"
												aria-hidden="true"
											/>
											{{
												isSetupRequired
													? i18n.baseText('settings.n8nAgent.status.setupRequired')
													: i18n.baseText('settings.n8nAgent.status.enabled')
											}}
											<N8nIcon icon="chevron-down" size="small" />
										</span>
									</N8nButton>
								</template>
								<template #item-leading="{ item }">
									<N8nIcon
										v-if="item.icon?.type === 'icon'"
										:class="$style.danger"
										:icon="item.icon.value"
										size="small"
									/>
								</template>
								<template #item-label="{ item }">
									<span :class="$style.danger">{{ item.label }}</span>
								</template>
							</N8nDropdownMenu>
						</template>
					</N8nSettingsRow>

					<N8nSettingsRow
						v-if="showCredentialsRows"
						:class="{ [$style.dim]: isOff }"
						:clickable="!isOff && isModelConfigured"
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
								@click="openModelSetup"
							/>
							<N8nSettingsRowConfigure v-else :value="modelValue" />
						</template>
					</N8nSettingsRow>

					<N8nSettingsRow
						v-if="showCredentialsRows"
						:class="{ [$style.dim]: isOff }"
						:clickable="!isOff && isSandboxConfigured"
						data-test-id="n8n-agent-sandbox-row"
						@click="openSandboxDialog"
					>
						<template #info>
							<N8nText bold size="medium" color="text-dark">
								{{ i18n.baseText('settings.n8nAgent.sandbox.label') }}
							</N8nText>
							<N8nText size="small" :color="sandboxDescription.warning ? 'warning' : 'text-light'">
								{{ i18n.baseText(sandboxDescription.key) }}
							</N8nText>
						</template>
						<template v-if="!isOff" #action>
							<N8nButton
								v-if="!isSandboxConfigured"
								variant="solid"
								size="medium"
								:label="i18n.baseText('settings.n8nAgent.sandbox.add')"
								:disabled="store.isSaving"
								data-test-id="n8n-agent-sandbox-add"
								@click="openSandboxDialog"
							/>
							<N8nSettingsRowConfigure v-else :value="sandboxValue" />
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>

			<N8nSettingsSection
				v-if="showCredentialsRows || isComputerUseExperimentEnabled || isBrowserUseEnabled"
				:title="i18n.baseText('settings.n8nAgent.capabilities.title')"
				:description="i18n.baseText('settings.n8nAgent.capabilities.description')"
			>
				<N8nSettingsRowGroup>
					<N8nSettingsRow
						v-if="showCredentialsRows"
						:class="{ [$style.dim]: isOff }"
						:clickable="!isOff && searchState !== 'notset'"
						data-test-id="n8n-agent-search-row"
						@click="activeDialog = 'search'"
					>
						<template #info>
							<span :class="$style.titleWithTag">
								<N8nText bold size="medium" color="text-dark">
									{{ i18n.baseText('settings.n8nAgent.search.label') }}
								</N8nText>
								<N8nBadge theme="success" size="xsmall">
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
								@click="activeDialog = 'search'"
							/>
							<N8nSettingsRowConfigure v-else :value="searchValue" />
						</template>
					</N8nSettingsRow>

					<N8nSettingsRow
						v-if="isComputerUseExperimentEnabled"
						:class="{ [$style.dim]: isOff }"
						:title="i18n.baseText('settings.n8nAgent.computerUse.label')"
						:description="i18n.baseText('settings.n8nAgent.computerUse.description')"
					>
						<template #action>
							<N8nSwitch
								:model-value="!(store.settings?.localGatewayDisabled ?? false)"
								:disabled="store.isSaving || isOff"
								:aria-label="i18n.baseText('settings.n8nAgent.computerUse.label')"
								data-test-id="n8n-agent-computer-use-toggle"
								@update:model-value="handleComputerUseToggle"
							/>
						</template>
					</N8nSettingsRow>

					<N8nSettingsRow
						v-if="isBrowserUseEnabled"
						:class="{ [$style.dim]: isOff }"
						:title="i18n.baseText('settings.n8nAgent.browserUse.label')"
						:description="i18n.baseText('settings.n8nAgent.browserUse.description')"
					>
						<template #action>
							<N8nSwitch
								:model-value="store.settings?.browserUseEnabled ?? true"
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
				v-if="isMcpConnectionsExperimentEnabled"
				:title="i18n.baseText('settings.n8nAgent.mcp.title')"
				:description="i18n.baseText('settings.n8nAgent.mcp.description')"
			>
				<N8nSettingsRowGroup>
					<N8nSettingsRow
						:class="{ [$style.dim]: isOff }"
						:title="i18n.baseText('settings.n8nAgent.mcpAccess.label')"
						:description="i18n.baseText('settings.n8nAgent.mcpAccess.description')"
					>
						<template #action>
							<N8nSwitch
								:model-value="isMcpAccessEnabled"
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
				:title="i18n.baseText('settings.n8nAgent.permissions.title')"
				:description="i18n.baseText('settings.n8nAgent.permissions.description')"
			>
				<N8nSettingsRowGroup>
					<N8nSettingsRow
						v-for="group in permissionGroups"
						:key="group.id"
						v-model="expandedGroups[group.id]"
						:class="{ [$style.dim]: isGroupLocked(group) }"
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
				:title="i18n.baseText('settings.n8nAgent.dataSharing.title')"
				:description="i18n.baseText('settings.n8nAgent.dataSharing.description')"
			>
				<N8nSettingsRowGroup>
					<N8nSettingsRow
						:class="{ [$style.dim]: isOff }"
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

		<template v-if="showCredentialsRows">
			<ConnectionDialog
				kind="model"
				:open="activeDialog === 'model'"
				:setup="setupChain"
				@update:open="setDialogOpen('model', $event)"
				@saved="handleModelSaved"
			/>
			<ConnectionDialog
				kind="sandbox"
				:open="activeDialog === 'sandbox'"
				:setup="setupChain"
				@update:open="setDialogOpen('sandbox', $event)"
				@saved="handleSandboxSaved"
				@back="activeDialog = 'model'"
			/>
			<ConnectionDialog
				kind="search"
				:open="activeDialog === 'search'"
				:setup="setupChain"
				@update:open="setDialogOpen('search', $event)"
				@back="activeDialog = 'sandbox'"
			/>
		</template>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.statusLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.statusDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
}

.statusDotSuccess {
	background: var(--text-color--success);
}

.statusDotWarning {
	background: var(--text-color--warning);
}

.danger {
	color: var(--text-color--danger);
}

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
	padding: 0 0 var(--spacing--2xs) var(--spacing--sm);
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
