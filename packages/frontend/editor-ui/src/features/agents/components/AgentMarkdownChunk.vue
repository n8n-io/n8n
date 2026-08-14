<script setup lang="ts">
import VueMarkdown from 'vue-markdown-render';
import { useRouter } from 'vue-router';

defineProps<{
	source: string;
}>();

const router = useRouter();
const AGENT_PREVIEW_PATH = /^\/projects\/[^/]+\/agents\/[^/]+\/preview\/?$/;

function handleLinkClick(event: MouseEvent) {
	if (event.metaKey || event.ctrlKey || !(event.target instanceof Element)) return;

	const link = event.target.closest('a');
	const href = link?.getAttribute('href');
	if (!href || !AGENT_PREVIEW_PATH.test(href)) return;

	event.preventDefault();
	void router.push(href);
}
</script>

<template>
	<VueMarkdown :source="source" :class="$style.markdown" @click="handleLinkClick" />
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins' as ds-mixins;

.markdown {
	@include ds-mixins.markdown-content;
}
</style>
