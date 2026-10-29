<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { ElDrawer } from 'element-plus';
import type {
	AgentOnlineActivityItem,
	AgentOnlineCase,
	AgentOnlineCaseResult,
	AgentOnlineReplayComparison,
	AgentOnlineRubric,
	AgentOnlineSession,
} from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nIcon, N8nInput, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useStyles } from '@n8n/composables/useStyles';
import { useRootStore } from '@n8n/stores/useRootStore';

import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import {
	generateOnlineRubric,
	getOnlineRubric,
	listOnlineActivity,
	listOnlineCases,
	listOnlineSessions,
	replayOnlineCase,
	runOnlineChecks,
} from '../agentEvals.api';
import { onlineResultStatus, onlineScore } from '../onlineChecks.utils';

/**
 * Prototype of evals for a change to a published agent. The Rubric view shows
 * the checks. The Tests view replays past sessions on the draft with tools
 * mocked and compares each replay with the recorded run under the same rubric.
 * Sessions are added from a side panel.
 */
const props = defineProps<{
	projectId: string;
	agentId: string;
	disabled?: boolean;
	/** Open the side panel on arrival, for example from the publish warning. */
	openData?: boolean;
}>();
const emit = defineEmits<{
	publish: [];
	'details-open': [open: boolean];
	'data-opened': [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const rubric = ref<AgentOnlineRubric | null>(null);
const sessions = ref<AgentOnlineSession[]>([]);
const cases = ref<AgentOnlineCase[]>([]);
const activity = ref<AgentOnlineActivityItem[]>([]);
const loading = ref(true);
const error = ref('');
/** Thread IDs being added right now. */
const adding = ref<string[]>([]);
/** Case IDs picked for the replay. */
const picked = ref<number[]>([]);
const search = ref('');
const view = ref<'rubric' | 'tests'>('rubric');
const dataOpen = ref(false);

type ReplayRow = {
	state: 'queued' | 'running' | 'done' | 'error';
	comparison?: AgentOnlineReplayComparison;
	error?: string;
};
/** Replay state for each case ID in the latest replay. */
const replays = ref<Record<number, ReplayRow>>({});
let requestId = 0;
onBeforeUnmount(() => {
	requestId += 1;
	emit('details-open', false);
});

const { APP_Z_INDEXES } = useStyles();
// Same width as the check details drawer, so the Evals column makes the same room.
const wideViewport = useMediaQuery('(min-width: 80rem)');
const drawerWidth = computed(() =>
	wideViewport.value ? 'min(40vw, calc(var(--spacing--5xl) * 3))' : '100%',
);
watch(dataOpen, (open) => emit('details-open', open));
watch(
	() => props.openData,
	(open) => {
		if (!open) return;
		dataOpen.value = true;
		emit('data-opened');
	},
	{ immediate: true },
);

const caseForThread = (threadId: string) => cases.value.find((item) => item.threadId === threadId);
const pickedCases = computed(() =>
	picked.value
		.map((id) => cases.value.find((item) => item.id === id))
		.filter((item): item is AgentOnlineCase => item !== undefined),
);
const pickedCount = computed(() => picked.value.length);
const visibleSessions = computed(() => {
	const query = search.value.trim().toLowerCase();
	return query
		? sessions.value.filter((session) => session.title.toLowerCase().includes(query))
		: sessions.value;
});
const isPicked = (threadId: string) => {
	const testCase = caseForThread(threadId);
	return testCase !== undefined && picked.value.includes(testCase.id);
};

const replaying = computed(() =>
	Object.values(replays.value).some((row) => row.state === 'queued' || row.state === 'running'),
);
const finished = computed(() =>
	pickedCases.value
		.map((testCase) => replays.value[testCase.id]?.comparison)
		.filter((comparison): comparison is AgentOnlineReplayComparison => comparison !== undefined),
);
const hasReplayed = computed(() => Object.keys(replays.value).length > 0);

/** The question without the "Did the agent" the column header already says. */
const checkText = (question: string) => question.replace(/^did the agent\s+/i, '…');

type DotStatus = 'good' | 'bad' | 'review' | 'none';
/** This check's verdicts in the five latest assessments, oldest first. */
function lastFive(checkId: string): DotStatus[] {
	return activity.value
		.map((item) => item.result.verdicts.find((verdict) => verdict.checkId === checkId)?.status)
		.filter((status) => status !== undefined)
		.slice(0, 5)
		.reverse()
		.map((status) =>
			status === 'pass'
				? 'good'
				: status === 'fail'
					? 'bad'
					: status === 'not_applicable'
						? 'none'
						: 'review',
		);
}

type Trend = 'better' | 'same' | 'worse';
function trend(comparison: AgentOnlineReplayComparison): Trend {
	const ratio = (score: { passed: number; total: number }) =>
		score.total === 0 ? 1 : score.passed / score.total;
	const before = ratio(onlineScore(comparison.before));
	const after = ratio(onlineScore(comparison.after));
	if (after > before) return 'better';
	if (after < before) return 'worse';
	return 'same';
}
const summary = computed(() => {
	if (replaying.value || finished.value.length === 0) return null;
	const trends = finished.value.map(trend);
	const worse = trends.filter((value) => value === 'worse').length;
	if (worse > 0) return { kind: 'worse' as const, count: worse };
	if (trends.every((value) => value === 'better')) return { kind: 'better' as const, count: 0 };
	return { kind: 'same' as const, count: 0 };
});

const sessionDate = (value: string) => {
	const { date, time } = convertToDisplayDate(value);
	return `${date} ${time}`;
};
const sessionMeta = (session: AgentOnlineSession) => {
	const latest = caseForThread(session.threadId)?.latestResult;
	const status = latest
		? i18n.baseText(
				`agents.builder.agentEvals.onlineChecks.sessions.status.${onlineResultStatus(latest.verdicts)}`,
			)
		: i18n.baseText('agents.builder.agentEvals.replay.notChecked');
	return `${sessionDate(session.updatedAt)} · ${status}`;
};
const scoreLabel = (result: Pick<AgentOnlineCaseResult, 'rubric' | 'verdicts'>) => {
	const { passed, total } = onlineScore(result);
	return i18n.baseText('agents.builder.agentEvals.onlineChecks.review.score', {
		interpolate: { passed: String(passed), total: String(total) },
	});
};
const beforeResult = (testCase: AgentOnlineCase) =>
	replays.value[testCase.id]?.comparison?.before ?? testCase.latestResult;
const replayFailed = (comparison: AgentOnlineReplayComparison) =>
	comparison.after.turns.length === 0 || comparison.after.turns.some((turn) => turn.runFailed);

async function load() {
	const current = ++requestId;
	loading.value = true;
	error.value = '';
	replays.value = {};
	try {
		const [loadedRubric, loadedSessions, page, activityPage] = await Promise.all([
			getOnlineRubric(rootStore.restApiContext, props.projectId, props.agentId),
			listOnlineSessions(rootStore.restApiContext, props.projectId, props.agentId),
			listOnlineCases(rootStore.restApiContext, props.projectId, props.agentId),
			listOnlineActivity(rootStore.restApiContext, props.projectId, props.agentId),
		]);
		if (current !== requestId) return;
		rubric.value =
			loadedRubric ??
			(await generateOnlineRubric(rootStore.restApiContext, props.projectId, props.agentId));
		if (current !== requestId) return;
		sessions.value = loadedSessions;
		cases.value = page.items;
		activity.value = activityPage.items;
		picked.value = loadedSessions
			.map((session) => caseForThread(session.threadId)?.id)
			.filter((id): id is number => id !== undefined);
	} catch (cause) {
		if (current === requestId) error.value = cause instanceof Error ? cause.message : String(cause);
	} finally {
		if (current === requestId) loading.value = false;
	}
}

async function onAdd(session: AgentOnlineSession) {
	const existing = caseForThread(session.threadId);
	if (existing) {
		picked.value = picked.value.includes(existing.id)
			? picked.value.filter((id) => id !== existing.id)
			: [...picked.value, existing.id];
		return;
	}
	const current = requestId;
	adding.value = [...adding.value, session.threadId];
	error.value = '';
	try {
		// Saving the session as a case also judges the recorded run, which is the baseline.
		const report = await runOnlineChecks(rootStore.restApiContext, props.projectId, props.agentId, [
			session.threadId,
		]);
		if (current !== requestId) return;
		const caseId = report.sessions[0]?.savedResult?.caseId;
		const page = await listOnlineCases(rootStore.restApiContext, props.projectId, props.agentId);
		if (current !== requestId) return;
		cases.value = page.items;
		if (caseId !== undefined) picked.value = [...new Set([...picked.value, caseId])];
	} catch (cause) {
		if (current === requestId) error.value = cause instanceof Error ? cause.message : String(cause);
	} finally {
		adding.value = adding.value.filter((id) => id !== session.threadId);
	}
}

async function onReplay() {
	const current = requestId;
	dataOpen.value = false;
	view.value = 'tests';
	const ids = [...picked.value];
	replays.value = Object.fromEntries(ids.map((id) => [id, { state: 'queued' as const }]));
	for (const caseId of ids) {
		if (current !== requestId) return;
		const row = replays.value[caseId];
		row.state = 'running';
		try {
			row.comparison = await replayOnlineCase(
				rootStore.restApiContext,
				props.projectId,
				props.agentId,
				caseId,
			);
			row.state = 'done';
		} catch (cause) {
			row.state = 'error';
			row.error = cause instanceof Error ? cause.message : String(cause);
		}
	}
}

watch(() => [props.projectId, props.agentId], load, { immediate: true });
</script>

<template>
	<section :class="$style.panel" data-testid="agent-online-replay">
		<nav
			:class="$style.subnav"
			:aria-label="i18n.baseText('agents.builder.agentEvals.onlineChecks.review.navigation')"
		>
			<N8nButton
				:variant="view === 'rubric' ? 'solid' : 'outline'"
				size="small"
				:aria-pressed="view === 'rubric'"
				data-testid="agent-online-replay-rubric-tab"
				@click="view = 'rubric'"
				>{{
					i18n.baseText('agents.builder.agentEvals.replay.rubricTab', {
						interpolate: { count: String(rubric?.checks.length ?? 0) },
					})
				}}</N8nButton
			>
			<N8nButton
				:variant="view === 'tests' ? 'solid' : 'outline'"
				size="small"
				:aria-pressed="view === 'tests'"
				data-testid="agent-online-replay-tests-tab"
				@click="view = 'tests'"
				>{{
					i18n.baseText('agents.builder.agentEvals.replay.testsTab', {
						interpolate: { count: String(pickedCount) },
					})
				}}</N8nButton
			>
		</nav>

		<N8nCallout v-if="error" theme="danger">{{ error }}</N8nCallout>
		<div v-if="loading" :class="$style.progress" role="status">
			<N8nSpinner size="small" /><N8nText size="small">{{
				i18n.baseText('agents.builder.agentEvals.replay.loading')
			}}</N8nText>
		</div>

		<template v-else-if="view === 'rubric'">
			<div :class="$style.intro">
				<div :class="$style.introText">
					<N8nText size="medium" color="text-dark" bold>{{
						i18n.baseText('agents.builder.agentEvals.replay.title')
					}}</N8nText>
					<N8nText size="small" color="text-base">{{
						i18n.baseText('agents.builder.agentEvals.replay.description')
					}}</N8nText>
				</div>
				<N8nButton
					variant="outline"
					size="small"
					data-testid="agent-online-replay-add-more"
					@click="dataOpen = true"
					>{{ i18n.baseText('agents.builder.agentEvals.replay.addMore') }}</N8nButton
				>
			</div>
			<div v-if="rubric" :class="$style.tableWrap">
				<table :class="[$style.table, $style.checks]" data-testid="agent-online-replay-rubric">
					<thead>
						<tr>
							<th>{{ i18n.baseText('agents.builder.agentEvals.replay.table.check') }}</th>
							<th>{{ i18n.baseText('agents.builder.agentEvals.replay.table.appliesWhen') }}</th>
							<th>{{ i18n.baseText('agents.builder.agentEvals.replay.table.lastFive') }}</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="check in rubric.checks" :key="check.id">
							<td>
								<N8nText size="small" color="text-dark" bold>{{
									checkText(check.question)
								}}</N8nText>
							</td>
							<td>
								<N8nText size="small" color="text-base">{{
									check.appliesWhen ||
									i18n.baseText('agents.builder.agentEvals.replay.table.always')
								}}</N8nText>
							</td>
							<td>
								<span :class="$style.dots">
									<span
										v-for="(status, index) in lastFive(check.id)"
										:key="index"
										:class="[$style.dot, $style[status]]"
										aria-hidden="true"
									/>
								</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</template>

		<template v-else>
			<div :class="$style.intro">
				<div :class="$style.introText">
					<div :class="$style.line">
						<N8nSpinner v-if="replaying" size="small" />
						<N8nText size="medium" color="text-dark" bold>{{
							i18n.baseText(
								replaying
									? 'agents.builder.agentEvals.replay.running'
									: hasReplayed
										? 'agents.builder.agentEvals.replay.done'
										: 'agents.builder.agentEvals.replay.ready',
								{
									interpolate: {
										done: String(finished.length),
										count: String(pickedCount),
									},
								},
							)
						}}</N8nText>
					</div>
					<N8nText size="small" color="text-base">{{
						i18n.baseText('agents.builder.agentEvals.replay.explainer')
					}}</N8nText>
				</div>
				<N8nButton
					variant="outline"
					size="small"
					:disabled="replaying"
					data-testid="agent-online-replay-add-more"
					@click="dataOpen = true"
					>{{ i18n.baseText('agents.builder.agentEvals.replay.addMore') }}</N8nButton
				>
			</div>
			<N8nText v-if="pickedCount === 0" size="small" color="text-base">{{
				i18n.baseText('agents.builder.agentEvals.replay.noTests')
			}}</N8nText>
			<div v-else :class="$style.tableWrap">
				<table :class="$style.table" data-testid="agent-online-replay-results">
					<thead>
						<tr>
							<th>{{ i18n.baseText('agents.builder.agentEvals.replay.pastSession') }}</th>
							<th>{{ i18n.baseText('agents.builder.agentEvals.replay.before') }}</th>
							<th>{{ i18n.baseText('agents.builder.agentEvals.replay.after') }}</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="testCase in pickedCases"
							:key="testCase.id"
							data-testid="agent-online-replay-row"
						>
							<td>
								<N8nText size="small" color="text-dark" bold>{{ testCase.title }}</N8nText>
							</td>
							<td>
								<span
									v-if="beforeResult(testCase)"
									:class="[
										$style.score,
										$style[onlineResultStatus(beforeResult(testCase)!.verdicts)],
									]"
									><span :class="$style.dot" aria-hidden="true" />{{
										scoreLabel(beforeResult(testCase)!)
									}}</span
								>
							</td>
							<td>
								<N8nSpinner v-if="replays[testCase.id]?.state === 'running'" size="small" />
								<N8nText
									v-else-if="replays[testCase.id]?.state === 'queued'"
									size="small"
									color="text-light"
									>{{
										i18n.baseText('agents.builder.agentEvals.onlineChecks.sessions.status.queued')
									}}</N8nText
								>
								<N8nText
									v-else-if="replays[testCase.id]?.state === 'error'"
									size="small"
									color="danger"
									>{{ replays[testCase.id].error }}</N8nText
								>
								<span
									v-else-if="replays[testCase.id]?.comparison"
									:class="[
										$style.score,
										$style[
											replayFailed(replays[testCase.id].comparison!)
												? 'bad'
												: onlineResultStatus(replays[testCase.id].comparison!.after.verdicts)
										],
									]"
									:title="
										replays[testCase.id]
											.comparison!.after.turns.map((turn) => turn.reply)
											.join('\n\n')
									"
									><span :class="$style.dot" aria-hidden="true" />{{
										replayFailed(replays[testCase.id].comparison!)
											? i18n.baseText('agents.builder.agentEvals.replay.errored')
											: scoreLabel(replays[testCase.id].comparison!.after)
									}}</span
								>
								<N8nText v-else size="small" color="text-light">{{
									i18n.baseText('agents.builder.agentEvals.replay.notReplayed')
								}}</N8nText>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<div v-if="summary" :class="$style.line" data-testid="agent-online-replay-summary">
				<N8nIcon
					:icon="summary.kind === 'worse' ? 'triangle-alert' : 'circle-check'"
					:color="summary.kind === 'worse' ? 'warning' : 'success'"
				/>
				<N8nText size="small">{{
					i18n.baseText(`agents.builder.agentEvals.replay.summary.${summary.kind}`, {
						interpolate: { count: String(summary.count) },
					})
				}}</N8nText>
			</div>
			<div :class="$style.line">
				<N8nButton
					v-if="hasReplayed"
					variant="solid"
					size="medium"
					:disabled="disabled || replaying"
					data-testid="agent-online-replay-publish"
					@click="emit('publish')"
					>{{ i18n.baseText('agents.builder.agentEvals.replay.publish') }}</N8nButton
				>
				<N8nButton
					:variant="hasReplayed ? 'outline' : 'solid'"
					size="medium"
					:disabled="disabled || replaying || pickedCount === 0"
					data-testid="agent-online-replay-run"
					@click="onReplay"
					>{{
						i18n.baseText(
							hasReplayed
								? 'agents.builder.agentEvals.replay.again'
								: 'agents.builder.agentEvals.replay.start',
							{ interpolate: { count: String(pickedCount) } },
						)
					}}</N8nButton
				>
			</div>
		</template>

		<ElDrawer
			v-model="dataOpen"
			append-to-body
			:modal="false"
			:lock-scroll="false"
			:z-index="APP_Z_INDEXES.MODALS"
			direction="rtl"
			:size="drawerWidth"
			:style="{ top: 'var(--spacing--3xl)', height: 'calc(100% - var(--spacing--3xl))' }"
			:title="i18n.baseText('agents.builder.agentEvals.replay.addData')"
			:class="$style.drawer"
			data-testid="agent-online-replay-data"
		>
			<div :class="$style.paneBody">
				<N8nText size="small" color="text-base">{{
					i18n.baseText('agents.builder.agentEvals.replay.addDataDescription')
				}}</N8nText>
				<N8nInput
					v-model="search"
					size="medium"
					:placeholder="i18n.baseText('agents.builder.agentEvals.replay.search')"
					data-testid="agent-online-replay-search"
				/>
				<N8nText v-if="sessions.length === 0" size="small">{{
					i18n.baseText('agents.builder.agentEvals.onlineChecks.noSessions')
				}}</N8nText>
				<ul :class="$style.sessions">
					<li
						v-for="session in visibleSessions"
						:key="session.threadId"
						:class="$style.session"
						data-testid="agent-online-replay-session"
					>
						<div :class="$style.line">
							<N8nText size="small" color="text-dark" bold :class="$style.grow">{{
								session.title
							}}</N8nText>
							<N8nButton
								:variant="isPicked(session.threadId) ? 'solid' : 'outline'"
								size="small"
								:loading="adding.includes(session.threadId)"
								:disabled="disabled || replaying"
								:data-testid="`agent-online-replay-add-${session.threadId}`"
								@click="onAdd(session)"
								>{{
									i18n.baseText(
										isPicked(session.threadId)
											? 'agents.builder.agentEvals.replay.added'
											: 'agents.builder.agentEvals.replay.add',
									)
								}}</N8nButton
							>
						</div>
						<N8nText size="xsmall" color="text-base">{{ sessionMeta(session) }}</N8nText>
					</li>
				</ul>
			</div>
			<template #footer>
				<div :class="$style.paneFooter">
					<N8nButton
						variant="solid"
						size="medium"
						:disabled="disabled || replaying || pickedCount === 0 || adding.length > 0"
						data-testid="agent-online-replay-start"
						@click="onReplay"
						>{{
							i18n.baseText('agents.builder.agentEvals.replay.start', {
								interpolate: { count: String(pickedCount) },
							})
						}}</N8nButton
					>
					<N8nButton variant="outline" size="medium" @click="dataOpen = false">{{
						i18n.baseText('agents.builder.agentEvals.replay.cancel')
					}}</N8nButton>
				</div>
			</template>
		</ElDrawer>
	</section>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	box-sizing: border-box;
}
.subnav,
.line,
.progress,
.paneFooter {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}
.intro {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
	background: var(--background--subtle);
}
.introText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}
.tableWrap {
	overflow-x: auto;
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
}
.table {
	width: 100%;
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
}
.checks {
	td:first-child {
		width: 55%;
	}
	th:last-child,
	td:last-child {
		white-space: nowrap;
	}
}
.dots {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
.score {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--sm);
}
.dot {
	display: inline-block;
	flex: none;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: currentColor;
}
.good {
	color: var(--color--success);
}
.review {
	color: var(--color--warning);
}
.bad {
	color: var(--color--danger);
}
.none {
	color: var(--text-color--subtler);
}
.drawer {
	:global(.el-drawer__header) {
		margin: 0;
		padding: var(--spacing--md);
		border-bottom: var(--border-width) var(--border-style) var(--border-color);
		font-weight: var(--font-weight--bold);
		color: var(--color--text--shade-1);
	}
	:global(.el-drawer__body) {
		padding: 0;
		overflow-y: auto;
	}
	:global(.el-drawer__footer) {
		padding: 0;
	}
}
.paneBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--md);
}
.paneFooter {
	padding: var(--spacing--sm) var(--spacing--md);
	border-top: var(--border-width) var(--border-style) var(--border-color);
}
.sessions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}
.session {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
}
.grow {
	flex: 1;
	min-width: 0;
	overflow-wrap: anywhere;
}
</style>
