<script setup lang="ts">
import type { InstanceAiEvalNodeResult } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nSpinner,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ElDialog } from 'element-plus';
import { computed, ref, watch } from 'vue';

import { useScenarioRunnerStore } from '../scenarioRunner.store';
import ScenarioNodeResult from './ScenarioNodeResult.vue';

const props = defineProps<{
	modelValue: boolean;
	workflowId: string;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
}>();

const i18n = useI18n();
const store = useScenarioRunnerStore();

const MAX_SCENARIO_LENGTH = 2000;

const scenarioText = ref(store.lastScenarioHints);
const showGlobalContext = ref(false);
const editingScenario = ref(!store.hasResult);

const charCount = computed(() => scenarioText.value.length);
const overLimit = computed(() => charCount.value > MAX_SCENARIO_LENGTH);

const canRun = computed(() => !store.isRunning && !overLimit.value);
const canClose = computed(() => !store.isRunning);

const orderedNodeResults = computed(() => {
	if (!store.result) return [];
	return Object.entries(store.result.nodeResults)
		.map(([name, result]) => ({ name, result: result as InstanceAiEvalNodeResult }))
		.sort((a, b) => (a.result.startTime ?? 0) - (b.result.startTime ?? 0));
});

const warnings = computed(() => store.result?.hints.warnings ?? []);
const errors = computed(() => store.result?.errors ?? []);

const nodesWithConfigIssues = computed(() =>
	orderedNodeResults.value.filter(
		({ result }) => result.configIssues && Object.keys(result.configIssues).length > 0,
	),
);

const mockedCallCount = computed(() =>
	orderedNodeResults.value.reduce(
		(total, { result }) => total + (result.interceptedRequests?.length ?? 0),
		0,
	),
);

const issueCount = computed(
	() => warnings.value.length + errors.value.length + nodesWithConfigIssues.value.length,
);

type VerdictKind = 'passed' | 'passedWithIssues' | 'failed';

const verdictKind = computed<VerdictKind>(() => {
	if (!store.result) return 'passed';
	if (!store.result.success || errors.value.length > 0) return 'failed';
	if (issueCount.value > 0) return 'passedWithIssues';
	return 'passed';
});

const verdictIcon = computed(() => {
	switch (verdictKind.value) {
		case 'passed':
			return 'circle-check';
		case 'passedWithIssues':
			return 'triangle-alert';
		case 'failed':
			return 'circle-x';
	}
});

const verdictColor = computed(() => {
	switch (verdictKind.value) {
		case 'passed':
			return 'success';
		case 'passedWithIssues':
			return 'warning';
		case 'failed':
			return 'danger';
	}
});

const verdictLabel = computed(() => i18n.baseText(`scenarioRunner.verdict.${verdictKind.value}`));

const scenarioSummary = computed(() => {
	const text = store.lastScenarioHints?.trim() ?? '';
	if (!text) return i18n.baseText('scenarioRunner.summary.empty');
	return text;
});

function close() {
	if (!canClose.value) return;
	emit('update:modelValue', false);
}

async function run() {
	if (!canRun.value) return;
	editingScenario.value = false;
	await store.runScenario(props.workflowId, scenarioText.value.trim());
}

function editScenario() {
	editingScenario.value = true;
}

watch(
	() => props.modelValue,
	(isOpen) => {
		if (isOpen) {
			scenarioText.value = store.lastScenarioHints;
			editingScenario.value = !store.hasResult;
			showGlobalContext.value = false;
		}
	},
);
</script>

<template>
	<ElDialog
		:model-value="modelValue"
		:close-on-click-modal="canClose"
		:close-on-press-escape="canClose"
		:show-close="false"
		:width="720"
		append-to-body
		aria-labelledby="scenario-runner-title"
		custom-class="scenario-runner-dialog"
		@update:model-value="(val: boolean) => emit('update:modelValue', val)"
	>
		<div :class="$style.container">
			<header :class="$style.header">
				<div>
					<N8nText id="scenario-runner-title" tag="h2" bold size="large" color="text-dark">
						{{ i18n.baseText('scenarioRunner.title') }}
					</N8nText>
					<N8nText tag="p" size="small" color="text-light" :class="$style.subtitle">
						{{ i18n.baseText('scenarioRunner.subtitle') }}
					</N8nText>
				</div>
				<N8nIconButton
					icon="x"
					type="tertiary"
					size="small"
					:disabled="!canClose"
					:title="i18n.baseText('generic.close')"
					data-test-id="scenario-runner-close"
					@click="close"
				/>
			</header>

			<section v-if="store.errorMessage && !store.isRunning" :class="$style.section">
				<N8nCallout theme="danger" icon="triangle-alert">
					{{ i18n.baseText('scenarioRunner.error.requestFailed') }}
					<template #trailingContent>
						<N8nText size="xsmall" color="text-base">{{ store.errorMessage }}</N8nText>
					</template>
				</N8nCallout>
			</section>

			<section v-if="editingScenario || !store.hasResult" :class="$style.inputSection">
				<label :class="$style.label" for="scenario-runner-textarea">
					<N8nText bold size="small" color="text-dark">
						{{ i18n.baseText('scenarioRunner.input.label') }}
					</N8nText>
					<N8nText size="xsmall" color="text-light" tag="span">
						{{ i18n.baseText('scenarioRunner.input.optional') }}
					</N8nText>
				</label>
				<N8nInput
					id="scenario-runner-textarea"
					v-model="scenarioText"
					type="textarea"
					:rows="4"
					:placeholder="i18n.baseText('scenarioRunner.input.placeholder')"
					:maxlength="MAX_SCENARIO_LENGTH"
					:disabled="store.isRunning"
					data-test-id="scenario-runner-textarea"
				/>
				<div :class="$style.inputMeta">
					<N8nText size="xsmall" color="text-light">
						{{ i18n.baseText('scenarioRunner.input.helper') }}
					</N8nText>
					<N8nText
						size="xsmall"
						:color="overLimit ? 'danger' : 'text-light'"
						:class="$style.counter"
					>
						{{ charCount }} / {{ MAX_SCENARIO_LENGTH }}
					</N8nText>
				</div>
			</section>

			<section v-else :class="$style.inputCollapsed">
				<div :class="$style.inputCollapsedLabel">
					<N8nText bold size="xsmall" color="text-light">
						{{ i18n.baseText('scenarioRunner.summary.label') }}
					</N8nText>
					<N8nButton
						type="tertiary"
						size="mini"
						icon="pencil"
						:label="i18n.baseText('scenarioRunner.summary.edit')"
						@click="editScenario"
					/>
				</div>
				<N8nText size="small" color="text-base" :class="$style.inputCollapsedText">
					{{ scenarioSummary }}
				</N8nText>
			</section>

			<footer :class="$style.actionBar">
				<N8nButton
					type="secondary"
					size="small"
					:disabled="!canClose"
					:label="i18n.baseText('generic.close')"
					@click="close"
				/>
				<N8nButton
					type="primary"
					size="small"
					:loading="store.isRunning"
					:disabled="!canRun"
					:label="
						store.hasResult
							? i18n.baseText('scenarioRunner.rerunButton')
							: i18n.baseText('scenarioRunner.runButton')
					"
					data-test-id="scenario-runner-run"
					@click="run"
				/>
			</footer>

			<section v-if="store.isRunning" :class="$style.runningBlock">
				<N8nSpinner size="small" />
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('scenarioRunner.running') }}
				</N8nText>
			</section>

			<section
				v-if="store.result && !store.isRunning"
				:class="[$style.verdict, $style[`verdict_${verdictKind}`]]"
			>
				<N8nIcon :icon="verdictIcon" :color="verdictColor" size="medium" />
				<div :class="$style.verdictText">
					<N8nText bold size="medium" :color="verdictColor">
						{{ verdictLabel }}
					</N8nText>
					<div :class="$style.verdictStats">
						<N8nText v-if="store.durationMs !== null" size="xsmall" color="text-light" tag="span">
							{{
								i18n.baseText('scenarioRunner.verdict.duration', {
									interpolate: { s: (store.durationMs / 1000).toFixed(1) },
								})
							}}
						</N8nText>
						<N8nText size="xsmall" color="text-xlight" tag="span">·</N8nText>
						<N8nText size="xsmall" color="text-light" tag="span">
							{{
								i18n.baseText('scenarioRunner.verdict.nodesRan', {
									interpolate: { count: orderedNodeResults.length },
								})
							}}
						</N8nText>
						<template v-if="mockedCallCount > 0">
							<N8nText size="xsmall" color="text-xlight" tag="span">·</N8nText>
							<N8nText size="xsmall" color="text-light" tag="span">
								{{
									i18n.baseText('scenarioRunner.verdict.mockedCalls', {
										interpolate: { count: mockedCallCount },
									})
								}}
							</N8nText>
						</template>
						<template v-if="issueCount > 0">
							<N8nText size="xsmall" color="text-xlight" tag="span">·</N8nText>
							<N8nText size="xsmall" color="warning" tag="span">
								{{
									i18n.baseText('scenarioRunner.verdict.issues', {
										interpolate: { count: issueCount },
									})
								}}
							</N8nText>
						</template>
					</div>
				</div>
			</section>

			<section v-if="store.result && !store.isRunning" :class="$style.resultsBlock">
				<details v-if="issueCount > 0" :class="$style.details" :open="issueCount > 0">
					<summary :class="$style.detailsSummary">
						<N8nIcon icon="chevron-right" size="small" :class="$style.detailsChevron" />
						<N8nText bold size="small" color="text-dark">
							{{ i18n.baseText('scenarioRunner.issues.header') }}
						</N8nText>
						<N8nText size="xsmall" color="text-light">
							{{
								i18n.baseText('scenarioRunner.issues.count', {
									interpolate: { count: issueCount },
								})
							}}
						</N8nText>
					</summary>
					<div :class="$style.issuesList">
						<div v-for="(err, i) in errors" :key="`err-${i}`" :class="$style.issueRow">
							<N8nIcon icon="circle-x" color="danger" size="small" />
							<N8nText size="small" color="text-base">{{ err }}</N8nText>
						</div>
						<div v-for="(w, i) in warnings" :key="`warn-${i}`" :class="$style.issueRow">
							<N8nIcon icon="triangle-alert" color="warning" size="small" />
							<N8nText size="small" color="text-base">{{ w }}</N8nText>
						</div>
						<div
							v-for="{ name, result } in nodesWithConfigIssues"
							:key="`cfg-${name}`"
							:class="$style.issueRow"
						>
							<N8nIcon icon="triangle-alert" color="warning" size="small" />
							<div :class="$style.issueText">
								<N8nText size="small" color="text-base">
									{{
										i18n.baseText('scenarioRunner.issues.configPrefix', {
											interpolate: { name },
										})
									}}
								</N8nText>
								<N8nText size="xsmall" color="text-light">
									{{ Object.keys(result.configIssues ?? {}).join(', ') }}
								</N8nText>
							</div>
						</div>
					</div>
				</details>

				<details :class="$style.details" open>
					<summary :class="$style.detailsSummary">
						<N8nIcon icon="chevron-right" size="small" :class="$style.detailsChevron" />
						<N8nText bold size="small" color="text-dark">
							{{ i18n.baseText('scenarioRunner.trace.header') }}
						</N8nText>
						<N8nText size="xsmall" color="text-light">
							{{
								i18n.baseText('scenarioRunner.trace.count', {
									interpolate: { count: orderedNodeResults.length },
								})
							}}
						</N8nText>
					</summary>
					<div :class="$style.nodesList">
						<ScenarioNodeResult
							v-for="{ name, result } in orderedNodeResults"
							:key="name"
							:node-name="name"
							:result="result"
						/>
					</div>
				</details>

				<details v-if="store.result.hints.globalContext" :class="$style.details">
					<summary :class="$style.detailsSummary">
						<N8nIcon icon="chevron-right" size="small" :class="$style.detailsChevron" />
						<N8nText bold size="small" color="text-dark">
							{{ i18n.baseText('scenarioRunner.technical.header') }}
						</N8nText>
					</summary>
					<pre :class="$style.contextText">{{ store.result.hints.globalContext }}</pre>
				</details>
			</section>
		</div>
	</ElDialog>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-height: 80vh;
	overflow: hidden;
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.subtitle {
	margin-top: var(--spacing--3xs);
}

.verdict {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius);
	background-color: var(--color--background--light-2);
	border: var(--border);
	border-left-width: 3px;
}

.verdict_passed {
	border-left-color: var(--color--success);
}

.verdict_passedWithIssues {
	border-left-color: var(--color--warning);
}

.verdict_failed {
	border-left-color: var(--color--danger);
}

.verdictText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.verdictStats {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	flex-wrap: wrap;
	line-height: var(--line-height--md);
}

.inputSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.label {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
}

.inputMeta {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.counter {
	font-variant-numeric: tabular-nums;
}

.inputCollapsed {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background-color: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius);
}

.inputCollapsedLabel {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.inputCollapsedText {
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	line-clamp: 2;
}

.actionBar {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.runningBlock {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	background-color: var(--color--background--light-2);
	border-radius: var(--radius);
	border: var(--border);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.resultsBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	overflow-y: auto;
	padding-top: var(--spacing--2xs);
	border-top: var(--border);
}

.details {
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background);
	overflow: hidden;

	&[open] .detailsChevron {
		transform: rotate(90deg);
	}
}

.detailsSummary {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	cursor: pointer;
	list-style: none;
	user-select: none;

	&::-webkit-details-marker {
		display: none;
	}

	&:hover {
		background-color: var(--color--background--light-2);
	}
}

.detailsChevron {
	flex-shrink: 0;
	transition: transform 0.15s ease;
}

.issuesList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--xs);
	border-top: var(--border);
}

.issueRow {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.issueText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.nodesList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--xs);
	border-top: var(--border);
}

.contextText {
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
	margin: 0;
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--xs);
	white-space: pre-wrap;
	word-break: break-word;
	color: var(--color--text);
	border-top: var(--border);
	background-color: var(--color--background--light-2);
}
</style>

<style lang="scss">
.scenario-runner-dialog {
	.el-dialog__header {
		display: none;
	}

	.el-dialog__body {
		padding: var(--spacing--lg);
	}
}
</style>
