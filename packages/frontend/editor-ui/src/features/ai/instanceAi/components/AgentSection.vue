<script lang="ts" setup>
import { computed, ref, useTemplateRef, watch, nextTick } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';
import SubagentStepTimeline from './SubagentStepTimeline.vue';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
}>();

const i18n = useI18n();
const instanceAiStore = useInstanceAiStore();

const isExpanded = ref(false);
const peekRef = useTemplateRef<HTMLElement>('peekContainer');

const isActive = computed(() => props.agentNode.status === 'active');
const isError = computed(() => props.agentNode.status === 'error');

const sectionTitle = computed(
	() => props.agentNode.subtitle ?? props.agentNode.role ?? 'Working...',
);

function handleStop() {
	instanceAiStore.amendAgent(props.agentNode.agentId, props.agentNode.role, props.agentNode.taskId);
}

function toggleExpanded() {
	isExpanded.value = !isExpanded.value;
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

// Scroll peek container to bottom so last steps are visible
function scrollPeekToBottom() {
	if (peekRef.value && !isExpanded.value) {
		peekRef.value.scrollTop = peekRef.value.scrollHeight;
	}
}

// Re-scroll when timeline content updates (new steps appear)
watch(
	() => props.agentNode.timeline.length,
	async () => {
		await nextTick();
		scrollPeekToBottom();
	},
);

// Scroll on initial mount and when collapsing
watch(
	isExpanded,
	async (expanded) => {
		if (!expanded) {
			await nextTick();
			scrollPeekToBottom();
		}
	},
	{ flush: 'post' },
);
</script>

<template>
	<div :class="$style.root">
		<!-- Section header -->
		<div
			:class="$style.header"
			role="button"
			tabindex="0"
			@click="toggleExpanded"
			@keydown.enter="toggleExpanded"
		>
			<N8nIcon
				:icon="isExpanded ? 'chevron-down' : 'chevron-right'"
				size="small"
				:class="$style.chevron"
			/>
			<span :class="[$style.title, isActive && $style.shimmer]">{{ sectionTitle }}</span>
			<button v-if="isActive" :class="$style.stopButton" @click.stop="handleStop">
				<N8nIcon icon="square" size="small" />
				{{ i18n.baseText('instanceAi.agent.stop') }}
			</button>
		</div>

		<!-- Expanded: full timeline -->
		<div v-if="isExpanded" :class="$style.content">
			<SubagentStepTimeline :agent-node="props.agentNode" />
		</div>

		<!-- Collapsed + active: peek preview with gradient (click to expand) -->
		<div v-else-if="isActive" :class="$style.peekWrapper" @click="toggleExpanded">
			<div :class="$style.peekGradient" />
			<div ref="peekContainer" :class="$style.peekContainer">
				<SubagentStepTimeline :agent-node="props.agentNode" />
			</div>
		</div>

		<!-- Error display -->
		<div v-if="isError && props.agentNode.error" :class="$style.errorResult">
			<N8nIcon icon="triangle-alert" size="small" :class="$style.errorIcon" />
			<span>{{ props.agentNode.error }}</span>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	margin: var(--spacing--2xs) 0;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--4xs) 0;
	background: none;
	border: none;
	cursor: pointer;
	font-family: var(--font-family);
	gap: var(--spacing--2xs);
}

.title {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--lg);
	text-align: left;
	flex: 1;
	min-width: 0;
}

.chevron {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.content {
	padding-top: var(--spacing--4xs);
}

.peekWrapper {
	position: relative;
	cursor: pointer;
}

.peekGradient {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 40px;
	background: linear-gradient(to bottom, var(--color--background), transparent);
	z-index: 1;
	pointer-events: none;
}

.peekContainer {
	max-height: 100px;
	overflow: hidden;
}

.errorResult {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs) 0 0;
	font-size: var(--font-size--2xs);
	color: var(--color--danger);
}

.errorIcon {
	color: var(--color--danger);
	flex-shrink: 0;
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
