<script setup lang="ts">
import CanvasBottomPanel from '@/components/CanvasChat/v2/CanvasBottomPanel.vue';
import { useSettingsStore } from '@/stores/settings.store';

const { isNewLogsEnabled } = useSettingsStore();
</script>

<template>
	<CanvasBottomPanel v-if="isNewLogsEnabled" />
	<CanvasChat v-else />
</template>
