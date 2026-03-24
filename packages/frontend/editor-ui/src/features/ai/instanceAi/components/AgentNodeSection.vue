<script lang="ts" setup>
import { ref, watch } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';
import SubagentStepTimeline from './SubagentStepTimeline.vue';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();

function handleStop() {
	store.amendAgent(props.agentNode.agentId, props.agentNode.role, props.agentNode.taskId);
}
const isOpen = ref(false);

// Auto-collapse when sub-agent completes
watch(
	() => props.agentNode.status,
	(newStatus) => {
		if (newStatus === 'completed' || newStatus === 'cancelled') {
			isOpen.value = false;
		}
	},
);

const statusIconMap = {
	active: { icon: 'spinner', className: 'activeIcon' },
	completed: { icon: 'check', className: 'completedIcon' },
	cancelled: { icon: 'status-canceled', className: 'cancelledIcon' },
	error: { icon: 'triangle-alert', className: 'errorIcon' },
} satisfies Record<InstanceAiAgentNode['status'], { icon: IconName; className: string }>;
</script>

<template>
	<CollapsibleRoot v-model:open="isOpen" :class="$style.root">
		<CollapsibleTrigger :class="$style.header">
			<div :class="$style.headerLeft">
				<N8nIcon
					:icon="statusIconMap[props.agentNode.status].icon"
					:class="$style[statusIconMap[props.agentNode.status].className]"
					:spin="props.agentNode.status === 'active'"
					size="small"
				/>
				<span :class="$style.role">
					{{ i18n.baseText('instanceAi.agentTree.subAgent') }}:
					{{ props.agentNode.role }}
				</span>
			</div>
			<div :class="$style.headerRight">
				<button
					v-if="props.agentNode.status === 'active'"
					:class="$style.stopButton"
					@click.stop="handleStop"
				>
					<N8nIcon icon="square" size="small" />
					{{ i18n.baseText('instanceAi.agent.stop') }}
				</button>
				<N8nIcon :icon="isOpen ? 'chevron-up' : 'chevron-down'" size="small" />
			</div>
		</CollapsibleTrigger>
		<CollapsibleContent :class="$style.content">
			<SubagentStepTimeline :agent-node="props.agentNode" />

			<!-- Error -->
			<div v-if="props.agentNode.error" :class="$style.errorBlock">
				<N8nIcon icon="triangle-alert" size="small" :class="$style.errorIcon" />
				<span>{{ i18n.baseText('instanceAi.agentTree.error') }}: {{ props.agentNode.error }}</span>
			</div>
		</CollapsibleContent>
	</CollapsibleRoot>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--2xs) 0;
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--foreground--tint-2);
	border: none;
	cursor: pointer;
	font-family: var(--font-family);
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);

	&:hover {
		background: var(--color--foreground--tint-1);
	}
}

.headerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.headerRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.role {
	font-weight: var(--font-weight--bold);
}

.content {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-top: var(--border);
}

.errorBlock {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--danger);
	margin-top: var(--spacing--2xs);
}

.stopButton {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	font-family: var(--font-family);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--danger);
	background: color-mix(in srgb, var(--color--danger) 10%, var(--color--background));
	border: var(--border-width) var(--border-style) var(--color--danger);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		background: color-mix(in srgb, var(--color--danger) 18%, var(--color--background));
	}
}

.activeIcon {
	color: var(--color--primary);
}

.completedIcon {
	color: var(--color--success);
}

.cancelledIcon {
	color: var(--text-color--subtle);
}

.errorIcon {
	color: var(--color--danger);
}
</style>
