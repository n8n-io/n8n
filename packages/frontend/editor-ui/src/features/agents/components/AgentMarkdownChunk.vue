<script setup lang="ts">
import { N8nMarkdown } from '@n8n/design-system';
import { inject } from 'vue';
import { useRouter } from 'vue-router';
import { resolveAgentPreviewLink } from '../utils/agentPreviewUrl';

defineProps<{
	source: string;
}>();

const router = useRouter();
const openAgentChatPreview = inject<((agentId: string, projectId: string) => boolean) | undefined>(
	'openAgentChatPreview',
	undefined,
);

function handleLinkClick(event: MouseEvent) {
	if (!(event.target instanceof Element)) return;

	const link = event.target.closest('a');
	if (!link) return;
	const href = link.getAttribute('href');
	if (!href) return;
	const previewTarget = resolveAgentPreviewLink(href);
	if (!previewTarget) return;
	link.setAttribute('href', previewTarget.href);

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
	<N8nMarkdown :content="source" @click="handleLinkClick" />
</template>
