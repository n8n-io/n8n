<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon } from '@n8n/design-system';

import AgentPersonalisationIcon from '../../components/AgentPersonalisationIcon.vue';
import type { RecentChatItem } from '../mergeRecentChats';

/** The leading icon of a merged chat row: the AI sparkle for the Assistant, the avatar for an agent. */
const props = withDefaults(defineProps<{ item?: RecentChatItem; size?: number }>(), {
	item: undefined,
	size: 16,
});

// A bare glyph reads larger than the same-sized avatar tile, so the sparkle is a bit smaller.
const sparkleSize = computed(() => Math.round(props.size * 0.75));
</script>

<template>
	<N8nIcon v-if="item?.kind === 'assistant'" icon="sparkles" :size="sparkleSize" />
	<AgentPersonalisationIcon
		v-else-if="item?.kind === 'agent'"
		:personalisation="item.thread.agent.personalisation"
		:size="size"
	/>
</template>
