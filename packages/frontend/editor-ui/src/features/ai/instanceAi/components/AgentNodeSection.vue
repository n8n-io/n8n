<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';
import InstanceAiToolCall from './InstanceAiToolCall.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import ExecutionPreviewCard from './ExecutionPreviewCard.vue';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();

function handleStop() {
	store.amendAgent(props.agentNode.agentId, props.agentNode.role, props.agentNode.taskId);
}
const isOpen = ref(true);

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
				<span v-for="tool in props.agentNode.tools" :key="tool" :class="$style.toolBadge">
					{{ tool }}
				</span>
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
			<!-- Reasoning (collapsible, if non-empty) -->
			<CollapsibleRoot v-if="props.agentNode.reasoning" :class="$style.reasoningBlock">
				<CollapsibleTrigger :class="$style.reasoningTrigger">
					<N8nIcon icon="brain" size="small" />
					<span>{{ i18n.baseText('instanceAi.message.reasoning') }}</span>
				</CollapsibleTrigger>
				<CollapsibleContent :class="$style.reasoningContent">
					<p>{{ props.agentNode.reasoning }}</p>
				</CollapsibleContent>
			</CollapsibleRoot>

			<!-- Tool calls -->
			<template v-for="tc in props.agentNode.toolCalls" :key="tc.toolCallId">
				<InstanceAiToolCall :tool-call="tc" />
				<ExecutionPreviewCard
					v-if="runResults.has(tc.toolCallId)"
					:execution-id="runResults.get(tc.toolCallId)!.executionId"
					:workflow-id="runResults.get(tc.toolCallId)!.workflowId"
					:status="runResults.get(tc.toolCallId)!.status"
					:error="runResults.get(tc.toolCallId)!.error"
				/>
			</template>

			<!-- Text content from sub-agent -->
			<div v-if="props.agentNode.textContent" :class="$style.textContent">
				<InstanceAiMarkdown :content="props.agentNode.textContent" />
			</div>

			<!-- Error -->
			<div v-if="props.agentNode.error" :class="$style.errorBlock">
				<N8nIcon icon="triangle-alert" size="small" :class="$style.errorIcon" />
				<span>{{ i18n.baseText('instanceAi.agentTree.error') }}: {{ props.agentNode.error }}</span>
			</div>

			<!-- Result summary -->
			<div v-if="props.agentNode.result && !props.agentNode.error" :class="$style.resultBlock">
				<N8nIcon icon="check" size="small" :class="$style.completedIcon" />
				<span>{{ props.agentNode.result }}</span>
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
	color: var(--color--text--tint-1);

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

.toolBadge {
	display: inline-block;
	padding: 1px var(--spacing--4xs);
	font-size: var(--font-size--3xs);
	font-family: monospace;
	background: var(--color--foreground);
	border: var(--border);
	border-radius: var(--radius--sm);
	color: var(--color--text);
}

.content {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-top: var(--border);
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
