<script setup lang="ts">
import { computed } from 'vue';
import { N8nBadge, type BadgeSize } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { WorkflowEngineType } from 'n8n-workflow';

const props = defineProps<{
	engine: WorkflowEngineType;
	size?: BadgeSize;
}>();

const i18n = useI18n();
const settingsStore = useSettingsStore();

const label = computed(() =>
	i18n.baseText('generic.engine', { interpolate: { engine: props.engine } }),
);
</script>

<template>
	<N8nBadge v-if="settingsStore.isEngineV2Enabled" :size="props.size" :class="$style.badge">
		{{ label }}
	</N8nBadge>
</template>

<style module lang="scss">
.badge {
	flex: none;
}
</style>
