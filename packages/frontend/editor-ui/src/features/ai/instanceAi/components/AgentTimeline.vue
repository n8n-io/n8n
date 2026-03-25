<script lang="ts" setup>
import { computed } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon } from '@n8n/design-system';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToolLabel, getToolIcon } from '../toolLabels';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import AgentSection from './AgentSection.vue';
import ArtifactCard from './ArtifactCard.vue';
import ToolResultRenderer from './ToolResultRenderer.vue';
import ToolResultJson from './ToolResultJson.vue';

const i18n = useI18n();
const { getToolLabel, getToggleLabel, getHideLabel } = useToolLabel();

function extractResourceId(node: InstanceAiAgentNode): string | undefined {
	if (node.targetResource?.id) return node.targetResource.id;
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
			if (tc.result && typeof tc.result === 'object') {
				const result = tc.result as Record<string, unknown>;
				if (typeof result.workflowName === 'string') return result.workflowName;
			}
			if (tc.args && typeof tc.args === 'object') {
				const args = tc.args as Record<string, unknown>;
				if (typeof args.name === 'string') return args.name;
			}
		}
	}
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
	for (const child of node.children) {
		const count = extractColumnCount(child);
		if (count !== undefined) return count;
	}
	return undefined;
}

function formatRelativeTime(isoTime: string): string {
	const diffMs = Date.now() - new Date(isoTime).getTime();
	const diffMin = Math.floor(diffMs / 60_000);
	if (diffMin < 1) {
		return i18n.baseText('instanceAi.artifactCard.updatedJustNow');
	}
	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 1) {
		return i18n.baseText('instanceAi.artifactCard.updatedAgo', {
			interpolate: { time: `${diffMin} minutes` },
		});
	}
	return i18n.baseText('instanceAi.artifactCard.updatedAgo', {
		interpolate: { time: `${diffHours} hours` },
	});
}

function formatCreatedDate(isoTime: string): string {
	const date = new Date(isoTime);
	const day = date.getDate();
	const month = date.toLocaleString('en', { month: 'long' });
	return i18n.baseText('instanceAi.artifactCard.createdAt', {
		interpolate: { date: `${day} ${month}` },
	});
}

function formatArtifactMetadata(node: InstanceAiAgentNode): string {
	const parts: string[] = [];

	// Find latest and earliest times from tool calls
	let latestTime: string | undefined;
	let earliestTime: string | undefined;
	for (const tc of node.toolCalls) {
		if (tc.completedAt) {
			if (!latestTime || tc.completedAt > latestTime) latestTime = tc.completedAt;
			if (!earliestTime || tc.completedAt < earliestTime) earliestTime = tc.completedAt;
		}
	}

	if (latestTime) {
		parts.push(formatRelativeTime(latestTime));
	} else {
		parts.push(i18n.baseText('instanceAi.artifactCard.updatedJustNow'));
	}

	if (earliestTime) {
		parts.push(formatCreatedDate(earliestTime));
	}

	return parts.join(' \u2502 ');
}

/** Display label for a tool call, with contextual info for search/fetch. */
function getToolDisplayName(tc: InstanceAiToolCallState): string {
	const label = getToolLabel(tc.toolName) || tc.toolName;
	if (tc.toolName === 'delegate') {
		const role = typeof tc.args?.role === 'string' ? tc.args.role : '';
		return role ? `${label} (${role})` : label;
	}
	if (tc.toolName === 'web-search' && typeof tc.args?.query === 'string') {
		return `${label}: "${tc.args.query}"`;
	}
	if (tc.toolName === 'fetch-url' && typeof tc.args?.url === 'string') {
		return `${label}: ${tc.args.url}`;
	}
	return label;
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

			<!-- Tool call — flat timeline step -->
			<template v-else-if="entry.type === 'tool-call' && toolCallsById[entry.toolCallId]">
				<!-- Hidden tool calls (tasks, builder/data-table/researcher handled by child agent) -->
				<template
					v-if="
						toolCallsById[entry.toolCallId].renderHint === 'tasks' ||
						toolCallsById[entry.toolCallId].renderHint === 'builder' ||
						toolCallsById[entry.toolCallId].renderHint === 'data-table' ||
						toolCallsById[entry.toolCallId].renderHint === 'researcher'
					"
				/>

				<!-- Visible tool call — rendered as flat timeline step -->
				<template v-else>
					<div :class="$style.step">
						<div :class="$style.iconColumn">
							<N8nIcon
								:icon="
									toolCallsById[entry.toolCallId].isLoading
										? 'spinner'
										: getToolIcon(toolCallsById[entry.toolCallId].toolName)
								"
								size="small"
								:spin="toolCallsById[entry.toolCallId].isLoading"
								:class="[
									$style.stepIcon,
									toolCallsById[entry.toolCallId].isLoading && $style.loadingIcon,
								]"
							/>
							<div :class="$style.connector" />
						</div>
						<div :class="$style.stepContent">
							<span :class="$style.stepLabel">{{
								getToolDisplayName(toolCallsById[entry.toolCallId])
							}}</span>
							<CollapsibleRoot
								v-if="getToggleLabel(toolCallsById[entry.toolCallId])"
								v-slot="{ open: toolOpen }"
								:class="$style.toggleBlock"
							>
								<CollapsibleTrigger :class="$style.toggleButton">
									{{
										toolOpen
											? getHideLabel(toolCallsById[entry.toolCallId])
											: getToggleLabel(toolCallsById[entry.toolCallId])
									}}
								</CollapsibleTrigger>
								<CollapsibleContent :class="$style.toggleContent">
									<div v-if="toolCallsById[entry.toolCallId].args" :class="$style.dataSection">
										<ToolResultJson :value="toolCallsById[entry.toolCallId].args" />
									</div>
									<div
										v-if="toolCallsById[entry.toolCallId].result !== undefined"
										:class="$style.dataSection"
									>
										<ToolResultRenderer
											:result="toolCallsById[entry.toolCallId].result"
											:tool-name="toolCallsById[entry.toolCallId].toolName"
										/>
									</div>
									<div
										v-if="toolCallsById[entry.toolCallId].error !== undefined"
										:class="[$style.dataSection, $style.errorText]"
									>
										{{ toolCallsById[entry.toolCallId].error }}
									</div>
								</CollapsibleContent>
							</CollapsibleRoot>
							<slot name="after-tool-call" :tool-call="toolCallsById[entry.toolCallId]" />
						</div>
					</div>
				</template>
			</template>

			<!-- Child agent — flat section -->
			<template v-else-if="entry.type === 'child' && childrenById[entry.agentId]">
				<AgentSection :agent-node="childrenById[entry.agentId]" />

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
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
	color: var(--color--text--shade-1);
	margin-bottom: var(--spacing--xs);
}

.compactText {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

/* Flat timeline step styles (matching SubagentStepTimeline) */
.step {
	display: flex;
	gap: var(--spacing--xs);
}

.iconColumn {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 20px;
	flex-shrink: 0;
	padding-top: 2px;
}

.connector {
	width: 1px;
	flex: 1;
	background: var(--color--foreground--shade-1);
	min-height: 12px;
}

.stepIcon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.loadingIcon {
	color: var(--color--primary);
}

.stepContent {
	display: flex;
	flex-direction: column;
	min-width: 0;
	flex: 1;
	padding-bottom: var(--spacing--2xs);
}

.stepLabel {
	font-size: var(--font-size--sm);
	color: var(--color--text);
	line-height: var(--line-height--lg);
}

.toggleBlock {
	margin-top: var(--spacing--4xs);
}

.toggleButton {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	font-family: var(--font-family);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--tint-1);
	background: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.toggleContent {
	margin-top: var(--spacing--4xs);
	max-height: 300px;
	overflow-y: auto;
}

.dataSection {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	padding: var(--spacing--2xs);

	:global(pre) {
		background: transparent;
		margin: 0;
		padding: 0;
	}

	& + & {
		margin-top: var(--spacing--4xs);
	}
}

.errorText {
	color: var(--color--danger);
	font-family: monospace;
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
