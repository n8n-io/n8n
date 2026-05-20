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
import SessionDetailPanel from '../components/SessionDetailPanel.vue';
import SessionTimelineTable from '../components/SessionTimelineTable.vue';
import type { AgentExecution } from '../composables/useAgentThreadsApi';
import { AGENT_BUILDER_VIEW, AGENT_DEBUG_RUN_DETAIL_VIEW, DEBUG_SECTION_KEY } from '../constants';
import type { TimelineItem } from '../session-timeline.types';
import { flattenExecutionsToTimelineItems } from '../session-timeline.utils';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const projectsStore = useProjectsStore();
const debugStore = useAgentDebugStore();

const projectId = computed(() => String(route.params.projectId ?? ''));
const agentId = computed(() => String(route.params.agentId ?? ''));
const runId = computed(() => String(route.params.runId ?? ''));

const selectedTimelineIndex = ref<number | null>(null);
const visibleTimelineKinds = ref(new Set<string>());
const expectedOutput = ref('');
const reviewNotes = ref('');
const selectedRejectionReason = ref<AgentReviewRejectionReason>(
	DEFAULT_AGENT_REVIEW_REJECTION_REASON,
);
const savingReviewAction = ref<AgentReviewStatus | 'clear' | null>(null);

const selectedRun = computed(() => debugStore.selectedRun);

const availableRuns = computed<AgentDebugRun[]>(() => {
	const runs = [...debugStore.runs];
	const detail = selectedRun.value;
	if (detail && !runs.some((run) => run.id === detail.id)) runs.unshift(detail);
	return runs;
});

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

const timelineItems = computed<TimelineItem[]>(() => {
	const detail = selectedRun.value;
	if (!detail) return [];
	return flattenExecutionsToTimelineItems([toTimelineExecution(detail)]);
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

const triggerSource = computed(() => selectedRun.value?.source ?? null);
const triggerIcon = computed((): 'slack' | 'bolt-filled' =>
	triggerSource.value === 'slack' ? 'slack' : 'bolt-filled',
);
const triggerLabel = computed((): string => {
	const source = triggerSource.value;
	if (!source) return '';
	return source.charAt(0).toUpperCase() + source.slice(1);
});

const rejectionReasonOptions = computed(() =>
	AGENT_REVIEW_REJECTION_REASONS.map((reason) => ({
		label: rejectionReasonLabel(reason),
		value: reason,
	})),
);

function toTimelineExecution(run: AgentDebugRunDetail): AgentExecution {
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
				toolName: toolCall.name,
				input: toolCall.input,
				output: toolCall.output,
			})) ?? null,
		timeline: run.timeline,
		error: run.error,
		hitlStatus: run.hitlStatus,
		source: run.source,
	};
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

function formatTokens(run: AgentDebugRunDetail): string {
	if (run.totalTokens !== null) return run.totalTokens.toLocaleString();
	const promptTokens = run.promptTokens ?? 0;
	const completionTokens = run.completionTokens ?? 0;
	if (promptTokens + completionTokens === 0) return '-';
	return (promptTokens + completionTokens).toLocaleString();
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

function messageText(value: string): string {
	return value.trim() || i18n.baseText('agentDebug.noMessageRecorded');
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
		const payload: UpsertAgentReviewCaseDto = {
			status,
			expectedOutput: expectedOutput.value,
			notes: reviewNotes.value || undefined,
		};
		if (status === 'rejected') {
			payload.rejectionReason = selectedRejectionReason.value;
		}

		await debugStore.saveRunReview(projectId.value, agentId.value, run.id, payload);
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

async function clearReview() {
	const run = selectedRun.value;
	if (!run?.review) return;

	savingReviewAction.value = 'clear';
	try {
		await debugStore.clearRunReview(projectId.value, agentId.value, run.id);
		expectedOutput.value = run.assistantResponse;
		reviewNotes.value = '';
		selectedRejectionReason.value = DEFAULT_AGENT_REVIEW_REJECTION_REASON;
		toast.showMessage({
			title: i18n.baseText('agentDebug.review.showMessage.cleared'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('agentDebug.review.showError.clear'));
	} finally {
		if (savingReviewAction.value === 'clear') savingReviewAction.value = null;
	}
}

async function loadRunDetail() {
	if (!projectId.value || !agentId.value || !runId.value) return;

	debugStore.clearSelectedRun();
	selectedTimelineIndex.value = null;
	void debugStore.fetchRuns(projectId.value, agentId.value).catch((error) => {
		toast.showError(error, i18n.baseText('agentDebug.showError.load'));
	});

	try {
		await debugStore.fetchRunDetail(projectId.value, agentId.value, runId.value);
	} catch (error) {
		toast.showError(error, i18n.baseText('agentDebug.showError.loadRun'));
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
			<div v-if="selectedRun" :class="$style.topBarRight">
				<span
					:class="[
						$style.metricItem,
						selectedRun.status === 'error' ? $style.metricDanger : $style.metricOk,
					]"
				>
					<N8nIcon
						:icon="selectedRun.status === 'error' ? 'circle-alert' : 'circle-check'"
						:size="12"
					/>
					<span>{{ selectedRun.status }}</span>
				</span>
				<span v-if="triggerSource" :class="$style.metricItem">
					<N8nIcon :icon="triggerIcon" :size="12" />
					<span>{{ triggerLabel }}</span>
				</span>
				<span :class="$style.metricItem">
					<N8nIcon icon="circle-dollar-sign" :size="12" />
					<span>{{ formatTokens(selectedRun) }}t ({{ formatCost(selectedRun.cost) }})</span>
				</span>
				<span :class="$style.metricItem">
					<N8nIcon icon="clock" :size="12" />
					<span>{{ formatDuration(selectedRun.duration) }}</span>
				</span>
			</div>
		</div>

		<div :class="$style.content">
			<div v-if="debugStore.loadingDetail" :class="$style.detailLoading">
				<ElSkeletonItem v-for="item in 8" :key="item" />
			</div>

			<template v-else-if="selectedRun">
				<section :class="$style.summarySection">
					<div :class="$style.detailHeader">
						<N8nText bold>{{ i18n.baseText('agentDebug.runDetails') }}</N8nText>
						<div :class="$style.signalList">
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
					</div>

					<div :class="$style.messageSummary">
						<section :class="$style.messageBlock">
							<div :class="$style.messageLabel">
								<N8nIcon icon="user" :size="16" />
								<N8nText bold>{{ i18n.baseText('agentDebug.userMessage') }}</N8nText>
							</div>
							<N8nText tag="p" :class="$style.messageText">
								{{ messageText(selectedRun.userMessage) }}
							</N8nText>
						</section>
						<section :class="$style.messageBlock">
							<div :class="$style.messageLabel">
								<N8nIcon icon="bot" :size="16" />
								<N8nText bold>{{ i18n.baseText('agentDebug.agentResponse') }}</N8nText>
							</div>
							<N8nText tag="p" :class="$style.messageText">
								{{ messageText(selectedRun.assistantResponse) }}
							</N8nText>
						</section>
						<dl :class="$style.runMetadata">
							<div>
								<dt>{{ i18n.baseText('agentDebug.status') }}</dt>
								<dd>{{ selectedRun.status }}</dd>
							</div>
							<div>
								<dt>{{ i18n.baseText('agentDebug.duration') }}</dt>
								<dd>{{ formatDuration(selectedRun.duration) }}</dd>
							</div>
							<div>
								<dt>{{ i18n.baseText('agentDebug.tokens') }}</dt>
								<dd>{{ formatTokens(selectedRun) }}</dd>
							</div>
							<div>
								<dt>{{ i18n.baseText('agentDebug.cost') }}</dt>
								<dd>{{ formatCost(selectedRun.cost) }}</dd>
							</div>
							<div>
								<dt>{{ i18n.baseText('agentDebug.model') }}</dt>
								<dd>{{ selectedRun.model ?? '-' }}</dd>
							</div>
							<div>
								<dt>{{ i18n.baseText('agentDebug.source') }}</dt>
								<dd>{{ selectedRun.source ?? '-' }}</dd>
							</div>
						</dl>
					</div>
				</section>

				<section :class="$style.reviewPanel" data-testid="agent-debug-review-form">
					<div :class="$style.reviewHeader">
						<div>
							<N8nText bold>{{ i18n.baseText('agentDebug.review.title') }}</N8nText>
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('agentDebug.review.description') }}
							</N8nText>
						</div>
					</div>
					<div :class="$style.reviewFields">
						<label :class="$style.reviewField">
							<N8nText size="small" bold>
								{{ i18n.baseText('agentDebug.review.expectedOutput') }}
							</N8nText>
							<N8nInput
								v-model="expectedOutput"
								type="textarea"
								:rows="5"
								resize="vertical"
								:placeholder="i18n.baseText('agentDebug.review.expectedOutputPlaceholder')"
								data-testid="agent-debug-expected-output"
							/>
						</label>
						<label :class="$style.reviewField">
							<N8nText size="small" bold>
								{{ i18n.baseText('agentDebug.review.notes') }}
							</N8nText>
							<N8nInput
								v-model="reviewNotes"
								type="textarea"
								:rows="2"
								resize="vertical"
								:placeholder="i18n.baseText('agentDebug.review.notesPlaceholder')"
								data-testid="agent-debug-review-notes"
							/>
						</label>
						<label :class="$style.reviewField">
							<N8nText size="small" bold>
								{{ i18n.baseText('agentDebug.review.rejectionReason') }}
							</N8nText>
							<N8nSelect
								:model-value="selectedRejectionReason"
								:disabled="savingReviewAction !== null"
								size="small"
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
					</div>
					<div :class="$style.reviewActions">
						<N8nButton
							icon="thumbs-up"
							:label="i18n.baseText('agentDebug.review.approve')"
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
							@click="saveReview('rejected')"
						/>
						<N8nButton
							v-if="selectedRun.review"
							icon="trash-2"
							variant="outline"
							:label="i18n.baseText('agentDebug.review.clear')"
							:loading="savingReviewAction === 'clear'"
							:disabled="savingReviewAction !== null"
							data-testid="agent-debug-clear-review"
							@click="clearReview"
						/>
					</div>
				</section>

				<section :class="$style.timeline">
					<div :class="$style.timelineHeader">
						<N8nText bold>{{ i18n.baseText('agentDebug.trace') }}</N8nText>
					</div>
					<div :class="$style.timelinePanels">
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

.topBarRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	user-select: none;
	color: var(--text-color--subtler);
	margin-left: auto;
	min-width: 0;
}

.metricItem {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
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
	min-height: 0;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
	background-color: light-dark(
		var(--color--background--light-1),
		var(--color--background--light-2)
	);
}

.summarySection,
.reviewPanel,
.timeline {
	background-color: var(--background--surface);
	border-bottom: var(--border);
}

.detailHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--md);
	border-bottom: var(--border);
}

.signalList {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.messageSummary {
	display: grid;
	grid-template-columns: 1fr 1fr minmax(18rem, 0.7fr);
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
}

.messageBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--border-radius-base);
	background-color: light-dark(
		var(--color--background--light-1),
		var(--color--background--light-2)
	);
	min-width: 0;
}

.messageLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.messageText {
	margin: 0;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.runMetadata {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--xs);
	margin: 0;
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--border-radius-base);
	background-color: var(--background--surface);

	> div {
		min-width: 0;
	}

	dt {
		color: var(--color--text--tint-1);
		font-size: var(--font-size--xs);
	}

	dd {
		margin: var(--spacing--4xs) 0 0;
		overflow-wrap: anywhere;
	}
}

.reviewPanel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
}

.reviewHeader {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.reviewFields {
	display: grid;
	grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) minmax(16rem, 0.6fr);
	gap: var(--spacing--sm);
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
	min-height: 28rem;
}

.timelineHeader {
	padding: var(--spacing--md) var(--spacing--md) var(--spacing--sm);
	border-bottom: var(--border);
}

.timelinePanels {
	display: flex;
	flex: 1;
	min-height: 28rem;
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

	.topBarRight {
		margin-left: 0;
		flex-wrap: wrap;
	}

	.messageSummary,
	.reviewFields {
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
