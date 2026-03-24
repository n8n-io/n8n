<script lang="ts" setup>
import { computed } from 'vue';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import InstanceAiToolCall from './InstanceAiToolCall.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import BuilderCard from './BuilderCard.vue';
import DataTableCard from './DataTableCard.vue';
import ResearchCard from './ResearchCard.vue';
import AgentNodeSection from './AgentNodeSection.vue';
import DelegateCard from './DelegateCard.vue';
import ArtifactCard from './ArtifactCard.vue';

const i18n = useI18n();

function extractResourceId(node: InstanceAiAgentNode): string | undefined {
	if (node.targetResource?.id) return node.targetResource.id;
	// Fallback: extract from tool call results
	for (const tc of node.toolCalls) {
		if (!tc.result || typeof tc.result !== 'object') continue;
		const result = tc.result as Record<string, unknown>;
		if (typeof result.workflowId === 'string') return result.workflowId;
		if (typeof result.tableId === 'string') return result.tableId;
		if (typeof result.dataTableId === 'string') return result.dataTableId;
	}
	for (const child of node.children) {
		const id = extractResourceId(child);
		if (id !== undefined) return id;
	}
	return undefined;
}

function shouldShowArtifact(node: InstanceAiAgentNode): boolean {
	return (
		node.status === 'completed' &&
		(node.targetResource?.type === 'workflow' || node.targetResource?.type === 'data-table') &&
		extractResourceId(node) !== undefined
	);
}

function extractWorkflowName(node: InstanceAiAgentNode): string | undefined {
	for (const tc of node.toolCalls) {
		if (tc.toolName === 'build-workflow' || tc.toolName === 'submit-workflow') {
			// Check result for workflowName
			if (tc.result && typeof tc.result === 'object') {
				const result = tc.result as Record<string, unknown>;
				if (typeof result.workflowName === 'string') return result.workflowName;
			}
			// Check args for name (build-workflow args contain { name, code })
			if (tc.args && typeof tc.args === 'object') {
				const args = tc.args as Record<string, unknown>;
				if (typeof args.name === 'string') return args.name;
			}
		}
	}
	// Fallback: check get-workflow-as-code result which has { name, workflowId }
	for (const tc of node.toolCalls) {
		if (tc.toolName === 'get-workflow-as-code' && tc.result && typeof tc.result === 'object') {
			const result = tc.result as Record<string, unknown>;
			if (typeof result.name === 'string') return result.name;
		}
	}
	for (const child of node.children) {
		const name = extractWorkflowName(child);
		if (name !== undefined) return name;
	}
	return undefined;
}

function extractDataTableName(node: InstanceAiAgentNode): string | undefined {
	for (const tc of node.toolCalls) {
		if (tc.toolName === 'create-data-table' && tc.result && typeof tc.result === 'object') {
			const result = tc.result as Record<string, unknown>;
			if (typeof result.name === 'string') return result.name;
			if (typeof result.tableName === 'string') return result.tableName;
		}
	}
	for (const child of node.children) {
		const name = extractDataTableName(child);
		if (name !== undefined) return name;
	}
	return undefined;
}

function getArtifactName(node: InstanceAiAgentNode): string {
	if (node.targetResource?.type === 'workflow') {
		const name = extractWorkflowName(node);
		if (name) return name;
	}

	if (node.targetResource?.type === 'data-table') {
		const name = extractDataTableName(node);
		if (name) return name;
	}

	return node.subtitle ?? node.targetResource?.name ?? 'Untitled';
}

function extractColumnCount(node: InstanceAiAgentNode): number | undefined {
	for (const tc of node.toolCalls) {
		if (!tc.result || typeof tc.result !== 'object') continue;
		const result = tc.result as Record<string, unknown>;
		if (Array.isArray(result.columns)) return (result.columns as unknown[]).length;
		if (typeof result.columnCount === 'number') return result.columnCount;
	}
	// Also check child agents' tool calls
	for (const child of node.children) {
		const count = extractColumnCount(child);
		if (count !== undefined) return count;
	}
	return undefined;
}

function formatArtifactMetadata(node: InstanceAiAgentNode): string {
	const parts: string[] = [];

	if (node.targetResource?.type === 'data-table') {
		const columnCount = extractColumnCount(node);
		if (columnCount !== undefined) {
			parts.push(
				i18n.baseText('instanceAi.artifactCard.columns', {
					interpolate: { count: String(columnCount) },
				}),
			);
		}
	}

	// Find latest completedAt from tool calls
	let latestTime: string | undefined;
	for (const tc of node.toolCalls) {
		if (tc.completedAt && (!latestTime || tc.completedAt > latestTime)) {
			latestTime = tc.completedAt;
		}
	}

	if (latestTime) {
		const diffMs = Date.now() - new Date(latestTime).getTime();
		const diffMin = Math.floor(diffMs / 60_000);
		if (diffMin < 1) {
			parts.push(i18n.baseText('instanceAi.artifactCard.updatedJustNow'));
		} else {
			parts.push(
				i18n.baseText('instanceAi.artifactCard.updatedAgo', {
					interpolate: { time: `${diffMin}m` },
				}),
			);
		}
	} else {
		parts.push(i18n.baseText('instanceAi.artifactCard.updatedJustNow'));
	}

	return parts.join(' \u00B7 ');
}

const props = withDefaults(
	defineProps<{
		agentNode: InstanceAiAgentNode;
		compact?: boolean;
	}>(),
	{
		compact: false,
	},
);

defineSlots<{
	'after-tool-call'?: (props: { toolCall: InstanceAiToolCallState }) => unknown;
}>();

/** Index tool calls by ID for O(1) lookup and proper reactivity tracking. */
const toolCallsById = computed(() => {
	const map: Record<string, InstanceAiToolCallState> = {};
	for (const tc of props.agentNode.toolCalls) {
		map[tc.toolCallId] = tc;
	}
	return map;
});

/** Index children by agentId for O(1) lookup and proper reactivity tracking. */
const childrenById = computed(() => {
	const map: Record<string, InstanceAiAgentNode> = {};
	for (const child of props.agentNode.children) {
		map[child.agentId] = child;
	}
	return map;
});
</script>

<template>
	<div :class="$style.timeline">
		<template v-for="(entry, idx) in props.agentNode.timeline" :key="idx">
			<!-- Text segment -->
			<div
				v-if="entry.type === 'text'"
				:class="[$style.textContent, props.compact && $style.compactText]"
			>
				<InstanceAiMarkdown :content="entry.content" />
			</div>

			<!-- Tool call -->
			<template v-else-if="entry.type === 'tool-call' && toolCallsById[entry.toolCallId]">
				<template v-if="toolCallsById[entry.toolCallId].renderHint === 'tasks'" />
				<DelegateCard
					v-else-if="toolCallsById[entry.toolCallId].renderHint === 'delegate'"
					:args="toolCallsById[entry.toolCallId].args"
					:result="toolCallsById[entry.toolCallId].result"
					:is-loading="toolCallsById[entry.toolCallId].isLoading"
					:tool-call-id="toolCallsById[entry.toolCallId].toolCallId"
				/>
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'builder'" />
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'data-table'" />
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'researcher'" />
				<template v-else>
					<InstanceAiToolCall :tool-call="toolCallsById[entry.toolCallId]" />
					<slot name="after-tool-call" :tool-call="toolCallsById[entry.toolCallId]" />
				</template>
			</template>

			<!-- Child agent -->
			<template v-else-if="entry.type === 'child' && childrenById[entry.agentId]">
				<BuilderCard
					v-if="
						childrenById[entry.agentId].kind === 'builder' ||
						childrenById[entry.agentId].role === 'workflow-builder'
					"
					:agent-node="childrenById[entry.agentId]"
				/>
				<DataTableCard
					v-else-if="
						childrenById[entry.agentId].kind === 'data-table' ||
						childrenById[entry.agentId].role === 'data-table-manager'
					"
					:agent-node="childrenById[entry.agentId]"
				/>
				<ResearchCard
					v-else-if="
						childrenById[entry.agentId].kind === 'researcher' ||
						childrenById[entry.agentId].role === 'web-researcher'
					"
					:agent-node="childrenById[entry.agentId]"
				/>
				<AgentNodeSection v-else :agent-node="childrenById[entry.agentId]" />

				<!-- Artifact card for completed subagents with a target resource -->
				<ArtifactCard
					v-if="shouldShowArtifact(childrenById[entry.agentId])"
					:type="
						(childrenById[entry.agentId].targetResource?.type ?? 'workflow') as
							| 'workflow'
							| 'data-table'
					"
					:name="getArtifactName(childrenById[entry.agentId])"
					:resource-id="extractResourceId(childrenById[entry.agentId]) ?? ''"
					:metadata="formatArtifactMetadata(childrenById[entry.agentId])"
				/>
			</template>
		</template>
	</div>
</template>

<style lang="scss" module>
.timeline {
	width: 100%;
}

.textContent {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text);
}

.compactText {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}
</style>
