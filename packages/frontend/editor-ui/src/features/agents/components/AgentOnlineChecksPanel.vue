<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type {
	AgentOnlineRubric,
	AgentOnlineSession,
	AgentOnlineCase,
	AgentOnlineActivityItem,
	AgentOnlineCaseResult,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nIcon,
	N8nSpinner,
	N8nText,
	type IconName,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import {
	runOnlineChecks,
	getOnlineRubric,
	generateOnlineRubric,
	listOnlineSessions,
	listOnlineCases,
	listOnlineActivity,
} from '../agentEvals.api';
import type { OnlineChecksReport } from '../agentEvals.types';
import { AGENT_SESSION_DETAIL_VIEW } from '../constants';

import AgentOnlineRubricReview from './AgentOnlineRubricReview.vue';
import AgentOnlineCheckDetails from './AgentOnlineCheckDetails.vue';
import { onlineResultStatus } from '../onlineChecks.utils';

const emit = defineEmits<{ 'details-open': [open: boolean] }>();
const props = defineProps<{ projectId: string; agentId: string; disabled?: boolean }>();
const i18n = useI18n();
const rootStore = useRootStore();
const rubric = ref<AgentOnlineRubric | null>(null);
const loadingRubric = ref(true);
const generatingRubric = ref(false);
const errorMessage = ref<string | null>(null);
let requestId = 0;

onBeforeUnmount(() => {
	requestId += 1;
	emit('details-open', false);
});

const showSessions = ref(false);
const loadingSessions = ref(false);
const sessions = ref<AgentOnlineSession[]>([]);
const selectedIds = ref<string[]>([]);
const running = ref(false);
const runCount = ref(0);

type SessionResult = OnlineChecksReport['sessions'][number];
type SessionState = 'queued' | 'running' | 'good' | 'bad' | 'review' | 'error';
const results = ref<
	Record<string, { status: SessionState; result?: SessionResult; error?: string }>
>({});
const completedCount = computed(
	() =>
		Object.values(results.value).filter(
			(row) => row.status !== 'queued' && row.status !== 'running',
		).length,
);
const allSelected = computed(
	() => sessions.value.length > 0 && selectedIds.value.length === sessions.value.length,
);
const busy = computed(
	() => running.value || generatingRubric.value || loadingRubric.value || loadingSessions.value,
);
const cases = ref<AgentOnlineCase[]>([]);
const loadingCases = ref(false);
const casesHaveMore = ref(false);
const historyError = ref('');
const detailsOpen = ref(false);
watch(detailsOpen, (open) => emit('details-open', open));
const openedCase = ref<AgentOnlineCase | null>(null);
const openedResultId = ref<number>();
const initialAssessment = ref<AgentOnlineCaseResult>();
const activeView = ref<'cases' | 'rubric' | 'activity'>('cases');
const activity = ref<AgentOnlineActivityItem[]>([]);
const loadingActivity = ref(false);
const activityError = ref('');
const activityHasMore = ref(false);
async function loadActivity(append = false) {
	const current = requestId;
	loadingActivity.value = true;
	activityError.value = '';
	try {
		const page = await listOnlineActivity(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			append ? activity.value.length : 0,
		);
		if (current !== requestId) return;
		activity.value = append ? [...activity.value, ...page.items] : page.items;
		activityHasMore.value = page.hasMore;
	} catch (cause) {
		if (current === requestId)
			activityError.value = cause instanceof Error ? cause.message : String(cause);
	} finally {
		if (current === requestId) loadingActivity.value = false;
	}
}
watch(activeView, (view) => {
	if (view !== 'cases') void loadActivity();
});
const passCount = (result: AgentOnlineCaseResult) =>
	result.verdicts.filter((verdict) => verdict.status === 'pass').length;
const applicableCount = (result: AgentOnlineCaseResult) =>
	result.rubric.checks.filter(
		(check) =>
			result.verdicts.find((verdict) => verdict.checkId === check.id)?.status !== 'not_applicable',
	).length;
function openActivity(item: AgentOnlineActivityItem) {
	openDetails(
		{
			id: item.caseId,
			title: item.title,
			threadId: null,
			createdAt: item.result.checkedAt,
			latestResult: item.result,
			recentResults: [],
		},
		item.result.id,
	);
	initialAssessment.value = item.result;
}
async function refreshResults() {
	await loadCases();
	if (activeView.value !== 'cases') await loadActivity();
}

const openDetails = (testCase: AgentOnlineCase | null, resultId?: number) => {
	openedResultId.value = resultId;
	initialAssessment.value = undefined;
	openedCase.value = testCase;
	detailsOpen.value = true;
};
async function loadCases(append = false) {
	const current = requestId;
	loadingCases.value = true;
	historyError.value = '';
	try {
		const page = await listOnlineCases(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			append ? cases.value.length : 0,
		);
		if (current !== requestId) return;
		cases.value = append ? [...cases.value, ...page.items] : page.items;
		casesHaveMore.value = page.hasMore;
	} catch (error) {
		if (current === requestId)
			historyError.value = error instanceof Error ? error.message : String(error);
	} finally {
		if (current === requestId) loadingCases.value = false;
	}
}
const openSessionResult = (threadId: string) => {
	const savedId = results.value[threadId]?.result?.savedResult?.caseId;
	const testCase = cases.value.find((item) => item.id === savedId || item.threadId === threadId);
	if (testCase) openDetails(testCase);
};

const selectAll = (selected: boolean) => {
	selectedIds.value = selected ? sessions.value.map((session) => session.threadId) : [];
};
const selectSession = (threadId: string, selected: boolean) => {
	selectedIds.value = selected
		? [...new Set([...selectedIds.value, threadId])]
		: selectedIds.value.filter((id) => id !== threadId);
};
const sessionRoute = (threadId: string) => ({
	name: AGENT_SESSION_DETAIL_VIEW,
	params: { projectId: props.projectId, agentId: props.agentId, threadId },
});
const sessionDate = (value: string) => {
	const { date, time } = convertToDisplayDate(value);
	return `${date} ${time}`;
};
const statusIcon = (status: SessionState): IconName =>
	status === 'good'
		? 'circle-check'
		: status === 'bad' || status === 'error'
			? 'circle-x'
			: 'circle-help';

const onChooseSessions = async () => {
	const currentRequest = requestId;
	showSessions.value = true;
	activeView.value = 'cases';
	loadingSessions.value = true;
	errorMessage.value = null;
	results.value = {};
	try {
		const listed = await listOnlineSessions(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		if (currentRequest !== requestId) return;
		sessions.value = listed;
		selectedIds.value = listed.map((session) => session.threadId);
	} catch (error) {
		if (currentRequest === requestId)
			errorMessage.value = error instanceof Error ? error.message : String(error);
	} finally {
		if (currentRequest === requestId) loadingSessions.value = false;
	}
};

const onRunSelected = async () => {
	if (props.disabled || busy.value || selectedIds.value.length === 0) return;
	const currentRequest = requestId;
	const { projectId, agentId } = props;
	const ids = [...selectedIds.value];
	runCount.value = ids.length;
	running.value = true;
	errorMessage.value = null;
	results.value = Object.fromEntries(ids.map((id) => [id, { status: 'queued' as const }]));
	try {
		for (const threadId of ids) {
			if (currentRequest !== requestId) return;
			results.value[threadId] = { status: 'running' };
			try {
				const report = await runOnlineChecks(rootStore.restApiContext, projectId, agentId, [
					threadId,
				]);
				if (currentRequest !== requestId) return;
				const result = report.sessions.find((session) => session.threadId === threadId);
				if (!result) {
					results.value[threadId] = {
						status: 'error',
						error: i18n.baseText('agents.builder.agentEvals.onlineChecks.sessions.noResult'),
					};
					continue;
				}
				results.value[threadId] = { status: onlineResultStatus(result.verdicts), result };
				await loadCases();
			} catch (error) {
				if (currentRequest !== requestId) return;
				results.value[threadId] = {
					status: 'error',
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}
	} finally {
		if (currentRequest === requestId) running.value = false;
	}
};

const onGenerateRubric = async () => {
	const currentRequest = requestId;
	generatingRubric.value = true;
	errorMessage.value = null;
	try {
		const result = await generateOnlineRubric(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		if (currentRequest === requestId) rubric.value = result;
	} catch (error) {
		if (currentRequest === requestId)
			errorMessage.value = error instanceof Error ? error.message : String(error);
	} finally {
		if (currentRequest === requestId) generatingRubric.value = false;
	}
};

watch(
	() => [props.projectId, props.agentId],
	async () => {
		const currentRequest = ++requestId;
		rubric.value = null;
		activeView.value = 'cases';
		activity.value = [];
		activityError.value = '';
		loadingActivity.value = false;
		initialAssessment.value = undefined;
		cases.value = [];
		detailsOpen.value = false;
		openedCase.value = null;
		historyError.value = '';
		void loadCases();
		showSessions.value = false;
		sessions.value = [];
		selectedIds.value = [];
		results.value = {};
		errorMessage.value = null;
		running.value = false;
		loadingSessions.value = false;
		generatingRubric.value = false;
		loadingRubric.value = true;
		try {
			const result = await getOnlineRubric(
				rootStore.restApiContext,
				props.projectId,
				props.agentId,
			);
			if (currentRequest === requestId) rubric.value = result;
		} catch (error) {
			if (currentRequest === requestId)
				errorMessage.value = error instanceof Error ? error.message : String(error);
		} finally {
			if (currentRequest === requestId) loadingRubric.value = false;
		}
	},
	{ immediate: true },
);
</script>

<template>
	<section :class="$style.panel" data-testid="agent-online-checks">
		<header :class="$style.header">
			<div :class="$style.heading">
				<N8nText tag="h3" size="large" color="text-dark" bold>{{
					i18n.baseText('agents.builder.agentEvals.onlineChecks.title')
				}}</N8nText>
				<N8nText size="small" color="text-base">{{
					i18n.baseText(
						showSessions
							? 'agents.builder.agentEvals.onlineChecks.sessions.description'
							: 'agents.builder.agentEvals.onlineChecks.description',
					)
				}}</N8nText>
			</div>
			<template v-if="!showSessions">
				<N8nButton
					:variant="rubric ? 'outline' : 'solid'"
					size="medium"
					:loading="generatingRubric"
					:disabled="disabled || busy"
					data-testid="agent-online-rubric-generate"
					@click="onGenerateRubric"
				>
					{{
						i18n.baseText(
							rubric
								? 'agents.builder.agentEvals.onlineChecks.regenerateRubric'
								: 'agents.builder.agentEvals.onlineChecks.generateRubric',
						)
					}}
				</N8nButton>
				<N8nButton
					v-if="rubric"
					variant="solid"
					size="medium"
					:disabled="disabled || busy"
					data-testid="agent-online-checks-run"
					@click="onChooseSessions"
					>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.run') }}</N8nButton
				>
			</template>
			<N8nButton
				v-else
				variant="outline"
				size="medium"
				:disabled="busy"
				data-testid="agent-online-checks-back"
				@click="showSessions = false"
				>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.sessions.back') }}</N8nButton
			>
		</header>

		<nav
			v-if="!showSessions"
			:class="$style.subnav"
			:aria-label="i18n.baseText('agents.builder.agentEvals.onlineChecks.review.navigation')"
		>
			<N8nButton
				:variant="activeView === 'cases' ? 'solid' : 'outline'"
				size="small"
				:aria-pressed="activeView === 'cases'"
				:disabled="running"
				data-testid="agent-online-cases-tab"
				@click="activeView = 'cases'"
				>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.history.title') }} ·
				{{ cases.length }}{{ casesHaveMore ? '+' : '' }}</N8nButton
			>
			<N8nButton
				:variant="activeView === 'rubric' ? 'solid' : 'outline'"
				size="small"
				:aria-pressed="activeView === 'rubric'"
				:disabled="running || !rubric"
				data-testid="agent-online-rubric"
				@click="activeView = 'rubric'"
				>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.history.rubric') }} ·
				{{ rubric?.checks.length ?? 0 }}</N8nButton
			>
			<N8nButton
				:variant="activeView === 'activity' ? 'solid' : 'outline'"
				size="small"
				:aria-pressed="activeView === 'activity'"
				:disabled="running"
				data-testid="agent-online-activity-tab"
				@click="activeView = 'activity'"
				>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.review.activity') }}</N8nButton
			>
		</nav>
		<N8nCallout v-if="errorMessage" theme="danger" data-testid="agent-online-checks-error"
			>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.error') }}:
			{{ errorMessage }}</N8nCallout
		>

		<template v-if="showSessions">
			<div v-if="loadingSessions" :class="$style.progress" role="status">
				<N8nSpinner size="small" /><N8nText size="small">{{
					i18n.baseText('agents.builder.agentEvals.onlineChecks.sessions.loading')
				}}</N8nText>
			</div>
			<N8nText
				v-else-if="sessions.length === 0"
				size="small"
				data-testid="agent-online-checks-no-sessions"
				>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.noSessions') }}</N8nText
			>
			<template v-else>
				<div :class="$style.selectionHeader">
					<N8nCheckbox
						:model-value="allSelected"
						:indeterminate="selectedIds.length > 0 && !allSelected"
						:disabled="disabled || running"
						:label="i18n.baseText('agents.builder.agentEvals.onlineChecks.sessions.selectAll')"
						data-testid="agent-online-sessions-select-all"
						@update:model-value="selectAll"
					/>
					<N8nText size="small" color="text-base">{{
						i18n.baseText('agents.builder.agentEvals.onlineChecks.sessions.selected', {
							interpolate: { selected: String(selectedIds.length), total: String(sessions.length) },
						})
					}}</N8nText>
				</div>
				<div
					v-if="running"
					:class="$style.progress"
					role="status"
					aria-live="polite"
					data-testid="agent-online-sessions-progress"
				>
					<N8nSpinner size="small" /><N8nText size="small">{{
						i18n.baseText('agents.builder.agentEvals.onlineChecks.sessions.progress', {
							interpolate: { completed: String(completedCount), total: String(runCount) },
						})
					}}</N8nText>
				</div>
				<ul :class="$style.sessionList" :aria-busy="running" data-testid="agent-online-sessions">
					<li
						v-for="session in sessions"
						:key="session.threadId"
						:class="[
							$style.sessionRow,
							results[session.threadId] && $style[results[session.threadId].status],
						]"
						data-testid="agent-online-session"
					>
						<div :class="$style.sessionHeader">
							<N8nCheckbox
								:model-value="selectedIds.includes(session.threadId)"
								:disabled="disabled || running"
								:aria-label="
									i18n.baseText('agents.builder.agentEvals.onlineChecks.sessions.select', {
										interpolate: { title: session.title },
									})
								"
								:data-testid="`agent-online-session-select-${session.threadId}`"
								@update:model-value="selectSession(session.threadId, $event)"
							/>
							<div :class="$style.sessionTitle">
								<RouterLink :to="sessionRoute(session.threadId)" :class="$style.link">{{
									session.title
								}}</RouterLink>
								<N8nText size="xsmall" color="text-light">{{
									sessionDate(session.updatedAt)
								}}</N8nText>
							</div>
							<div
								v-if="results[session.threadId]"
								:class="$style.sessionStatus"
								role="status"
								:data-testid="`agent-online-session-status-${session.threadId}`"
							>
								<N8nSpinner v-if="results[session.threadId].status === 'running'" size="small" />
								<N8nIcon v-else :icon="statusIcon(results[session.threadId].status)" size="small" />
								<N8nText size="small">{{
									i18n.baseText(
										`agents.builder.agentEvals.onlineChecks.sessions.status.${results[session.threadId].status}`,
									)
								}}</N8nText>
							</div>
						</div>
						<N8nText v-if="results[session.threadId]?.error" size="small" color="text-base">{{
							results[session.threadId].error
						}}</N8nText>
						<N8nButton
							v-if="results[session.threadId]?.result"
							variant="ghost"
							size="small"
							:disabled="loadingCases"
							@click="openSessionResult(session.threadId)"
							>{{
								i18n.baseText('agents.builder.agentEvals.onlineChecks.sessions.details')
							}}</N8nButton
						>
					</li>
				</ul>
				<N8nButton
					variant="solid"
					size="medium"
					:loading="running"
					:disabled="disabled || busy || selectedIds.length === 0"
					data-testid="agent-online-sessions-confirm"
					@click="onRunSelected"
					>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.sessions.confirm') }}</N8nButton
				>
			</template>
		</template>

		<template v-if="activeView === 'cases'">
			<N8nText tag="h3" size="medium" bold>{{
				i18n.baseText('agents.builder.agentEvals.onlineChecks.history.title')
			}}</N8nText>
			<N8nText size="small" color="text-base">{{
				i18n.baseText('agents.builder.agentEvals.onlineChecks.history.description')
			}}</N8nText>
			<N8nCallout v-if="historyError" theme="danger">{{ historyError }}</N8nCallout>
			<N8nSpinner v-if="loadingCases" size="small" />
			<N8nText
				v-if="!loadingCases && cases.length === 0 && !historyError"
				size="small"
				color="text-base"
				>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.history.empty') }}</N8nText
			>

			<div v-if="cases.length" :class="$style.caseTableWrap">
				<table :class="$style.caseTable" data-testid="agent-online-saved-cases">
					<thead>
						<tr>
							<th>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.history.test') }}</th>
							<th>
								{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.history.lastResult') }}
							</th>
							<th>
								{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.history.overTime') }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="testCase in cases" :key="testCase.id" data-testid="agent-online-saved-case">
							<td>
								<button type="button" :class="$style.caseTitle" @click="openDetails(testCase)">
									{{ testCase.title }}
								</button>
							</td>
							<td>
								<div
									v-if="testCase.latestResult"
									:class="[
										$style.lastResult,
										$style[onlineResultStatus(testCase.latestResult.verdicts)],
									]"
								>
									<span :class="$style.dot" aria-hidden="true" />
									<N8nText size="small">{{
										i18n.baseText(
											`agents.builder.agentEvals.onlineChecks.sessions.status.${onlineResultStatus(testCase.latestResult.verdicts)}`,
										)
									}}</N8nText>
								</div>
								<N8nText v-if="testCase.latestResult" size="xsmall" color="text-base">{{
									i18n.baseText('agents.builder.agentEvals.onlineChecks.history.lastChecked', {
										interpolate: { date: sessionDate(testCase.latestResult.checkedAt) },
									})
								}}</N8nText>
							</td>
							<td>
								<div :class="$style.timeline">
									<button
										v-for="assessment in testCase.recentResults"
										:key="assessment.id"
										type="button"
										:class="[$style.dotButton, $style[assessment.status]]"
										:aria-label="
											i18n.baseText('agents.builder.agentEvals.onlineChecks.history.resultAt', {
												interpolate: {
													status: i18n.baseText(
														`agents.builder.agentEvals.onlineChecks.sessions.status.${assessment.status}`,
													),
													date: sessionDate(assessment.checkedAt),
												},
											})
										"
										:title="
											i18n.baseText('agents.builder.agentEvals.onlineChecks.history.resultAt', {
												interpolate: {
													status: i18n.baseText(
														`agents.builder.agentEvals.onlineChecks.sessions.status.${assessment.status}`,
													),
													date: sessionDate(assessment.checkedAt),
												},
											})
										"
										data-testid="agent-online-result-dot"
										@click="openDetails(testCase, assessment.id)"
									>
										<span :class="$style.dot" aria-hidden="true" />
									</button>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<N8nButton
				v-if="casesHaveMore"
				variant="ghost"
				:disabled="loadingCases"
				@click="loadCases(true)"
				>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.history.loadMore') }}</N8nButton
			>
		</template>
		<template v-if="activeView === 'rubric' && rubric">
			<N8nSpinner v-if="loadingActivity" size="small" />
			<N8nCallout v-if="activityError" theme="danger">{{ activityError }}</N8nCallout>
			<AgentOnlineRubricReview
				:rubric="rubric"
				:activity="activity"
				:project-id="projectId"
				:agent-id="agentId"
				:disabled="disabled || busy"
				:history-state="loadingActivity ? 'loading' : activityError ? 'error' : 'ready'"
				@updated="rubric = $event"
				@assessment="openActivity"
			/>
		</template>
		<template v-if="activeView === 'activity'">
			<N8nCallout v-if="activityError" theme="danger">{{ activityError }}</N8nCallout>
			<N8nSpinner v-if="loadingActivity" size="small" />
			<N8nText
				v-if="!loadingActivity && !activityError && !activity.length"
				size="small"
				color="text-base"
				>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.review.noActivity') }}</N8nText
			>
			<div v-if="activity.length" :class="$style.caseTableWrap">
				<table :class="$style.caseTable" data-testid="agent-online-activity">
					<thead>
						<tr>
							<th>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.review.when') }}</th>
							<th>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.review.session') }}</th>
							<th>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.history.rubric') }}</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="item in activity"
							:key="item.result.id"
							data-testid="agent-online-activity-row"
						>
							<td>
								<N8nText size="small" color="text-base">{{
									sessionDate(item.result.checkedAt)
								}}</N8nText>
							</td>
							<td>
								<button type="button" :class="$style.caseTitle" @click="openActivity(item)">
									{{ item.title }}
								</button>
							</td>
							<td>
								<button
									type="button"
									:class="[$style.activityResult, $style[onlineResultStatus(item.result.verdicts)]]"
									@click="openActivity(item)"
								>
									<span :class="$style.dot" aria-hidden="true" /><N8nText size="small">{{
										i18n.baseText('agents.builder.agentEvals.onlineChecks.review.score', {
											interpolate: {
												passed: String(passCount(item.result)),
												total: String(applicableCount(item.result)),
											},
										})
									}}</N8nText>
								</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<N8nButton
				v-if="activityHasMore"
				variant="ghost"
				:disabled="loadingActivity"
				@click="loadActivity(true)"
				>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.history.loadMore') }}</N8nButton
			>
		</template>

		<AgentOnlineCheckDetails
			:open="detailsOpen"
			:project-id="projectId"
			:agent-id="agentId"
			:test-case="openedCase"
			:initial-result-id="openedResultId"
			:initial-assessment="initialAssessment"
			:rubric="rubric"
			:disabled="disabled || running"
			@close="detailsOpen = false"
			@updated="refreshResults()"
		/>
	</section>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	box-sizing: border-box;
	padding: var(--spacing--md);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
}
.header,
.selectionHeader,
.sessionHeader {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}
.heading,
.sessionTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
	flex: 1;
	overflow-wrap: anywhere;
}
.heading {
	flex: 1 1 var(--spacing--5xl);
}
.progress,
.sessionStatus {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
.sessionList,
.checkList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin: 0;
	padding: 0;
	list-style: none;
}
.sessionRow {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
	overflow-wrap: anywhere;
}
.good .sessionStatus {
	color: var(--color--success);
}
.bad .sessionStatus,
.error .sessionStatus {
	color: var(--color--danger);
}
.review .sessionStatus {
	color: var(--color--warning);
}
.queued .sessionStatus {
	color: var(--text-color--subtler);
}
.link {
	font-size: var(--font-size--2xs);
	color: var(--color--primary);
	text-decoration: none;
	&:hover {
		text-decoration: underline;
	}
}

.caseTableWrap {
	width: 100%;
	overflow-x: auto;
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
}
.caseTable {
	width: 100%;
	min-width: calc(var(--spacing--5xl) * 2);
	border-collapse: collapse;
	text-align: left;
	th {
		color: var(--text-color--subtler);
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--regular);
	}
	th,
	td {
		padding: var(--spacing--sm);
		vertical-align: middle;
	}
	tbody tr {
		border-top: var(--border-width) var(--border-style) var(--border-color);
	}
	td:first-child {
		width: 45%;
	}
	td:nth-child(2) {
		width: 30%;
	}
}
.caseTitle {
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--text-color);
	font: inherit;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	text-align: left;
	cursor: pointer;
	overflow-wrap: anywhere;
	&:hover {
		color: var(--color--primary);
	}
}
.lastResult {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--4xs);
}
.timeline {
	display: flex;
	align-items: center;
	width: max-content;
}
.dotButton {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	background: transparent;
	border: 0;
	border-radius: var(--radius);
	cursor: pointer;
	&:hover {
		background: var(--background--subtle);
	}
}
.dot {
	display: inline-block;
	flex: none;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: currentColor;
}
.good.lastResult,
.good.dotButton {
	color: var(--color--success);
}
.bad.lastResult,
.bad.dotButton {
	color: var(--color--danger);
}
.review.lastResult,
.review.dotButton {
	color: var(--color--warning);
}
.caseTitle:focus-visible,
.dotButton:focus-visible {
	outline: var(--border-width) solid var(--color--primary);
	outline-offset: var(--spacing--5xs);
}

.subnav {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	button {
		border-radius: var(--radius--full);
	}
}
.activityResult {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0;
	border: 0;
	background: transparent;
	cursor: pointer;
}
.good.activityResult {
	color: var(--color--success);
}
.bad.activityResult {
	color: var(--color--danger);
}
.review.activityResult {
	color: var(--color--warning);
}
.activityResult:focus-visible {
	outline: var(--border-width) solid var(--color--primary);
}
</style>
