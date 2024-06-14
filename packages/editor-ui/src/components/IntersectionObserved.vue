<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import type { PropType } from 'vue';
import type { EventBus } from 'n8n-design-system/utils';
import { createEventBus } from 'n8n-design-system/utils';

const props = defineProps({
	enabled: {
		type: Boolean,
		default: false,
	},
	eventBus: {
		type: Object as PropType<EventBus>,
		default: () => createEventBus(),
	},
});

const observed = ref<HTMLElement | null>(null);

onMounted(async () => {
	if (!props.enabled) {
		return;
	}

	await nextTick();
	if (observed.value) {
		props.eventBus.emit('observe', observed.value);
	}
});

onBeforeUnmount(() => {
	if (props.enabled && observed.value) {
		props.eventBus.emit('unobserve', observed.value);
	}
});
</script>

<template>
	<span ref="observed">
		<slot></slot>
	</span>
</template>
