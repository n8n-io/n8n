<script setup lang="ts">
import ActionCard from './ActionCard.vue';
defineProps<{ app: string; operation: string; sheet: string; nodeId?: string | null }>();
defineEmits<{ press: [] }>();
</script>
<template>
	<ActionCard
		:node-id="nodeId"
		label="Spreadsheet"
		:title="sheet"
		:badge="operation"
		@press="$emit('press')"
		><p :class="$style.app">{{ app }}</p></ActionCard
	>
</template>
<style lang="scss" module>
.app {
	margin: 0;
	color: var(--text-color--subtle);
}
</style>
