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

// A version has its own engine only with the engine-v2 module.
const isVisible = computed(() => settingsStore.isModuleActive('engine-v2'));
// A version without an engine runs on v1.
const engine = computed(() => props.settings?.engineType ?? 'v1');
</script>

<template>
	<N8nBadge v-if="isVisible" :class="$style.badge" data-test-id="workflow-history-engine-badge">
		{{ i18n.baseText('workflowHistory.item.engine', { interpolate: { engine } }) }}
	</N8nBadge>
</template>

<style module lang="scss">
.badge {
	flex: none;
}
</style>
