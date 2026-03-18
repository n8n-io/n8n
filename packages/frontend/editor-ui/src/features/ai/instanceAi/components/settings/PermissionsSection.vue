<script lang="ts" setup>
import { N8nIcon } from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';

const i18n = useI18n();
const store = useInstanceAiSettingsStore();
</script>

<template>
	<div :class="$style.section">
		<div :class="$style.sectionHeader">
			<N8nIcon icon="shield" size="small" />
			{{ i18n.baseText('instanceAi.settings.section.permissions') }}
		</div>

		<div :class="$style.permissionDescription">
			{{ i18n.baseText('instanceAi.settings.permissions.description') }}
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
				i18n.baseText('instanceAi.settings.permissions.activateWorkflow.label')
			}}</span>
			<ElSwitch
				:model-value="store.getPermission('activateWorkflow') === 'always_allow'"
				@update:model-value="
					store.setPermission('activateWorkflow', $event ? 'always_allow' : 'require_approval')
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

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	padding-bottom: var(--spacing--4xs);
	border-bottom: var(--border);
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
