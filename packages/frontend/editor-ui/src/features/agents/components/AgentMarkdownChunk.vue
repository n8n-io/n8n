<script setup lang="ts">
import { N8nMarkdown } from '@n8n/design-system';
import { AGENT_PREVIEW_BUILD_HREF, AGENT_PREVIEW_EDIT_HREF } from '@n8n/api-types';
import type { PluginSimple } from 'markdown-it';
import { inject } from 'vue';
import { useRouter } from 'vue-router';
import { AGENT_BUILDER_STANDALONE_KEY } from './agentBuilderInjectionKeys';
import { resolveAgentTestLink } from '../utils/agentTestUrl';

const props = defineProps<{
	source: string;
	canOpenBuild?: boolean;
}>();
const emit = defineEmits<{ 'open-build': [edit: boolean] }>();

const buildLinks: PluginSimple = (parser) => {
	parser.core.ruler.after('inline', 'agent-build-links', (state) => {
		for (const block of state.tokens) {
			let hideLink = false;
			for (const token of block.children ?? []) {
				if (token.type === 'link_open') {
					const href = token.attrGet('href');
					hideLink =
						!props.canOpenBuild &&
						(href === AGENT_PREVIEW_BUILD_HREF || href === AGENT_PREVIEW_EDIT_HREF);
					token.hidden = hideLink;
				} else if (token.type === 'link_close') {
					token.hidden = hideLink;
					hideLink = false;
				}
			}
		}
	});
};

const standaloneBuilder = inject(AGENT_BUILDER_STANDALONE_KEY, false);
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
	if (
		standaloneBuilder &&
		(href === AGENT_PREVIEW_BUILD_HREF || href === AGENT_PREVIEW_EDIT_HREF)
	) {
		event.preventDefault();
		if (props.canOpenBuild) emit('open-build', href === AGENT_PREVIEW_EDIT_HREF);
		return;
	}
	const previewTarget = resolveAgentTestLink(href);
	if (!previewTarget) return;
	link.setAttribute('href', previewTarget.href);
	if (standaloneBuilder && (event.metaKey || event.ctrlKey)) return;

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
	<N8nMarkdown
		:content="source"
		:plugins="standaloneBuilder ? [buildLinks] : []"
		@click="handleLinkClick"
	/>
</template>
