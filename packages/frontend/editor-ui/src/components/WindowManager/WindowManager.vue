<script lang="ts" setup>
import { defineProps, toRefs } from 'vue';
import Pane from './Pane.vue';
import type { PaneNode } from './types';

interface WindowManagerProps {
	rootPane: PaneNode;
}

const props = defineProps<WindowManagerProps>();

const { rootPane } = toRefs(props);
</script>

<template>
	<div class="window-manager">
		<Pane :node="rootPane" />
	</div>
</template>

<style scoped>
.window-manager {
	position: relative;
	width: 100%;
	height: 100%;
}
</style>
