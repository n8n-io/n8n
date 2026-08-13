<script setup lang="ts">
import ActionCard from './ActionCard.vue';
defineProps<{ method: string; url: string; nodeId?: string | null }>();
defineEmits<{ press: [] }>();
</script>
<template>
	<ActionCard
		:node-id="nodeId"
		label="HTTP request"
		:title="url"
		:badge="method.toUpperCase()"
		@press="$emit('press')"
		><code :class="$style.url">{{ url }}</code></ActionCard
	>
</template>
<style lang="scss" module>
.url {
	color: var(--text-color--subtle);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
	overflow-wrap: anywhere;
}
</style>
