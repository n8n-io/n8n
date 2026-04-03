<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';
import { useToolLabel } from '../toolLabels';
import { getRenderableAgentResult } from '../agentResult';
import ExecutionPreviewCard from './ExecutionPreviewCard.vue';
import AgentTimeline from './AgentTimeline.vue';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const { getToolLabel } = useToolLabel();
const isGoalOpen = ref(false);

function handleStop() {
	store.amendAgent(props.agentNode.agentId, props.agentNode.role, props.agentNode.taskId);
}

const isOpen = ref(true);

watch(
	() => props.agentNode.status,
	(newStatus) => {
		if (newStatus === 'completed' || newStatus === 'cancelled') {
			isOpen.value = false;
		}
	},
);

const statusConfig = {
	active: { icon: 'spinner', className: 'activeIcon', spin: true },
	completed: { icon: 'check', className: 'completedIcon', spin: false },
	cancelled: { icon: 'x', className: 'cancelledIcon', spin: false },
	error: { icon: 'triangle-alert', className: 'errorIcon', spin: false },
} satisfies Record<
	InstanceAiAgentNode['status'],
	{ icon: IconName; className: string; spin: boolean }
>;

const displayTitle = computed(() => {
	return props.agentNode.title ?? props.agentNode.role;
});

const displaySubtitle = computed(() => {
	return props.agentNode.subtitle ?? '';
});

/** Extract execution info from completed run-workflow tool calls. */
const runResults = computed(() => {
	const map = new Map<
		string,
		{ executionId: string; workflowId: string; status: string; error?: string }
	>();
	for (const tc of props.agentNode.toolCalls) {
		if (tc.toolName === 'run-workflow' && tc.result && typeof tc.result === 'object') {
			const result = tc.result as Record<string, unknown>;
			const args = tc.args as Record<string, unknown>;
			if (typeof result.executionId === 'string' && typeof args.workflowId === 'string') {
				map.set(tc.toolCallId, {
					executionId: result.executionId,
					workflowId: args.workflowId,
					status: typeof result.status === 'string' ? result.status : 'unknown',
					error: typeof result.error === 'string' ? result.error : undefined,
				});
			}
		}
	}
	return map;
});

const displayResult = computed(() => getRenderableAgentResult(props.agentNode));
const isActive = computed(() => props.agentNode.status === 'active');
const statusEntry = computed(() => statusConfig[props.agentNode.status]);
</script>

<template>
	<CollapsibleRoot v-model:open="isOpen" :class="$style.root">
		<CollapsibleTrigger :class="$style.header">
			<div :class="$style.headerLeft">
				<N8nIcon
					:icon="statusEntry.icon"
					:class="$style[statusEntry.className]"
					:spin="statusEntry.spin"
					size="small"
				/>
				<span :class="$style.title">{{ displayTitle }}</span>
				<span v-if="displaySubtitle" :class="$style.subtitle">{{ displaySubtitle }}</span>
			</div>
			<div :class="$style.headerRight">
				<button v-if="isActive" :class="$style.stopButton" @click.stop="handleStop">
					<N8nIcon icon="square" size="small" />
					{{ i18n.baseText('instanceAi.agent.stop') }}
				</button>
				<N8nIcon :icon="isOpen ? 'chevron-up' : 'chevron-down'" size="small" />
			</div>
		</CollapsibleTrigger>

		<!-- Tools row -->
		<div v-if="props.agentNode.tools?.length" :class="$style.toolsRow">
			<span v-for="tool in props.agentNode.tools" :key="tool" :class="$style.toolBadge">
				{{ getToolLabel(tool) }}
			</span>
		</div>

		<!-- Goal / delegation prompt (collapsed by default) -->
		<CollapsibleRoot
			v-if="props.agentNode.goal"
			v-model:open="isGoalOpen"
			:class="$style.goalBlock"
		>
			<CollapsibleTrigger :class="$style.goalTrigger">
				<span>Delegation briefing</span>
				<N8nIcon :icon="isGoalOpen ? 'chevron-up' : 'chevron-down'" size="small" />
			</CollapsibleTrigger>
			<CollapsibleContent :class="$style.goalContent">
				<p>{{ props.agentNode.goal }}</p>
			</CollapsibleContent>
		</CollapsibleRoot>

		<CollapsibleContent :class="$style.content">
			<!-- Reasoning -->
			<CollapsibleRoot v-if="props.agentNode.reasoning" :class="$style.reasoningBlock">
				<CollapsibleTrigger :class="$style.reasoningTrigger">
					<N8nIcon icon="brain" size="small" />
					<span>{{ i18n.baseText('instanceAi.message.reasoning') }}</span>
				</CollapsibleTrigger>
				<CollapsibleContent :class="$style.reasoningContent">
					<p>{{ props.agentNode.reasoning }}</p>
				</CollapsibleContent>
			</CollapsibleRoot>

			<!-- Timeline -->
			<AgentTimeline :agent-node="props.agentNode" :compact="true">
				<template #after-tool-call="{ toolCall: tc }">
					<ExecutionPreviewCard
						v-if="runResults.has(tc.toolCallId)"
						:execution-id="runResults.get(tc.toolCallId)!.executionId"
						:workflow-id="runResults.get(tc.toolCallId)!.workflowId"
						:status="runResults.get(tc.toolCallId)!.status"
						:error="runResults.get(tc.toolCallId)!.error"
					/>
				</template>
			</AgentTimeline>
		</CollapsibleContent>

		<!-- Footer: error or result (always visible, outside collapsible) -->
		<div v-if="props.agentNode.error" :class="$style.footer">
			<N8nIcon icon="triangle-alert" size="small" :class="$style.errorIcon" />
			<span>{{ props.agentNode.error }}</span>
		</div>
		<div v-else-if="displayResult && !isOpen" :class="[$style.footer, $style.footerSuccess]">
			<N8nIcon icon="check" size="small" :class="$style.completedIcon" />
			<span>{{ displayResult }}</span>
		</div>
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
	padding: var(--spacing--xs) var(--spacing--sm);
	background: var(--color--foreground--tint-2);
	border: none;
	cursor: pointer;
	font-family: var(--font-family);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);

	&:hover {
		background: var(--color--foreground--tint-1);
	}
}

.headerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.headerRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.title {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	white-space: nowrap;
}

.subtitle {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 280px;
}

.toolsRow {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	padding: var(--spacing--3xs) var(--spacing--sm);
	border-top: var(--border);
}

.toolBadge {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	background: var(--color--foreground);
	border-radius: var(--radius--sm);
	white-space: nowrap;
	color: var(--color--text);
}

.goalBlock {
	border-top: var(--border);
}

.goalTrigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--sm);
	background: none;
	border: none;
	cursor: pointer;
	font-family: var(--font-family);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.05em;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.goalContent {
	padding: 0 var(--spacing--sm) var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--xl);

	p {
		margin: 0;
		white-space: pre-wrap;
		word-break: break-word;
	}
}

.content {
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-top: var(--border);
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-top: var(--border);
	font-size: var(--font-size--2xs);
	color: var(--color--danger);
	background: color-mix(in srgb, var(--color--danger) 5%, var(--color--background));
}

.footerSuccess {
	color: var(--color--success);
	background: color-mix(in srgb, var(--color--success) 5%, var(--color--background));
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
	border-left: var(--border-width) var(--border-style) var(--color--foreground);
	margin-left: var(--spacing--4xs);
}

.textContent {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text);
	margin-top: var(--spacing--2xs);
}

.errorBlock {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--danger);
	margin-top: var(--spacing--2xs);
}

.resultBlock {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--success);
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
	color: var(--color--text--tint-1);
}

.errorIcon {
	color: var(--color--danger);
}
</style>
