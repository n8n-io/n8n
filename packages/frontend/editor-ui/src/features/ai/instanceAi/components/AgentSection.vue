<script lang="ts" setup>
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useElementHover } from '@vueuse/core';
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useInstanceAiStore } from '../instanceAi.store';
import SubagentStepTimeline from './SubagentStepTimeline.vue';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
}>();

const instanceAiStore = useInstanceAiStore();

const triggerRef = useTemplateRef<HTMLElement>('triggerRef');
const isHovered = useElementHover(triggerRef);

const isExpanded = ref(false);

const isActive = computed(() => props.agentNode.status === 'active');
const isError = computed(() => props.agentNode.status === 'error');

const sectionTitle = computed(
	() => props.agentNode.subtitle ?? props.agentNode.role ?? 'Working...',
);

function handleStop() {
	instanceAiStore.amendAgent(props.agentNode.agentId, props.agentNode.role, props.agentNode.taskId);
}

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
			<N8nButton ref="triggerRef" variant="ghost" :class="$style.block">
				<template #icon>
					<template v-if="!isHovered && isActive">
						<N8nIcon icon="spinner" color="primary" size="small" transform-origin="center" spin />
					</template>
					<template v-else>
						<N8nIcon v-if="!isOpen" icon="chevron-right" size="small" />
						<N8nIcon v-else icon="chevron-down" size="small" />
					</template>
				</template>
				<span :class="{ [$style.shimmer]: isActive, [$style.ellipsis]: true }">{{
					sectionTitle
				}}</span>

				<N8nIconButton
					v-if="isActive"
					:class="$style.stopButton"
					icon="square"
					size="small"
					variant="destructive"
					@click.stop="handleStop"
				/>
			</N8nButton>
		</CollapsibleTrigger>
		<CollapsibleContent>
			<SubagentStepTimeline :agent-node="props.agentNode" />
		</CollapsibleContent>
	</CollapsibleRoot>
	<!-- Error display -->
	<N8nCallout v-if="isError && props.agentNode.error" theme="danger">
		{{ props.agentNode.error }}
	</N8nCallout>
</template>

<style lang="scss" module>
.block {
	width: 100%;
	justify-content: flex-start;
	color: var(--color--text--tint-1);
	:global(.n8n-icon) {
		flex-shrink: 0;
	}
	> *:first-child {
		max-width: 100%;
		overflow: hidden;
	}
}

.ellipsis {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.stopButton {
	position: absolute;
	right: 0;
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
