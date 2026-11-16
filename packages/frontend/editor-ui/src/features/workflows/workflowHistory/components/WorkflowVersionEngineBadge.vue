<script setup lang="ts">
import { computed } from 'vue';
import { N8nBadge, type BadgeSize } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { pickVersionedSettings, type VersionedWorkflowSettings } from 'n8n-workflow';

const props = defineProps<{
	settings?: VersionedWorkflowSettings | null;
	size?: BadgeSize;
}>();

const i18n = useI18n();
const settingsStore = useSettingsStore();

const label = computed(() => {
	if (!settingsStore.isModuleActive('engine-v2')) return null;

	const engine = pickVersionedSettings(props.settings).engineType;
	return i18n.baseText('workflowHistory.item.engine', { interpolate: { engine } });
});
</script>

<template>
	<N8nBadge
		v-if="label"
		:size="props.size"
		:class="$style.badge"
		data-test-id="workflow-history-engine-badge"
	>
		{{ label }}
	</N8nBadge>
</template>

<style module lang="scss">
.badge {
	flex: none;
}
</style>
