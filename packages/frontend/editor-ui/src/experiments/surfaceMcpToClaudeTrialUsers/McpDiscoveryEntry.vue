<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import ClaudeEntryPoint from './ClaudeEntryPoint.vue';

import { useMcpDiscovery } from './useMcpDiscovery';

const props = defineProps<{ placement: 'canvas' | 'sidebar' | 'footer'; collapsed?: boolean }>();
const target = ref<HTMLElement>();
const i18n = useI18n();
const { showMcpDiscovery, mcpDiscovery: discovery, entryLabel, openEntry } = useMcpDiscovery();
const label = computed(() =>
	props.placement === 'footer' && discovery.ctaStage !== 'connect'
		? i18n.baseText('experiments.mcpDiscovery.footer.build')
		: entryLabel.value,
);
useIntersectionObserver(target, ([entry]) => {
	if (entry?.isIntersecting) discovery.trackEntry(props.placement, 'viewed');
});
</script>

<template>
	<span v-if="showMcpDiscovery" ref="target" :class="[$style.wrapper, $style[placement]]">
		<span v-if="placement === 'footer'" :class="$style.prefix">
			{{ i18n.baseText('experiments.mcpDiscovery.footer.prefix') }}
		</span>
		<ClaudeEntryPoint
			:placement="placement"
			:collapsed="collapsed"
			:label="label"
			:title="i18n.baseText('experiments.mcpDiscovery.sidebar.title')"
			:description="
				placement === 'sidebar'
					? i18n.baseText('experiments.mcpDiscovery.sidebar.description')
					: undefined
			"
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
.footer {
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}
.prefix {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}
</style>
