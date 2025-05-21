<script lang="ts" setup>
import { defineProps, toRefs, defineEmits } from 'vue';
import Pane from './Pane.vue';
import type { PaneNode, SplitDirection } from './types';

interface WindowManagerProps {
	rootPane: PaneNode;
}

const props = defineProps<WindowManagerProps>();
defineEmits<{
	close: [id: string];
	split: [id: string, direction: SplitDirection];
}>();

const { rootPane } = toRefs(props);
</script>

<template>
	<div class="window-manager">
		<Pane
			:node="rootPane"
			@close="(id) => $emit('close', id)"
			@split="(id, direction) => $emit('split', id, direction)"
		/>
	</div>
</template>

<style scoped>
.window-manager {
	position: relative;
	width: 100%;
	height: 100%;
}
</style>
