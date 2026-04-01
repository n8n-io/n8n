<script lang="ts" setup>
import { onMounted, ref, computed, watch } from 'vue';
import { N8nHeading, N8nIcon, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { fetchSettings, updateSettings } from '../instanceAi.settings.api';
import type {
	InstanceAiAdminSettingsResponse,
	InstanceAiPermissions,
	InstanceAiPermissionMode,
} from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const rootStore = useRootStore();
const toast = useToast();

const isLoading = ref(false);
const isSaving = ref(false);
const settings = ref<InstanceAiAdminSettingsResponse | null>(null);

const permissionKeys: Array<{ key: keyof InstanceAiPermissions; labelKey: BaseTextKey }> = [
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
	{
		key: 'restoreWorkflowVersion',
		labelKey: 'settings.n8nAgent.permissions.restoreWorkflowVersion',
	},
];

const isEnabled = computed(() => settings.value?.enabled ?? false);

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.n8nAgent'));
});

watch(
	() => settings.value,
	(val) => {
		if (!val) void loadSettings();
	},
	{ immediate: true },
);

async function loadSettings() {
	isLoading.value = true;
	try {
		settings.value = await fetchSettings(rootStore.restApiContext);
	} catch {
		toast.showError(new Error('Failed to load settings'), 'Settings error');
	} finally {
		isLoading.value = false;
	}
}

async function autoSave(update: Record<string, unknown>) {
	if (isSaving.value) return;
	isSaving.value = true;
	try {
		settings.value = await updateSettings(
			rootStore.restApiContext,
			update as Parameters<typeof updateSettings>[1],
		);
	} catch {
		toast.showError(new Error('Failed to save settings'), 'Settings error');
	} finally {
		isSaving.value = false;
	}
}

function handleEnabledToggle(value: string | number | boolean) {
	void autoSave({ enabled: Boolean(value) });
}

function handlePermissionChange(key: keyof InstanceAiPermissions, value: InstanceAiPermissionMode) {
	void autoSave({ permissions: { [key]: value } });
}

function getPermissionValue(key: keyof InstanceAiPermissions): InstanceAiPermissionMode {
	return settings.value?.permissions?.[key] ?? 'require_approval';
}
</script>

<template>
	<div :class="$style.container" data-test-id="n8n-agent-settings">
		<header :class="$style.header">
			<N8nHeading size="2xlarge" class="mb-2xs">
				{{ i18n.baseText('settings.n8nAgent') }}
			</N8nHeading>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('settings.n8nAgent.description') }}
			</N8nText>
		</header>

		<div v-if="isLoading" :class="$style.loading">
			<N8nIcon icon="spinner" spin />
		</div>

		<template v-else-if="settings">
			<div :class="$style.card">
				<div :class="$style.settingsRow">
					<div :class="$style.settingsRowLeft">
						<span :class="$style.settingsRowLabel">
							{{ i18n.baseText('settings.n8nAgent.enable.label') }}
						</span>
						<span :class="$style.settingsRowDescription">
							{{ i18n.baseText('settings.n8nAgent.enable.description') }}
						</span>
					</div>
					<ElSwitch
						:model-value="isEnabled"
						:disabled="isSaving"
						data-test-id="n8n-agent-enable-toggle"
						@update:model-value="handleEnabledToggle"
					/>
				</div>
			</div>

			<template v-if="isEnabled">
				<div :class="$style.permissionsHeader">
					<N8nHeading tag="h3" size="small">
						{{ i18n.baseText('settings.n8nAgent.permissions.title') }}
					</N8nHeading>
					<N8nText size="small" color="text-light">
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
							:model-value="getPermissionValue(perm.key)"
							size="small"
							:disabled="isSaving"
							:data-test-id="`n8n-agent-permission-${perm.key}`"
							@update:model-value="
								handlePermissionChange(perm.key, $event as InstanceAiPermissionMode)
							"
						>
							<N8nOption
								value="require_approval"
								:label="i18n.baseText('settings.n8nAgent.permissions.needsApproval')"
							/>
							<N8nOption
								value="always_allow"
								:label="i18n.baseText('settings.n8nAgent.permissions.alwaysAllow')"
							/>
						</N8nSelect>
					</div>
				</div>
			</template>
		</template>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	max-width: 720px;
}

.header {
	display: flex;
	flex-direction: column;
	margin-bottom: var(--spacing--xl);
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

.settingsRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--sm);
	min-height: 64px;
	background: var(--color--background);
}

.settingsRowBorder {
	border-bottom: var(--border);
}

.settingsRowLeft {
	display: flex;
	flex-direction: column;
	gap: 1px;
}

.settingsRowLabel {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.settingsRowDescription {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.permissionsHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--lg);
	margin-bottom: var(--spacing--xs);
}
</style>
