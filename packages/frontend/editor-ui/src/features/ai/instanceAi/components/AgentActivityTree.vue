<script lang="ts" setup>
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useElementHover } from '@vueuse/core';
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, useTemplateRef } from 'vue';
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
const triggerRef = useTemplateRef<HTMLElement>('triggerRef');
const isHovered = useElementHover(triggerRef);
</script>

<template>
	<!-- eslint-disable vue/no-multiple-template-root -->

	<!-- Reasoning (collapsible, root agent only) -->
	<CollapsibleRoot v-if="isRoot && hasReasoning" v-slot="{ open: isOpen }">
		<CollapsibleTrigger as-child>
			<N8nButton ref="triggerRef" variant="ghost" size="small" :class="$style.reasoningTrigger">
				<template #icon>
					<template v-if="isHovered">
						<N8nIcon :icon="isOpen ? 'minus' : 'plus'" size="small" />
					</template>
					<N8nIcon v-else icon="brain" size="small" />
				</template>
				{{ i18n.baseText('instanceAi.message.reasoning') }}
			</N8nButton>
		</CollapsibleTrigger>
		<CollapsibleContent>
			<N8nText tag="div" :class="$style.reasoningContent">{{ props.agentNode.reasoning }}</N8nText>
		</CollapsibleContent>
	</CollapsibleRoot>

	<!-- Unified timeline renderer -->
	<AgentTimeline :agent-node="props.agentNode" />
</template>

<style lang="scss" module>
.reasoningTrigger {
	color: var(--text-color--subtler);
}

.reasoningContent {
	padding: var(--spacing--4xs) var(--spacing--xs);
	border-left: 2px solid var(--color--foreground);
	margin-left: var(--spacing--4xs);
	color: var(--color--text--tint-2);
}
</style>
