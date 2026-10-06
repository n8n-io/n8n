<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import ClaudeEntryPoint from './ClaudeEntryPoint.vue';
import { MCP_SETTINGS_VIEW } from '@/features/ai/mcpAccess/mcp.constants';

import { useMcpDiscovery } from './useMcpDiscovery';

const props = defineProps<{ placement: 'canvas' | 'sidebar' | 'footer'; collapsed?: boolean }>();
const target = ref<HTMLElement>();
const { mcpDiscovery: discovery, entryLabel } = useMcpDiscovery();
const router = useRouter();
useIntersectionObserver(target, ([entry]) => {
	if (entry?.isIntersecting) discovery.trackEntry(props.placement, 'viewed');
});
function connect() {
	discovery.trackEntry(props.placement, 'clicked');
	void router.push({ name: MCP_SETTINGS_VIEW });
}
</script>

<template>
	<span ref="target" :class="$style.wrapper">
		<ClaudeEntryPoint
			:placement="placement"
			:collapsed="collapsed"
			:label="entryLabel"
			@click="connect"
		/>
	</span>
</template>

<style module>
.wrapper {
	display: inline-flex;
	justify-content: center;
}
</style>
