<template>
	<div ref="root">
		<slot></slot>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { createEventBus } from 'n8n-design-system/utils';
import type { EventBus } from 'n8n-design-system/utils';

interface Props {
	threshold?: number;
	enabled?: boolean;
	eventBus?: EventBus;
}

const props = withDefaults(defineProps<Props>(), {
	threshold: 0,
	enabled: false,
	eventBus: () => createEventBus(),
});

const emit = defineEmits<{
	(event: 'observed', payload: { el: Element; isIntersecting: boolean }): void;
}>();

const root = ref<HTMLElement | null>(null);
const observer = ref<IntersectionObserver | null>(null);

onMounted(() => {
	if (!props.enabled) {
		return;
	}

	const options = {
		root: root.value as Element,
		rootMargin: '0px',
		threshold: props.threshold,
	};

	observer.value = new IntersectionObserver((entries) => {
		entries.forEach(({ target, isIntersecting }) => {
			emit('observed', {
				el: target,
				isIntersecting,
			});
		});
	}, options);

	props.eventBus.on('observe', (observed: Element) => {
		if (observed) {
			observer.value?.observe(observed);
		}
	});

	props.eventBus.on('unobserve', (observed: Element) => {
		observer.value?.unobserve(observed);
	});
});

onBeforeUnmount(() => {
	if (props.enabled && observer.value) {
		observer.value.disconnect();
	}
});
</script>
