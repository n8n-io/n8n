<script lang="ts" setup>
import type { InstanceAiTimelineEntry } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { ref, watch } from 'vue';
import AnimatedCollapsibleContent from './AnimatedCollapsibleContent.vue';
import TimelineStepButton from './TimelineStepButton.vue';
import TimelineStepChevron from './TimelineStepChevron.vue';

/**
 * Renders one reasoning timeline entry. Keeps the per-token `entry.content`
 * read out of parent timeline renders, so streamed tokens re-render only this
 * segment.
 */
const props = withDefaults(
	defineProps<{
		entry: Extract<InstanceAiTimelineEntry, { type: 'reasoning' }>;
		/** True while this entry is still receiving stream deltas. */
		streaming?: boolean;
		/** Peek mode: compact, pins streaming text to the bottom. */
		peek?: boolean;
	}>(),
	{ streaming: false, peek: false },
);

const i18n = useI18n();
const isOpen = ref(props.streaming);

watch(
	() => props.streaming,
	(streaming) => {
		if (streaming) {
			isOpen.value = true;
		} else {
			isOpen.value = false;
		}
	},
);
</script>

<template>
	<CollapsibleRoot v-model:open="isOpen">
		<CollapsibleTrigger as-child>
			<TimelineStepButton :loading="props.streaming">
				<template #icon>
					<TimelineStepChevron :open="isOpen" />
				</template>
				{{ i18n.baseText('instanceAi.message.reasoning') }}
			</TimelineStepButton>
		</CollapsibleTrigger>
		<AnimatedCollapsibleContent :class="$style.reasoningPanel">
			<div
				:class="[
					$style.reasoningScroll,
					{ [$style.reasoningScrollStreaming]: props.streaming && props.peek },
				]"
			>
				<span :class="$style.reasoningContent">{{ props.entry.content }}</span>
			</div>
		</AnimatedCollapsibleContent>
	</CollapsibleRoot>
</template>

<style lang="scss" module>
.reasoningPanel {
	padding-left: var(--spacing--2xs);
	border-left: var(--border);
	margin-left: var(--spacing--xs);
	max-width: 90%;
	min-width: 0;
	overflow-x: hidden;
}

.reasoningScroll {
	margin-top: var(--spacing--2xs);
	max-height: 200px;
	overflow-x: hidden;
	overflow-y: auto;
	padding-bottom: var(--spacing--2xs);
	scrollbar-width: thin;
	scrollbar-color: light-dark(var(--color--neutral-300), var(--color--neutral-700)) transparent;
}

.reasoningScrollStreaming {
	display: flex;
	flex-direction: column-reverse;
	max-height: 120px;
	scrollbar-width: none;
}

.reasoningContent {
	display: block;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text--tint-1);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	word-break: break-word;
}
</style>
