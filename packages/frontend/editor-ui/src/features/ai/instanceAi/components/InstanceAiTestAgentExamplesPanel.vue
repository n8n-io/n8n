<script setup lang="ts">
/**
 * Shown after "Looks good" on the preview popup: the confirmed try, plus a
 * slider-controlled batch of additional generated examples the user can trim,
 * extend with their own, and hand off to a real check via "Check your agent".
 */
import { computed, ref } from 'vue';
import type { AgentEvalDraftCase } from '@n8n/api-types';
import { ElSlider } from 'element-plus';
import { N8nButton, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import AgentAvatar, { type AgentAvatarKind } from '@/features/agents/components/AgentAvatar.vue';
import AgentEvalTryRow from '@/features/agents/components/AgentEvalTryRow.vue';

/** One case of the running suite: its live status and, once settled, its answer. */
export type SuiteCaseRun = {
	rowId: number;
	input: string;
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
}>();

const emit = defineEmits<{
	'add-example': [input: string];
	'check-agent': [count: number];
	'stop-run': [];
	'view-evals': [];
}>();

const i18n = useI18n();

// Collapsed to the summary strip by default once the run settles — expanding
// is the user's own request, not something a partial success should force.
const summaryExpanded = ref(false);

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

function toggleSummaryExpanded() {
	summaryExpanded.value = !summaryExpanded.value;
}

function onStopRun() {
	emit('stop-run');
}

// `examples` grows when the user adds their own (the parent appends the
// created case) — freeze the generated batch size at mount so the slider and
// the generated list never pick up those additions.
const generatedCount = props.examples.length;

const maxSliderValue = computed(() => Math.max(1, Math.min(10, generatedCount)));
const sliderValue = ref(Math.min(2, maxSliderValue.value));

const visibleExamples = computed(() => props.examples.slice(0, sliderValue.value));

const ownExamples = ref<string[]>([]);
const ownInput = ref('');

// N8nInput draws its border as a box-shadow ring, which can't be dashed —
// disable it here so the dashed `.addOwnInput` border underneath shows instead.
const addOwnInputStyle = {
	'--input--shadow': 'none',
	'--input--shadow--hover': 'none',
	'--input--shadow--focus': 'none',
	'--input--border--shadow': 'none',
	'--input--border--shadow--hover': 'none',
	'--input--border--shadow--focus': 'none',
	'--input--color--background': 'transparent',
};

function submitOwnExample() {
	const value = ownInput.value.trim();
	if (!value) return;
	ownExamples.value = [...ownExamples.value, value];
	emit('add-example', value);
	ownInput.value = '';
}

function cancelAddOwn() {
	ownInput.value = '';
}

function onCheckYourAgent() {
	emit('check-agent', sliderValue.value);
}

function onViewEvals() {
	emit('view-evals');
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

			<div :class="$style.sliderRow" data-test-id="instance-ai-test-agent-examples-slider">
				<ElSlider
					v-model="sliderValue"
					:min="1"
					:max="maxSliderValue"
					:step="1"
					:show-tooltip="false"
					:class="$style.slider"
				/>
				<div :class="$style.sliderLabels">
					<span :class="$style.sliderCount">
						{{
							i18n.baseText('instanceAi.testAgentPreview.examplesCount', {
								adjustToNumber: sliderValue,
								interpolate: { count: String(sliderValue) },
							})
						}}
					</span>
				</div>
			</div>

			<div :class="$style.exampleList">
				<AgentEvalTryRow
					v-for="(example, index) in visibleExamples"
					:key="index"
					status="idle"
					:input="example.input"
					:output="null"
					:label="example.scenario"
					test-id="instance-ai-test-agent-examples-example"
				/>
				<AgentEvalTryRow
					v-for="(example, index) in ownExamples"
					:key="`own-${index}`"
					status="idle"
					:input="example"
					:output="null"
					test-id="instance-ai-test-agent-examples-own-example"
				/>
			</div>

			<div :class="$style.addOwnForm">
				<N8nInput
					v-model="ownInput"
					:class="$style.addOwnInput"
					:style="addOwnInputStyle"
					:autosize="{ minRows: 1, maxRows: 4 }"
					:placeholder="i18n.baseText('instanceAi.testAgentPreview.addYourOwnExample')"
					data-test-id="instance-ai-test-agent-examples-add-own-input"
					@keydown.meta.enter="submitOwnExample"
					@keydown.enter="submitOwnExample"
					@keydown.esc="cancelAddOwn"
				>
					<template #prefix>
						<N8nIcon icon="plus" size="small" />
					</template>
				</N8nInput>
			</div>

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
							total: String(caseRuns.length),
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
						size="row"
						:class="$style.summaryAvatar"
					/>
				</div>
				<N8nText size="small" color="text-dark">
					{{
						i18n.baseText('instanceAi.testAgentPreview.savedChecks', {
							adjustToNumber: caseRuns.length,
							interpolate: { count: String(caseRuns.length) },
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
					v-for="run in caseRuns"
					:key="run.rowId"
					:status="run.status"
					:input="run.input"
					:output="run.output"
					:test-id="`instance-ai-test-agent-examples-case-${run.rowId}`"
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

.sliderRow {
	position: relative;
	width: 100%;
}

.slider {
	width: 100%;

	:global(.el-slider__runway) {
		height: 44px;
		background-color: var(--run-data--color--background);
		border-radius: var(--radius--xl);
		border: var(--border);
	}

	:global(.el-slider__bar) {
		height: 44px;
		background-color: oklch(from var(--color--primary) l c h/.2);
		border-right: 1px solid var(--color--orange-500);
		border-radius: var(--radius--xl) 0 0 var(--radius--xl);
	}

	:global(.el-slider__button-wrapper) {
		top: 2px;
	}

	:global(.el-slider__button) {
		border-color: var(--color--primary);
	}
}

.sliderLabels {
	position: absolute;
	top: 0;
	left: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: var(--font-size--xs);

	width: 100%;
	height: 100%;
	padding: 0 var(--spacing--sm);
	pointer-events: none;
}

.sliderCount {
	font-weight: var(--font-weight--bold);
	color: var(--text-color--dark);
}

.sliderToTry {
	color: var(--text-color--subtler);
}

.exampleList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}

.addOwn {
	width: 100%;
}

.addOwnInput {
	border: 1px dashed oklch(88.53% 0 89.88);
	border-radius: var(--radius--lg);
}

.addOwnForm {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}
</style>
