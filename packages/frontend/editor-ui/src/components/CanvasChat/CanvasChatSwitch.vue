<script setup lang="ts">
import LogsPanel from '@/components/CanvasChat/future/LogsPanel.vue';
import { useSettingsStore } from '@/stores/settings.store';

const { isNewLogsEnabled } = useSettingsStore();
</script>

<template>
	<LogsPanel v-if="isNewLogsEnabled" />
	<CanvasChat v-else />
</template>
