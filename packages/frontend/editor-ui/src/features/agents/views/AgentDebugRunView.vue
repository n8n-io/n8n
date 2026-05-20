<script lang="ts" setup>
import {
	AGENT_REVIEW_REJECTION_REASONS,
	DEFAULT_AGENT_REVIEW_REJECTION_REASON,
	type AgentDebugRun,
	type AgentDebugRunDetail,
	type AgentDebugSignal,
	type AgentReviewCase,
	type AgentReviewRejectionReason,
	type AgentReviewStatus,
	type UpsertAgentReviewCaseDto,
} from '@n8n/api-types';
import {
	N8nBadge,
	N8nBreadcrumbs,
	N8nButton,
	N8nCheckbox,
	N8nDialog,
	N8nDialogFooter,
	N8nDropdownMenu,
	N8nIcon,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { useI18n } from '@n8n/i18n';
import { truncate } from '@n8n/utils';
import { ElSkeletonItem } from 'element-plus';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';

import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { useAgentDebugStore } from '../agentDebug.store';
import { useAgentSessionsStore } from '../agentSessions.store';
import SessionDetailPanel from '../components/SessionDetailPanel.vue';
import SessionTimelineTable from '../components/SessionTimelineTable.vue';
import type { AgentExecution, AgentExecutionThread } from '../composables/useAgentThreadsApi';
import { useAgentConfig } from '../composables/useAgentConfig';
import { AGENT_BUILDER_VIEW, AGENT_DEBUG_RUN_DETAIL_VIEW, DEBUG_SECTION_KEY } from '../constants';
import type { TimelineItem } from '../session-timeline.types';
import { flattenExecutionsToTimelineItems } from '../session-timeline.utils';
import type { AgentJsonToolConfig } from '../types';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const projectsStore = useProjectsStore();
const debugStore = useAgentDebugStore();
const sessionsStore = useAgentSessionsStore();
const { config: agentConfig, fetchConfig } = useAgentConfig();

const projectId = computed(() => String(route.params.projectId ?? ''));
const agentId = computed(() => String(route.params.agentId ?? ''));
const runId = computed(() => String(route.params.runId ?? ''));

const selectedTimelineIndex = ref<number | null>(null);
const visibleTimelineKinds = ref(new Set<string>());
const expandedMessageIds = ref(new Set<string>());
const traceExpanded = ref(false);
const thread = ref<AgentExecutionThread | null>(null);
const executions = ref<AgentExecution[]>([]);
const loadingThread = ref(false);
const expectedOutput = ref('');
const reviewNotes = ref('');
const selectedRejectionReason = ref<AgentReviewRejectionReason>(
	DEFAULT_AGENT_REVIEW_REJECTION_REASON,
);
const selectedWrongToolNames = ref(new Set<string>());
const selectedMissingToolNames = ref(new Set<string>());
const rejectDialogOpen = ref(false);
const savingReviewAction = ref<AgentReviewStatus | 'clear' | null>(null);
let loadRunDetailRequestId = 0;

const selectedRun = computed(() => debugStore.selectedRun);

const availableRuns = computed<AgentDebugRun[]>(() => {
	const seenThreadIds = new Set<string>();
	const runs = debugStore.runs.filter((run) => {
		if (seenThreadIds.has(run.threadId)) return false;
		seenThreadIds.add(run.threadId);
		return true;
	});
	const detail = selectedRun.value;
	if (detail && !runs.some((run) => run.id === detail.id)) runs.unshift(detail);
	return runs;
});

const conversationStatus = computed<'success' | 'error'>(() =>
	executions.value.some((execution) => execution.status === 'error') ? 'error' : 'success',
);

const conversationDuration = computed(() =>
	thread.value ? thread.value.totalDuration : (selectedRun.value?.duration ?? 0),
);

const conversationTokens = computed(() => {
	if (thread.value) {
		return thread.value.totalPromptTokens + thread.value.totalCompletionTokens;
	}
	return selectedRun.value?.totalTokens ?? 0;
});

const conversationCost = computed(() => thread.value?.totalCost ?? selectedRun.value?.cost ?? null);

const runOptions = computed<
	Array<DropdownMenuItemProps<string, { date: string; active: boolean }>>
>(() => {
	if (availableRuns.value.length === 0) {
		return [
			{
				id: '__empty__',
				label: i18n.baseText('agentDebug.empty'),
				disabled: true,
			},
		];
	}

	return availableRuns.value.map((run) => ({
		id: run.id,
		label: truncate(sessionLabel(run), 64),
		class: run.id === runId.value ? 'debug-run-dropdown-item-active' : undefined,
		data: {
			date: formatDate(run.createdAt),
			active: run.id === runId.value,
		},
	}));
});

const currentRunTitle = computed(() => {
	const run =
		selectedRun.value ?? availableRuns.value.find((candidate) => candidate.id === runId.value);
	if (!run) return i18n.baseText('agentDebug.runDetails');
	return truncate(sessionLabel(run), 64);
});

const conversationExecutions = computed<AgentExecution[]>(() => {
	if (executions.value.length > 0) return executions.value;
	return selectedRun.value ? [toTimelineExecution(selectedRun.value)] : [];
});

const timelineItems = computed<TimelineItem[]>(() => {
	return flattenExecutionsToTimelineItems(conversationExecutions.value);
});

const selectedTimelineItem = computed(() => {
	if (selectedTimelineIndex.value === null) return null;
	return timelineItems.value[selectedTimelineIndex.value] ?? null;
});

const projectName = computed<string | null>(() => {
	if (projectsStore.personalProject?.id === projectId.value) {
		return i18n.baseText('projects.menu.personal');
	}
	const current = projectsStore.currentProject;
	if (current && current.id === projectId.value) return current.name ?? null;
	const match = projectsStore.myProjects.find((p) => p.id === projectId.value);
	return match?.name ?? null;
});

const projectRoute = computed<RouteLocationRaw>(() => ({
	name: VIEWS.PROJECTS_WORKFLOWS,
	params: { projectId: projectId.value },
}));

const agentRoute = computed<RouteLocationRaw>(() => ({
	name: AGENT_BUILDER_VIEW,
	params: { projectId: projectId.value, agentId: agentId.value },
	query: { section: DEBUG_SECTION_KEY },
}));

const breadcrumbItems = computed<PathItem[]>(() => [
	{
		id: projectId.value,
		label: projectName.value ?? i18n.baseText('agents.builder.header.projectFallback'),
		href: router.resolve(projectRoute.value).href,
	},
	{
		id: agentId.value,
		label: selectedRun.value?.sessionTitle ?? i18n.baseText('agents.builder.header.tab.debug'),
		href: router.resolve(agentRoute.value).href,
	},
]);

const rejectionReasonOptions = computed(() =>
	AGENT_REVIEW_REJECTION_REASONS.map((reason) => ({
		label: rejectionReasonLabel(reason),
		value: reason,
	})),
);

interface ConversationMessage {
	id: string;
	kind: 'user' | 'agent';
	text: string;
}

interface ConversationTool {
	id: string;
	name: string;
	input: unknown;
	output: unknown;
	success: boolean;
	error: string | null;
}

type ConversationEntry = ConversationMessage | (ConversationTool & { kind: 'tool' });

const conversationEntries = computed<ConversationEntry[]>(() =>
	conversationExecutions.value.flatMap((execution) => {
		const entries: ConversationEntry[] = [];
		if (execution.userMessage.trim()) {
			entries.push({
				id: `${execution.id}:user`,
				kind: 'user',
				text: execution.userMessage,
			});
		}

		entries.push(...extractToolEntries(execution));

		if (execution.assistantResponse.trim()) {
			entries.push({
				id: `${execution.id}:agent`,
				kind: 'agent',
				text: execution.assistantResponse,
			});
		}

		return entries;
	}),
);

const usedToolNames = computed(() => {
	const names = new Set<string>();
	for (const entry of conversationEntries.value) {
		if (entry.kind === 'tool') names.add(entry.name);
	}
	return Array.from(names).sort((a, b) => a.localeCompare(b));
});

const configuredToolNames = computed(() =>
	(agentConfig.value?.tools ?? [])
		.map((tool) => toolLabel(tool))
		.filter((name) => name.trim().length > 0)
		.sort((a, b) => a.localeCompare(b)),
);

const unusedToolNames = computed(() =>
	configuredToolNames.value.filter((toolName) => !usedToolNames.value.includes(toolName)),
);

const rejectionRequiresCorrectOutput = computed(
	() =>
		selectedRejectionReason.value === 'incorrect_answer' ||
		selectedRejectionReason.value === 'incomplete_answer',
);

const rejectionRequiresWrongTools = computed(() => selectedRejectionReason.value === 'wrong_tool');

const rejectionRequiresMissingTools = computed(
	() => selectedRejectionReason.value === 'missing_tool',
);

const rejectionRequiresNotes = computed(
	() =>
		!rejectionRequiresCorrectOutput.value &&
		!rejectionRequiresWrongTools.value &&
		!rejectionRequiresMissingTools.value,
);

function toTimelineExecution(run: AgentDebugRunDetail | AgentExecution): AgentExecution {
	return {
		id: run.id,
		threadId: run.threadId,
		agentId: agentId.value,
		status: run.status,
		createdAt: run.createdAt,
		startedAt: run.startedAt,
		stoppedAt: run.stoppedAt,
		duration: run.duration,
		userMessage: run.userMessage,
		assistantResponse: run.assistantResponse,
		model: run.model,
		promptTokens: run.promptTokens,
		completionTokens: run.completionTokens,
		totalTokens: run.totalTokens,
		cost: run.cost,
		toolCalls:
			run.toolCalls?.map((toolCall) => ({
				toolName:
					stringValue('name' in toolCall ? toolCall.name : toolCall.toolName) ??
					i18n.baseText('agentDebug.conversation.tool'),
				input: toolCall.input,
				output: toolCall.output,
			})) ?? null,
		timeline: run.timeline,
		error: run.error,
		hitlStatus: run.hitlStatus,
		source: run.source,
	};
}

function extractToolEntries(execution: AgentExecution): ConversationEntry[] {
	const timelineTools = (execution.timeline ?? [])
		.filter((event) => event.type === 'tool-call')
		.map((event, index) => ({
			id: `${execution.id}:tool:${index}`,
			kind: 'tool' as const,
			name:
				stringValue(event.toolName) ??
				stringValue(event.name) ??
				i18n.baseText('agentDebug.conversation.tool'),
			input: event.input,
			output: event.output,
			success: event.success !== false,
			error: stringValue(event.error),
		}));

	if (timelineTools.length > 0) return timelineTools;

	return (execution.toolCalls ?? []).map((toolCall, index) => ({
		id: `${execution.id}:tool:${index}`,
		kind: 'tool' as const,
		name: toolCall.toolName,
		input: toolCall.input,
		output: toolCall.output,
		success: true,
		error: null,
	}));
}

function stringValue(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value : null;
}

function toolLabel(tool: AgentJsonToolConfig): string {
	if (tool.type === 'custom') return tool.id;
	if (tool.type === 'workflow') return tool.name?.trim() || tool.workflow;
	return tool.name;
}

function formatJson(value: unknown): string {
	if (value === null || value === undefined) return '-';
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

function isLongMessage(text: string): boolean {
	return text.length > 520 || text.split('\n').length > 8;
}

function visibleMessage(entry: ConversationMessage): string {
	if (!isLongMessage(entry.text) || expandedMessageIds.value.has(entry.id)) return entry.text;
	return `${entry.text.slice(0, 520).trimEnd()}...`;
}

function toggleMessage(entryId: string) {
	const next = new Set(expandedMessageIds.value);
	if (next.has(entryId)) {
		next.delete(entryId);
	} else {
		next.add(entryId);
	}
	expandedMessageIds.value = next;
}

function formatDate(fullDate: string) {
	const { date, time } = convertToDisplayDate(fullDate);
	return `${date} ${time}`;
}

function formatDuration(ms: number): string {
	if (!ms || ms <= 0) return '0ms';
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(cost: number | null): string {
	if (!cost) return '-';
	return `$${cost.toFixed(4)}`;
}

function sessionLabel(run: Pick<AgentDebugRun, 'sessionTitle' | 'sessionNumber'>): string {
	return (
		run.sessionTitle?.trim() ||
		i18n.baseText('agentDebug.sessionFallback', {
			interpolate: { number: String(run.sessionNumber) },
		})
	);
}

function badgeTheme(
	signal: Pick<AgentDebugSignal, 'severity'>,
): 'danger' | 'warning' | 'secondary' {
	if (signal.severity === 'error') return 'danger';
	if (signal.severity === 'warning') return 'warning';
	return 'secondary';
}

function signalLabel(signal: AgentDebugSignal): string {
	return i18n.baseText(`agentDebug.signal.${signal.type}`);
}

function reviewLabel(status: AgentReviewStatus): string {
	return i18n.baseText(`agentDebug.review.status.${status}`);
}

function rejectionReasonLabel(reason: AgentReviewRejectionReason): string {
	return i18n.baseText(`agentDebug.review.rejectionReason.${reason}`);
}

function reviewSummaryLabel(review: AgentReviewCase): string {
	if (review.status !== 'rejected' || !review.rejectionReason) {
		return reviewLabel(review.status);
	}

	return `${reviewLabel(review.status)}: ${rejectionReasonLabel(review.rejectionReason)}`;
}

function reviewBadgeTheme(status: AgentReviewStatus): 'default' | 'danger' {
	return status === 'approved' ? 'default' : 'danger';
}

function reviewBadgeStyle(status: AgentReviewStatus): Record<string, string> {
	if (status === 'approved') {
		return {
			color: 'var(--color--blue-500)',
			borderColor: 'var(--color--blue-500)',
		};
	}
	return {};
}

function setRejectionReason(value: string) {
	const reason = AGENT_REVIEW_REJECTION_REASONS.find((candidate) => candidate === value);
	if (reason) selectedRejectionReason.value = reason;
}

function onBreadcrumbSelect(item: PathItem) {
	if (item.id === projectId.value) {
		void router.push(projectRoute.value);
	} else if (item.id === agentId.value) {
		void router.push(agentRoute.value);
	}
}

function onRunSelect(nextRunId: string) {
	if (nextRunId === '__empty__' || nextRunId === runId.value) return;
	void router.push({
		name: AGENT_DEBUG_RUN_DETAIL_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value, runId: nextRunId },
	});
}

async function saveReview(status: AgentReviewStatus) {
	const run = selectedRun.value;
	if (!run) return;

	savingReviewAction.value = status;
	try {
		await debugStore.saveRunReview(projectId.value, agentId.value, run.id, { status });
		toast.showMessage({
			title: i18n.baseText('agentDebug.review.showMessage.saved'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('agentDebug.review.showError.save'));
	} finally {
		if (savingReviewAction.value === status) savingReviewAction.value = null;
	}
}

function openRejectDialog() {
	const run = selectedRun.value;
	if (!run) return;

	selectedRejectionReason.value =
		run.review?.rejectionReason ?? DEFAULT_AGENT_REVIEW_REJECTION_REASON;
	expectedOutput.value = run.review?.expectedOutput ?? run.assistantResponse;
	reviewNotes.value = run.review?.notes ?? '';
	selectedWrongToolNames.value = new Set();
	selectedMissingToolNames.value = new Set();
	rejectDialogOpen.value = true;
}

function toggleToolSelection(target: 'wrong' | 'missing', toolName: string, checked: boolean) {
	const source = target === 'wrong' ? selectedWrongToolNames : selectedMissingToolNames;
	const next = new Set(source.value);
	if (checked) {
		next.add(toolName);
	} else {
		next.delete(toolName);
	}
	source.value = next;
}

function rejectionNotes(): string | undefined {
	if (rejectionRequiresWrongTools.value) {
		const tools = Array.from(selectedWrongToolNames.value);
		return tools.length ? `Wrong tools: ${tools.join(', ')}` : undefined;
	}

	if (rejectionRequiresMissingTools.value) {
		const tools = Array.from(selectedMissingToolNames.value);
		return tools.length ? `Missing tools: ${tools.join(', ')}` : undefined;
	}

	return reviewNotes.value.trim() || undefined;
}

async function confirmRejection() {
	const run = selectedRun.value;
	if (!run) return;

	savingReviewAction.value = 'rejected';
	try {
		const payload: UpsertAgentReviewCaseDto = {
			status: 'rejected',
			rejectionReason: selectedRejectionReason.value,
			notes: rejectionNotes(),
		};

		if (rejectionRequiresCorrectOutput.value) {
			payload.expectedOutput = expectedOutput.value;
		}

		await debugStore.saveRunReview(projectId.value, agentId.value, run.id, payload);
		rejectDialogOpen.value = false;
		toast.showMessage({
			title: i18n.baseText('agentDebug.review.showMessage.saved'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('agentDebug.review.showError.save'));
	} finally {
		if (savingReviewAction.value === 'rejected') savingReviewAction.value = null;
	}
}

async function loadRunDetail() {
	if (!projectId.value || !agentId.value || !runId.value) return;
	const requestId = ++loadRunDetailRequestId;

	debugStore.clearSelectedRun();
	thread.value = null;
	executions.value = [];
	selectedTimelineIndex.value = null;
	traceExpanded.value = false;
	expandedMessageIds.value = new Set();
	void debugStore.fetchRuns(projectId.value, agentId.value).catch((error) => {
		toast.showError(error, i18n.baseText('agentDebug.showError.load'));
	});
	void fetchConfig(projectId.value, agentId.value).catch((error) => {
		toast.showError(error, i18n.baseText('agentDebug.showError.load'));
	});

	try {
		await debugStore.fetchRunDetail(projectId.value, agentId.value, runId.value);
		if (requestId !== loadRunDetailRequestId) return;
		const detail = selectedRun.value;
		if (!detail) return;

		loadingThread.value = true;
		const result = await sessionsStore.getThreadDetail(
			projectId.value,
			detail.threadId,
			agentId.value,
		);
		if (requestId !== loadRunDetailRequestId) return;
		thread.value = result.thread;
		executions.value = result.executions;
	} catch (error) {
		if (requestId !== loadRunDetailRequestId) return;
		toast.showError(error, i18n.baseText('agentDebug.showError.loadRun'));
	} finally {
		if (requestId === loadRunDetailRequestId) loadingThread.value = false;
	}
}

watch([projectId, agentId, runId], () => void loadRunDetail(), { immediate: true });

watch(selectedRun, (run) => {
	expectedOutput.value = run?.review?.expectedOutput ?? run?.assistantResponse ?? '';
	reviewNotes.value = run?.review?.notes ?? '';
	selectedRejectionReason.value =
		run?.review?.rejectionReason ?? DEFAULT_AGENT_REVIEW_REJECTION_REASON;
});

onBeforeUnmount(() => {
	loadRunDetailRequestId++;
	debugStore.clearSelectedRun();
});
</script>

<template>
	<div :class="$style.view" data-testid="agent-debug-run-view">
		<div :class="$style.topBar">
			<div :class="$style.topBarLeft">
				<N8nBreadcrumbs :items="breadcrumbItems" theme="medium" @item-selected="onBreadcrumbSelect">
					<template #append>
						<span :class="$style.crumbSeparator" aria-hidden="true">/</span>
						<N8nDropdownMenu
							:items="runOptions"
							placement="bottom-start"
							:extra-popper-class="$style.runDropdownMenu"
							data-testid="agent-debug-run-switcher"
							@select="onRunSelect"
						>
							<template #trigger>
								<N8nButton
									variant="ghost"
									size="small"
									:class="$style.switcherButton"
									:aria-label="i18n.baseText('agentDebug.table.run')"
								>
									<span :class="$style.switcherLabel">{{ currentRunTitle }}</span>
									<N8nIcon icon="chevron-down" :size="14" />
								</N8nButton>
							</template>
							<template #item-label="{ item }">
								<span :class="$style.runDropdownName">{{ item.label }}</span>
							</template>
							<template #item-trailing="{ item }">
								<span v-if="item.data?.date" :class="$style.runDropdownDate">
									{{ item.data.date }}
								</span>
							</template>
						</N8nDropdownMenu>
					</template>
				</N8nBreadcrumbs>
			</div>
		</div>

		<div :class="$style.content">
			<div v-if="debugStore.loadingDetail" :class="$style.detailLoading">
				<ElSkeletonItem v-for="item in 8" :key="item" />
			</div>

			<template v-else-if="selectedRun">
				<section :class="$style.statusSection">
					<div :class="$style.statusGrid">
						<div>
							<N8nText size="small" color="text-light">{{
								i18n.baseText('agentDebug.status')
							}}</N8nText>
							<div
								:class="[
									$style.statusValue,
									conversationStatus === 'error' ? $style.metricDanger : $style.metricOk,
								]"
							>
								<N8nIcon
									:icon="conversationStatus === 'error' ? 'circle-alert' : 'circle-check'"
									:size="16"
								/>
								<span>{{ conversationStatus }}</span>
							</div>
						</div>
						<div>
							<N8nText size="small" color="text-light">{{
								i18n.baseText('agentDebug.duration')
							}}</N8nText>
							<N8nText bold>{{ formatDuration(conversationDuration) }}</N8nText>
						</div>
						<div>
							<N8nText size="small" color="text-light">{{
								i18n.baseText('agentDebug.tokens')
							}}</N8nText>
							<N8nText bold>{{ conversationTokens.toLocaleString() }}</N8nText>
						</div>
						<div>
							<N8nText size="small" color="text-light">{{
								i18n.baseText('agentDebug.cost')
							}}</N8nText>
							<N8nText bold>{{ formatCost(conversationCost) }}</N8nText>
						</div>
					</div>
					<div v-if="selectedRun.signals.length || selectedRun.review" :class="$style.signalList">
						<N8nBadge
							v-for="signal in selectedRun.signals"
							:key="signal.type"
							:theme="badgeTheme(signal)"
							size="small"
						>
							{{ signalLabel(signal) }}
						</N8nBadge>
						<N8nBadge
							v-if="selectedRun.review"
							:theme="reviewBadgeTheme(selectedRun.review.status)"
							:style="reviewBadgeStyle(selectedRun.review.status)"
							size="small"
						>
							{{ reviewSummaryLabel(selectedRun.review) }}
						</N8nBadge>
					</div>
				</section>

				<section :class="$style.conversationSection">
					<div :class="$style.sectionHeader">
						<N8nText bold>{{ i18n.baseText('agentDebug.conversation.title') }}</N8nText>
					</div>
					<div v-if="loadingThread" :class="$style.detailLoading">
						<ElSkeletonItem v-for="item in 4" :key="item" />
					</div>
					<div v-else :class="$style.conversationList">
						<div
							v-for="entry in conversationEntries"
							:key="entry.id"
							:class="[$style.conversationEntry, $style[`conversationEntry_${entry.kind}`]]"
						>
							<div :class="$style.entryIcon">
								<N8nIcon
									:icon="entry.kind === 'user' ? 'user' : entry.kind === 'agent' ? 'bot' : 'wrench'"
									:size="16"
								/>
							</div>
							<div :class="$style.entryBody">
								<div :class="$style.entryHeader">
									<N8nText bold size="small">
										{{
											entry.kind === 'user'
												? i18n.baseText('agentDebug.userMessage')
												: entry.kind === 'agent'
													? i18n.baseText('agentDebug.agentResponse')
													: i18n.baseText('agentDebug.conversation.tool')
										}}
									</N8nText>
								</div>

								<div :class="$style.entryContent">
									<template v-if="entry.kind === 'tool'">
										<div :class="$style.toolSummary">
											<N8nBadge
												:theme="entry.success ? 'default' : 'danger'"
												:style="entry.success ? reviewBadgeStyle('approved') : {}"
												size="small"
											>
												{{ entry.name }}
											</N8nBadge>
											<N8nText v-if="entry.error" size="small" color="danger">
												{{ entry.error }}
											</N8nText>
										</div>
										<details :class="$style.toolDetails">
											<summary>{{ i18n.baseText('agentDebug.conversation.toolDetails') }}</summary>
											<pre>{{ formatJson({ input: entry.input, output: entry.output }) }}</pre>
										</details>
									</template>

									<template v-else>
										<N8nText tag="p" :class="$style.messageText">
											{{ visibleMessage(entry) }}
										</N8nText>
										<N8nButton
											v-if="isLongMessage(entry.text)"
											type="tertiary"
											size="small"
											:label="
												expandedMessageIds.has(entry.id)
													? i18n.baseText('agentDebug.conversation.collapseMessage')
													: i18n.baseText('agentDebug.conversation.expandMessage')
											"
											@click="toggleMessage(entry.id)"
										/>
									</template>
								</div>
							</div>
						</div>
					</div>
				</section>

				<section :class="$style.reviewPanel" data-testid="agent-debug-review-form">
					<div>
						<N8nText bold>{{ i18n.baseText('agentDebug.review.title') }}</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agentDebug.review.description') }}
						</N8nText>
					</div>
					<div :class="$style.reviewActions">
						<N8nButton
							icon="thumbs-up"
							:label="i18n.baseText('agentDebug.review.accept')"
							:loading="savingReviewAction === 'approved'"
							:disabled="savingReviewAction !== null"
							data-testid="agent-debug-approve-review"
							@click="saveReview('approved')"
						/>
						<N8nButton
							icon="thumbs-down"
							variant="outline"
							:label="i18n.baseText('agentDebug.review.reject')"
							:loading="savingReviewAction === 'rejected'"
							:disabled="savingReviewAction !== null"
							data-testid="agent-debug-reject-review"
							@click="openRejectDialog"
						/>
					</div>
				</section>

				<section :class="$style.timeline">
					<N8nButton
						type="tertiary"
						:icon="traceExpanded ? 'chevron-up' : 'chevron-down'"
						:label="
							traceExpanded
								? i18n.baseText('agentDebug.trace.hide')
								: i18n.baseText('agentDebug.trace.show')
						"
						data-testid="agent-debug-trace-toggle"
						@click="traceExpanded = !traceExpanded"
					/>
					<div v-if="traceExpanded" :class="$style.timelinePanels">
						<div :class="$style.tablePanel">
							<SessionTimelineTable
								:items="timelineItems"
								:selected-index="selectedTimelineIndex"
								:visible-kinds="visibleTimelineKinds"
								@select="selectedTimelineIndex = $event"
							/>
						</div>
						<Transition name="debug-run-detail-panel">
							<div v-if="selectedTimelineItem" :class="$style.timelineDetailPanel">
								<SessionDetailPanel
									:item="selectedTimelineItem"
									@close="selectedTimelineIndex = null"
								/>
							</div>
						</Transition>
					</div>
				</section>
			</template>

			<div v-else :class="$style.empty">
				{{ i18n.baseText('agentDebug.selectRun') }}
			</div>
		</div>

		<N8nDialog
			:open="rejectDialogOpen"
			size="medium"
			:header="i18n.baseText('agentDebug.review.rejectDialog.title')"
			:description="i18n.baseText('agentDebug.review.rejectDialog.description')"
			@update:open="rejectDialogOpen = $event"
		>
			<div :class="$style.rejectDialogBody">
				<label :class="$style.reviewField">
					<N8nText size="small" bold>
						{{ i18n.baseText('agentDebug.review.rejectDialog.reason') }}
					</N8nText>
					<N8nSelect
						:model-value="selectedRejectionReason"
						:disabled="savingReviewAction !== null"
						data-testid="agent-debug-rejection-reason"
						@update:model-value="setRejectionReason"
					>
						<N8nOption
							v-for="reason in rejectionReasonOptions"
							:key="reason.value"
							:value="reason.value"
							:label="reason.label"
						/>
					</N8nSelect>
				</label>

				<label v-if="rejectionRequiresCorrectOutput" :class="$style.reviewField">
					<N8nText size="small" bold>
						{{ i18n.baseText('agentDebug.review.rejectDialog.correctOutput') }}
					</N8nText>
					<N8nInput
						v-model="expectedOutput"
						type="textarea"
						:rows="5"
						resize="vertical"
						:placeholder="i18n.baseText('agentDebug.review.rejectDialog.correctOutputPlaceholder')"
						data-testid="agent-debug-expected-output"
					/>
				</label>

				<div v-else-if="rejectionRequiresWrongTools" :class="$style.reviewField">
					<N8nText size="small" bold>
						{{ i18n.baseText('agentDebug.review.rejectDialog.wrongTools') }}
					</N8nText>
					<div v-if="usedToolNames.length" :class="$style.toolChecklist">
						<label v-for="toolName in usedToolNames" :key="toolName" :class="$style.toolChoice">
							<N8nCheckbox
								:model-value="selectedWrongToolNames.has(toolName)"
								@update:model-value="
									(checked: boolean) => toggleToolSelection('wrong', toolName, checked)
								"
							/>
							<span>{{ toolName }}</span>
						</label>
					</div>
					<N8nText v-else size="small" color="text-light">
						{{ i18n.baseText('agentDebug.review.rejectDialog.noTools') }}
					</N8nText>
				</div>

				<div v-else-if="rejectionRequiresMissingTools" :class="$style.reviewField">
					<N8nText size="small" bold>
						{{ i18n.baseText('agentDebug.review.rejectDialog.missingTools') }}
					</N8nText>
					<div v-if="unusedToolNames.length" :class="$style.toolChecklist">
						<label v-for="toolName in unusedToolNames" :key="toolName" :class="$style.toolChoice">
							<N8nCheckbox
								:model-value="selectedMissingToolNames.has(toolName)"
								@update:model-value="
									(checked: boolean) => toggleToolSelection('missing', toolName, checked)
								"
							/>
							<span>{{ toolName }}</span>
						</label>
					</div>
					<N8nText v-else size="small" color="text-light">
						{{ i18n.baseText('agentDebug.review.rejectDialog.noTools') }}
					</N8nText>
				</div>

				<label v-else-if="rejectionRequiresNotes" :class="$style.reviewField">
					<N8nText size="small" bold>
						{{ i18n.baseText('agentDebug.review.rejectDialog.notes') }}
					</N8nText>
					<N8nInput
						v-model="reviewNotes"
						type="textarea"
						:rows="3"
						resize="vertical"
						:placeholder="i18n.baseText('agentDebug.review.rejectDialog.notesPlaceholder')"
						data-testid="agent-debug-review-notes"
					/>
				</label>
			</div>

			<N8nDialogFooter>
				<N8nButton
					variant="outline"
					:label="i18n.baseText('generic.cancel')"
					:disabled="savingReviewAction !== null"
					@click="rejectDialogOpen = false"
				/>
				<N8nButton
					icon="thumbs-down"
					:label="i18n.baseText('agentDebug.review.rejectDialog.save')"
					:loading="savingReviewAction === 'rejected'"
					:disabled="savingReviewAction !== null"
					data-testid="agent-debug-save-rejection"
					@click="confirmRejection"
				/>
			</N8nDialogFooter>
		</N8nDialog>
	</div>
</template>

<style module lang="scss">
:global(body) {
	--color--session-timeline-block-bg-alpha: 75%;
}
:global(body[data-theme='dark']) {
	--color--session-timeline-block-bg-alpha: 45%;
}
@media (prefers-color-scheme: dark) {
	:global(body:not([data-theme])) {
		--color--session-timeline-block-bg-alpha: 45%;
	}
}

.view {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.topBar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--md);
	background-color: var(--background--surface);
	border-bottom: var(--border);
	flex-shrink: 0;
	height: var(--height--4xl);
}

.topBarLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.metricOk {
	color: var(--color--blue-500);
}

.metricDanger {
	color: var(--color--danger);
}

.crumbSeparator {
	color: var(--border-color);
	margin: 0 var(--spacing--4xs);
	user-select: none;
}

.switcherButton {
	font-size: var(--font-size--sm);
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--5xs);
}

.switcherLabel {
	max-width: 200px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.runDropdownMenu {
	min-width: 360px;
}

:global(.debug-run-dropdown-item-active),
:global(.debug-run-dropdown-item-active:hover),
:global(.debug-run-dropdown-item-active:focus),
:global(.debug-run-dropdown-item-active[data-highlighted]) {
	background-color: var(--background--active);
}

.runDropdownName {
	display: block;
	max-width: 60%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.runDropdownDate {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	text-align: right;
	white-space: nowrap;
	margin-left: auto;
}

.content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	min-height: 0;
	padding: var(--spacing--md);
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
	background-color: light-dark(
		var(--color--background--light-1),
		var(--color--background--light-2)
	);
}

.statusSection,
.conversationSection,
.reviewPanel,
.timeline {
	background-color: var(--background--surface);
	border: var(--border);
	border-radius: var(--border-radius-base);
	overflow: hidden;
}

.statusSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--md);
}

.statusGrid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: var(--spacing--sm);
}

.statusGrid > div {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.statusValue {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-weight: var(--font-weight--bold);
}

.signalList {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.conversationSection {
	display: flex;
	flex-direction: column;
}

.sectionHeader {
	padding: var(--spacing--md);
	border-bottom: var(--border);
}

.conversationList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
}

.conversationEntry {
	display: grid;
	grid-template-columns: var(--height--xl) minmax(0, 1fr);
	gap: var(--spacing--xs);
	min-width: 0;
}

.conversationEntry_agent,
.conversationEntry_tool {
	grid-template-columns: minmax(0, 1fr) var(--height--xl);
}

.conversationEntry_agent .entryIcon,
.conversationEntry_tool .entryIcon {
	grid-column: 2;
}

.conversationEntry_agent .entryBody,
.conversationEntry_tool .entryBody {
	grid-column: 1;
	grid-row: 1;
}

.entryIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--height--xl);
	height: var(--height--xl);
	border-radius: var(--border-radius-base);
	background-color: var(--background--hover);
	color: var(--text-color--subtle);
}

.conversationEntry_user .entryIcon {
	color: var(--color--blue-500);
}

.conversationEntry_tool .entryIcon {
	color: var(--color--warning);
}

.conversationEntry_agent .entryIcon {
	color: var(--color--success);
}

.entryBody {
	display: flex;
	flex-direction: column;
	gap: 0;
	border: var(--border);
	border-radius: var(--border-radius-base);
	background-color: light-dark(
		var(--color--background--light-1),
		var(--color--background--light-2)
	);
	min-width: 0;
	overflow: hidden;
}

.entryHeader {
	padding: var(--spacing--2xs) var(--spacing--sm);
	background-color: var(--background--hover);
	border-bottom: var(--border);
}

.entryContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	min-width: 0;
}

.messageText {
	margin: 0;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.toolSummary {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.toolDetails {
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);

	pre {
		margin: var(--spacing--2xs) 0 0;
		padding: var(--spacing--xs);
		max-height: 14rem;
		overflow: auto;
		background-color: var(--background--surface);
		border: var(--border);
		border-radius: var(--border-radius-base);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
}

.reviewPanel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
}

.reviewField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.reviewActions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--xs);
}

.timeline {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
}

.timelinePanels {
	display: flex;
	flex: 1;
	min-height: 24rem;
	border: var(--border);
	border-radius: var(--border-radius-base);
	overflow: hidden;
}

.tablePanel {
	flex: 6;
	min-width: 0;
}

.timelineDetailPanel {
	flex: 0 0 40%;
	min-width: 0;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
	border-left: var(--border);
	background-color: var(--background--surface);
}

:global(.debug-run-detail-panel-enter-active),
:global(.debug-run-detail-panel-leave-active) {
	transition:
		flex-basis var(--duration--snappy) var(--easing--ease-out),
		opacity var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--snappy) var(--easing--ease-out);
	overflow: hidden;
}

:global(.debug-run-detail-panel-enter-from),
:global(.debug-run-detail-panel-leave-to) {
	flex-basis: 0;
	opacity: 0;
	transform: translateX(var(--spacing--sm));
	border-left-color: transparent;
}

:global(.debug-run-detail-panel-enter-to),
:global(.debug-run-detail-panel-leave-from) {
	flex-basis: 40%;
	opacity: 1;
	transform: translateX(0);
}

@media (prefers-reduced-motion: reduce) {
	:global(.debug-run-detail-panel-enter-active),
	:global(.debug-run-detail-panel-leave-active) {
		transition: none;
	}
}

.detailLoading {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
	background-color: var(--background--surface);
}

.rejectDialogBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.toolChecklist {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	max-height: 14rem;
	overflow-y: auto;
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--border-radius-base);
}

.toolChoice {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;

	span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.empty {
	padding: var(--spacing--lg);
	text-align: center;
	color: var(--color--text--tint-1);
	background-color: var(--background--surface);
}

@media (max-width: 1200px) {
	.topBar {
		align-items: flex-start;
		flex-direction: column;
		height: auto;
	}

	.statusGrid {
		grid-template-columns: 1fr;
	}

	.timelinePanels {
		flex-direction: column;
	}

	.timelineDetailPanel {
		flex-basis: auto;
		border-left: 0;
		border-top: var(--border);
	}
}
</style>
