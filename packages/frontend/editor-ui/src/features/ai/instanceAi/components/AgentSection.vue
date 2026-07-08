<script lang="ts" setup>
import {
	N8nCallout,
	N8nAnimatedCollapsibleContent as AnimatedCollapsibleContent,
	N8nAiActivityStepChevron as TimelineStepChevron,
	N8nAiActivityStepButton as TimelineStepButton,
} from '@n8n/design-system';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, ref, watch } from 'vue';
import SubagentStepTimeline from './SubagentStepTimeline.vue';
import { useSettingsStore } from '@/app/stores/settings.store';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
}>();

const settingsStore = useSettingsStore();

const isActive = computed(() => props.agentNode.status === 'active');
const isExpanded = ref(settingsStore.isCloudDeployment);

const isError = computed(() => props.agentNode.status === 'error');

const sectionTitle = computed(
	() => props.agentNode.subtitle ?? props.agentNode.role ?? 'Working...',
);

/**
 * Most recent timeline entry that SubagentStepTimeline can render (text or
 * tool call), shown as a peek while collapsed and active.
 */
const peekEntries = computed(() => {
	const entries = props.agentNode.timeline;
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type === 'text' || entry.type === 'tool-call') return [entry];
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
					<TimelineStepChevron :open="isOpen" />
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
