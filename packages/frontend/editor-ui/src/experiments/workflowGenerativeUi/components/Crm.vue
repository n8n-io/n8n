<script setup lang="ts">
import ActionCard from './ActionCard.vue';
defineProps<{
	app: string;
	operation: string;
	object: string;
	matchOn: string | null;
	nodeId?: string | null;
}>();
defineEmits<{ press: [] }>();
</script>
<template>
	<ActionCard
		:node-id="nodeId"
		label="CRM"
		:title="`${operation} ${object}`"
		:badge="app"
		@press="$emit('press')"
		><p v-if="matchOn" :class="$style.match">
			Match on <strong>{{ matchOn }}</strong>
		</p></ActionCard
	>
</template>
<style lang="scss" module>
.match {
	margin: 0;
	color: var(--text-color--subtle);
}
.match strong {
	color: var(--text-color);
	font-weight: var(--font-weight--medium);
}
</style>
