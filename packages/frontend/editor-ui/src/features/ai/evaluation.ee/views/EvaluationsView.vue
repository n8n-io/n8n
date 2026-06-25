<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, watch } from 'vue';

import ConcurrencySlider from '../components/ConcurrencySlider';
import RunsSection from '../components/ListRuns/RunsSection.vue';
// TODO(TRUST-70 follow-up): wire `RunComparison.vue` from `../components/RunDetail/`
// here once the feature is built. The placeholder lives next to the run-detail
// components since comparison reuses the delta/tone helpers.
import { useEvaluationStore } from '../evaluation.store';
import { useParallelEvalStore } from '../parallelEval.store';
import orderBy from 'lodash/orderBy';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';

import { N8nButton, N8nIcon, N8nPopover } from '@n8n/design-system';

const props = defineProps<{
	workflowId: string;
}>();

const locale = useI18n();
const toast = useToast();
const telemetry = useTelemetry();

const evaluationStore = useEvaluationStore();
const parallelEvalStore = useParallelEvalStore();

const selectedMetric = ref<string>('');
const cancellingTestRun = ref<boolean>(false);
const popoverOpen = ref(false);
// Configs load async on mount. Until they resolve we can't tell a "no config"
// workflow apart from one whose configs simply haven't arrived yet, so the
// primary Run Test button stays disabled to avoid kicking off an unintended
// direct run.
const configsLoading = ref<boolean>(true);

const activeConfigId = computed<string | null>(() => {
	const configs = evaluationStore.evaluationConfigsByWorkflowId[props.workflowId];
	// The eval-config flow creates a single config per workflow, so the first
	// entry is the active one. If multi-config support lands, this needs to
	// become an explicit user selection rather than an implicit first().
	return configs?.[0]?.id ?? null;
});

// The split-button caret + popover appear when there's something to put in the
// popover: concurrency controls and/or the "Run workflow" direct-run option.
const showRunPopover = computed(
	() => parallelEvalStore.isConcurrencyAvailable || activeConfigId.value !== null,
);

const runningTestRun = computed(() => runs.value.find((run) => run.status === 'running'));

const concurrencyModel = computed({
	get: () => parallelEvalStore.concurrencyValue(props.workflowId),
	set: (value: number) => parallelEvalStore.setConcurrencyValue(props.workflowId, value),
});

// Slider value 1 = sequential, > 1 = concurrent. The current value is
// surfaced as a pill in the popover header ("N of M") rather than a
// separate text label, mirroring the Figma spec.
const valuePillLabel = computed(() =>
	locale.baseText('evaluation.runInParallel.popover.valuePill', {
		interpolate: {
			count: String(concurrencyModel.value),
			max: String(parallelEvalStore.maxConcurrency),
		},
	}),
);

onMounted(async () => {
	try {
		await evaluationStore.fetchEvaluationConfigs(props.workflowId);
	} catch (error) {
		// Non-fatal: the run falls back to a direct run. Warn the user so a
		// missing config doesn't silently produce a config-less run.
		toast.showError(error, locale.baseText('evaluation.listRuns.error.cantFetchConfigs'));
	} finally {
		configsLoading.value = false;
	}
});

async function runTest(runType: 'config' | 'direct' = 'config') {
	try {
		const configId = runType === 'config' ? activeConfigId.value : null;
		// `concurrency` is only sent when available; a plain direct run sends no
		// options at all (undefined) so the request body stays empty.
		const concurrencyOptions = parallelEvalStore.isConcurrencyAvailable
			? { concurrency: concurrencyModel.value }
			: undefined;
		const options =
			configId !== null
				? { ...concurrencyOptions, evaluationConfigId: configId, compileFromConfig: true }
				: concurrencyOptions;
		await evaluationStore.startTestRun(props.workflowId, options);
		telemetry.track('User ran evaluation', {
			workflow_id: props.workflowId,
			run_type: configId !== null ? 'config' : 'direct',
		});
	} catch (error) {
		toast.showError(error, locale.baseText('evaluation.listRuns.error.cantStartTestRun'));
	}

	try {
		await evaluationStore.fetchTestRuns(props.workflowId);
	} catch (error) {
		toast.showError(error, locale.baseText('evaluation.listRuns.error.cantFetchTestRuns'));
	}
}

async function stopTest() {
	if (!runningTestRun.value) {
		return;
	}

	try {
		cancellingTestRun.value = true;
		await evaluationStore.cancelTestRun(runningTestRun.value.workflowId, runningTestRun.value.id);
		// we don't reset cancellingTestRun flag here, because we want the button to stay disabled
		// until the "running" testRun is updated and cancelled in the list of test runs
	} catch (error) {
		toast.showError(error, locale.baseText('evaluation.listRuns.error.cantStopTestRun'));
		cancellingTestRun.value = false;
	}
}

const runs = computed(() => {
	const testRuns = Object.values(evaluationStore.testRunsById ?? {}).filter(
		({ workflowId }) => workflowId === props.workflowId,
	);

	return orderBy(testRuns, (record) => new Date(record.runAt), ['asc']).map((record, index) => ({
		...record,
		index: index + 1,
	}));
});

watch(runningTestRun, (run) => {
	if (!run) {
		// reset to ensure next run can be stopped
		cancellingTestRun.value = false;
	}
});
</script>

<template>
	<div :class="$style.evaluationsView">
		<div :class="$style.header">
			<div :class="$style.headerInner">
				<N8nButton
					v-if="runningTestRun"
					variant="subtle"
					:disabled="cancellingTestRun"
					:class="$style.runOrStopTestButton"
					size="small"
					data-test-id="stop-test-button"
					:label="locale.baseText('evaluation.stopTest')"
					@click="stopTest"
				/>
				<div v-else :class="$style.runTestGroup">
					<!--
						Split-button: solid "Run Test" on the left, caret toggle on the
						right that opens a popover.
						When an evaluation config exists: primary click runs with the
						config; the popover exposes a "Run workflow" option (direct run)
						and optionally the concurrency slider.
						When no config exists: same as before – popover shows only the
						concurrency slider, and the caret is hidden when concurrency is
						also unavailable.
					-->
					<N8nButton
						variant="solid"
						size="small"
						:loading="configsLoading"
						:class="[$style.runTestButton, showRunPopover ? $style.runTestButtonWithCaret : null]"
						data-test-id="run-test-button"
						:label="locale.baseText('evaluation.runTest')"
						@click="runTest()"
					/>
					<N8nPopover
						v-if="showRunPopover"
						v-model:open="popoverOpen"
						side="bottom"
						align="end"
						:side-offset="6"
						:enable-scrolling="false"
					>
						<template #trigger>
							<button
								type="button"
								:class="[$style.caretButton, popoverOpen ? $style.caretButtonOpen : null]"
								:aria-label="locale.baseText('evaluation.runInParallel.popover.ariaLabel')"
								:aria-expanded="popoverOpen"
								data-test-id="parallel-eval-toggle"
							>
								<N8nIcon icon="chevron-down" size="xsmall" />
							</button>
						</template>
						<template #content>
							<div :class="$style.popoverBody" data-test-id="parallel-eval-controls">
								<!-- "Run workflow" option – direct run, only shown when a config exists -->
								<template v-if="activeConfigId !== null">
									<N8nButton
										variant="subtle"
										size="small"
										:label="locale.baseText('evaluation.runWorkflow')"
										data-test-id="run-workflow-direct-button"
										@click="
											runTest('direct');
											popoverOpen = false;
										"
									/>
									<hr
										v-if="parallelEvalStore.isConcurrencyAvailable"
										:class="$style.popoverDivider"
									/>
								</template>
								<!-- Concurrency controls – only shown when concurrency is available -->
								<template v-if="parallelEvalStore.isConcurrencyAvailable">
									<div :class="$style.popoverHeader">
										<span :class="$style.popoverTitle">
											{{ locale.baseText('evaluation.runInParallel.popover.title') }}
										</span>
										<span :class="$style.valuePill" data-test-id="run-in-parallel-mode-label">
											{{ valuePillLabel }}
										</span>
									</div>
									<ConcurrencySlider
										v-model="concurrencyModel"
										:min="1"
										:max="parallelEvalStore.maxConcurrency"
										:step="1"
										show-stops
										:show-tooltip="false"
										:class="$style.concurrencySlider"
										data-test-id="run-in-parallel-concurrency"
									/>
									<div :class="$style.scaleLabels">
										<span>{{
											locale.baseText('evaluation.runInParallel.popover.scaleSequential')
										}}</span>
										<span>{{
											locale.baseText('evaluation.runInParallel.popover.scaleFaster')
										}}</span>
									</div>
									<p :class="$style.popoverHelper">
										{{ locale.baseText('evaluation.runInParallel.popover.helper') }}
									</p>
								</template>
							</div>
						</template>
					</N8nPopover>
				</div>
			</div>
		</div>
		<div :class="$style.wrapper">
			<div :class="$style.content">
				<RunsSection
					v-model:selected-metric="selectedMetric"
					:class="$style.runs"
					:runs="runs"
					:workflow-id="props.workflowId"
				/>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.evaluationsView {
	width: 100%;
}

.content {
	display: flex;
	justify-content: center;
	gap: var(--spacing--md);
	padding-bottom: var(--spacing--md);
}

.header {
	display: flex;
	justify-content: center;
	padding: var(--spacing--md) var(--spacing--lg);
	// Match `.wrapper` so the inner 1024px box anchors at the same left
	// origin as the runs section below (the 58px reserves space for the
	// editor's collapsed sidebar in the wrapper layout).
	padding-left: 58px;
	padding-bottom: 8px;
	position: sticky;
	top: 0;
	left: 0;
	background-color: var(--color--background--light-2);
	z-index: 2;
}

// Inner container: width-capped at the same 1024px as `.runs` and
// horizontally centred via the parent's `justify-content: center`. This
// makes the controls + Run button hug the same horizontal bounds as the
// chart and table below, instead of floating against the viewport edges.
.headerInner {
	display: flex;
	align-items: center;
	width: 100%;
	max-width: 1024px;
}

.runOrStopTestButton {
	white-space: nowrap;
	// Anchor to the right edge of `.headerInner` so the button sits flush
	// with the right edge regardless of which siblings render.
	margin-left: auto;
}

// Split-button container: the Run Test button and the caret toggle live
// inside this wrapper so they visually read as one control. The caret
// borrows the brand colour from the solid button via a thin inset shadow
// rather than a real border, which keeps the seam between the two visually
// soft.
.runTestGroup {
	margin-left: auto;
	display: inline-flex;
	align-items: stretch;
}

.runTestButton {
	white-space: nowrap;
}

// When the caret is present, square off the right edge of the Run Test
// button so the two halves meet cleanly. Hidden state (no caret) falls back
// to the default fully-rounded button.
.runTestButtonWithCaret {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
}

// Match the left-side radius to the Figma split-button (6px) so both halves
// share an identical curve. Only the standalone caret-less variant inherits
// the design-system's default radius.
.runTestGroup .runTestButtonWithCaret {
	border-top-left-radius: 6px;
	border-bottom-left-radius: 6px;
}

.caretButton {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: auto;
	padding: 0;
	border: none;
	border-top-right-radius: 6px;
	border-bottom-right-radius: 6px;
	background-color: var(--background--brand);
	color: #fff;
	cursor: pointer;
	transition:
		background-color var(--duration--snappy) ease,
		transform var(--duration--snappy) ease;
	// Soft separator between the Run Test button and the caret — matches the
	// 1px × 20px white-translucent divider in the Figma spec. Inset shadow
	// rather than a 1px border so the two halves stay visually flush at any
	// zoom level.
	box-shadow: inset 1px 0 0 rgba(255, 255, 255, 0.35);

	&:hover {
		background-color: var(--background--brand--hover);
	}

	&:focus-visible {
		outline: 2px solid var(--background--brand--focus);
		outline-offset: 2px;
	}

	svg {
		transition: transform var(--duration--snappy) ease;
	}
}

// Open state: rotate the caret 180° for an unmistakable open/closed cue.
// The N8nPopover handles the slide-in animation on the content itself.
.caretButtonOpen {
	svg {
		transform: rotate(180deg);
	}
}

.popoverBody {
	display: flex;
	flex-direction: column;
	gap: 14px;
	padding: 16px;
	width: 300px;
	box-sizing: border-box;
	// Override N8nPopover's default 8px radius — Figma calls for 10px on
	// this specific popover. Targets the portaled content node directly so
	// the inherited radius wins.
	border-radius: 10px;
	background-color: var(--background--surface);
}

.popoverDivider {
	border: none;
	border-top: 1px solid var(--border-color);
	margin: 0;
}

.popoverHeader {
	display: flex;
	align-items: center;
	gap: 8px;
}

.popoverTitle {
	font-size: 13px;
	font-weight: var(--font-weight--semibold, 600);
	color: var(--color--text);
}

.valuePill {
	margin-left: auto;
	padding: 2px 8px;
	border-radius: 999px;
	background-color: var(--color--orange-50, #f7ede8);
	color: var(--color--orange-700, #c73d21);
	font-size: 11px;
	font-weight: var(--font-weight--semibold, 600);
	// Tabular numerals so the pill width doesn't jitter as the user drags
	// the slider through different digits.
	font-variant-numeric: tabular-nums;
	line-height: 1;
}

.concurrencySlider {
	width: 100%;
}

.scaleLabels {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 10px;
	color: var(--color--text--tint-1);
}

.popoverHelper {
	margin: 0;
	font-size: 11px;
	line-height: 1.4;
	color: var(--color--text--tint-1);
}

.wrapper {
	padding: 0 var(--spacing--lg);
	padding-left: 58px;
}

.runs {
	width: 100%;
	max-width: 1024px;
}
</style>
