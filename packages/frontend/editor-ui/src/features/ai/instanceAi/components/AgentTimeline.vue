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
import DelegateCard from './DelegateCard.vue';
import TaskChecklist from './TaskChecklist.vue';
import AnsweredQuestions from './AnsweredQuestions.vue';
import PlanReviewPanel, { type PlannedTaskArg } from './PlanReviewPanel.vue';
import { useInstanceAiStore } from '../instanceAi.store';

const i18n = useI18n();
const { getToolLabel, getToggleLabel, getHideLabel } = useToolLabel();

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
