<script lang="ts" setup>
import { ref, computed } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';
import SubagentStepTimeline from './SubagentStepTimeline.vue';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
}>();

const instanceAiStore = useInstanceAiStore();

function handleStop() {
	instanceAiStore.amendAgent(props.agentNode.agentId, props.agentNode.role, props.agentNode.taskId);
}

const i18n = useI18n();
const isOpen = ref(false);

const isActive = computed(() => props.agentNode.status === 'active');
const isError = computed(() => props.agentNode.status === 'error');
</script>

<template>
	<CollapsibleRoot v-model:open="isOpen" :class="$style.root">
		<!-- Header -->
		<CollapsibleTrigger :class="$style.header">
			<div :class="$style.headerLeft">
				<N8nIcon v-if="isActive" icon="spinner" spin size="small" :class="$style.activeIcon" />
				<N8nIcon v-else-if="isError" icon="triangle-alert" size="small" :class="$style.errorIcon" />
				<N8nIcon v-else icon="check" size="small" :class="$style.successIcon" />
				<span :class="$style.title">{{ i18n.baseText('instanceAi.researchCard.title') }}</span>
			</div>
			<div :class="$style.headerRight">
				<button v-if="isActive" :class="$style.stopButton" @click.stop="handleStop">
					<N8nIcon icon="square" size="small" />
					{{ i18n.baseText('instanceAi.agent.stop') }}
				</button>
				<N8nIcon :icon="isOpen ? 'chevron-up' : 'chevron-down'" size="small" />
			</div>
		</CollapsibleTrigger>

		<CollapsibleContent :class="$style.body">
			<SubagentStepTimeline :agent-node="props.agentNode" />

			<!-- Error -->
			<div v-if="props.agentNode.error" :class="$style.errorResult">
				<N8nIcon icon="triangle-alert" size="small" :class="$style.errorIcon" />
				<span>{{ props.agentNode.error }}</span>
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
	background: var(--color--background);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: none;
	border: none;
	cursor: pointer;
	font-family: var(--font-family);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);

	&:hover {
		background: var(--color--background--shade-1);
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

.title {
	font-weight: var(--font-weight--bold);
	color: var(--text-color);
}

.body {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-top: var(--border);
}

.errorResult {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs) 0 0;
	font-size: var(--font-size--2xs);
	color: var(--color--danger);
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

.successIcon {
	color: var(--color--success);
}

.errorIcon {
	color: var(--color--danger);
}
</style>
