<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

export type BreakpointDefinition = { bp: string; width: number };

const props = withDefaults(
	defineProps<{
		enabled?: boolean;
		breakpoints?: BreakpointDefinition[];
	}>(),
	{
		enabled: true,
		breakpoints: () => [],
	},
);

const observer = ref<ResizeObserver | null>(null);
const breakpoint = ref('');
const root = ref<HTMLDivElement | null>(null);

const sortedBreakpoints = computed(() => [...props.breakpoints].sort((a, b) => a.width - b.width));

const getBreakpointFromWidth = (width: number): string => {
	return (
		sortedBreakpoints.value.find((sortedBreakpoint) => width < sortedBreakpoint.width)?.bp ??
		'default'
	);
};

onMounted(() => {
	if (!props.enabled) return;
	if (!root.value) return;

	breakpoint.value = getBreakpointFromWidth(root.value.offsetWidth);

	observer.value = new ResizeObserver((entries) => {
		entries.forEach((entry) => {
			requestAnimationFrame(() => {
				breakpoint.value = getBreakpointFromWidth(entry.contentRect.width);
			});
		});
	});

	observer.value.observe(root.value);
});

onBeforeUnmount(() => {
	if (observer.value) {
		observer.value.disconnect();
	}
});
</script>

<template>
	<div ref="root">
		<slot :bp="breakpoint"></slot>
	</div>
</template>
