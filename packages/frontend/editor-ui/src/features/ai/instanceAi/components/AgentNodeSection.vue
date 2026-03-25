<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import type { IWorkflowDb } from '@/Interface';
import { useInstanceAiStore } from '../instanceAi.store';
import { getRenderableAgentResult } from '../agentResult';
import { useToolLabel } from '../toolLabels';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import ExecutionPreviewCard from './ExecutionPreviewCard.vue';
import WorkflowMiniCanvas from './WorkflowMiniCanvas.vue';
import WorkflowPreview from '@/app/components/WorkflowPreview.vue';
import TaskChecklist from './TaskChecklist.vue';
import AnsweredQuestions from './AnsweredQuestions.vue';
import PlanReviewPanel, { type PlannedTaskArg } from './PlanReviewPanel.vue';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const workflowsListStore = useWorkflowsListStore();
const { getToolLabel } = useToolLabel();

function handleStop() {
	store.amendAgent(props.agentNode.agentId, props.agentNode.role, props.agentNode.taskId);
}

// ── Segment the timeline: text visible, tools collapsed ─────────────

interface TextSegment {
	kind: 'text';
	content: string;
}

interface ActivitySegment {
	kind: 'activity';
	entries: InstanceAiTimelineEntry[];
}

/** Special entries that should render at top level (not inside thinking). */
interface RichSegment {
	kind: 'rich';
	richType: 'tool-call';
	toolCallId: string;
}

type Segment = TextSegment | ActivitySegment | RichSegment;

/** Tool calls that produce visible top-level content (not hidden in thinking). */
function isRichToolCall(tc: InstanceAiToolCallState): boolean {
	if (tc.renderHint === 'tasks') return true;
	if (tc.confirmation?.inputType === 'plan-review') return true;
	if (tc.confirmation?.inputType === 'questions' && !tc.isLoading) return true;
	// Workflow preview / execution preview — these get rendered as rich content
	if (
		(tc.toolName === 'build-workflow' || tc.toolName === 'submit-workflow') &&
		tc.result &&
		typeof tc.result === 'object'
	) {
		const r = tc.result as Record<string, unknown>;
		if (r.success === true && typeof r.workflowId === 'string') return true;
	}
	if (tc.toolName === 'run-workflow' && tc.result && typeof tc.result === 'object') return true;
	return false;
}

/** Index all tool calls: own + children (for flattened rendering). */
const allToolCallsById = computed(() => {
	const map: Record<string, InstanceAiToolCallState> = {};
	for (const tc of props.agentNode.toolCalls) {
		map[tc.toolCallId] = tc;
	}
	for (const child of props.agentNode.children) {
		for (const tc of child.toolCalls) {
			map[tc.toolCallId] = tc;
		}
	}
	return map;
});

// Keep direct-only lookup for backwards compat with getActivityPeek
const toolCallsById = allToolCallsById;

const childrenById = computed(() => {
	const map: Record<string, InstanceAiAgentNode> = {};
	for (const child of props.agentNode.children) {
		map[child.agentId] = child;
	}
	return map;
});

/**
 * Push tool-call timeline entries into segments, grouping into activity
 * or surfacing as rich content depending on the tool call type.
 */
function pushToolCallEntry(
	result: Segment[],
	toolCallId: string,
	allTcs: Record<string, InstanceAiToolCallState>,
) {
	const tc = allTcs[toolCallId];
	if (tc && isRichToolCall(tc)) {
		result.push({ kind: 'rich', richType: 'tool-call', toolCallId });
	} else {
		const last = result.at(-1);
		if (last?.kind === 'activity') {
			last.entries.push({ type: 'tool-call', toolCallId });
		} else {
			result.push({ kind: 'activity', entries: [{ type: 'tool-call', toolCallId }] });
		}
	}
}

const segments = computed((): Segment[] => {
	const result: Segment[] = [];
	const allTcs = allToolCallsById.value;

	for (const entry of props.agentNode.timeline) {
		if (entry.type === 'text') {
			result.push({ kind: 'text', content: entry.content });
		} else if (entry.type === 'tool-call') {
			pushToolCallEntry(result, entry.toolCallId, allTcs);
		} else if (entry.type === 'child') {
			// Flatten child agent content into parent segments
			const child = childrenById.value[entry.agentId];
			if (!child) continue;

			// Child reasoning as text
			if (child.reasoning) {
				result.push({ kind: 'text', content: child.reasoning });
			}

			// Walk the child's timeline and inline its content
			for (const childEntry of child.timeline) {
				if (childEntry.type === 'text') {
					result.push({ kind: 'text', content: childEntry.content });
				} else if (childEntry.type === 'tool-call') {
					pushToolCallEntry(result, childEntry.toolCallId, allTcs);
				}
				// Nested children (grandchildren) — add to activity group
				else if (childEntry.type === 'child') {
					const last = result.at(-1);
					if (last?.kind === 'activity') {
						last.entries.push(childEntry);
					} else {
						result.push({ kind: 'activity', entries: [childEntry] });
					}
				}
			}
		}
	}
	return result;
});

// ── Thinking section collapse state ──────────────────────────────────
const openSections = ref(new Set<number>());

function toggleSection(idx: number) {
	if (openSections.value.has(idx)) {
		openSections.value.delete(idx);
	} else {
		openSections.value.add(idx);
	}
}

watch(
	() => props.agentNode.status,
	(newStatus) => {
		if (newStatus === 'completed' || newStatus === 'cancelled') {
			openSections.value.clear();
		}
	},
);

function getActivityPeek(entries: InstanceAiTimelineEntry[]): string {
	const allTcs = allToolCallsById.value;
	const seen = new Set<string>();
	const labels: string[] = [];
	for (const e of entries) {
		let label = '';
		if (e.type === 'tool-call') {
			const tc = allTcs[e.toolCallId];
			if (tc) label = getToolLabel(tc.toolName);
		} else if (e.type === 'child') {
			const child = props.agentNode.children.find((c) => c.agentId === e.agentId);
			if (child) label = child.title ?? child.role;
		}
		if (label && !seen.has(label)) {
			seen.add(label);
			labels.push(label);
		}
	}
	if (labels.length <= 3) return labels.join(', ');
	return `${labels.slice(0, 2).join(', ')} +${String(labels.length - 2)}`;
}

function isActivityActive(entries: InstanceAiTimelineEntry[]): boolean {
	const allTcs = allToolCallsById.value;
	for (const e of entries) {
		if (e.type === 'tool-call') {
			const tc = allTcs[e.toolCallId];
			if (tc?.isLoading) return true;
		} else if (e.type === 'child') {
			const child = props.agentNode.children.find((c) => c.agentId === e.agentId);
			if (child?.status === 'active') return true;
		}
	}
	return false;
}

// ── Status / display ────────────────────────────────────────────────

const statusConfig = {
	active: { icon: 'spinner', className: 'activeIcon', spin: true },
	completed: { icon: 'check', className: 'completedIcon', spin: false },
	cancelled: { icon: 'x', className: 'cancelledIcon', spin: false },
	error: { icon: 'triangle-alert', className: 'errorIcon', spin: false },
} satisfies Record<
	InstanceAiAgentNode['status'],
	{ icon: IconName; className: string; spin: boolean }
>;

const displayTitle = computed(() => props.agentNode.title ?? props.agentNode.role);
const displaySubtitle = computed(() => props.agentNode.subtitle ?? '');
const displayResult = computed(() => getRenderableAgentResult(props.agentNode));
const isActive = computed(() => props.agentNode.status === 'active');
const statusEntry = computed(() => statusConfig[props.agentNode.status]);

const livePeek = computed(() => {
	if (props.agentNode.status !== 'active') return '';
	// Check children's active tools first (flattened view)
	for (const child of props.agentNode.children) {
		if (child.status === 'active') {
			const childActiveTool = child.toolCalls.find((tc) => tc.isLoading);
			if (childActiveTool) return getToolLabel(childActiveTool.toolName);
			return child.title ?? child.role;
		}
	}
	const activeTool = props.agentNode.toolCalls.find((tc) => tc.isLoading);
	if (activeTool) return getToolLabel(activeTool.toolName);
	return '';
});

const isOpen = ref(true);

watch(
	() => props.agentNode.status,
	(newStatus) => {
		if (newStatus === 'completed' || newStatus === 'cancelled') {
			isOpen.value = false;
		}
	},
);

// ── Workflow / execution previews ───────────────────────────────────

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

const submitResults = computed(() => {
	const map = new Map<string, { workflowId: string; workflowName?: string }>();
	for (const tc of props.agentNode.toolCalls) {
		if (
			(tc.toolName === 'build-workflow' || tc.toolName === 'submit-workflow') &&
			tc.result &&
			typeof tc.result === 'object'
		) {
			const result = tc.result as Record<string, unknown>;
			if (result.success === true && typeof result.workflowId === 'string') {
				map.set(tc.toolCallId, {
					workflowId: result.workflowId,
					workflowName: typeof result.workflowName === 'string' ? result.workflowName : undefined,
				});
			}
		}
	}
	return map;
});

const previewWorkflows = ref<Map<string, IWorkflowDb>>(new Map());
const workflowModalId = ref<string | null>(null);

watch(
	() => props.agentNode.toolCalls.filter((t) => !t.isLoading && t.result).length,
	async () => {
		for (const [toolCallId, entry] of submitResults.value) {
			if (!entry.workflowId || previewWorkflows.value.has(toolCallId)) continue;
			try {
				const wf = await workflowsListStore.fetchWorkflow(entry.workflowId);
				previewWorkflows.value.set(toolCallId, wf);
			} catch {
				// non-critical
			}
		}
	},
	{ immediate: true },
);

// ── Plan review handler ─────────────────────────────────────────────

function handlePlanConfirm(tc: InstanceAiToolCallState, approved: boolean, feedback?: string) {
	const requestId = tc.confirmation?.requestId;
	if (!requestId) return;
	store.resolveConfirmation(requestId, approved ? 'approved' : 'denied');
	void store.confirmAction(requestId, approved, undefined, undefined, undefined, feedback);
}
</script>

<template>
	<div :class="$style.root">
		<!-- Header row -->
		<button :class="$style.header" @click="isOpen = !isOpen">
			<div :class="$style.headerLeft">
				<N8nIcon
					:icon="statusEntry.icon"
					:class="$style[statusEntry.className]"
					:spin="statusEntry.spin"
					size="small"
				/>
				<span :class="$style.title">{{ displayTitle }}</span>
				<span v-if="displaySubtitle" :class="$style.subtitle">{{ displaySubtitle }}</span>
				<span v-if="!isOpen && livePeek" :class="$style.livePeek">{{ livePeek }}</span>
			</div>
			<div :class="$style.headerRight">
				<button v-if="isActive" :class="$style.stopButton" @click.stop="handleStop">
					<N8nIcon icon="square" size="small" />
					{{ i18n.baseText('instanceAi.agent.stop') }}
				</button>
				<N8nIcon :icon="isOpen ? 'chevron-up' : 'chevron-down'" size="small" />
			</div>
		</button>

		<!-- Content: segmented rendering -->
		<div v-if="isOpen" :class="$style.content">
			<!-- Reasoning text (always visible) -->
			<div v-if="props.agentNode.reasoning" :class="$style.reasoningText">
				<p>{{ props.agentNode.reasoning }}</p>
			</div>

			<template v-for="(seg, segIdx) in segments" :key="segIdx">
				<!-- Text — always visible -->
				<div v-if="seg.kind === 'text'" :class="$style.textSegment">
					<InstanceAiMarkdown :content="seg.content" />
				</div>

				<!-- Activity — collapsed thinking group -->
				<div v-else-if="seg.kind === 'activity'" :class="$style.thinkingSection">
					<button :class="$style.thinkingTrigger" @click="toggleSection(segIdx)">
						<N8nIcon
							:icon="openSections.has(segIdx) ? 'chevron-down' : 'chevron-right'"
							size="small"
							:class="$style.chevron"
						/>
						<N8nIcon
							v-if="isActivityActive(seg.entries)"
							icon="spinner"
							spin
							size="small"
							:class="$style.peekSpinner"
						/>
						<span :class="$style.thinkingLabel">{{ getActivityPeek(seg.entries) }}</span>
					</button>
					<!-- Expanded: just labels, no input/output -->
					<div v-if="openSections.has(segIdx)" :class="$style.thinkingContent">
						<div v-for="(e, eIdx) in seg.entries" :key="eIdx" :class="$style.toolRow">
							<template v-if="e.type === 'tool-call' && toolCallsById[e.toolCallId]">
								<N8nIcon
									v-if="toolCallsById[e.toolCallId].isLoading"
									icon="spinner"
									spin
									size="small"
									:class="$style.peekSpinner"
								/>
								<N8nIcon
									v-else-if="toolCallsById[e.toolCallId].error !== undefined"
									icon="triangle-alert"
									size="small"
									:class="$style.errorIcon"
								/>
								<N8nIcon v-else icon="check" size="small" :class="$style.completedIcon" />
								<span>{{ getToolLabel(toolCallsById[e.toolCallId].toolName) }}</span>
							</template>
						</div>
					</div>
				</div>

				<!-- Rich content — always visible at top level -->
				<template v-else-if="seg.kind === 'rich'">
					<!-- Task checklist -->
					<TaskChecklist
						v-if="
							seg.richType === 'tool-call' && toolCallsById[seg.toolCallId]?.renderHint === 'tasks'
						"
						:tasks="props.agentNode.tasks"
					/>

					<!-- Plan review -->
					<PlanReviewPanel
						v-else-if="
							seg.richType === 'tool-call' &&
							toolCallsById[seg.toolCallId]?.confirmation?.inputType === 'plan-review'
						"
						:planned-tasks="
							(toolCallsById[seg.toolCallId].args?.tasks as PlannedTaskArg[] | undefined) ?? []
						"
						:read-only="!toolCallsById[seg.toolCallId].isLoading"
						@approve="handlePlanConfirm(toolCallsById[seg.toolCallId], true)"
						@request-changes="(fb) => handlePlanConfirm(toolCallsById[seg.toolCallId], false, fb)"
					/>

					<!-- Answered questions -->
					<AnsweredQuestions
						v-else-if="
							seg.richType === 'tool-call' &&
							toolCallsById[seg.toolCallId]?.confirmation?.inputType === 'questions' &&
							!toolCallsById[seg.toolCallId].isLoading
						"
						:tool-call="toolCallsById[seg.toolCallId]"
					/>

					<!-- Workflow preview -->
					<div
						v-else-if="
							seg.richType === 'tool-call' &&
							submitResults.has(seg.toolCallId) &&
							previewWorkflows.has(seg.toolCallId)
						"
						:class="$style.previewBlock"
					>
						<div :class="$style.previewHeader">
							<N8nIcon icon="check" size="small" :class="$style.completedIcon" />
							<span :class="$style.previewName">
								{{
									submitResults.get(seg.toolCallId)!.workflowName ??
									i18n.baseText('instanceAi.builderCard.success')
								}}
							</span>
							<button :class="$style.workflowLink" @click="workflowModalId = seg.toolCallId">
								Details
								<N8nIcon icon="expand" size="small" />
							</button>
							<a
								:href="`/workflow/${submitResults.get(seg.toolCallId)!.workflowId}`"
								target="_blank"
								:class="$style.workflowLink"
							>
								Open
								<N8nIcon icon="external-link" size="small" />
							</a>
						</div>
						<div>
							<WorkflowMiniCanvas
								:workflow="previewWorkflows.get(seg.toolCallId)!"
								:canvas-id="`builder-preview-${seg.toolCallId}`"
							/>
						</div>
					</div>

					<!-- Execution preview -->
					<ExecutionPreviewCard
						v-else-if="seg.richType === 'tool-call' && runResults.has(seg.toolCallId)"
						:execution-id="runResults.get(seg.toolCallId)!.executionId"
						:workflow-id="runResults.get(seg.toolCallId)!.workflowId"
						:status="runResults.get(seg.toolCallId)!.status"
						:error="runResults.get(seg.toolCallId)!.error"
					/>
				</template>
			</template>

			<!-- Live activity peek -->
			<div v-if="isActive && livePeek" :class="$style.activityPeek">
				<N8nIcon icon="spinner" spin size="small" :class="$style.peekSpinner" />
				<span>{{ livePeek }}</span>
			</div>
		</div>

		<!-- Footer: error or result (visible when collapsed) -->
		<div v-if="props.agentNode.error" :class="$style.footer">
			<N8nIcon icon="triangle-alert" size="small" :class="$style.errorIcon" />
			<span>{{ props.agentNode.error }}</span>
		</div>
		<div v-else-if="displayResult && !isOpen" :class="[$style.footer, $style.footerSuccess]">
			<N8nIcon icon="check" size="small" :class="$style.completedIcon" />
			<span>{{ displayResult }}</span>
		</div>

		<!-- Workflow detail modal -->
		<Teleport to="body">
			<div
				v-if="workflowModalId && previewWorkflows.has(workflowModalId)"
				:class="$style.modalOverlay"
				@click.self="workflowModalId = null"
			>
				<div :class="$style.modalContent">
					<div :class="$style.modalHeader">
						<span :class="$style.modalTitle">Workflow details</span>
						<button :class="$style.modalClose" @click="workflowModalId = null">
							<N8nIcon icon="x" size="medium" />
						</button>
					</div>
					<div :class="$style.modalBody">
						<WorkflowPreview
							mode="workflow"
							:workflow="previewWorkflows.get(workflowModalId)!"
							:can-open-ndv="true"
							:hide-controls="true"
							:tidy-up="true"
							loader-type="spinner"
						/>
					</div>
				</div>
			</div>
		</Teleport>
	</div>
</template>

<style lang="scss" module>
.root {
	margin: var(--spacing--4xs) 0;
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
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
	text-align: left;

	&:hover {
		color: var(--color--text);
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

.livePeek {
	color: var(--text-color--subtle);
	font-weight: var(--font-weight--regular);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 250px;
}

.content {
	padding-left: var(--spacing--sm);
}

.reasoningText {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
	font-style: italic;

	p {
		margin: 0;
	}
}

.textSegment {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--text-color);
}

.thinkingSection {
	margin: var(--spacing--4xs) 0;
}

.thinkingTrigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
	background: none;
	border: none;
	cursor: pointer;
	padding: var(--spacing--4xs) 0;
	font-family: var(--font-family);
	width: 100%;
	text-align: left;

	&:hover {
		color: var(--color--text);
	}
}

.chevron {
	flex-shrink: 0;
}

.thinkingLabel {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.thinkingContent {
	padding-left: var(--spacing--sm);
}

.toolRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--5xs) 0;
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}

.activityPeek {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) 0;
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}

.peekSpinner {
	color: var(--color--primary);
	flex-shrink: 0;
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) 0;
	font-size: var(--font-size--2xs);
	color: var(--color--danger);
}

.footerSuccess {
	color: var(--color--success);
}

.previewBlock {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--3xs) 0 var(--spacing--2xs);
	overflow: hidden;
	background: var(--color--background);
}

.previewHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: color-mix(in srgb, var(--color--success) 10%, var(--color--background));
	font-size: var(--font-size--2xs);
	color: var(--color--success);
}

.previewName {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: var(--font-weight--bold);
}

.workflowLink {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--color--primary);
	text-decoration: none;
	font-family: var(--font-family);
	font-size: inherit;
	font-weight: var(--font-weight--bold);
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;

	&:first-of-type {
		margin-left: auto;
	}

	&:hover {
		text-decoration: underline;
	}
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

.modalOverlay {
	position: fixed;
	inset: 0;
	z-index: 10000;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgb(0 0 0 / 50%);
}

.modalContent {
	display: flex;
	flex-direction: column;
	width: 90vw;
	height: 85vh;
	max-width: 1200px;
	background: var(--color--background);
	border-radius: var(--radius--xl);
	overflow: hidden;
	box-shadow: 0 20px 60px rgb(0 0 0 / 30%);
}

.modalHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
	flex-shrink: 0;
}

.modalTitle {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--text-color);
}

.modalClose {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	padding: 0;
	background: none;
	border: none;
	border-radius: var(--radius);
	cursor: pointer;
	color: var(--text-color--subtle);

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.modalBody {
	flex: 1;
	position: relative;
	overflow: hidden;
}
</style>
