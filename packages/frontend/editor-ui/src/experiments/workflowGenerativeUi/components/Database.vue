<script setup lang="ts">
import ActionCard from './ActionCard.vue';
defineProps<{ operation: string; table: string; nodeId?: string | null }>();
defineEmits<{ press: [] }>();
</script>
<template>
	<ActionCard
		:node-id="nodeId"
		label="Database"
		:title="table"
		:badge="operation"
		@press="$emit('press')"
		><code :class="$style.table">{{ table }}</code></ActionCard
	>
</template>
<style lang="scss" module>
.table {
	color: var(--text-color--subtle);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
}
</style>
