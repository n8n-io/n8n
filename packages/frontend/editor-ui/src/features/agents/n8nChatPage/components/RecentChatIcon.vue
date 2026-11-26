<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';

import AgentPersonalisationIcon from '../../components/AgentPersonalisationIcon.vue';
import type { RecentChatItem } from '../mergeRecentChats';

/**
 * The leading icon of a merged chat row: the brand icon for the Assistant, the avatar for an agent.
 * Both use the full size, so the Assistant glyph matches the other menu icons.
 */
withDefaults(defineProps<{ item?: RecentChatItem; size?: number }>(), {
	item: undefined,
	size: 16,
});
</script>

<template>
	<N8nIcon
		v-if="item?.kind === 'assistant' || item?.kind === 'assistant-agent'"
		icon="n8n-assistant"
		:size="size"
	/>
	<AgentPersonalisationIcon
		v-else-if="item?.kind === 'agent'"
		:personalisation="item.thread.agent.personalisation"
		:size="size"
	/>
</template>
