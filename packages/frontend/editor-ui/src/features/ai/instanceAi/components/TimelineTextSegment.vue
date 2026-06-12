<script lang="ts" setup>
import type { InstanceAiTimelineEntry } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';

/**
 * Leaf renderer for one text timeline entry. Exists so the per-token
 * `entry.content` read is tracked here rather than in AgentTimeline's render —
 * streamed tokens re-render only this segment, not the whole timeline and
 * every tool-call step in it.
 */
const props = withDefaults(
	defineProps<{
		entry: Extract<InstanceAiTimelineEntry, { type: 'text' }>;
		compact?: boolean;
	}>(),
	{ compact: false },
);
</script>

<template>
	<N8nText size="large" :compact="props.compact">
		<InstanceAiMarkdown :content="props.entry.content" />
	</N8nText>
</template>
