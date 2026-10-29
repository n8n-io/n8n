<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { ElDrawer } from 'element-plus';
import type {
	AgentOnlineCase,
	AgentOnlineCaseResult,
	AgentOnlineRubric,
	AgentOnlineResultPage,
} from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nIcon, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useStyles } from '@n8n/composables/useStyles';
import { useRootStore } from '@n8n/stores/useRootStore';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { listOnlineCaseResults, recheckOnlineCase, reviewOnlineCheck } from '../agentEvals.api';
import { onlineResultStatus } from '../onlineChecks.utils';

const props = defineProps<{
	open: boolean;
	initialResultId?: number;
	initialAssessment?: AgentOnlineCaseResult;
	projectId: string;
	agentId: string;
	testCase: AgentOnlineCase | null;
	rubric: AgentOnlineRubric | null;
	disabled?: boolean;
}>();
const emit = defineEmits<{ close: []; updated: [] }>();
const i18n = useI18n();
const root = useRootStore();
const wideViewport = useMediaQuery('(min-width: 80rem)');
const drawerWidth = computed(() =>
	wideViewport.value ? 'min(40vw, calc(var(--spacing--5xl) * 3))' : '100%',
);
const { APP_Z_INDEXES } = useStyles();
const history = ref<AgentOnlineCaseResult[]>([]);
const conversation = ref<NonNullable<AgentOnlineResultPage['conversation']>>([]);
const selected = ref<AgentOnlineCaseResult | null>(null);
const hasMore = ref(false);
const loading = ref(false);
const checking = ref(false);
const error = ref('');
const reviewing = ref<string | null>(null);
const reviewingFeedback = ref<'good' | 'bad' | null>(null);
let requestId = 0;
onBeforeUnmount(() => {
	requestId += 1;
});
const shownRubric = computed(() => (props.testCase ? selected.value?.rubric : props.rubric));
const formatDate = (value: string) => {
	const { date, time } = convertToDisplayDate(value);
	return `${date} ${time}`;
};
async function loadHistory(append = false) {
	if (!props.testCase) return;
	const current = requestId;
	loading.value = true;
	error.value = '';
	try {
		const page = await listOnlineCaseResults(
			root.restApiContext,
			props.projectId,
			props.agentId,
			props.testCase.id,
			append ? history.value.length : 0,
		);
		if (current !== requestId) return;
		history.value = append ? [...history.value, ...page.items] : page.items;
		hasMore.value = page.hasMore;
		conversation.value = page.conversation ?? [];
		if (!append)
			selected.value =
				page.items.find((item) => item.id === props.initialResultId) ??
				(props.initialAssessment?.id === props.initialResultId
					? props.initialAssessment
					: undefined) ??
				page.items[0] ??
				null;
	} catch (cause) {
		if (current === requestId) error.value = cause instanceof Error ? cause.message : String(cause);
	} finally {
		if (current === requestId) loading.value = false;
	}
}
async function recheck() {
	if (!props.testCase || checking.value || props.disabled) return;
	const current = requestId;
	checking.value = true;
	error.value = '';
	try {
		const result = await recheckOnlineCase(
			root.restApiContext,
			props.projectId,
			props.agentId,
			props.testCase.id,
		);
		emit('updated');
		if (current !== requestId) return;
		// Reload the first page so page offsets stay correct after an insert.
		await loadHistory();
		if (current === requestId && history.value.some((item) => item.id === result.id))
			selected.value = result;
	} catch (cause) {
		if (current === requestId) error.value = cause instanceof Error ? cause.message : String(cause);
	} finally {
		if (current === requestId) checking.value = false;
	}
}
const rows = computed(
	() =>
		shownRubric.value?.checks.map((check) => ({
			check,
			verdict: selected.value?.verdicts.find((verdict) => verdict.checkId === check.id),
		})) ?? [],
);
const groups = computed(() => [
	{ key: 'always', rows: rows.value.filter((row) => row.check.kind !== 'promise') },
	{ key: 'specific', rows: rows.value.filter((row) => row.check.kind === 'promise') },
]);
const passed = computed(() => rows.value.filter((row) => row.verdict?.status === 'pass').length);
const applicable = computed(
	() => rows.value.filter((row) => row.verdict?.status !== 'not_applicable').length,
);
const needsReview = computed(
	() =>
		rows.value.filter(
			(row) => row.verdict && ['fail', 'unsure', 'not_run'].includes(row.verdict.status),
		).length,
);
async function review(checkId: string, feedback: 'good' | 'bad') {
	if (!selected.value || props.disabled || reviewing.value) return;
	const assessment = selected.value;
	const current = requestId;
	reviewing.value = checkId;
	reviewingFeedback.value = feedback;
	error.value = '';
	try {
		await reviewOnlineCheck(
			root.restApiContext,
			props.projectId,
			props.agentId,
			assessment.id,
			checkId,
			feedback,
		);
		if (current !== requestId) return;
		const updated = { ...assessment, reviews: { ...assessment.reviews, [checkId]: feedback } };
		history.value = history.value.map((item) => (item.id === assessment.id ? updated : item));
		if (selected.value?.id === assessment.id) selected.value = updated;
		emit('updated');
	} catch (cause) {
		if (current === requestId) error.value = cause instanceof Error ? cause.message : String(cause);
	} finally {
		if (current === requestId) reviewing.value = null;
	}
}

watch(
	() => [props.open, props.projectId, props.agentId, props.testCase?.id, props.initialResultId],
	() => {
		requestId += 1;
		history.value = [];
		conversation.value = [];
		selected.value = null;
		error.value = '';
		loading.value = false;
		checking.value = false;
		reviewing.value = null;
		if (props.open && props.testCase) void loadHistory();
	},
	{ immediate: true },
);
</script>

<template>
	<ElDrawer
		:model-value="open"
		append-to-body
		:modal="false"
		:lock-scroll="false"
		:z-index="APP_Z_INDEXES.MODALS"
		direction="rtl"
		:size="drawerWidth"
		:style="{ top: 'var(--spacing--3xl)', height: 'calc(100% - var(--spacing--3xl))' }"
		:title="
			testCase?.title ?? i18n.baseText('agents.builder.agentEvals.onlineChecks.history.rubric')
		"
		:class="$style.drawer"
		@close="emit('close')"
	>
		<div :class="$style.content" data-testid="agent-online-details">
			<N8nCallout v-if="error" theme="danger">{{ error }}</N8nCallout>
			<template v-if="selected">
				<div :class="$style.summaryHeader">
					<N8nText tag="h3" size="large" bold data-testid="agent-online-score">{{
						i18n.baseText('agents.builder.agentEvals.onlineChecks.review.passed', {
							interpolate: { passed: String(passed), total: String(applicable) },
						})
					}}</N8nText>
					<N8nText size="small" color="text-base">{{
						i18n.baseText('agents.builder.agentEvals.onlineChecks.review.needsLook', {
							interpolate: { count: String(needsReview) },
						})
					}}</N8nText>
				</div>
				<div :class="$style.segments" data-testid="agent-online-score-segments">
					<span
						v-for="row in groups.flatMap((group) => group.rows)"
						:key="row.check.id"
						:class="[$style.segment, $style[row.verdict?.status ?? 'not_run']]"
						:title="
							row.check.question +
							' · ' +
							i18n.baseText(
								`agents.builder.agentEvals.onlineChecks.sessions.verdict.${row.verdict?.status ?? 'not_run'}`,
							)
						"
					/>
				</div>
				<N8nText size="xsmall" color="text-base" data-testid="agent-online-assessment-date">{{
					i18n.baseText('agents.builder.agentEvals.onlineChecks.history.checkedAt', {
						interpolate: { date: formatDate(selected.checkedAt) },
					})
				}}</N8nText>
			</template>
			<N8nSpinner v-if="loading" size="small" />
			<template v-if="shownRubric">
				<section v-for="group in groups" :key="group.key" :class="$style.group">
					<N8nText tag="h3" size="small" color="text-base" bold>{{
						i18n.baseText(
							group.key === 'always'
								? 'agents.builder.agentEvals.onlineChecks.review.alwaysHeading'
								: 'agents.builder.agentEvals.onlineChecks.review.specificHeading',
						)
					}}</N8nText>
					<details
						v-for="row in group.rows"
						:key="row.check.id"
						:class="[
							$style.check,
							$style[row.verdict?.status ?? 'not_run'],
							row.verdict &&
								['fail', 'unsure', 'not_run'].includes(row.verdict.status) &&
								$style.issue,
						]"
						:open="!row.verdict || ['fail', 'unsure', 'not_run'].includes(row.verdict.status)"
						data-testid="agent-online-detail-check"
					>
						<summary :class="$style.checkHeading">
							<N8nIcon
								v-if="row.verdict"
								:icon="
									row.verdict.status === 'pass'
										? 'circle-check'
										: row.verdict.status === 'fail'
											? 'circle-x'
											: 'circle-help'
								"
								size="medium"
							/>
							<N8nText size="small" color="text-dark" bold>{{ row.check.question }}</N8nText>
						</summary>
						<div :class="$style.checkBody">
							<N8nText v-if="row.verdict" size="xsmall" color="text-base">{{
								i18n.baseText(
									`agents.builder.agentEvals.onlineChecks.sessions.verdict.${row.verdict.status}`,
								)
							}}</N8nText>
							<N8nText size="small" color="text-base">{{
								row.verdict?.reason ?? row.check.reason
							}}</N8nText>
							<details v-if="row.check.source.quote || row.check.appliesWhen" :class="$style.rule">
								<summary>
									{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.review.rule') }}
								</summary>
								<N8nText v-if="row.check.appliesWhen" tag="p" size="small" color="text-base">{{
									row.check.appliesWhen
								}}</N8nText>
								<blockquote v-if="row.check.source.quote">{{ row.check.source.quote }}</blockquote>
							</details>
							<template
								v-if="
									selected &&
									row.verdict &&
									['fail', 'unsure', 'not_run'].includes(row.verdict.status)
								"
							>
								<N8nText size="xsmall" color="text-base" bold>{{
									i18n.baseText('agents.builder.agentEvals.onlineChecks.review.yourCall')
								}}</N8nText>
								<N8nText size="small" bold>{{
									i18n.baseText('agents.builder.agentEvals.onlineChecks.review.isGood')
								}}</N8nText>
								<div :class="$style.reviewActions">
									<N8nButton
										:variant="selected.reviews?.[row.check.id] === 'good' ? 'solid' : 'outline'"
										size="small"
										:disabled="disabled || !!reviewing || checking"
										:loading="reviewing === row.check.id && reviewingFeedback === 'good'"
										:data-testid="`agent-online-review-good-${row.check.id}`"
										@click="review(row.check.id, 'good')"
										>{{
											i18n.baseText('agents.builder.agentEvals.onlineChecks.review.yesGood')
										}}</N8nButton
									>
									<N8nButton
										:variant="selected.reviews?.[row.check.id] === 'bad' ? 'solid' : 'outline'"
										size="small"
										:disabled="disabled || !!reviewing || checking"
										:loading="reviewing === row.check.id && reviewingFeedback === 'bad'"
										:data-testid="`agent-online-review-bad-${row.check.id}`"
										@click="review(row.check.id, 'bad')"
										>{{
											i18n.baseText('agents.builder.agentEvals.onlineChecks.review.noGood')
										}}</N8nButton
									>
								</div>
								<N8nText
									v-if="selected.reviews?.[row.check.id]"
									size="xsmall"
									color="text-base"
									data-testid="agent-online-review-saved"
									>{{
										i18n.baseText(
											selected.reviews[row.check.id] === 'good'
												? 'agents.builder.agentEvals.onlineChecks.review.markedGood'
												: 'agents.builder.agentEvals.onlineChecks.review.markedBad',
										)
									}}</N8nText
								>
							</template>
						</div>
					</details>
				</section>
				<N8nText size="xsmall" color="text-base">{{
					i18n.baseText('agents.builder.agentEvals.onlineChecks.history.rubricDate', {
						interpolate: { date: formatDate(shownRubric.generatedAt) },
					})
				}}</N8nText>
			</template>
			<details
				v-if="conversation.length"
				:class="$style.rule"
				data-testid="agent-online-recorded-conversation"
			>
				<summary>
					{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.review.conversation') }}
				</summary>
				<div v-for="(turn, index) in conversation" :key="index" :class="$style.transcriptTurn">
					<N8nText size="xsmall" bold>{{
						i18n.baseText('agents.builder.agentEvals.onlineChecks.review.user')
					}}</N8nText>
					<N8nText size="small">{{ turn.userMessage }}</N8nText>
					<N8nText size="xsmall" bold>{{
						i18n.baseText('agents.builder.agentEvals.onlineChecks.review.agent')
					}}</N8nText>
					<N8nText size="small">{{ turn.reply }}</N8nText>
				</div>
			</details>

			<template v-if="testCase">
				<N8nText tag="h3" size="medium" bold>{{
					i18n.baseText('agents.builder.agentEvals.onlineChecks.history.results')
				}}</N8nText>
				<div :class="$style.history" data-testid="agent-online-result-history">
					<button
						v-for="result in history"
						:key="result.id"
						type="button"
						:aria-pressed="selected?.id === result.id"
						:class="[$style.result, $style[onlineResultStatus(result.verdicts)]]"
						@click="selected = result"
					>
						<N8nIcon
							:icon="
								onlineResultStatus(result.verdicts) === 'good'
									? 'circle-check'
									: onlineResultStatus(result.verdicts) === 'bad'
										? 'circle-x'
										: 'circle-help'
							"
							size="small"
						/>
						<N8nText size="small">{{
							i18n.baseText(
								`agents.builder.agentEvals.onlineChecks.sessions.status.${onlineResultStatus(result.verdicts)}`,
							)
						}}</N8nText>
						<N8nText size="xsmall" color="text-base">{{ formatDate(result.checkedAt) }}</N8nText>
					</button>
				</div>
				<N8nButton v-if="hasMore" variant="ghost" :disabled="loading" @click="loadHistory(true)">{{
					i18n.baseText('agents.builder.agentEvals.onlineChecks.history.loadMore')
				}}</N8nButton>
				<N8nText size="small" color="text-base">{{
					i18n.baseText('agents.builder.agentEvals.onlineChecks.history.snapshot')
				}}</N8nText>
				<N8nButton
					:loading="checking"
					:disabled="disabled || checking || loading || !!reviewing"
					data-testid="agent-online-case-recheck"
					@click="recheck"
					>{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.history.recheck') }}</N8nButton
				>
			</template>
		</div>
	</ElDrawer>
</template>

<style lang="scss" module>
.drawer {
	:global(.el-drawer__header) {
		margin: 0;
		padding: var(--spacing--md);
		overflow-wrap: anywhere;
	}
	:global(.el-drawer__body) {
		padding: var(--spacing--md);
		overflow-y: auto;
	}
}
.content {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--sm);
}
.history {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}
.result {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
	background: var(--background--surface);
	cursor: pointer;
	text-align: left;
	&[aria-pressed='true'] {
		border-color: var(--color--primary);
		background: var(--background--subtle);
	}
	&:focus-visible {
		outline: var(--border-width) solid var(--color--primary);
		outline-offset: var(--spacing--5xs);
	}
}
.good {
	color: var(--color--success);
}
.bad {
	color: var(--color--danger);
}
.review {
	color: var(--color--warning);
}

.summaryHeader,
.checkHeading,
.reviewActions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}
.summaryHeader {
	justify-content: space-between;
}
.segments {
	display: flex;
	gap: var(--spacing--4xs);
}
.segment {
	flex: 1;
	height: var(--spacing--sm);
	background: currentColor;
	border-radius: var(--radius--4xs);
}
.transcriptTurn {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) 0;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
.check {
	display: block;
	overflow-wrap: anywhere;
	:global(p) {
		margin: var(--spacing--2xs) 0;
	}
}
.checkBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--xs);
}
.checkHeading {
	cursor: pointer;
	flex-wrap: nowrap;
	align-items: flex-start;
}
.pass {
	color: var(--color--success);
}
.fail {
	color: var(--color--danger);
}
.unsure,
.not_run {
	color: var(--color--warning);
}
.not_applicable {
	color: var(--text-color--subtler);
}
.issue {
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) currentColor;
	border-radius: var(--radius);
	background: var(--background--surface);
}
.rule {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	summary {
		cursor: pointer;
	}
	blockquote {
		margin: var(--spacing--2xs) 0;
		padding-left: var(--spacing--xs);
		border-left: var(--border-width) var(--border-style) var(--border-color);
	}
}
</style>
