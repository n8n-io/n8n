<script lang="ts" setup>
import { computed } from 'vue';
import { N8nHeading } from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import { useSettingsField } from './useSettingsField';
import LocalGatewayConnectionPanel from './LocalGatewayConnectionPanel.vue';

const i18n = useI18n();
const { store } = useSettingsField();

const isFilesystemDisabled = computed(() => {
	if (store.preferencesDraft.filesystemDisabled !== undefined)
		return store.preferencesDraft.filesystemDisabled;
	return store.preferences?.filesystemDisabled ?? false;
});
</script>

<template>
	<div :class="$style.section">
		<N8nHeading tag="h2" size="small">
			{{ i18n.baseText('instanceAi.filesystem.label') }}
		</N8nHeading>

		<div :class="$style.switchRow">
			<span :class="$style.switchLabel">{{ i18n.baseText('instanceAi.filesystem.label') }}</span>
			<ElSwitch
				:model-value="!isFilesystemDisabled"
				@update:model-value="store.setPreferenceField('filesystemDisabled', !$event)"
			/>
		</div>

		<LocalGatewayConnectionPanel v-if="!isFilesystemDisabled" />
	</div>
</template>

<style lang="scss" module>
.section {
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

.switchLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}
</style>
