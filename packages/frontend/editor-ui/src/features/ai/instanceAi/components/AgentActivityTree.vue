<script lang="ts" setup>
import { computed } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import AgentTimeline from './AgentTimeline.vue';

const props = withDefaults(
	defineProps<{
		agentNode: InstanceAiAgentNode;
		isRoot?: boolean;
	}>(),
	{
		isRoot: false,
	},
);

const i18n = useI18n();

const hasReasoning = computed(() => props.agentNode.reasoning.length > 0);
</script>

<template>
	<div :class="$style.tree">
		<!-- Reasoning (collapsible, root agent only) -->
		<CollapsibleRoot v-if="isRoot && hasReasoning" :class="$style.reasoningBlock">
			<CollapsibleTrigger :class="$style.reasoningTrigger">
				<N8nIcon icon="brain" size="small" />
				<span>{{ i18n.baseText('instanceAi.message.reasoning') }}</span>
			</CollapsibleTrigger>
			<CollapsibleContent :class="$style.reasoningContent">
				<p>{{ props.agentNode.reasoning }}</p>
			</CollapsibleContent>
		</CollapsibleRoot>

		<!-- Unified timeline renderer -->
		<AgentTimeline :agent-node="props.agentNode" />
	</div>
</template>

<style lang="scss" module>
.tree {
	width: 100%;
}

.reasoningBlock {
	margin-bottom: var(--spacing--2xs);
}

.reasoningTrigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
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
	color: var(--color--text--tint-1);
	font-style: italic;
	border-left: 2px solid var(--color--foreground);
	margin-left: var(--spacing--4xs);
}
</style>
