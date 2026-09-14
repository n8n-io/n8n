<script lang="ts" setup>
import {
	N8nButton,
	N8nDialog,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, ref, watch } from 'vue';
import { useThread } from '../instanceAi.store';
import { useInstanceAiDebugStore } from '../instanceAiDebug.store';
import { parseStepSummary } from '@n8n/api-types';
import InstanceAiLlmStepDetail from './InstanceAiLlmStepDetail.vue';
import InstanceAiRunWorkflowCodeSection from './InstanceAiRunWorkflowCodeSection.vue';

const props = defineProps<{
	open: boolean;
}>();

const emit = defineEmits<{ 'update:open': [value: boolean] }>();

const i18n = useI18n();
const debugStore = useInstanceAiDebugStore();
const currentThread = useThread();
const selectedStepNumber = ref<number | null>(null);
const detailPaneRef = ref<HTMLElement | null>(null);
const stepDetailRef = ref<InstanceType<typeof InstanceAiLlmStepDetail> | null>(null);

const steps = computed(() => debugStore.runDebug?.steps ?? []);
const runWorkflowCode = computed(() => debugStore.runDebug?.workflowCode ?? []);
const selectedRunId = computed(() => debugStore.selectedRunId);

const selectedStep = computed(() => {
	if (selectedStepNumber.value === null) return undefined;
	return steps.value.find((step) => step.stepNumber === selectedStepNumber.value);
});

const stepSummaries = computed(() =>
	steps.value.map((step) => ({
		stepNumber: step.stepNumber,
		summary: parseStepSummary(step.input, step.output),
	})),
);

watch(
	() => props.open,
	(isOpen) => {
		if (!isOpen) {
			selectedStepNumber.value = null;
			return;
		}
		selectedStepNumber.value = steps.value[0]?.stepNumber ?? null;
	},
);

watch(
	() => steps.value,
	(nextSteps) => {
		if (!props.open || nextSteps.length === 0) {
			selectedStepNumber.value = null;
			return;
		}
		if (
			selectedStepNumber.value === null ||
			!nextSteps.some((step) => step.stepNumber === selectedStepNumber.value)
		) {
			selectedStepNumber.value = nextSteps[0]?.stepNumber ?? null;
		}
	},
);

function handleOpenChange(open: boolean) {
	emit('update:open', open);
}

function selectStep(stepNumber: number) {
	selectedStepNumber.value = stepNumber;
}

async function scrollDetailToOutput() {
	await nextTick();
	if (!detailPaneRef.value || !stepDetailRef.value) return;
	stepDetailRef.value.scrollToOutput(detailPaneRef.value);
}

watch([selectedStep, () => debugStore.isLoadingRunDebug], ([step, isLoading]) => {
	if (!props.open || !step || isLoading) return;
	void scrollDetailToOutput();
});

async function selectRun(runId: string) {
	if (runId === selectedRunId.value) return;
	await debugStore.loadRunDebug(runId);
	selectedStepNumber.value = debugStore.runDebug?.steps[0]?.stepNumber ?? null;
}

function formatTimestamp(ms: number): string {
	try {
		return new Date(ms).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
	} catch {
		return String(ms);
	}
}

function formatStepCount(count: number): string {
	return i18n.baseText('instanceAi.debug.runDebug.stepCount', {
		interpolate: { count: String(count) },
	});
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="cover"
		data-test-id="instance-ai-llm-steps-modal"
		@update:open="handleOpenChange"
	>
		<div :class="$style.shell">
			<N8nDialogHeader :class="$style.header">
				<div :class="$style.headerMain">
					<div :class="$style.headerTitleRow">
						<N8nDialogTitle>
							{{ i18n.baseText('instanceAi.debug.runDebug.stepsModalTitle') }}
						</N8nDialogTitle>
						<span v-if="steps.length > 0" :class="$style.stepCount">
							{{ formatStepCount(steps.length) }}
						</span>
					</div>
					<N8nText v-if="selectedRunId" size="small" color="text-light" :class="$style.runId">
						{{ selectedRunId }}
					</N8nText>
				</div>
			</N8nDialogHeader>

			<div v-if="debugStore.threadDebugRuns.length === 0" :class="$style.emptyState">
				{{ i18n.baseText('instanceAi.debug.runDebug.noRuns') }}
			</div>

			<div v-else :class="$style.layout">
				<aside :class="[$style.sidebar, $style.runsSidebar]">
					<div :class="$style.sidebarHeader">
						{{ i18n.baseText('instanceAi.debug.runDebug.runs') }}
						<span :class="$style.sidebarCount">{{ debugStore.threadDebugRuns.length }}</span>
					</div>
					<div :class="$style.runList">
						<button
							v-for="(run, index) in debugStore.threadDebugRuns"
							:key="run.runId"
							type="button"
							:class="[$style.runButton, selectedRunId === run.runId && $style.runButtonSelected]"
							data-test-id="instance-ai-llm-steps-modal-run"
							@click="selectRun(run.runId)"
						>
							<div :class="$style.runTopRow">
								<span :class="$style.runNumber">{{ index + 1 }}</span>
								<div :class="$style.runTopRowRight">
									<span v-if="run.runId === currentThread.activeRunId" :class="$style.currentBadge">
										{{ i18n.baseText('instanceAi.debug.threads.current') }}
									</span>
									<span :class="$style.runIdShort">{{ run.runId.slice(0, 12) }}</span>
								</div>
							</div>
							<span v-if="run.label" :class="$style.runLabel">{{ run.label }}</span>
							<span :class="$style.runMeta">
								{{ formatStepCount(run.stepCount) }} · {{ formatTimestamp(run.startedAt) }}
							</span>
						</button>
					</div>
				</aside>

				<aside :class="[$style.sidebar, $style.stepsSidebar]">
					<div :class="$style.sidebarHeader">
						{{ i18n.baseText('instanceAi.debug.tab.llmSteps') }}
						<span :class="$style.sidebarCount">{{ steps.length }}</span>
					</div>
					<div v-if="steps.length === 0" :class="$style.sidebarEmpty">
						{{ i18n.baseText('instanceAi.debug.runDebug.noSteps') }}
					</div>
					<div v-else :class="$style.stepList">
						<button
							v-for="{ stepNumber, summary } in stepSummaries"
							:key="stepNumber"
							type="button"
							:class="[
								$style.stepButton,
								selectedStepNumber === stepNumber && $style.stepButtonSelected,
							]"
							@click="selectStep(stepNumber)"
						>
							<div :class="$style.stepTopRow">
								<span :class="$style.stepNumber">{{ stepNumber + 1 }}</span>
								<span v-if="summary.finishReason" :class="$style.finishReason">
									{{ summary.finishReason }}
								</span>
							</div>
							<span v-if="summary.toolNames.length > 0" :class="$style.stepTools">
								{{ summary.toolNames.join(', ') }}
							</span>
							<span v-else-if="summary.messagePreview" :class="$style.stepPreview">
								{{ summary.messagePreview }}
							</span>
							<span v-if="summary.usageLabel" :class="$style.stepUsage">
								{{ summary.usageLabel }}
							</span>
						</button>
					</div>
				</aside>

				<div ref="detailPaneRef" :class="$style.detail">
					<div v-if="debugStore.isLoadingRunDebug" :class="$style.loadingState">
						<N8nIcon icon="spinner" color="primary" spin size="small" />
					</div>
					<div v-else-if="selectedStep || runWorkflowCode.length > 0" :class="$style.detailContent">
						<InstanceAiLlmStepDetail
							v-if="selectedStep"
							ref="stepDetailRef"
							:input="selectedStep.input"
							:output="selectedStep.output"
							:run-steps="steps"
							:workflow-code="runWorkflowCode"
						/>
						<InstanceAiRunWorkflowCodeSection
							v-if="runWorkflowCode.length > 0"
							:snapshots="runWorkflowCode"
							:show-divider="Boolean(selectedStep)"
						/>
					</div>
					<div v-else :class="$style.emptyState">
						{{ i18n.baseText('instanceAi.debug.runDebug.noStepDetail') }}
					</div>
				</div>
			</div>

			<div :class="$style.footer">
				<N8nButton variant="outline" size="medium" @click="handleOpenChange(false)">
					{{ i18n.baseText('generic.close') }}
				</N8nButton>
			</div>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
.shell {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	max-height: 100%;
	overflow: hidden;
	gap: var(--spacing--xs);
}

.header {
	flex-shrink: 0;
	margin: 0;
	padding-right: var(--spacing--xl);
}

.headerMain {
	min-width: 0;
}

.headerTitleRow {
	display: flex;
	align-items: baseline;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.runId {
	display: block;
	margin-top: var(--spacing--5xs);
	font-family: monospace;
}

.stepCount {
	flex-shrink: 0;
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.layout {
	flex: 1;
	min-height: 0;
	display: grid;
	grid-template-columns: 220px 220px minmax(0, 1fr);
	grid-template-rows: minmax(0, 1fr);
	gap: var(--spacing--xs);
	overflow: hidden;
}

.sidebar {
	display: flex;
	flex-direction: column;
	min-height: 0;
	padding: var(--spacing--4xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--background--shade-1);
}

.sidebarHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.sidebarCount {
	font-family: monospace;
	font-weight: var(--font-weight--regular);
}

.runList,
.stepList {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	overflow-y: auto;
	min-height: 0;
}

.sidebarEmpty {
	padding: var(--spacing--2xs);
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.runButton,
.stepButton {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	width: 100%;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: 1px solid transparent;
	border-radius: var(--radius);
	background: transparent;
	cursor: pointer;
	text-align: left;
	transition:
		background-color var(--duration--fast) ease,
		border-color var(--duration--fast) ease;

	&:hover {
		background: var(--background--surface);
		border-color: var(--color--foreground--tint-2);
	}
}

.runButtonSelected,
.stepButtonSelected {
	background: var(--background--surface);
	border-color: var(--color--foreground--tint-2);
	border-left: 2px solid var(--color--primary);

	&:hover {
		background: var(--background--surface);
	}
}

.runTopRow,
.stepTopRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	width: 100%;
}

.runTopRowRight {
	display: inline-flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.runNumber,
.stepNumber {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: var(--spacing--sm);
	height: var(--spacing--sm);
	border-radius: var(--radius--xl);
	background: var(--color--foreground--tint-2);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.runButtonSelected .runNumber,
.stepButtonSelected .stepNumber {
	background: color-mix(in srgb, var(--color--primary) 12%, var(--color--foreground--tint-2));
}

.currentBadge {
	padding: 0 var(--spacing--4xs);
	border-radius: var(--radius--sm);
	font-size: var(--font-size--3xs);
	background: color-mix(in srgb, var(--color--success) 15%, transparent);
	color: var(--color--success);
}

.runIdShort {
	font-family: monospace;
	font-size: var(--font-size--3xs);
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.runLabel {
	width: 100%;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--lg);
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.runMeta,
.finishReason,
.stepTools,
.stepPreview,
.stepUsage {
	width: 100%;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--lg);
	color: var(--color--text--tint-1);
}

.stepTools {
	font-family: monospace;
	color: var(--color--text);
}

.detail {
	min-height: 0;
	height: 100%;
	overflow-x: hidden;
	overflow-y: auto;
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
}

.detailContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.loadingState {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: var(--spacing--2xl);
	color: var(--color--text--tint-1);
}

.emptyState {
	padding: var(--spacing--md);
	text-align: center;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.footer {
	display: flex;
	flex-shrink: 0;
	justify-content: flex-end;
	padding-top: var(--spacing--4xs);
}
</style>
