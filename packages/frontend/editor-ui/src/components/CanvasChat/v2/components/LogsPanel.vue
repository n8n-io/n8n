<script setup lang="ts">
defineProps<{ isOpen: boolean }>();

const emit = defineEmits<{ clickHeader: [] }>();

defineSlots<{ actions: {} }>();
</script>

<template>
	<div :class="$style.container">
		<PanelHeader title="Logs" @click="emit('clickHeader')">
			<template #actions>
				<slot name="actions" />
			</template>
		</PanelHeader>
		<div v-if="isOpen" :class="$style.content">body...</div>
	</div>
</template>

<style lang="scss" module>
.container {
	flex-grow: 1;
	flex-shrink: 1;
}

.content {
	padding: var(--spacing-2xs);
}
</style>
