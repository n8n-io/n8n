<script lang="ts" setup>
import { onMounted, computed } from 'vue';
import { N8nButton, N8nHeading, N8nIcon, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import type { InstanceAiPermissions, InstanceAiPermissionMode } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import ModelSection from '../components/settings/ModelSection.vue';
import SandboxSection from '../components/settings/SandboxSection.vue';
import MemorySection from '../components/settings/MemorySection.vue';
import SearchSection from '../components/settings/SearchSection.vue';
import AdvancedSection from '../components/settings/AdvancedSection.vue';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const settingsStore = useSettingsStore();
const store = useInstanceAiSettingsStore();

const isAdmin = computed(() => store.canManage);

const permissionKeys: Array<{ key: keyof InstanceAiPermissions; labelKey: BaseTextKey }> = [
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
	{
		key: 'restoreWorkflowVersion',
		labelKey: 'settings.n8nAgent.permissions.restoreWorkflowVersion',
	},
];

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
				<div v-if="isAdmin" :class="$style.card">
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
									value="require_approval"
									:label="i18n.baseText('settings.n8nAgent.permissions.needsApproval')"
								/>
								<N8nOption
									value="always_allow"
									:label="i18n.baseText('settings.n8nAgent.permissions.alwaysAllow')"
								/>
								<N8nOption
									value="blocked"
									:label="i18n.baseText('settings.n8nAgent.permissions.blocked')"
								/>
							</N8nSelect>
						</div>
					</div>
				</template>

				<div v-if="!store.isProxyEnabled && !store.isCloudManaged" :class="$style.card">
					<div :class="$style.sectionBlock">
						<ModelSection />
					</div>
				</div>

				<template v-if="isAdmin">
					<div v-if="!store.isProxyEnabled && !store.isCloudManaged" :class="$style.card">
						<div :class="$style.sectionBlock">
							<SandboxSection />
						</div>
					</div>

					<div v-if="!store.isCloudManaged" :class="$style.card">
						<div :class="$style.sectionBlock">
							<MemorySection />
						</div>
					</div>

					<div v-if="!store.isProxyEnabled" :class="$style.card">
						<div :class="$style.sectionBlock">
							<SearchSection />
						</div>
					</div>

					<div v-if="!store.isCloudManaged" :class="$style.card">
						<div :class="$style.sectionBlock">
							<AdvancedSection />
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
	padding-left: var(--spacing--sm);
	padding-right: var(--spacing--sm);
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
