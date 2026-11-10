<script lang="ts" setup>
import ChatMarkdown from '@/features/ai/shared/components/ChatMarkdown/ChatMarkdown.vue';
import type { AgentTestTarget } from '@/features/agents/utils/agentTestUrl';
import { inject } from 'vue';
import { useThread } from '../instanceAi.store';
import { appHref, skillsHubHref } from '../canvasPreview.utils';

const props = defineProps<{
	content: string;
	agentPreviewTarget?: AgentTestTarget;
	/**
	 * True while the source text is still streaming in. While streaming we skip
	 * the resource-name decoration — O(content × resources), re-run on every
	 * token — and apply it once the block settles. Markdown formatting still
	 * renders live, and the post-render DOM link walk keeps running so links
	 * the AI writes directly (e.g. `[name](/workflow/abc)`) stay safe to click
	 * mid-stream (target="_blank" instead of same-tab SPA navigation).
	 */
	streaming?: boolean;
}>();
const thread = useThread();
const openWorkflowPreview = inject<((id: string) => boolean) | undefined>(
	'openWorkflowPreview',
	undefined,
);
const openDataTablePreview = inject<((id: string, projectId: string) => boolean) | undefined>(
	'openDataTablePreview',
	undefined,
);
const openAgentPreview = inject<((id: string, projectId: string) => boolean) | undefined>(
	'openAgentPreview',
	undefined,
);
const openAgentChatPreview = inject<((id: string, projectId: string) => boolean) | undefined>(
	'openAgentChatPreview',
	undefined,
);
const openSkillPreview = inject<((id: string) => boolean) | undefined>(
	'openSkillPreview',
	undefined,
);
const openAppPreview = inject<((id: string) => boolean) | undefined>('openAppPreview', undefined);
</script>
<template>
	<ChatMarkdown
		:content="props.content"
		:streaming="props.streaming"
		:resources="[...thread.resourceNameIndex.values()]"
		:linkable-resources="[...thread.linkableResourceNameIndex.values()]"
		:agent-preview-target="props.agentPreviewTarget"
		:open-workflow-preview="openWorkflowPreview"
		:open-data-table-preview="openDataTablePreview"
		:open-agent-preview="openAgentPreview"
		:open-agent-chat-preview="openAgentChatPreview"
		:open-skill-preview="openSkillPreview"
		:open-app-preview="openAppPreview"
		:build-app-href="appHref"
		:build-skill-href="skillsHubHref"
		:options="{ math: true, footnotes: 'pill' }"
		:filter-internal-blocks="true"
	/>
</template>
