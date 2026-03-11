<script lang="ts" setup>
import { computed } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import InstanceAiToolCall from './InstanceAiToolCall.vue';
import DelegateCard from './DelegateCard.vue';
import BuilderCard from './BuilderCard.vue';
import DataTableCard from './DataTableCard.vue';
import ResearchCard from './ResearchCard.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import AgentNodeSection from './AgentNodeSection.vue';

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

function findToolCall(toolCallId: string): InstanceAiToolCallState | undefined {
	return props.agentNode.toolCalls.find((tc) => tc.toolCallId === toolCallId);
}

function findChild(agentId: string): InstanceAiAgentNode | undefined {
	return props.agentNode.children.find((c) => c.agentId === agentId);
}
</script>

<template>
	<div :class="$style.tree">
		<!-- Reasoning (collapsible, root agent only) -->
		<CollapsibleRoot v-if="isRoot && hasReasoning" :class="$style.reasoningBlock">
			<CollapsibleTrigger :class="$style.reasoningTrigger">
				<N8nIcon icon="brain" size="small" />
				<span>{{ i18n.baseText('instanceAi.message.reasoning') }}</span>
			</CollapsibleTrigger>
			<CollapsibleContent :class="$style.reasoningContent">
				<p>{{ props.agentNode.reasoning }}</p>
			</CollapsibleContent>
		</CollapsibleRoot>

		<!-- Interleaved timeline: text, tool calls, sub-agents in chronological order -->
		<template v-for="(entry, idx) in props.agentNode.timeline" :key="idx">
			<!-- Text segment -->
			<div v-if="entry.type === 'text' && isRoot" :class="$style.textContent">
				<InstanceAiMarkdown :content="entry.content" />
			</div>

			<!-- Tool call -->
			<template v-else-if="entry.type === 'tool-call'">
				<template v-for="(tc, tcIdx) in [findToolCall(entry.toolCallId)]" :key="tcIdx">
					<template v-if="tc">
						<template v-if="tc.renderHint === 'plan'" />
						<DelegateCard
							v-else-if="tc.renderHint === 'delegate'"
							:args="tc.args"
							:result="tc.result"
							:is-loading="tc.isLoading"
							:tool-call-id="tc.toolCallId"
						/>
						<template v-else-if="tc.renderHint === 'builder'" />
						<template v-else-if="tc.renderHint === 'data-table'" />
						<template v-else-if="tc.renderHint === 'researcher'" />
						<InstanceAiToolCall v-else :tool-call="tc" />
					</template>
				</template>
			</template>

			<!-- Sub-agent -->
			<template v-else-if="entry.type === 'child'">
				<template v-for="(child, childIdx) in [findChild(entry.agentId)]" :key="childIdx">
					<template v-if="child">
						<BuilderCard v-if="child.role === 'workflow-builder'" :agent-node="child" />
						<DataTableCard v-else-if="child.role === 'data-table-manager'" :agent-node="child" />
						<ResearchCard v-else-if="child.role === 'web-researcher'" :agent-node="child" />
						<AgentNodeSection v-else :agent-node="child" />
					</template>
				</template>
			</template>
		</template>
	</div>
</template>

<style lang="scss" module>
.tree {
	width: 100%;
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
	border-left: 2px solid var(--color--foreground);
	margin-left: var(--spacing--4xs);
}

.textContent {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text);
}
</style>
