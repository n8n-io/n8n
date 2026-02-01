<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';

const props = withDefaults(
	defineProps<{
		threshold: number;
		enabled: boolean;
		eventBus: EventBus;
	}>(),
	{
		threshold: 0,
		enabled: false,
		default: () => createEventBus(),
	},
);

const emit = defineEmits<{
	observed: [{ el: HTMLElement; isIntersecting: boolean }];
}>();

const observer = ref<IntersectionObserver | null>(null);
const root = ref<HTMLElement | null>(null);

onBeforeUnmount(() => {
	if (props.enabled && observer.value) {
		observer.value.disconnect();
	}
});

onMounted(() => {
	if (!props.enabled) {
		return;
	}

	const options = {
		root: root.value,
		rootMargin: '0px',
		threshold: props.threshold,
	};

	const intersectionObserver = new IntersectionObserver((entries) => {
		entries.forEach(({ target, isIntersecting }) => {
			emit('observed', {
				el: target as HTMLElement,
				isIntersecting,
			});
		});
	}, options);

	observer.value = intersectionObserver;

	props.eventBus.on('observe', (observed: Element) => {
		if (observed) {
			intersectionObserver.observe(observed);
		}
	});

	props.eventBus.on('unobserve', (observed: Element) => {
		intersectionObserver.unobserve(observed);
	});
});
</script>

<template>
	<div ref="root">
		<slot></slot>
	</div>
</template>
