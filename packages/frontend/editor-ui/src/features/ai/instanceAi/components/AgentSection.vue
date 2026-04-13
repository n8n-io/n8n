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
const isExpanded = ref(isActive.value); // Start expanded if active, otherwise collapsed

const isError = computed(() => props.agentNode.status === 'error');

const sectionTitle = computed(
	() => props.agentNode.subtitle ?? props.agentNode.role ?? 'Working...',
);

// Auto-collapse when agent completes (keep collapsed by default for peek preview)
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
			<TimelineStepButton size="medium">
				<template #icon="{ isHovered }">
					<template v-if="!isHovered && isActive">
						<N8nIcon icon="spinner" color="primary" size="small" transform-origin="center" spin />
					</template>
					<template v-else>
						<N8nIcon v-if="!isOpen" icon="chevron-right" size="small" />
						<N8nIcon v-else icon="chevron-down" size="small" />
					</template>
				</template>
				<span :class="{ [$style.shimmer]: isActive }">{{ sectionTitle }}</span>
			</TimelineStepButton>
		</CollapsibleTrigger>
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

// Shimmer animation for active section headers
.shimmer {
	background: linear-gradient(
		90deg,
		var(--color--text--tint-1) 25%,
		var(--color--text--tint-2) 50%,
		var(--color--text--tint-1) 75%
	);
	background-size: 200% 100%;
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
	0% {
		background-position: 200% 0;
	}
	100% {
		background-position: -200% 0;
	}
}
</style>
