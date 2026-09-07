<script setup lang="ts">
import VueMarkdown from 'vue-markdown-render';
import { inject } from 'vue';
import { useRouter } from 'vue-router';
import { OPEN_PREVIEW_PARAM } from '../constants';

defineProps<{
	source: string;
}>();

const router = useRouter();
const openAgentChatPreview = inject<((agentId: string, projectId: string) => boolean) | undefined>(
	'openAgentChatPreview',
	undefined,
);
const AGENT_PREVIEW_PATH = /^\/projects\/([^/]+)\/agents\/([^/]+)\/preview\/?$/;
const AGENT_BUILDER_PATH = /^\/projects\/([^/]+)\/agents\/([^/]+)\/?$/;

function decodePathSegment(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function getPreviewTarget(href: string) {
	try {
		const url = new URL(href, window.location.origin);
		if (url.origin !== window.location.origin) return undefined;
		const match =
			AGENT_PREVIEW_PATH.exec(url.pathname) ??
			(url.searchParams.get(OPEN_PREVIEW_PARAM) === 'true'
				? AGENT_BUILDER_PATH.exec(url.pathname)
				: null);
		if (!match) return undefined;

		const searchParams = new URLSearchParams(url.search);
		searchParams.set(OPEN_PREVIEW_PARAM, 'true');
		return {
			projectId: decodePathSegment(match[1]),
			agentId: decodePathSegment(match[2]),
			href: `/projects/${match[1]}/agents/${match[2]}?${searchParams.toString()}`,
		};
	} catch {
		return undefined;
	}
}

function handleLinkClick(event: MouseEvent) {
	if (!(event.target instanceof Element)) return;

	const link = event.target.closest('a');
	const href = link?.getAttribute('href');
	if (!href) return;
	const previewTarget = getPreviewTarget(href);
	if (!previewTarget) return;

	if (openAgentChatPreview) {
		event.preventDefault();
		openAgentChatPreview(previewTarget.agentId, previewTarget.projectId);
		return;
	}

	if (event.metaKey || event.ctrlKey) return;
	event.preventDefault();
	void router.push(previewTarget.href);
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
