<script setup lang="ts">
import { computed } from 'vue';
import type { BadgeSize } from '@n8n/design-system';
import { pickVersionedSettings, type VersionedWorkflowSettings } from 'n8n-workflow';
import EngineBadge from '@/app/components/EngineBadge.vue';

const props = defineProps<{
	settings?: VersionedWorkflowSettings | null;
	size?: BadgeSize;
}>();

const engine = computed(() => pickVersionedSettings(props.settings).engineType);
</script>

<template>
	<EngineBadge :engine="engine" :size="props.size" data-test-id="workflow-history-engine-badge" />
</template>
