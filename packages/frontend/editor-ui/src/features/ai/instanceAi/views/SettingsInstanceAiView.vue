<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import {
	N8nButton,
	N8nDropdownMenu,
	N8nEmptyState,
	N8nIcon,
	N8nOption,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nSwitch,
	type DropdownMenuItemProps,
	type EmptyStateIconCards,
} from '@n8n/design-system';
import type { InstanceAiPermissions, InstanceAiPermissionMode } from '@n8n/api-types';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { MODAL_CONFIRM } from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useInstanceAiBrowserUseExperiment } from '@/experiments/instanceAiBrowserUse';
import { useInstanceAiComputerUseExperiment } from '@/experiments/instanceAiComputerUse';
import { useInstanceAiMcpConnectionsExperiment } from '@/experiments/instanceAiMcpConnections';
import { INSTANCE_AI_CREDENTIALS_SETTINGS_VIEW } from '../constants';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const message = useMessage();
const router = useRouter();
const settingsStore = useSettingsStore();
const store = useInstanceAiSettingsStore();

const { isFeatureEnabled: isMcpConnectionsExperimentEnabled } =
	useInstanceAiMcpConnectionsExperiment();
const { isFeatureEnabled: isBrowserUseEnabled } = useInstanceAiBrowserUseExperiment();
const { isFeatureEnabled: isComputerUseExperimentEnabled } = useInstanceAiComputerUseExperiment();

const isAdmin = computed(() => store.canManage);
const isEnabled = computed(
	() => store.settings?.enabled ?? settingsStore.moduleSettings?.['instance-ai']?.enabled ?? false,
);
const isMcpAccessEnabled = computed(() => store.settings?.mcpAccessEnabled ?? true);
const showCredentialsRow = computed(
	() => isAdmin.value && !store.isProxyEnabled && !store.isCloudManaged,
);
const showCapabilitiesSection = computed(
	() =>
		isComputerUseExperimentEnabled.value ||
		isBrowserUseEnabled.value ||
		isMcpConnectionsExperimentEnabled.value,
);

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

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.n8nAgent'));
	void store.fetch();
});

async function handleEnable() {
	await store.persistEnabled(true);
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

function openCredentialsSettings() {
	void router.push({ name: INSTANCE_AI_CREDENTIALS_SETTINGS_VIEW });
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
</script>

<template>
	<N8nSettingsLayout data-test-id="n8n-agent-settings">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.n8nAgent')"
			:description="i18n.baseText('settings.n8nAgent.description')"
			:show-docs-link="false"
		/>

		<div v-if="store.isLoading" :class="$style.loading">
			<N8nIcon icon="spinner" spin />
		</div>

		<N8nEmptyState
			v-else-if="!isEnabled"
			:icon="emptyStateIcon"
			:heading="i18n.baseText('settings.n8nAgent.empty.title')"
			:description="i18n.baseText('settings.n8nAgent.empty.description')"
			:button-text="isAdmin ? i18n.baseText('settings.n8nAgent.empty.enable') : undefined"
			button-variant="solid"
			@click:button="handleEnable"
		/>

		<template v-else>
			<N8nSettingsSection v-if="isAdmin">
				<N8nSettingsRowGroup>
					<N8nSettingsRow
						:title="i18n.baseText('settings.n8nAgent.status.label')"
						:description="i18n.baseText('settings.n8nAgent.status.description')"
					>
						<template #action>
							<N8nDropdownMenu
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
											<span :class="$style.statusDot" aria-hidden="true" />
											{{ i18n.baseText('settings.n8nAgent.status.enabled') }}
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
						v-if="showCredentialsRow"
						:title="i18n.baseText('settings.n8nAgent.credentials.label')"
						:description="i18n.baseText('settings.n8nAgent.credentials.description')"
						clickable
						data-test-id="n8n-agent-credentials-row"
						@click="openCredentialsSettings"
					>
						<template #action>
							<N8nSettingsRowConfigure />
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>

			<N8nSettingsSection
				v-if="isAdmin && showCapabilitiesSection"
				:title="i18n.baseText('settings.n8nAgent.capabilities.title')"
				:description="i18n.baseText('settings.n8nAgent.capabilities.description')"
			>
				<N8nSettingsRowGroup>
					<N8nSettingsRow
						v-if="isComputerUseExperimentEnabled"
						:title="i18n.baseText('settings.n8nAgent.computerUse.label')"
						:description="i18n.baseText('settings.n8nAgent.computerUse.description')"
					>
						<template #action>
							<N8nSwitch
								:model-value="!(store.settings?.localGatewayDisabled ?? false)"
								:disabled="store.isSaving"
								:aria-label="i18n.baseText('settings.n8nAgent.computerUse.label')"
								data-test-id="n8n-agent-computer-use-toggle"
								@update:model-value="handleComputerUseToggle"
							/>
						</template>
					</N8nSettingsRow>

					<N8nSettingsRow
						v-if="isBrowserUseEnabled"
						:title="i18n.baseText('settings.n8nAgent.browserUse.label')"
						:description="i18n.baseText('settings.n8nAgent.browserUse.description')"
					>
						<template #action>
							<N8nSwitch
								:model-value="store.settings?.browserUseEnabled ?? true"
								:disabled="store.isSaving"
								:aria-label="i18n.baseText('settings.n8nAgent.browserUse.label')"
								data-test-id="n8n-agent-browser-use-toggle"
								@update:model-value="handleBrowserUseToggle"
							/>
						</template>
					</N8nSettingsRow>

					<N8nSettingsRow
						v-if="isMcpConnectionsExperimentEnabled"
						:title="i18n.baseText('settings.n8nAgent.mcpAccess.label')"
						:description="i18n.baseText('settings.n8nAgent.mcpAccess.description')"
					>
						<template #action>
							<N8nSwitch
								:model-value="isMcpAccessEnabled"
								:disabled="store.isSaving"
								:aria-label="i18n.baseText('settings.n8nAgent.mcpAccess.label')"
								data-test-id="n8n-agent-mcp-access-toggle"
								@update:model-value="handleMcpAccessToggle"
							/>
						</template>
					</N8nSettingsRow>

					<N8nSettingsRow
						v-if="isMcpConnectionsExperimentEnabled && isMcpAccessEnabled"
						:title="i18n.baseText('settings.n8nAgent.permissions.executeMcpTool')"
					>
						<template #action>
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
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>

			<N8nSettingsSection
				v-if="isAdmin"
				:title="i18n.baseText('settings.n8nAgent.permissions.title')"
				:description="i18n.baseText('settings.n8nAgent.permissions.description')"
			>
				<N8nSettingsRowGroup>
					<N8nSettingsRow
						v-for="permission in permissionKeys"
						:key="permission.key"
						:title="i18n.baseText(permission.labelKey)"
					>
						<template #action>
							<N8nSelect
								:class="$style.permissionSelect"
								:model-value="store.getPermission(permission.key)"
								size="small"
								:disabled="store.isSaving"
								:data-test-id="`n8n-agent-permission-${permission.key}`"
								@update:model-value="
									handlePermissionChange(permission.key, $event as InstanceAiPermissionMode)
								"
							>
								<N8nOption
									v-for="option in PERMISSION_OPTIONS"
									:key="option"
									:value="option"
									:label="i18n.baseText(PERMISSION_OPTION_LABEL[option])"
								/>
							</N8nSelect>
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>
		</template>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl);
	color: var(--text-color--subtle);
}

.statusLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.statusDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: var(--text-color--success);
}

.danger {
	color: var(--text-color--danger);
}

.permissionSelect {
	width: 11rem;
}
</style>
