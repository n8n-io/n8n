<script setup lang="ts">
import { computed } from 'vue';
import { N8nBadge } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { VersionedWorkflowSettings } from 'n8n-workflow';

const props = defineProps<{
	settings?: VersionedWorkflowSettings | null;
}>();

const i18n = useI18n();
const settingsStore = useSettingsStore();

const label = computed(() => {
	if (!settingsStore.isModuleActive('engine-v2')) return null;

	const engine = props.settings?.engineType ?? 'v1';
	return i18n.baseText('workflowHistory.item.engine', { interpolate: { engine } });
});
</script>

<template>
	<N8nBadge v-if="label" :class="$style.badge" data-test-id="workflow-history-engine-badge">
		{{ label }}
	</N8nBadge>
</template>

<style module lang="scss">
.badge {
	flex: none;
}
</style>
