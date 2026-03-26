<script lang="ts" setup>
import { computed } from 'vue';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import AgentSection from './AgentSection.vue';
import ArtifactCard from './ArtifactCard.vue';
import ToolCallStep from './ToolCallStep.vue';
import DelegateCard from './DelegateCard.vue';
import TaskChecklist from './TaskChecklist.vue';
import AnsweredQuestions from './AnsweredQuestions.vue';
import PlanReviewPanel, { type PlannedTaskArg } from './PlanReviewPanel.vue';
import { useInstanceAiStore } from '../instanceAi.store';

const i18n = useI18n();

interface ArtifactInfo {
	type: 'workflow' | 'data-table';
	resourceId: string;
	name: string;
	projectId?: string;
	/** ISO timestamp of the tool call that produced this artifact. */
	completedAt?: string;
}

/** Extract all artifacts (workflows and data tables) from a node's tool calls. */
function extractArtifacts(node: InstanceAiAgentNode): ArtifactInfo[] {
	if (node.status !== 'completed') return [];

	const artifacts: ArtifactInfo[] = [];
	const seenIds = new Set<string>();

	// Check targetResource first (single-workflow agents)
	if (node.targetResource?.id && node.targetResource.type) {
		const type = node.targetResource.type;
		if (type === 'workflow' || type === 'data-table') {
			seenIds.add(node.targetResource.id);
			artifacts.push({
				type,
				resourceId: node.targetResource.id,
				name: node.targetResource.name ?? node.subtitle ?? 'Untitled',
				completedAt: undefined,
			});
		}
	}

	// Scan tool calls for additional artifacts
	for (const tc of node.toolCalls) {
		if (!tc.result || typeof tc.result !== 'object') continue;
		const result = tc.result as Record<string, unknown>;

		// Workflow artifacts from build-workflow / submit-workflow
		if (
			(tc.toolName === 'build-workflow' || tc.toolName === 'submit-workflow') &&
			typeof result.workflowId === 'string' &&
			!seenIds.has(result.workflowId)
		) {
			seenIds.add(result.workflowId);
			const name =
				(typeof result.workflowName === 'string' ? result.workflowName : undefined) ??
				(typeof (tc.args as Record<string, unknown>)?.name === 'string'
					? ((tc.args as Record<string, unknown>).name as string)
					: undefined) ??
				'Untitled';
			artifacts.push({
				type: 'workflow',
				resourceId: result.workflowId,
				name,
				completedAt: tc.completedAt,
			});
			continue;
		}

		// Data table artifacts
		let tableId: string | undefined;
		let tableName: string | undefined;
		let tableProjectId: string | undefined;

		if (typeof result.tableId === 'string') tableId = result.tableId;
		if (typeof result.dataTableId === 'string') tableId = result.dataTableId;
		if (typeof result.name === 'string') tableName = result.name;
		if (typeof result.tableName === 'string') tableName = result.tableName;
		if (typeof result.projectId === 'string') tableProjectId = result.projectId;

		const table = result.table;
		if (table && typeof table === 'object') {
			const t = table as Record<string, unknown>;
			if (typeof t.id === 'string') tableId = t.id;
			if (typeof t.name === 'string') tableName = t.name;
			if (typeof t.projectId === 'string') tableProjectId = t.projectId;
		}

		if (tableId && !seenIds.has(tableId)) {
			seenIds.add(tableId);
			artifacts.push({
				type: 'data-table',
				resourceId: tableId,
				name: tableName ?? 'Untitled',
				projectId: tableProjectId,
				completedAt: tc.completedAt,
			});
		}
	}

	// Recurse into children
	for (const child of node.children) {
		for (const artifact of extractArtifacts(child)) {
			if (!seenIds.has(artifact.resourceId)) {
				seenIds.add(artifact.resourceId);
				artifacts.push(artifact);
			}
		}
	}

	return artifacts;
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

function formatArtifactMetadata(artifact: ArtifactInfo): string {
	const parts: string[] = [];

	if (artifact.completedAt) {
		parts.push(formatRelativeTime(artifact.completedAt));
		parts.push(formatCreatedDate(artifact.completedAt));
	} else {
		parts.push(i18n.baseText('instanceAi.artifactCard.updatedJustNow'));
	}

	return parts.join(' \u2502 ');
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

const store = useInstanceAiStore();

function handlePlanConfirm(tc: InstanceAiToolCallState, approved: boolean, feedback?: string) {
	const requestId = tc.confirmation?.requestId;
	if (!requestId) return;
	store.resolveConfirmation(requestId, approved ? 'approved' : 'denied');
	void store.confirmAction(requestId, approved, undefined, undefined, undefined, feedback);
}
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
				<TaskChecklist
					v-if="toolCallsById[entry.toolCallId].renderHint === 'tasks'"
					:tasks="props.agentNode.tasks"
				/>
				<DelegateCard
					v-else-if="toolCallsById[entry.toolCallId].renderHint === 'delegate'"
					:args="toolCallsById[entry.toolCallId].args"
					:result="toolCallsById[entry.toolCallId].result"
					:is-loading="toolCallsById[entry.toolCallId].isLoading"
					:tool-call-id="toolCallsById[entry.toolCallId].toolCallId"
				/>
				<!-- Hidden tool calls (builder/data-table/researcher handled by child agent via AgentSection) -->
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'builder'" />
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'data-table'" />
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'researcher'" />
				<!-- Answered questions (read-only after resolution) -->
				<AnsweredQuestions
					v-else-if="
						toolCallsById[entry.toolCallId].confirmation?.inputType === 'questions' &&
						!toolCallsById[entry.toolCallId].isLoading
					"
					:tool-call="toolCallsById[entry.toolCallId]"
				/>
				<!-- Plan review: always render inline (interactive while pending, read-only after) -->
				<PlanReviewPanel
					v-else-if="toolCallsById[entry.toolCallId].confirmation?.inputType === 'plan-review'"
					:planned-tasks="
						(toolCallsById[entry.toolCallId].args?.tasks as PlannedTaskArg[] | undefined) ?? []
					"
					:read-only="!toolCallsById[entry.toolCallId].isLoading"
					@approve="handlePlanConfirm(toolCallsById[entry.toolCallId], true)"
					@request-changes="(fb) => handlePlanConfirm(toolCallsById[entry.toolCallId], false, fb)"
				/>
				<!-- Suppress default tool call while questions are pending -->
				<template
					v-else-if="
						toolCallsById[entry.toolCallId].confirmation?.inputType === 'questions' &&
						toolCallsById[entry.toolCallId].isLoading
					"
				/>
				<ToolCallStep
					v-else
					:tool-call="toolCallsById[entry.toolCallId]"
					:show-connector="true"
				>
					<slot name="after-tool-call" :tool-call="toolCallsById[entry.toolCallId]" />
				</ToolCallStep>
			</template>

			<!-- Child agent — flat section -->
			<template v-else-if="entry.type === 'child' && childrenById[entry.agentId]">
				<AgentSection :agent-node="childrenById[entry.agentId]" />

				<!-- Artifact cards for completed subagents (one per workflow/data-table) -->
				<ArtifactCard
					v-for="artifact in extractArtifacts(childrenById[entry.agentId])"
					:key="artifact.resourceId"
					:type="artifact.type"
					:name="artifact.name"
					:resource-id="artifact.resourceId"
					:project-id="artifact.projectId"
					:metadata="formatArtifactMetadata(artifact)"
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
</style>
