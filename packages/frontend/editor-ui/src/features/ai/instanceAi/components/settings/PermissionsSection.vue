<script lang="ts" setup>
import { N8nHeading } from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';

const i18n = useI18n();
const store = useInstanceAiSettingsStore();
</script>

<template>
	<div :class="$style.section">
		<N8nHeading tag="h2" size="small">
			{{ i18n.baseText('instanceAi.settings.section.permissions') }}
		</N8nHeading>

		<div :class="$style.permissionDescription">
			{{ i18n.baseText('instanceAi.settings.permissions.description') }}
		</div>

		<div :class="$style.switchRow">
			<span :class="$style.switchLabel">{{
				i18n.baseText('instanceAi.settings.permissions.createWorkflow.label')
			}}</span>
			<ElSwitch
				:model-value="store.getPermission('createWorkflow') === 'always_allow'"
				@update:model-value="
					store.setPermission('createWorkflow', $event ? 'always_allow' : 'require_approval')
				"
			/>
		</div>

		<div :class="$style.switchRow">
			<span :class="$style.switchLabel">{{
				i18n.baseText('instanceAi.settings.permissions.updateWorkflow.label')
			}}</span>
			<ElSwitch
				:model-value="store.getPermission('updateWorkflow') === 'always_allow'"
				@update:model-value="
					store.setPermission('updateWorkflow', $event ? 'always_allow' : 'require_approval')
				"
			/>
		</div>

		<div :class="$style.switchRow">
			<span :class="$style.switchLabel">{{
				i18n.baseText('instanceAi.settings.permissions.runWorkflow.label')
			}}</span>
			<ElSwitch
				:model-value="store.getPermission('runWorkflow') === 'always_allow'"
				@update:model-value="
					store.setPermission('runWorkflow', $event ? 'always_allow' : 'require_approval')
				"
			/>
		</div>

		<div :class="$style.switchRow">
			<span :class="$style.switchLabel">{{
				i18n.baseText('instanceAi.settings.permissions.publishWorkflow.label')
			}}</span>
			<ElSwitch
				:model-value="store.getPermission('publishWorkflow') === 'always_allow'"
				@update:model-value="
					store.setPermission('publishWorkflow', $event ? 'always_allow' : 'require_approval')
				"
			/>
		</div>

		<div :class="$style.switchRow">
			<span :class="$style.switchLabel">{{
				i18n.baseText('instanceAi.settings.permissions.deleteWorkflow.label')
			}}</span>
			<ElSwitch
				:model-value="store.getPermission('deleteWorkflow') === 'always_allow'"
				@update:model-value="
					store.setPermission('deleteWorkflow', $event ? 'always_allow' : 'require_approval')
				"
			/>
		</div>

		<div :class="$style.switchRow">
			<span :class="$style.switchLabel">{{
				i18n.baseText('instanceAi.settings.permissions.deleteCredential.label')
			}}</span>
			<ElSwitch
				:model-value="store.getPermission('deleteCredential') === 'always_allow'"
				@update:model-value="
					store.setPermission('deleteCredential', $event ? 'always_allow' : 'require_approval')
				"
			/>
		</div>

		<div :class="$style.switchRow">
			<span :class="$style.switchLabel">{{
				i18n.baseText('instanceAi.settings.permissions.deleteDataTable.label')
			}}</span>
			<ElSwitch
				:model-value="store.getPermission('deleteDataTable') === 'always_allow'"
				@update:model-value="
					store.setPermission('deleteDataTable', $event ? 'always_allow' : 'require_approval')
				"
			/>
		</div>

		<div :class="$style.switchRow">
			<span :class="$style.switchLabel">{{
				i18n.baseText('instanceAi.settings.permissions.fetchUrl.label')
			}}</span>
			<ElSwitch
				:model-value="store.getPermission('fetchUrl') === 'always_allow'"
				@update:model-value="
					store.setPermission('fetchUrl', $event ? 'always_allow' : 'require_approval')
				"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.permissionDescription {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--xl);
}

.switchRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--4xs) 0;
}

.switchLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}
</style>
