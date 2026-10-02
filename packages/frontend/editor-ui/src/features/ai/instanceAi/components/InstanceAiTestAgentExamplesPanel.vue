<script setup lang="ts">
/**
 * Shown after "Looks good" on the preview popup: the confirmed try, plus a
 * slider-controlled batch of additional generated examples the user can trim,
 * extend with their own, and hand off to a real check via "Check your agent".
 */
import { computed, ref, watch } from 'vue';
import type { AgentEvalDraftCase } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import AgentAvatar, { type AgentAvatarKind } from '@/features/agents/components/AgentAvatar.vue';
import AgentEvalExamplesSlider from '@/features/agents/components/AgentEvalExamplesSlider.vue';
import AgentEvalTryRow from '@/features/agents/components/AgentEvalTryRow.vue';

/** One case of the running suite: its live status and, once settled, its answer. */
export type SuiteCaseRun = {
	rowId: number;
	input: string;
	label: string;
	status: AgentAvatarKind;
	output: string | null;
};

const props = defineProps<{
	previewInput: string;
	previewOutput: string;
	/** The confirmed try's scenario tag, e.g. "Vague". Null when it has none
	 *  (the builder's own reused test result was never scenario-generated) —
	 *  falls back to a generic "Your try" label. */
	previewScenario: string | null;
	/** Already fetched in full (up to 10) — the slider only trims the display. */
	examples: AgentEvalDraftCase[];
	addingExample?: boolean;
	/** Set once "Check your agent" has committed the suite to a run — replaces
	 *  the slider/editor with each case's live status. Null beforehand. */
	caseRuns: SuiteCaseRun[] | null;
	/** True from the "Check your agent" click until the run has actually started. */
	startingRun?: boolean;
	/** True from the "Stop" click until the cancel request resolves. */
	stoppingRun?: boolean;
	/** The row currently mid "Save check" — regenerating and rerunning. Null otherwise. */
	revisingRowId?: number | null;
}>();

const emit = defineEmits<{
	'add-example': [input: string];
	'check-agent': [count: number];
	'stop-run': [];
	/** "Save check" on a case: regenerate it from the user's note and rerun. */
	'revise-case': [payload: { rowId: number; suggestion: string }];
}>();

const i18n = useI18n();

// Collapsed to the summary strip by default once the run settles — expanding
// is the user's own request, not something a partial success should force.
const summaryExpanded = ref(false);

// "Actually fine" is a local judgment call, not a data mutation — no request
// backs it, so it only overrides how a row's own status renders. Cleared the
// moment that row goes back to "waiting": a fresh run's real status should
// always win over a stale override from a previous one.
const manualStatusOverrides = ref<Record<number, AgentAvatarKind>>({});

watch(
	() => props.caseRuns,
	(runs) => {
		if (!runs) return;
		for (const run of runs) {
			if (run.status === 'waiting' && run.rowId in manualStatusOverrides.value) {
				const { [run.rowId]: _removed, ...rest } = manualStatusOverrides.value;
				manualStatusOverrides.value = rest;
			}
		}
	},
	{ deep: true },
);

function onActuallyFine(rowId: number) {
	manualStatusOverrides.value = { ...manualStatusOverrides.value, [rowId]: 'pass' };
}

function onSaveCheck(rowId: number, suggestion: string) {
	emit('revise-case', { rowId, suggestion });
}

// The list the template renders from — `caseRuns` with any "Actually fine"
// overrides applied, so the summary counts and each row agree on what's shown.
const effectiveCaseRuns = computed<SuiteCaseRun[] | null>(() => {
	if (!props.caseRuns) return null;
	return props.caseRuns.map((run) => {
		const override = manualStatusOverrides.value[run.rowId];
		return override ? { ...run, status: override } : run;
	});
});

const waitingCount = computed(
	() => effectiveCaseRuns.value?.filter((run) => run.status === 'waiting').length ?? 0,
);
const passedCount = computed(
	() => effectiveCaseRuns.value?.filter((run) => run.status === 'pass').length ?? 0,
);
const needsWorkCount = computed(
	() => (effectiveCaseRuns.value?.length ?? 0) - passedCount.value - waitingCount.value,
);
const runSettled = computed(() => effectiveCaseRuns.value !== null && waitingCount.value === 0);

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
			<AgentEvalTryRow
				status="pass"
				:input="previewInput"
				:output="previewOutput"
				:label="previewScenario ?? i18n.baseText('instanceAi.testAgentPreview.yourTry')"
				test-id="instance-ai-test-agent-examples-try"
			/>

			<N8nText color="text-light" size="small">
				{{ i18n.baseText('instanceAi.testAgentPreview.savedAsFirstCheck') }}
			</N8nText>

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
			<N8nText v-if="!runSettled" color="text-dark" :class="$style.runStatus">
				{{
					i18n.baseText('instanceAi.testAgentPreview.checkingLeft', {
						interpolate: { count: String(waitingCount) },
					})
				}}
			</N8nText>
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
							total: String(effectiveCaseRuns?.length ?? 0),
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
						v-for="run in effectiveCaseRuns"
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
							adjustToNumber: effectiveCaseRuns?.length ?? 0,
							interpolate: { count: String(effectiveCaseRuns?.length ?? 0) },
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
				<AgentEvalTryRow
					v-for="run in effectiveCaseRuns"
					:key="run.rowId"
					:status="run.status"
					:input="run.input"
					:output="run.output"
					:label="run.label"
					:test-id="`instance-ai-test-agent-examples-case-${run.rowId}`"
					:saving-check="revisingRowId === run.rowId"
					@save-check="onSaveCheck(run.rowId, $event)"
					@actually-fine="onActuallyFine(run.rowId)"
				/>
			</div>

			<N8nButton
				v-if="!runSettled"
				variant="ghost"
				size="small"
				:loading="stoppingRun"
				data-test-id="instance-ai-test-agent-examples-stop"
				@click="onStopRun"
			>
				{{ i18n.baseText('agents.builder.agentEvals.run.cancel') }}
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

.tryCard {
	width: 100%;
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
	margin-left: -6px;
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
	gap: var(--spacing--2xs);
	width: 100%;
}

.exampleList > * {
	border: var(--border);
	padding: 6px 10px 6px 8px;
	border-radius: var(--radius--lg);
}
</style>
