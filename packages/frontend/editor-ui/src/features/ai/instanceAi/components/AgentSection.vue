<script lang="ts" setup>
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { N8nCallout, N8nIcon } from '@n8n/design-system';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import AnimatedCollapsibleContent from './AnimatedCollapsibleContent.vue';
import { computed, ref, watch } from 'vue';
import SubagentStepTimeline from './SubagentStepTimeline.vue';
import TimelineStepButton from './TimelineStepButton.vue';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
}>();

const isActive = computed(() => props.agentNode.status === 'active');
const isExpanded = ref(false);

const isError = computed(() => props.agentNode.status === 'error');

const sectionTitle = computed(
	() => props.agentNode.subtitle ?? props.agentNode.role ?? 'Working...',
);

/** Most recent non-child timeline entry, shown as a peek while collapsed and active. */
const peekEntries = computed(() => {
	const entries = props.agentNode.timeline;
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type !== 'child') return [entry];
	}
	return [];
});

// Auto-collapse when agent completes so the peek preview returns to the resting state.
watch(
	() => props.agentNode.status,
	(status) => {
		if (status === 'completed') {
			isExpanded.value = false;
		}
	},
);
</script>

<template>
	<!-- eslint-disable vue/no-multiple-template-root -->
	<!-- Collapsible timeline -->
	<CollapsibleRoot v-slot="{ open: isOpen }" v-model:open="isExpanded">
		<CollapsibleTrigger as-child>
			<TimelineStepButton :loading="isActive" size="medium">
				<template #icon>
					<N8nIcon :icon="isOpen ? 'chevron-down' : 'chevron-right'" size="small" />
				</template>
				{{ sectionTitle }}
			</TimelineStepButton>
		</CollapsibleTrigger>
		<div v-if="!isOpen && isActive && peekEntries.length" :class="$style.content">
			<SubagentStepTimeline :agent-node="props.agentNode" :visible-entries="peekEntries" peek />
		</div>
		<AnimatedCollapsibleContent :class="$style.content">
			<SubagentStepTimeline :agent-node="props.agentNode" />
		</AnimatedCollapsibleContent>
	</CollapsibleRoot>
	<!-- Error display -->
	<N8nCallout v-if="isError && props.agentNode.error" theme="danger">
		{{ props.agentNode.error }}
	</N8nCallout>
</template>

<style lang="scss" module>
.content {
	padding-left: var(--spacing--2xs);
	border-left: var(--border);
	margin-left: var(--spacing--xs);
}
</style>
