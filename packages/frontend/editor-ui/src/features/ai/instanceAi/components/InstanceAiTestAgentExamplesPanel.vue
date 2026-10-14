<script setup lang="ts">
/**
 * Shown after "Looks good" on the preview popup: the confirmed try, plus a
 * slider-controlled batch of additional generated examples the user can trim,
 * extend with their own, and hand off to a real check via "Check your agent".
 */
import { computed, ref, useId, watch } from 'vue';
import { useIntervalFn } from '@vueuse/core';
import { TIME } from '@/app/constants/durations';
import { formatAgentElapsedTime } from '@/features/agents/utils/agent-elapsed-time';
import type { AgentEvalDraftCase } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import AgentAvatar, { type AgentAvatarKind } from '@/features/agents/components/AgentAvatar.vue';
import AgentEvalExamplesSlider from '@/features/agents/components/AgentEvalExamplesSlider.vue';
import AgentEvalSuggestionCard from '@/features/agents/components/AgentEvalSuggestionCard.vue';
import EvalInitialSample from '@/features/agents/components/EvalInitialSample.vue';
import AgentEvalTryRow from '@/features/agents/components/AgentEvalTryRow.vue';

/** One case of the running suite: its live status and, once settled, its answer. */
export type SuiteCaseRun = {
	rowId: number;
	/** Null until the row has a seeded result to rerun — never the case once
	 *  `caseRuns` is non-null, since `startRun` seeds every row up front. */
	resultId: string | null;
	input: string;
	label: string;
	status: AgentAvatarKind;
	output: string | null;
	toolCalls: ToolCall[];
	whatToCheck: string | null;
	/** Why the case errored, or the judge's reasoning on a graded fail. */
	errorMessage: string | null;
	/** One instruction the judge proposed for a graded fail. Absent or null when it made none. */
	fixSuggestion?: string | null;
};

const props = defineProps<{
	previewInput: string;
	previewOutput: string;
	/** The confirmed try's scenario tag, e.g. "Vague". Null when it has none
	 *  (the builder's own reused test result was never scenario-generated) —
	 *  falls back to a generic "Your try" label. */
	previewScenario: string | null;
	/** How the confirmed try fared. Defaults to a pass, the state that reaches this panel
	 *  after "Check harder cases". */
	previewStatus?: AgentAvatarKind;
	/** The judge's reasoning behind `previewStatus`, when it graded the try. */
	previewReasoning?: string | null;
	projectId?: string;
	/** Already fetched in full (up to 10) — the slider only trims the display. */
	examples: AgentEvalDraftCase[];
	addingExample?: boolean;
	/** Set once "Check your agent" has committed the suite to a run — replaces
	 *  the slider/editor with each case's live status. Null beforehand. */
	caseRuns: SuiteCaseRun[] | null;
	/** True from the "Check your agent" click until the run has actually started. */
	startingRun?: boolean;
	runStartedAt?: string | null;
	/** True from the "Stop" click until the cancel request resolves. */
	stoppingRun?: boolean;
	/** The cases are saved but their run could not be started or followed. */
	runFailed?: boolean;
	/** Result ids whose suggestion is being applied right now. */
	applyingSuggestionIds?: string[];
}>();

const emit = defineEmits<{
	'add-example': [input: string];
	'check-agent': [count: number];
	'stop-run': [];
	/** "Try again" after the run could not be started or followed. */
	'retry-run': [];
	/** "Try agent yourself": open the agent's own chat once every check passed. */
	'try-agent': [];
	/** A row's chevron: open the eval view on that case. Null for the confirmed
	 *  try, which has no result yet — the view just opens. */
	'open-case': [resultId: string | null];
	/** "Apply suggestion" on a failed case: rewrite the agent's instructions, then rerun it. */
	'apply-suggestion': [resultId: string];
	/** "Apply all suggestions": one rewrite of the instructions for all these cases, then rerun them. */
	'apply-suggestions': [resultIds: string[]];
}>();

const i18n = useI18n();

// Collapsed to the summary strip by default once the run settles — expanding
// is the user's own request, not something a partial success should force.
const summaryExpanded = ref(false);
const firstCheckExpanded = ref(false);
const firstCheckDetailsId = useId();

const waitingCount = computed(
	() => props.caseRuns?.filter((run) => run.status === 'waiting').length ?? 0,
);
const passedCount = computed(
	() => props.caseRuns?.filter((run) => run.status === 'pass').length ?? 0,
);
const needsWorkCount = computed(
	() => (props.caseRuns?.length ?? 0) - passedCount.value - waitingCount.value,
);
const runSettled = computed(() => props.caseRuns !== null && waitingCount.value === 0);
const allPassed = computed(
	() => runSettled.value && needsWorkCount.value === 0 && passedCount.value > 0,
);

const now = ref(Date.now());
const localStartedAt = ref(now.value);
const timerActive = computed(
	() => props.caseRuns !== null && !runSettled.value && !props.runFailed,
);
const { pause, resume } = useIntervalFn(
	() => {
		now.value = Date.now();
	},
	TIME.SECOND,
	{ immediate: false },
);
watch(
	timerActive,
	(active) => {
		if (active) {
			now.value = Date.now();
			localStartedAt.value = now.value;
			resume();
		} else pause();
	},
	{ immediate: true },
);
const elapsed = computed(() => {
	const startedAt = Date.parse(props.runStartedAt ?? '');
	return formatAgentElapsedTime(
		now.value - (Number.isFinite(startedAt) ? startedAt : localStartedAt.value),
	);
});

// "Keep as is" hides a card until a different suggestion arrives for that case.
const dismissedSuggestions = ref<string[]>([]);
const suggestionKey = (run: SuiteCaseRun) => `${run.rowId}:${run.fixSuggestion}`;

function suggestionFor(run: SuiteCaseRun): string | null {
	if (run.status !== 'work' || !run.resultId || !run.fixSuggestion?.trim()) return null;
	return dismissedSuggestions.value.includes(suggestionKey(run)) ? null : run.fixSuggestion;
}

const applyingAny = computed(() => (props.applyingSuggestionIds?.length ?? 0) > 0);

const applicableSuggestionIds = computed(() =>
	(props.caseRuns ?? [])
		.filter((run) => suggestionFor(run) !== null)
		.flatMap((run) => (run.resultId ? [run.resultId] : [])),
);

const applyingAll = ref(false);
watch(applyingAny, (applying) => {
	if (!applying) applyingAll.value = false;
});

function onApplyAllSuggestions() {
	applyingAll.value = true;
	emit('apply-suggestions', applicableSuggestionIds.value);
}

// A settled run with cases that need work opens its list, so they are not hidden behind
// the summary. The user can still collapse it.
watch(
	() => runSettled.value && needsWorkCount.value > 0,
	(needsAttention) => {
		if (needsAttention) summaryExpanded.value = true;
	},
	{ immediate: true },
);

function toggleSummaryExpanded() {
	summaryExpanded.value = !summaryExpanded.value;
}

function onStopRun() {
	emit('stop-run');
}

const examplesSlider = ref<InstanceType<typeof AgentEvalExamplesSlider> | null>(null);

function onCheckYourAgent() {
	emit('check-agent', examplesSlider.value?.sliderValue ?? 1);
}
</script>

<template>
	<div :class="$style.root">
		<template v-if="!caseRuns">
			<div
				:class="$style.firstCheckSummary"
				data-test-id="instance-ai-test-agent-examples-first-summary"
			>
				<AgentAvatar :kind="previewStatus ?? 'pass'" size="sm" />
				<N8nText color="text-dark">{{
					i18n.baseText(
						(previewStatus ?? 'pass') === 'pass'
							? 'instanceAi.testAgentPreview.firstCheckPassed'
							: 'instanceAi.testAgentPreview.firstCheckNeedsWork',
					)
				}}</N8nText>
				<N8nButton
					variant="ghost"
					size="small"
					:aria-expanded="firstCheckExpanded"
					:aria-controls="firstCheckDetailsId"
					data-test-id="instance-ai-test-agent-examples-view-first"
					@click="firstCheckExpanded = !firstCheckExpanded"
				>
					{{
						i18n.baseText(
							firstCheckExpanded
								? 'instanceAi.testAgentPreview.hideFirstCheck'
								: 'instanceAi.testAgentPreview.viewFirstCheck',
						)
					}}
				</N8nButton>
			</div>
			<div
				v-if="firstCheckExpanded"
				:id="firstCheckDetailsId"
				data-test-id="instance-ai-test-agent-examples-try"
			>
				<N8nText color="text-base" size="small">{{
					previewScenario ?? i18n.baseText('instanceAi.testAgentPreview.yourTry')
				}}</N8nText>
				<EvalInitialSample
					:preview-input="previewInput"
					:preview-output="previewOutput"
					:status="previewStatus ?? 'pass'"
					:error-message="previewReasoning ?? undefined"
				/>
				<N8nButton variant="ghost" size="small" @click="emit('open-case', null)">
					{{ i18n.baseText('instanceAi.testAgentPreview.openChecks') }}
				</N8nButton>
			</div>

			<hr :class="$style.divider" />
			<N8nText color="text-dark" :class="$style.checkMoreExamplesHint">
				{{ i18n.baseText('instanceAi.testAgentPreview.checkMoreExamples') }}
			</N8nText>

			<AgentEvalExamplesSlider
				ref="examplesSlider"
				:examples="examples"
				@add-example="emit('add-example', $event)"
			/>

			<N8nButton
				variant="solid"
				size="small"
				:loading="startingRun"
				data-test-id="instance-ai-test-agent-examples-check-agent"
				@click="onCheckYourAgent"
			>
				{{ i18n.baseText('instanceAi.testAgentPreview.checkYourAgent') }}
			</N8nButton>
		</template>

		<template v-else>
			<N8nText
				v-if="runFailed"
				color="text-dark"
				:class="$style.runStatus"
				data-test-id="instance-ai-test-agent-examples-run-failed"
			>
				{{ i18n.baseText('instanceAi.testAgentPreview.runProgressUnavailable') }}
			</N8nText>
			<div v-else-if="!runSettled" :class="$style.runningSummary">
				<div :class="$style.summaryAvatars" aria-hidden="true">
					<AgentAvatar
						v-for="run in caseRuns.slice(0, 3)"
						:key="run.rowId"
						:kind="run.status"
						size="row"
						:class="$style.summaryAvatar"
					/>
					<N8nText v-if="caseRuns.length > 3" color="text-base" :class="$style.extraCount"
						>+{{ caseRuns.length - 3 }}</N8nText
					>
				</div>
				<div>
					<N8nText color="text-dark" :class="$style.runStatus">{{
						i18n.baseText('instanceAi.testAgentPreview.runningChecks', {
							adjustToNumber: caseRuns.length,
							interpolate: {
								count: String(caseRuns.length),
								done: String(caseRuns.length - waitingCount),
							},
						})
					}}</N8nText>
					<div
						:class="$style.timer"
						aria-live="off"
						data-test-id="instance-ai-test-agent-examples-timer"
					>
						{{ elapsed }}
					</div>
				</div>
			</div>
			<N8nText
				v-else
				color="text-dark"
				:class="$style.runStatus"
				data-test-id="instance-ai-test-agent-examples-run-summary"
			>
				{{
					i18n.baseText('instanceAi.testAgentPreview.wentWellNeedWork', {
						interpolate: {
							passed: String(passedCount),
							total: String(caseRuns?.length ?? 0),
							needsWork: String(needsWorkCount),
						},
					})
				}}
			</N8nText>

			<button
				v-if="runSettled"
				type="button"
				:class="$style.summaryPill"
				data-test-id="instance-ai-test-agent-examples-summary-toggle"
				@click="toggleSummaryExpanded"
			>
				<div :class="$style.summaryAvatars">
					<AgentAvatar
						v-for="run in caseRuns"
						:key="run.rowId"
						:kind="run.status"
						:label="run.label"
						size="row"
						:class="$style.summaryAvatar"
					/>
				</div>
				<N8nText size="small" color="text-dark">
					{{
						i18n.baseText('instanceAi.testAgentPreview.savedChecks', {
							adjustToNumber: caseRuns?.length ?? 0,
							interpolate: { count: String(caseRuns?.length ?? 0) },
						})
					}}
				</N8nText>
				<N8nIcon
					:icon="summaryExpanded ? 'chevron-up' : 'chevron-down'"
					size="small"
					:class="$style.summaryChevron"
				/>
			</button>

			<div v-if="!runSettled || summaryExpanded" :class="$style.exampleList">
				<div v-for="run in caseRuns" :key="run.rowId" :class="$style.exampleItem">
					<AgentEvalTryRow
						:status="run.status"
						:input="run.input"
						:output="run.output"
						:label="run.label"
						:error-message="run.errorMessage"
						:tool-calls="run.toolCalls"
						:project-id="projectId"
						:test-id="`instance-ai-test-agent-examples-case-${run.rowId}`"
						@open="emit('open-case', run.resultId)"
					/>
					<template v-if="suggestionFor(run) && run.resultId">
						<N8nText
							v-if="run.errorMessage"
							color="text-base"
							size="small"
							:data-test-id="`instance-ai-test-agent-examples-case-${run.rowId}-verdict`"
						>
							{{ run.errorMessage }}
						</N8nText>
						<AgentEvalSuggestionCard
							:suggestion="suggestionFor(run) ?? ''"
							:applying="applyingSuggestionIds?.includes(run.resultId)"
							:disabled="applyingAny"
							:test-id="`instance-ai-test-agent-examples-case-${run.rowId}-suggestion`"
							@apply="emit('apply-suggestion', run.resultId)"
							@dismiss="dismissedSuggestions.push(suggestionKey(run))"
						/>
					</template>
				</div>
			</div>

			<N8nButton
				v-if="runSettled && summaryExpanded && applicableSuggestionIds.length > 1"
				variant="solid"
				size="small"
				:disabled="applyingAny"
				:loading="applyingAll"
				data-test-id="instance-ai-test-agent-examples-apply-all-suggestions"
				@click="onApplyAllSuggestions"
			>
				{{ i18n.baseText('agents.builder.agentEvals.suggestion.applyAll') }}
			</N8nButton>

			<N8nButton
				v-if="runFailed"
				variant="solid"
				size="small"
				:loading="startingRun"
				data-test-id="instance-ai-test-agent-examples-retry-run"
				@click="emit('retry-run')"
			>
				{{ i18n.baseText('instanceAi.testAgentPreview.retryRun') }}
			</N8nButton>
			<N8nButton
				v-else-if="!runSettled && !applyingAny"
				variant="ghost"
				size="small"
				:loading="stoppingRun"
				data-test-id="instance-ai-test-agent-examples-stop"
				@click="onStopRun"
			>
				{{ i18n.baseText('agents.builder.agentEvals.run.cancel') }}
			</N8nButton>

			<N8nButton
				v-if="allPassed"
				variant="solid"
				size="small"
				data-test-id="instance-ai-test-agent-examples-try-agent"
				@click="emit('try-agent')"
			>
				{{ i18n.baseText('instanceAi.testAgentPreview.tryAgentYourself') }}
			</N8nButton>
		</template>
	</div>
</template>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--sm);
	width: 100%;
}

.firstCheckSummary {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.runningSummary {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.extraCount {
	margin-left: var(--spacing--2xs);
	align-self: center;
}

.timer {
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-variant-numeric: tabular-nums;
}

.checkMoreExamplesHint {
	font-weight: bolder;
}

.runStatus {
	font-weight: var(--font-weight--bold);
}

.summaryPill {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--3xs) var(--spacing--sm);
	background: none;
	border: var(--border);
	border-radius: var(--radius--lg);
	cursor: pointer;
	text-align: left;
}

.summaryAvatars {
	display: flex;
	flex-shrink: 0;
}

.summaryAvatar:not(:first-child) {
	margin-left: calc(var(--spacing--3xs) * -1);
}

.summaryChevron {
	margin-left: auto;
	color: var(--text-color--subtler);
}

.divider {
	width: 100%;
	margin: 0;
	border: none;
	border-top: var(--border);
}

.exampleList {
	display: flex;
	flex-direction: column;
	width: 100%;
	border: var(--border);
	border-radius: var(--radius--lg);
}

.exampleList > * {
	padding: var(--spacing--3xs) var(--spacing--xs);
	border-bottom: var(--border);
}

.exampleItem {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.exampleList > *:last-of-type {
	border-bottom: none;
}
</style>
