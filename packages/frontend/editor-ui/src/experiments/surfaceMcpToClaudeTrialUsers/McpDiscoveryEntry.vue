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
const isBuildStage = computed(() => discovery.ctaStage === 'build');
const showSidebarCard = computed(() => props.placement === 'sidebar' && isBuildStage.value);
const label = computed(() =>
	props.placement === 'footer' && isBuildStage.value
		? i18n.baseText('experiments.mcpDiscovery.footer.build')
		: entryLabel.value,
);
useIntersectionObserver(target, ([entry]) => {
	if (entry?.isIntersecting) discovery.trackEntry(props.placement, 'viewed');
});
</script>

<template>
	<span v-if="showMcpDiscovery" ref="target" :class="[$style.wrapper, $style[placement]]">
		<span v-if="placement === 'footer' && isBuildStage" :class="$style.prefix">
			{{ i18n.baseText('experiments.mcpDiscovery.footer.prefix') }}
		</span>
		<ClaudeEntryPoint
			:placement="placement"
			:collapsed="collapsed"
			:label="label"
			:title="showSidebarCard ? i18n.baseText('experiments.mcpDiscovery.sidebar.title') : undefined"
			:description="
				showSidebarCard ? i18n.baseText('experiments.mcpDiscovery.sidebar.description') : undefined
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
