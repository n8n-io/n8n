<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { useI18n } from '@n8n/i18n';
import InstanceAiToolCall from './InstanceAiToolCall.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import type { InstanceAiChatMessage } from '../instanceAi.types';

const props = defineProps<{
	message: InstanceAiChatMessage;
}>();

const i18n = useI18n();

const isUser = computed(() => props.message.role === 'user');
const hasReasoning = computed(() => props.message.reasoning.length > 0);
const isStreaming = computed(() => props.message.isStreaming);
const showContent = computed(() => props.message.content.length > 0 || isStreaming.value);
</script>

<template>
	<div :class="[$style.message, isUser ? $style.userMessage : $style.assistantMessage]">
		<!-- User message -->
		<div v-if="isUser" :class="$style.userBubble">
			<span>{{ props.message.content }}</span>
		</div>

		<!-- Assistant message -->
		<div v-else :class="$style.assistantContent">
			<!-- Reasoning (collapsible) -->
			<CollapsibleRoot v-if="hasReasoning" :class="$style.reasoningBlock">
				<CollapsibleTrigger :class="$style.reasoningTrigger">
					<N8nIcon icon="brain" size="small" />
					<span>{{ i18n.baseText('instanceAi.message.reasoning') }}</span>
				</CollapsibleTrigger>
				<CollapsibleContent :class="$style.reasoningContent">
					<p>{{ props.message.reasoning }}</p>
				</CollapsibleContent>
			</CollapsibleRoot>

			<!-- Tool calls -->
			<InstanceAiToolCall
				v-for="tc in props.message.toolCalls"
				:key="tc.toolCallId"
				:tool-call="tc"
			/>

			<!-- Text content -->
			<div v-if="showContent" :class="$style.textContent">
				<InstanceAiMarkdown v-if="props.message.content" :content="props.message.content" />
				<span v-if="isStreaming && !props.message.content" :class="$style.typingDots">
					<span>.</span><span>.</span><span>.</span>
				</span>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.message {
	padding: var(--spacing--xs) 0;
}

.userMessage {
	display: flex;
	justify-content: flex-end;
}

.assistantMessage {
	display: flex;
	justify-content: flex-start;
}

.userBubble {
	background: var(--color--primary--tint-3);
	color: var(--color--text);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius--lg);
	max-width: 80%;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
}

.assistantContent {
	max-width: 90%;
	width: 100%;
}

.textContent {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text);
}

.reasoningBlock {
	margin-bottom: var(--spacing--2xs);
}

.reasoningTrigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
	background: none;
	border: none;
	cursor: pointer;
	padding: var(--spacing--4xs) 0;
	font-family: var(--font-family);

	&:hover {
		color: var(--color--text--tint-1);
	}
}

.reasoningContent {
	padding: var(--spacing--4xs) var(--spacing--xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
	font-style: italic;
	border-left: 2px solid var(--color--foreground);
	margin-left: var(--spacing--4xs);
}

.typingDots {
	display: inline-flex;
	gap: 2px;
	font-size: var(--font-size--lg);
	color: var(--color--text--tint-2);

	span {
		animation: blink 1.4s infinite both;

		&:nth-child(2) {
			animation-delay: 0.2s;
		}

		&:nth-child(3) {
			animation-delay: 0.4s;
		}
	}
}

@keyframes blink {
	0%,
	80%,
	100% {
		opacity: 0;
	}
	40% {
		opacity: 1;
	}
}
</style>
