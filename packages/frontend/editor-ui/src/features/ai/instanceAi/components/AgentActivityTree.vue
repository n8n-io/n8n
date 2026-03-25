<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type {
	InstanceAiAgentNode,
	InstanceAiToolCallState,
	InstanceAiTimelineEntry,
	TaskList,
} from '@n8n/api-types';
import type { IWorkflowDb } from '@/Interface';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import DomainAccessApproval from './DomainAccessApproval.vue';
import InstanceAiCredentialSetup from './InstanceAiCredentialSetup.vue';
import InstanceAiWorkflowSetup from './InstanceAiWorkflowSetup.vue';
import InstanceAiQuestions from './InstanceAiQuestions.vue';
import type { QuestionAnswer } from './InstanceAiQuestions.vue';
import TaskChecklist from './TaskChecklist.vue';
import AnsweredQuestions from './AnsweredQuestions.vue';
import PlanReviewPanel, { type PlannedTaskArg } from './PlanReviewPanel.vue';
import ExecutionPreviewCard from './ExecutionPreviewCard.vue';
import WorkflowMiniCanvas from './WorkflowMiniCanvas.vue';
import WorkflowPreview from '@/app/components/WorkflowPreview.vue';
import AgentTimeline from './AgentTimeline.vue';
import { useToolLabel } from '../toolLabels';
import { useInstanceAiStore } from '../instanceAi.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

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
const store = useInstanceAiStore();
const workflowsListStore = useWorkflowsListStore();
const { getToolLabel } = useToolLabel();

// ── Flatten the entire agent tree into tool-call lookup ─────────────

function collectAllToolCalls(
	node: InstanceAiAgentNode,
	map: Record<string, InstanceAiToolCallState>,
) {
	for (const tc of node.toolCalls) map[tc.toolCallId] = tc;
	for (const child of node.children) collectAllToolCalls(child, map);
}

const allToolCallsById = computed(() => {
	const map: Record<string, InstanceAiToolCallState> = {};
	collectAllToolCalls(props.agentNode, map);
	return map;
});

function collectAllTasks(node: InstanceAiAgentNode): TaskList | undefined {
	if (node.tasks) return node.tasks;
	for (const child of node.children) {
		const t = collectAllTasks(child);
		if (t) return t;
	}
	return undefined;
}

const tasks = computed(() => collectAllTasks(props.agentNode));

// ── Timeline segmentation ────────────────────────────────────────────

interface TextSegment {
	kind: 'text';
	content: string;
}

interface ActivitySegment {
	kind: 'activity';
	entries: InstanceAiTimelineEntry[];
}

interface RichSegment {
	kind: 'rich';
	toolCallId: string;
}

type Segment = TextSegment | ActivitySegment | RichSegment;

/** Tool calls that produce visible top-level content. */
function isRichToolCall(tc: InstanceAiToolCallState): boolean {
	if (tc.renderHint === 'tasks') return true;
	if (tc.confirmation?.inputType === 'plan-review') return true;
	if (tc.confirmation?.inputType === 'questions' && !tc.isLoading) return true;
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

function pushToolCallEntry(
	result: Segment[],
	toolCallId: string,
	allTcs: Record<string, InstanceAiToolCallState>,
) {
	const tc = allTcs[toolCallId];
	if (tc && isRichToolCall(tc)) {
		result.push({ kind: 'rich', toolCallId });
	} else {
		const last = result.at(-1);
		if (last?.kind === 'activity') {
			last.entries.push({ type: 'tool-call', toolCallId });
		} else {
			result.push({ kind: 'activity', entries: [{ type: 'tool-call', toolCallId }] });
		}
	}
}

/** Recursively flatten an agent node's timeline into the segment list. */
function flattenNode(
	node: InstanceAiAgentNode,
	result: Segment[],
	allTcs: Record<string, InstanceAiToolCallState>,
) {
	if (node.reasoning) {
		result.push({ kind: 'text', content: node.reasoning });
	}
	for (const entry of node.timeline) {
		if (entry.type === 'text') {
			result.push({ kind: 'text', content: entry.content });
		} else if (entry.type === 'tool-call') {
			pushToolCallEntry(result, entry.toolCallId, allTcs);
		} else if (entry.type === 'child') {
			const child = node.children.find((c) => c.agentId === entry.agentId);
			if (child) flattenNode(child, result, allTcs);
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
			const child = props.agentNode.children.find((c) => c.agentId === entry.agentId);
			if (child) flattenNode(child, result, allTcs);
		}
	}
	return result;
});

const hasReasoning = computed(() => props.agentNode.reasoning.length > 0);

const isThinkingEmpty = computed(
	() =>
		props.agentNode.status === 'active' &&
		props.agentNode.timeline.length === 0 &&
		!hasReasoning.value,
);

/** Live peek — deepest active tool across the entire tree (including children). */
const livePeek = computed(() => {
	function findDeepest(node: InstanceAiAgentNode): string {
		for (const child of node.children) {
			if (child.status === 'active') {
				const deeper = findDeepest(child);
				if (deeper) return deeper;
				return child.title ?? child.role;
			}
		}
		const activeTool = node.toolCalls.find((tc) => tc.isLoading);
		if (activeTool) return getToolLabel(activeTool.toolName);
		return '';
	}

	const peek = findDeepest(props.agentNode);
	if (peek) return peek;
	if (props.agentNode.status === 'active') return i18n.baseText('instanceAi.statusBar.thinking');
	return '';
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
		if (e.type === 'tool-call') {
			const tc = allTcs[e.toolCallId];
			if (tc) {
				const label = getToolLabel(tc.toolName);
				if (!seen.has(label)) {
					seen.add(label);
					labels.push(label);
				}
			}
		}
	}
	if (labels.length <= 3) return labels.join(', ');
	return `${labels.slice(0, 2).join(', ')} +${String(labels.length - 2)}`;
}

function isActivityActive(entries: InstanceAiTimelineEntry[]): boolean {
	const allTcs = allToolCallsById.value;
	for (const e of entries) {
		if (e.type === 'tool-call') {
			if (allTcs[e.toolCallId]?.isLoading) return true;
		}
	}
	return false;
}

/** Returns the label of the active tool, or the last completed tool if all done. */
function getActivityLivePeek(entries: InstanceAiTimelineEntry[]): string {
	const allTcs = allToolCallsById.value;
	// First pass: find an active tool
	for (const e of entries) {
		if (e.type === 'tool-call') {
			const tc = allTcs[e.toolCallId];
			if (tc?.isLoading) return getToolLabel(tc.toolName);
		} else if (e.type === 'child') {
			const child = props.agentNode.children.find((c) => c.agentId === e.agentId);
			if (child?.status === 'active') {
				const activeTool = child.toolCalls.find((tc) => tc.isLoading);
				if (activeTool) return getToolLabel(activeTool.toolName);
				return child.title ?? child.role;
			}
		}
	}
	// Second pass: no active tool — return the last completed tool's label
	for (let i = entries.length - 1; i >= 0; i--) {
		const e = entries[i];
		if (e.type === 'tool-call') {
			const tc = allTcs[e.toolCallId];
			if (tc) return getToolLabel(tc.toolName);
		}
	}
	return '';
}

// ── Workflow / execution previews ───────────────────────────────────

const submitResults = computed(() => {
	const map = new Map<string, { workflowId: string; workflowName?: string }>();
	for (const [id, tc] of Object.entries(allToolCallsById.value)) {
		if (
			(tc.toolName === 'build-workflow' || tc.toolName === 'submit-workflow') &&
			tc.result &&
			typeof tc.result === 'object'
		) {
			const r = tc.result as Record<string, unknown>;
			if (r.success === true && typeof r.workflowId === 'string') {
				map.set(id, {
					workflowId: r.workflowId,
					workflowName: typeof r.workflowName === 'string' ? r.workflowName : undefined,
				});
			}
		}
	}
	return map;
});

const runResults = computed(() => {
	const map = new Map<
		string,
		{ executionId: string; workflowId: string; status: string; error?: string }
	>();
	for (const [id, tc] of Object.entries(allToolCallsById.value)) {
		if (tc.toolName === 'run-workflow' && tc.result && typeof tc.result === 'object') {
			const result = tc.result as Record<string, unknown>;
			const args = tc.args as Record<string, unknown>;
			if (typeof result.executionId === 'string' && typeof args.workflowId === 'string') {
				map.set(id, {
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

const previewWorkflows = ref<Map<string, IWorkflowDb>>(new Map());
const workflowModalId = ref<string | null>(null);

watch(
	() =>
		Object.values(allToolCallsById.value).filter((t) => !t.isLoading && t.result !== undefined)
			.length,
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

// ── Top-level confirmations ─────────────────────────────────────────

interface PendingItem {
	toolCall: InstanceAiToolCallState;
	agentNode: InstanceAiAgentNode;
}

function collectPending(node: InstanceAiAgentNode, out: PendingItem[]): void {
	for (const tc of node.toolCalls) {
		if (
			tc.confirmation &&
			tc.isLoading &&
			tc.confirmationStatus !== 'approved' &&
			tc.confirmationStatus !== 'denied' &&
			!store.resolvedConfirmationIds.has(tc.confirmation.requestId) &&
			tc.confirmation.inputType !== 'plan-review'
		) {
			out.push({ toolCall: tc, agentNode: node });
		}
	}
	for (const child of node.children) {
		collectPending(child, out);
	}
}

const pendingConfirmations = computed((): PendingItem[] => {
	const items: PendingItem[] = [];
	collectPending(props.agentNode, items);
	return items;
});

function getSeverityIcon(severity?: string): IconName {
	if (severity === 'destructive') return 'triangle-alert';
	if (severity === 'warning') return 'triangle-alert';
	return 'info';
}

const textInputValues = ref<Record<string, string>>({});

function handleConfirm(requestId: string, approved: boolean) {
	store.resolveConfirmation(requestId, approved ? 'approved' : 'denied');
	void store.confirmAction(requestId, approved);
}

function handleTextSubmit(requestId: string) {
	const value = (textInputValues.value[requestId] ?? '').trim();
	if (!value) return;
	store.resolveConfirmation(requestId, 'approved');
	void store.confirmAction(requestId, true, undefined, undefined, undefined, value);
}

function handleTextSkip(requestId: string) {
	store.resolveConfirmation(requestId, 'deferred');
	void store.confirmAction(requestId, false);
}

function handleQuestionsSubmit(requestId: string, answers: QuestionAnswer[]) {
	store.resolveConfirmation(requestId, 'approved');
	void store.confirmAction(
		requestId,
		true,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		answers,
	);
}
</script>

<template>
	<div :class="$style.tree">
		<!-- Thinking indicator — shown when active but no content yet -->
		<div v-if="isRoot && isThinkingEmpty" :class="$style.thinkingIndicator">
			<N8nIcon icon="spinner" spin size="small" :class="$style.peekSpinner" />
			<span>{{ livePeek }}</span>
		</div>

		<!-- Reasoning text (always visible) -->
		<div v-if="hasReasoning" :class="$style.reasoningText">
			<p>{{ props.agentNode.reasoning }}</p>
		</div>

		<!-- Root: flat segmented rendering (text visible, tools collapsed, rich content at top level) -->
		<template v-if="isRoot">
			<template v-for="(seg, segIdx) in segments" :key="segIdx">
				<!-- Text — always visible -->
				<div v-if="seg.kind === 'text'" :class="$style.textSegment">
					<InstanceAiMarkdown :content="seg.content" />
				</div>

				<!-- Activity — collapsed thinking group (just labels, no input/output) -->
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
					<!-- Peek: shows the active tool (shimmer) or completed summary when collapsed -->
					<div
						v-if="!openSections.has(segIdx) && getActivityLivePeek(seg.entries)"
						:class="[
							$style.peekLine,
							isActivityActive(seg.entries) ? $style.peekShimmer : $style.peekStatic,
						]"
					>
						{{ getActivityLivePeek(seg.entries) }}
					</div>
					<div v-if="openSections.has(segIdx)" :class="$style.thinkingContent">
						<div v-for="(e, eIdx) in seg.entries" :key="eIdx" :class="$style.toolRow">
							<template v-if="e.type === 'tool-call' && allToolCallsById[e.toolCallId]">
								<N8nIcon
									v-if="allToolCallsById[e.toolCallId].isLoading"
									icon="spinner"
									spin
									size="small"
									:class="$style.peekSpinner"
								/>
								<N8nIcon
									v-else-if="allToolCallsById[e.toolCallId].error !== undefined"
									icon="triangle-alert"
									size="small"
									:class="$style.errorIcon"
								/>
								<N8nIcon v-else icon="check" size="small" :class="$style.completedIcon" />
								<span>{{ getToolLabel(allToolCallsById[e.toolCallId].toolName) }}</span>
							</template>
						</div>
					</div>
				</div>

				<!-- Rich content — always visible at top level -->
				<template v-else-if="seg.kind === 'rich'">
					<!-- Task checklist -->
					<TaskChecklist
						v-if="allToolCallsById[seg.toolCallId]?.renderHint === 'tasks'"
						:tasks="tasks"
					/>

					<!-- Plan review -->
					<PlanReviewPanel
						v-else-if="allToolCallsById[seg.toolCallId]?.confirmation?.inputType === 'plan-review'"
						:planned-tasks="
							(allToolCallsById[seg.toolCallId].args?.tasks as PlannedTaskArg[] | undefined) ?? []
						"
						:read-only="!allToolCallsById[seg.toolCallId].isLoading"
						@approve="handlePlanConfirm(allToolCallsById[seg.toolCallId], true)"
						@request-changes="
							(fb) => handlePlanConfirm(allToolCallsById[seg.toolCallId], false, fb)
						"
					/>

					<!-- Answered questions -->
					<AnsweredQuestions
						v-else-if="
							allToolCallsById[seg.toolCallId]?.confirmation?.inputType === 'questions' &&
							!allToolCallsById[seg.toolCallId].isLoading
						"
						:tool-call="allToolCallsById[seg.toolCallId]"
					/>

					<!-- Workflow preview -->
					<div
						v-else-if="submitResults.has(seg.toolCallId) && previewWorkflows.has(seg.toolCallId)"
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
						v-else-if="runResults.has(seg.toolCallId)"
						:execution-id="runResults.get(seg.toolCallId)!.executionId"
						:workflow-id="runResults.get(seg.toolCallId)!.workflowId"
						:status="runResults.get(seg.toolCallId)!.status"
						:error="runResults.get(seg.toolCallId)!.error"
					/>
				</template>
			</template>
		</template>

		<!-- Non-root: render full timeline normally (shouldn't happen in flattened model) -->
		<AgentTimeline v-else :agent-node="props.agentNode" />

		<!-- Top-level HITL confirmations — always visible -->
		<template v-if="isRoot">
			<div
				v-for="item in pendingConfirmations"
				:key="item.toolCall.confirmation!.requestId"
				:class="$style.confirmationItem"
			>
				<DomainAccessApproval
					v-if="item.toolCall.confirmation!.domainAccess"
					:request-id="item.toolCall.confirmation!.requestId"
					:url="item.toolCall.confirmation!.domainAccess!.url"
					:host="item.toolCall.confirmation!.domainAccess!.host"
				/>

				<InstanceAiWorkflowSetup
					v-else-if="
						item.toolCall.confirmation!.setupRequests &&
						item.toolCall.confirmation!.setupRequests!.length > 0
					"
					:request-id="item.toolCall.confirmation!.requestId"
					:setup-requests="item.toolCall.confirmation!.setupRequests!"
					:workflow-id="item.toolCall.confirmation!.workflowId ?? ''"
					:message="item.toolCall.confirmation!.message"
					:project-id="item.toolCall.confirmation!.projectId"
					:credential-flow="item.toolCall.confirmation!.credentialFlow"
				/>

				<InstanceAiCredentialSetup
					v-else-if="
						item.toolCall.confirmation!.credentialRequests &&
						item.toolCall.confirmation!.credentialRequests!.length > 0
					"
					:request-id="item.toolCall.confirmation!.requestId"
					:credential-requests="item.toolCall.confirmation!.credentialRequests!"
					:message="item.toolCall.confirmation!.message"
					:project-id="item.toolCall.confirmation!.projectId"
					:credential-flow="item.toolCall.confirmation!.credentialFlow"
				/>

				<InstanceAiQuestions
					v-else-if="
						item.toolCall.confirmation!.inputType === 'questions' &&
						item.toolCall.confirmation!.questions
					"
					:questions="item.toolCall.confirmation!.questions!"
					:intro-message="item.toolCall.confirmation!.introMessage"
					@submit="
						(answers) => handleQuestionsSubmit(item.toolCall.confirmation!.requestId, answers)
					"
				/>

				<div
					v-else-if="item.toolCall.confirmation!.inputType === 'text'"
					:class="$style.confirmBody"
				>
					<div :class="$style.confirmMessage">
						{{ item.toolCall.confirmation!.message }}
					</div>
					<div :class="$style.textInputRow">
						<input
							v-model="textInputValues[item.toolCall.confirmation!.requestId]"
							:class="$style.textInput"
							type="text"
							:placeholder="i18n.baseText('instanceAi.askUser.placeholder')"
							@keydown.enter="handleTextSubmit(item.toolCall.confirmation!.requestId)"
						/>
						<button
							v-if="!(textInputValues[item.toolCall.confirmation!.requestId] ?? '').trim()"
							:class="[$style.btn, $style.secondaryBtn]"
							@click="handleTextSkip(item.toolCall.confirmation!.requestId)"
						>
							{{ i18n.baseText('instanceAi.askUser.skip') }}
						</button>
						<button
							:class="[$style.btn, $style.approveBtn]"
							:disabled="!(textInputValues[item.toolCall.confirmation!.requestId] ?? '').trim()"
							@click="handleTextSubmit(item.toolCall.confirmation!.requestId)"
						>
							{{ i18n.baseText('instanceAi.askUser.submit') }}
						</button>
					</div>
				</div>

				<div v-else :class="$style.approvalRow">
					<N8nIcon
						:icon="getSeverityIcon(item.toolCall.confirmation!.severity)"
						size="small"
						:class="[
							item.toolCall.confirmation!.severity === 'destructive' ? $style.destructiveIcon : '',
							item.toolCall.confirmation!.severity === 'warning' ? $style.warningIcon : '',
							item.toolCall.confirmation!.severity === 'info' ? $style.infoIcon : '',
						]"
					/>
					<span :class="$style.toolLabel">{{ getToolLabel(item.toolCall.toolName) }}</span>
					<span :class="$style.approvalMessage">{{ item.toolCall.confirmation!.message }}</span>
					<span :class="$style.approvalActions">
						<button
							:class="[$style.btn, $style.secondaryBtn]"
							data-test-id="instance-ai-inline-confirm-deny"
							@click="handleConfirm(item.toolCall.confirmation!.requestId, false)"
						>
							{{ i18n.baseText('instanceAi.confirmation.deny') }}
						</button>
						<button
							:class="[
								$style.btn,
								item.toolCall.confirmation!.severity === 'destructive'
									? $style.approveDestructiveBtn
									: $style.approveBtn,
							]"
							data-test-id="instance-ai-inline-confirm-approve"
							@click="handleConfirm(item.toolCall.confirmation!.requestId, true)"
						>
							{{ i18n.baseText('instanceAi.confirmation.approve') }}
						</button>
					</span>
				</div>
			</div>
		</template>

		<!-- Workflow detail modal -->
		<Teleport v-if="isRoot" to="body">
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
.tree {
	width: 100%;
}

.thinkingIndicator {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) 0;
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}

.peekLine {
	padding: var(--spacing--5xs) 0 var(--spacing--5xs) var(--spacing--sm);
	font-size: var(--font-size--3xs);
	color: var(--text-color--subtle);
}

.peekShimmer {
	animation: shimmer 2s ease-in-out infinite;
}

.peekStatic {
	opacity: 0.5;
}

@keyframes shimmer {
	0%,
	100% {
		opacity: 0.6;
	}
	50% {
		opacity: 0.3;
	}
}

.peekSpinner {
	color: var(--color--primary);
	flex-shrink: 0;
}

.reasoningText {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--text-color);
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

.completedIcon {
	color: var(--color--success);
}

.errorIcon {
	color: var(--color--danger);
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

.confirmationItem {
	margin: var(--spacing--2xs) 0;
}

.confirmBody {
	padding: var(--spacing--2xs) 0;
}

.confirmMessage {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	margin-bottom: var(--spacing--2xs);
}

.textInputRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.textInput {
	flex: 1;
	min-width: 0;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	background: var(--color--background);
	color: var(--color--text);
	outline: none;

	&:focus {
		border-color: var(--color--primary);
	}

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}

.approvalRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) 0;
	font-size: var(--font-size--2xs);
	flex-wrap: wrap;
}

.toolLabel {
	font-weight: var(--font-weight--bold);
	font-family: monospace;
	font-size: var(--font-size--3xs);
	color: var(--color--text);
	white-space: nowrap;
}

.approvalMessage {
	color: var(--color--text--tint-1);
	flex: 1;
	min-width: 0;
}

.approvalActions {
	display: flex;
	gap: var(--spacing--4xs);
	margin-left: auto;
	flex-shrink: 0;
}

.destructiveIcon {
	color: var(--color--danger);
	flex-shrink: 0;
}

.warningIcon {
	color: var(--color--warning);
	flex-shrink: 0;
}

.infoIcon {
	color: var(--color--primary);
	flex-shrink: 0;
}

.btn {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	cursor: pointer;
	border: var(--border);
	background: var(--color--background);
	color: var(--color--text);
	white-space: nowrap;

	&:hover {
		background: var(--color--background--shade-1);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.secondaryBtn {
	color: var(--color--text--tint-1);
	border-color: transparent;
	background: none;

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.approveBtn {
	background: var(--color--primary);
	color: var(--button--color--text--primary);
	border-color: var(--color--primary);

	&:hover:not(:disabled) {
		background: var(--color--primary--shade-1);
	}
}

.approveDestructiveBtn {
	background: var(--color--danger);
	color: var(--button--color--text--primary);
	border-color: var(--color--danger);

	&:hover {
		background: var(--color--danger--shade-1);
	}
}
</style>
