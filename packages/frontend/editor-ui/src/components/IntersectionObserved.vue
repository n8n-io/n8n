<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';

const props = withDefaults(
	defineProps<{
		enabled: boolean;
		eventBus: EventBus;
	}>(),
	{
		enabled: false,
		default: () => createEventBus(),
	},
);

const observed = ref<IntersectionObserver | null>(null);

onMounted(async () => {
	if (!props.enabled) {
		return;
	}

	await nextTick();

	props.eventBus.emit('observe', observed.value);
});

onBeforeUnmount(() => {
	if (props.enabled) {
		props.eventBus.emit('unobserve', observed.value);
	}
});
</script>

<template>
	<span ref="observed">
		<slot></slot>
	</span>
</template>
