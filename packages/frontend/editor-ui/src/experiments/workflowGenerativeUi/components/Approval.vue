<script setup lang="ts">
import ActionCard from './ActionCard.vue';
defineProps<{ via: string; waitingFor: string; nodeId?: string | null }>();
defineEmits<{ press: [] }>();
</script>
<template>
	<ActionCard
		:node-id="nodeId"
		label="Approval"
		:title="waitingFor"
		:badge="via"
		@press="$emit('press')"
		><p :class="$style.summary">Waiting for {{ waitingFor }} via {{ via }}</p></ActionCard
	>
</template>
<style lang="scss" module>
.summary {
	margin: 0;
	color: var(--text-color--subtle);
}
</style>
