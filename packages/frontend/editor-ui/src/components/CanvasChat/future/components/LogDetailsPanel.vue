<script setup lang="ts">
import PanelHeader from '@/components/CanvasChat/future/components/PanelHeader.vue';

const { isOpen } = defineProps<{ isOpen: boolean }>();

const emit = defineEmits<{ clickHeader: [] }>();

defineSlots<{ actions: {} }>();
</script>

<template>
	<div :class="$style.container">
		<PanelHeader title="Log details" @click="emit('clickHeader')">
			<template #actions>
				<slot name="actions" />
			</template>
		</PanelHeader>
		<div v-if="isOpen" :class="$style.content" />
	</div>
</template>

<style lang="scss" module>
.container {
	flex-grow: 1;
	flex-shrink: 1;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	overflow: hidden;
}

.content {
	flex-grow: 1;
	padding: var(--spacing-s);
}
</style>
