<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core';
import { ref } from 'vue';

import ClaudeEntryPoint from './ClaudeEntryPoint.vue';

import { useMcpDiscovery } from './useMcpDiscovery';

const props = defineProps<{ placement: 'canvas' | 'sidebar' | 'footer'; collapsed?: boolean }>();
const target = ref<HTMLElement>();
const { mcpDiscovery: discovery, entryLabel, entryDescription, openEntry } = useMcpDiscovery();
useIntersectionObserver(target, ([entry]) => {
	if (entry?.isIntersecting) discovery.trackEntry(props.placement, 'viewed');
});
</script>

<template>
	<span ref="target" :class="[$style.wrapper, { [$style.sidebar]: placement === 'sidebar' }]">
		<ClaudeEntryPoint
			:placement="placement"
			:collapsed="collapsed"
			:label="entryLabel"
			:description="placement === 'sidebar' ? entryDescription : undefined"
			@click="openEntry(placement)"
		/>
	</span>
</template>

<style module>
.wrapper {
	display: inline-flex;
	justify-content: center;
}
.sidebar {
	padding-inline: var(--spacing--3xs);
	justify-content: stretch;
}
</style>
