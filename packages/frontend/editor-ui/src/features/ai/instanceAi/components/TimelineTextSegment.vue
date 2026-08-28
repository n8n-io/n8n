<script lang="ts" setup>
import type { InstanceAiTimelineEntry } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';

/**
 * Renders one text timeline entry. Keeps the per-token `entry.content` read
 * out of AgentTimeline's render, so streamed tokens re-render only this segment.
 */
const props = withDefaults(
	defineProps<{
		entry: Extract<InstanceAiTimelineEntry, { type: 'text' }>;
		compact?: boolean;
		/** Forwarded to InstanceAiMarkdown to defer resource decoration mid-stream. */
		streaming?: boolean;
	}>(),
	{ compact: false, streaming: false },
);
</script>

<template>
	<N8nText size="large" :compact="props.compact">
		<InstanceAiMarkdown :content="props.entry.content" :streaming="props.streaming" />
	</N8nText>
</template>
