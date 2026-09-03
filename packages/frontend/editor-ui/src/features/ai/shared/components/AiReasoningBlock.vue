<script lang="ts" setup>
import { N8nAiActivityStep } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { firstSentence } from '../thinking.utils';

const props = withDefaults(
	defineProps<{
		entry: { content: string };
		streaming?: boolean;
	}>(),
	{ streaming: false },
);

const i18n = useI18n();
const label = computed(() => firstSentence(props.entry.content) || i18n.baseText('ai.reasoning'));
</script>

<template>
	<N8nAiActivityStep :label="label" :loading="props.streaming">
		<div :class="$style.reasoningPanel">
			<div :class="$style.reasoningScroll">
				<span :class="$style.reasoningContent">{{ props.entry.content }}</span>
			</div>
		</div>
	</N8nAiActivityStep>
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
