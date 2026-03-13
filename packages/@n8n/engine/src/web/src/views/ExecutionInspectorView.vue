<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import StatusBadge from '../components/StatusBadge.vue';
import StepCard from '../components/StepCard.vue';
import JsonViewer from '../components/JsonViewer.vue';
import ExecutionGraph from '../components/ExecutionGraph.vue';
import { useExecutionStore } from '../stores/execution.store';
import type { WorkflowGraph } from '../stores/workflow.store';

const route = useRoute();
const router = useRouter();
const executionStore = useExecutionStore();

const executionId = computed(() => route.params.id as string);
let eventSource: EventSource | null = null;
const showResult = ref(false);
const showError = ref(false);
const showEvents = ref(false);
const showGraph = ref(true);
const autoRefreshInterval = ref<ReturnType<typeof setInterval> | null>(null);
const workflowGraph = ref<WorkflowGraph | null>(null);
const selectedStepId = ref<string | null>(null);
const expandedStepIds = ref<Set<string>>(new Set());
const stepsSectionRef = ref<HTMLElement | null>(null);

const isTerminal = computed(() => {
	const status = executionStore.currentExecution?.status;
	return status === 'completed' || status === 'failed' || status === 'cancelled';
});

const isRunning = computed(() => {
	return executionStore.currentExecution?.status === 'running';
});

const isPaused = computed(() => {
	return executionStore.currentExecution?.status === 'paused';
});

const isWaiting = computed(() => {
	return executionStore.currentExecution?.status === 'waiting';
});

const timingParts = computed(() => {
	const exec = executionStore.currentExecution;
	if (!exec) return [];
	const parts: { label: string; value: string }[] = [];
	if (exec.durationMs !== null && exec.durationMs !== undefined) {
		parts.push({ label: 'Total', value: formatMs(exec.durationMs) });
	}
	if (exec.computeMs !== null && exec.computeMs !== undefined) {
		parts.push({ label: 'Compute', value: formatMs(exec.computeMs) });
	}
	if (exec.waitMs !== null && exec.waitMs !== undefined) {
		parts.push({ label: 'Wait', value: formatMs(exec.waitMs) });
	}
	return parts;
});

onMounted(async () => {
	executionStore.clearEvents();
	await Promise.all([
		executionStore.fetchExecution(executionId.value),
		executionStore.fetchSteps(executionId.value),
	]);

	// Fetch the workflow graph for the pinned version
	if (executionStore.currentExecution) {
		const { workflowId, workflowVersion } = executionStore.currentExecution;
		try {
			const res = await fetch(`/api/workflows/${workflowId}?version=${workflowVersion}`);
			if (res.ok) {
				const workflow = await res.json();
				workflowGraph.value = workflow.graph ?? null;
			}
		} catch {
			// Graph is optional; silently ignore fetch failures
		}
	}

	// Subscribe to SSE for live updates
	eventSource = executionStore.subscribeSSE(executionId.value);

	// Also poll periodically for non-SSE environments
	autoRefreshInterval.value = setInterval(async () => {
		if (!isTerminal.value) {
			await executionStore.fetchExecution(executionId.value);
			await executionStore.fetchSteps(executionId.value);
		}
	}, 3000);
});

onUnmounted(() => {
	if (eventSource) {
		eventSource.close();
		eventSource = null;
	}
	if (autoRefreshInterval.value) {
		clearInterval(autoRefreshInterval.value);
		autoRefreshInterval.value = null;
	}
});

// Stop polling when execution completes
watch(isTerminal, (terminal) => {
	if (terminal) {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
		if (autoRefreshInterval.value) {
			clearInterval(autoRefreshInterval.value);
			autoRefreshInterval.value = null;
		}
	}
});

async function handleCancel() {
	await executionStore.cancelExecution(executionId.value);
}

async function handlePause() {
	await executionStore.pauseExecution(executionId.value);
}

async function handleResume() {
	await executionStore.resumeExecution(executionId.value);
}

async function handleApprove(stepId: string, approved: boolean) {
	const step = executionStore.steps.find((s) => s.id === stepId);
	if (step?.status === 'suspended') {
		await executionStore.resumeAgentStep(stepId, { approved });
	} else {
		await executionStore.approveStep(stepId, approved);
	}
	await executionStore.fetchSteps(executionId.value);
}

async function handleDelete() {
	if (!confirm('Delete this execution and all its step data?')) return;
	await executionStore.deleteExecution(executionId.value);
	router.push('/');
}

function goToWorkflow() {
	const wfId = executionStore.currentExecution?.workflowId;
	if (wfId) {
		void router.push({ name: 'workflow-editor', params: { id: wfId } });
	}
}

function handleSelectStep(stepId: string) {
	selectedStepId.value = stepId;
	// Expand the corresponding StepCard
	expandedStepIds.value.add(stepId);

	// Scroll to the StepCard in the timeline
	void nextTick(() => {
		const el = stepsSectionRef.value?.querySelector(`[data-step-id="${stepId}"]`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	});
}

function isStepExpanded(stepId: string): boolean {
	return expandedStepIds.value.has(stepId);
}

function handleStepExpandUpdate(stepId: string, value: boolean) {
	if (value) {
		expandedStepIds.value.add(stepId);
	} else {
		expandedStepIds.value.delete(stepId);
	}
}

function formatMs(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	const mins = Math.floor(ms / 60000);
	const secs = ((ms % 60000) / 1000).toFixed(0);
	return `${mins}m ${secs}s`;
}

function formatDateTime(dateString: string | null): string {
	if (!dateString) return '-';
	return new Date(dateString).toLocaleString();
}
</script>

<template>
	<div :class="$style.page">
		<!-- Loading -->
		<div
			v-if="executionStore.loading && !executionStore.currentExecution"
			:class="$style.loadingPage"
		>
			<div :class="$style.spinner" />
			Loading execution...
		</div>

		<!-- Error -->
		<div
			v-else-if="executionStore.error && !executionStore.currentExecution"
			:class="$style.errorPage"
		>
			<h2>Failed to load execution</h2>
			<p>{{ executionStore.error }}</p>
			<button :class="[$style.btn, $style.btnGhost]" @click="$router.push('/')">
				Back to Workflows
			</button>
		</div>

		<!-- Execution inspector -->
		<template v-else-if="executionStore.currentExecution">
			<!-- Header -->
			<div :class="$style.header">
				<div :class="$style.headerTop">
					<div :class="$style.headerLeft">
						<button :class="$style.backBtn" @click="goToWorkflow" title="Back to workflow">
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polyline points="15 18 9 12 15 6" />
							</svg>
							Workflow
						</button>
						<h1 :class="$style.title">Execution</h1>
						<code :class="$style.execId">{{ executionStore.currentExecution.id }}</code>
					</div>
					<div :class="$style.headerRight">
						<StatusBadge :status="executionStore.currentExecution.status" />
					</div>
				</div>

				<!-- Meta row -->
				<div :class="$style.metaRow">
					<div :class="$style.metaItem">
						<span :class="$style.metaLabel">Workflow</span>
						<button :class="$style.metaLink" @click="goToWorkflow">
							{{ executionStore.currentExecution.workflowId.slice(0, 12) }}...
						</button>
					</div>
					<div :class="$style.metaItem">
						<span :class="$style.metaLabel">Version</span>
						<span :class="$style.metaValuePill"
							>v{{ executionStore.currentExecution.workflowVersion }}</span
						>
					</div>
					<div :class="$style.metaItem">
						<span :class="$style.metaLabel">Mode</span>
						<span :class="$style.metaValue">{{ executionStore.currentExecution.mode }}</span>
					</div>
					<div :class="$style.metaItem">
						<span :class="$style.metaLabel">Started</span>
						<span :class="$style.metaValue">{{
							formatDateTime(executionStore.currentExecution.startedAt)
						}}</span>
					</div>
					<div v-if="executionStore.currentExecution.completedAt" :class="$style.metaItem">
						<span :class="$style.metaLabel">Completed</span>
						<span :class="$style.metaValue">{{
							formatDateTime(executionStore.currentExecution.completedAt)
						}}</span>
					</div>
				</div>

				<!-- Timing breakdown -->
				<div v-if="timingParts.length" :class="$style.timingBar">
					<div v-for="part in timingParts" :key="part.label" :class="$style.timingItem">
						<span :class="$style.timingLabel">{{ part.label }}</span>
						<span :class="$style.timingValue">{{ part.value }}</span>
					</div>
				</div>

				<!-- Action buttons -->
				<div :class="$style.actionBar">
					<template v-if="!isTerminal">
						<button v-if="isRunning" :class="[$style.btn, $style.btnDanger]" @click="handleCancel">
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<rect x="3" y="3" width="18" height="18" rx="2" />
							</svg>
							Cancel
						</button>
						<button v-if="isRunning" :class="[$style.btn, $style.btnWarning]" @click="handlePause">
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<rect x="6" y="4" width="4" height="16" />
								<rect x="14" y="4" width="4" height="16" />
							</svg>
							Pause
						</button>
						<button
							v-if="isPaused || isWaiting"
							:class="[$style.btn, $style.btnPrimary]"
							@click="handleResume"
						>
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polygon points="5 3 19 12 5 21 5 3" />
							</svg>
							Resume
						</button>
						<span :class="$style.liveIndicator">
							<span :class="$style.liveDot" />
							Live
						</span>
					</template>
					<template v-else>
						<div :class="$style.actionBarSpacer" />
						<button :class="[$style.btn, $style.btnDangerGhost]" @click="handleDelete">
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polyline points="3 6 5 6 21 6" />
								<path
									d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
								/>
							</svg>
							Delete
						</button>
					</template>
				</div>
			</div>

			<!-- Workflow Graph -->
			<div v-if="workflowGraph" :class="$style.graphSection">
				<button :class="$style.graphToggle" @click="showGraph = !showGraph">
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="18" cy="5" r="3" />
						<circle cx="6" cy="12" r="3" />
						<circle cx="18" cy="19" r="3" />
						<line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
						<line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
					</svg>
					Workflow Graph
					<span :class="[$style.chevron, showGraph ? $style.chevronUp : '']">&#9662;</span>
				</button>
				<div v-if="showGraph" :class="$style.graphContainer">
					<ExecutionGraph
						:graph="workflowGraph"
						:steps="executionStore.steps"
						:selected-step-id="selectedStepId"
						@select-step="handleSelectStep"
					/>
				</div>
			</div>

			<!-- Content area -->
			<div :class="$style.content">
				<!-- Steps timeline -->
				<div ref="stepsSectionRef" :class="$style.stepsSection">
					<div :class="$style.sectionHeader">
						<h2 :class="$style.sectionTitle">Steps</h2>
						<span :class="$style.stepCount">{{ executionStore.steps.length }}</span>
					</div>

					<div v-if="!executionStore.steps.length" :class="$style.emptySteps">
						<svg
							width="32"
							height="32"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							:class="$style.emptyIcon"
						>
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</svg>
						<p>No steps recorded yet</p>
					</div>

					<div :class="$style.stepsList">
						<div
							v-for="(step, idx) in executionStore.steps"
							:key="step.id"
							:class="$style.stepWrapper"
						>
							<!-- Timeline connector -->
							<div :class="$style.timeline">
								<div
									:class="[
										$style.timelineDot,
										step.status === 'completed' ? $style.timelineDotSuccess : '',
										step.status === 'failed' ? $style.timelineDotDanger : '',
										step.status === 'running' ? $style.timelineDotWarning : '',
									]"
								/>
								<div v-if="idx < executionStore.steps.length - 1" :class="$style.timelineLine" />
							</div>
							<div :class="$style.stepContent">
								<StepCard
									:step="step"
									:expanded="isStepExpanded(step.stepId)"
									@update:expanded="handleStepExpandUpdate(step.stepId, $event)"
									@approve="handleApprove"
								/>
							</div>
						</div>
					</div>
				</div>

				<!-- Sidebar: Result/Error/Events -->
				<div :class="$style.sidebar">
					<!-- Result -->
					<div v-if="executionStore.currentExecution.result" :class="$style.sidebarCard">
						<button :class="$style.sidebarCardHeader" @click="showResult = !showResult">
							<span :class="$style.sidebarCardTitle">
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
								Result
							</span>
							<span :class="[$style.chevron, showResult ? $style.chevronUp : '']">&#9662;</span>
						</button>
						<div v-if="showResult" :class="$style.sidebarCardBody">
							<JsonViewer :data="executionStore.currentExecution.result" max-height="300px" />
						</div>
					</div>

					<!-- Error -->
					<div
						v-if="executionStore.currentExecution.error"
						:class="[$style.sidebarCard, $style.sidebarCardError]"
					>
						<button :class="$style.sidebarCardHeader" @click="showError = !showError">
							<span :class="$style.sidebarCardTitle">
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<circle cx="12" cy="12" r="10" />
									<line x1="15" y1="9" x2="9" y2="15" />
									<line x1="9" y1="9" x2="15" y2="15" />
								</svg>
								Error
							</span>
							<span :class="[$style.chevron, showError ? $style.chevronUp : '']">&#9662;</span>
						</button>
						<div v-if="showError" :class="$style.sidebarCardBody">
							<JsonViewer :data="executionStore.currentExecution.error" max-height="300px" />
						</div>
					</div>

					<!-- Resume info -->
					<div v-if="executionStore.currentExecution.resumeAfter" :class="$style.sidebarCard">
						<div :class="$style.sidebarCardHeader">
							<span :class="$style.sidebarCardTitle">
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<circle cx="12" cy="12" r="10" />
									<polyline points="12 6 12 12 16 14" />
								</svg>
								Resume After
							</span>
						</div>
						<div :class="$style.sidebarCardBody">
							<p :class="$style.resumeTime">
								{{ formatDateTime(executionStore.currentExecution.resumeAfter) }}
							</p>
						</div>
					</div>

					<!-- Events log -->
					<div :class="$style.sidebarCard">
						<button :class="$style.sidebarCardHeader" @click="showEvents = !showEvents">
							<span :class="$style.sidebarCardTitle">
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
									<polyline points="14 2 14 8 20 8" />
									<line x1="16" y1="13" x2="8" y2="13" />
									<line x1="16" y1="17" x2="8" y2="17" />
									<polyline points="10 9 9 9 8 9" />
								</svg>
								Event Log
							</span>
							<span :class="$style.eventCount">{{ executionStore.events.length }}</span>
							<span :class="[$style.chevron, showEvents ? $style.chevronUp : '']">&#9662;</span>
						</button>
						<div v-if="showEvents" :class="$style.sidebarCardBody">
							<div v-if="!executionStore.events.length" :class="$style.emptyEvents">
								No events received
							</div>
							<div :class="$style.eventsList">
								<div
									v-for="(event, idx) in [...executionStore.events].reverse().slice(0, 50)"
									:key="idx"
									:class="$style.eventItem"
								>
									<code :class="$style.eventType">{{ event.type }}</code>
									<span v-if="event.stepId" :class="$style.eventDetail">
										{{ event.stepId }}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>

<style module>
.page {
	display: flex;
	flex-direction: column;
	height: calc(100vh - 56px);
	overflow: hidden;
}

.loadingPage,
.errorPage {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing-md);
	flex: 1;
	color: var(--color-text-lighter);
}

.spinner {
	width: 24px;
	height: 24px;
	border: 2px solid var(--color-border);
	border-top-color: var(--color-primary);
	border-radius: 50%;
	animation: spin 0.6s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.errorPage h2 {
	color: var(--color-danger);
}

/* Header */
.header {
	background: var(--color-bg);
	border-bottom: 1px solid var(--color-border-light);
	padding: var(--spacing-md) var(--spacing-lg);
	flex-shrink: 0;
	box-shadow: var(--shadow-sm);
}

.headerTop {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing-md);
}

.headerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
}

.headerRight {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
}

.backBtn {
	background: none;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-md);
	padding: var(--spacing-2xs) var(--spacing-sm);
	font-size: var(--font-size-sm);
	cursor: pointer;
	color: var(--color-text-light);
	transition: all var(--transition-fast);
	font-family: inherit;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing-2xs);
}

.backBtn:hover {
	background: var(--color-bg-medium);
}

.title {
	font-size: var(--font-size-xl);
	font-weight: var(--font-weight-bold);
}

.execId {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
	background: var(--color-bg-medium);
	padding: 2px 8px;
	border-radius: var(--radius-xl);
}

/* Meta row */
.metaRow {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-xl);
	margin-bottom: var(--spacing-md);
}

.metaItem {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-3xs);
}

.metaLabel {
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text-lighter);
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.metaValue {
	font-size: var(--font-size-sm);
	color: var(--color-text);
}

.metaValuePill {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-2xs);
	color: var(--color-text-lighter);
	background: var(--color-bg-medium);
	padding: 1px 6px;
	border-radius: var(--radius-xl);
	display: inline-block;
	width: fit-content;
}

.metaLink {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-sm);
	color: var(--color-primary);
	background: none;
	border: none;
	cursor: pointer;
	padding: 0;
	text-align: left;
}

.metaLink:hover {
	text-decoration: underline;
}

/* Timing breakdown */
.timingBar {
	display: flex;
	gap: var(--spacing-lg);
	padding: var(--spacing-sm) var(--spacing-md);
	background: var(--color-bg-light);
	border-radius: var(--radius-md);
	border: 1px solid var(--color-border-light);
	margin-bottom: var(--spacing-md);
}

.timingItem {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
}

.timingLabel {
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
	font-weight: var(--font-weight-medium);
}

.timingValue {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text);
}

/* Action bar */
.actionBar {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
	padding-top: var(--spacing-sm);
	border-top: 1px solid var(--color-border-light);
}

.actionBarSpacer {
	flex: 1;
}

.btn {
	padding: var(--spacing-2xs) var(--spacing-md);
	border-radius: var(--radius-md);
	border: 1px solid transparent;
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-medium);
	cursor: pointer;
	transition: all var(--transition-fast);
	font-family: inherit;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing-2xs);
}

.btnPrimary {
	background: var(--color-primary);
	color: white;
	border-color: var(--color-primary);
}

.btnPrimary:hover {
	background: var(--color-primary-shade);
	transform: translateY(-1px);
	box-shadow: 0 2px 8px rgba(255, 109, 90, 0.3);
}

.btnDanger {
	background: var(--color-danger);
	color: white;
	border-color: var(--color-danger);
}

.btnDanger:hover {
	background: var(--color-danger-shade);
}

.btnDangerGhost {
	background: transparent;
	color: var(--color-text-lighter);
	border-color: var(--color-border);
}

.btnDangerGhost:hover {
	color: var(--color-danger);
	border-color: var(--color-danger);
	background: var(--color-danger-tint);
}

.btnWarning {
	background: var(--color-warning);
	color: white;
	border-color: var(--color-warning);
}

.btnWarning:hover {
	background: var(--color-warning-shade);
}

.btnGhost {
	background: transparent;
	color: var(--color-text-light);
	border-color: var(--color-border);
}

.btnGhost:hover {
	background: var(--color-bg-medium);
}

.liveIndicator {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing-2xs);
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-medium);
	color: var(--color-success-shade);
	margin-left: auto;
	background: var(--color-success-tint);
	padding: var(--spacing-2xs) var(--spacing-sm);
	border-radius: var(--radius-xl);
}

@keyframes blink {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.3;
	}
}

.liveDot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--color-success);
	animation: blink 1.5s ease-in-out infinite;
}

/* Graph section */
.graphSection {
	border-bottom: 1px solid var(--color-border-light);
	flex-shrink: 0;
}

.graphToggle {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	padding: var(--spacing-xs) var(--spacing-lg);
	width: 100%;
	border: none;
	background: var(--color-bg-light);
	cursor: pointer;
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text);
	font-family: inherit;
	text-align: left;
	transition: background var(--transition-fast);
}

.graphToggle:hover {
	background: var(--color-bg-medium);
}

.graphContainer {
	padding: 0 var(--spacing-lg) var(--spacing-md);
}

/* Content layout */
.content {
	display: flex;
	flex: 1;
	overflow: hidden;
}

/* Steps section */
.stepsSection {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing-lg);
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
	margin-bottom: var(--spacing-md);
}

.sectionTitle {
	font-size: var(--font-size-lg);
	font-weight: var(--font-weight-semibold);
}

.stepCount {
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text-lighter);
	background: var(--color-bg-medium);
	padding: 1px 7px;
	border-radius: var(--radius-xl);
	min-width: 18px;
	text-align: center;
}

.emptySteps {
	padding: var(--spacing-2xl);
	text-align: center;
	color: var(--color-text-lighter);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing-sm);
}

.emptyIcon {
	color: var(--color-text-placeholder);
}

.stepsList {
	display: flex;
	flex-direction: column;
}

.stepWrapper {
	display: flex;
	gap: var(--spacing-md);
}

.timeline {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 20px;
	flex-shrink: 0;
	padding-top: 18px;
}

.timelineDot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: var(--color-border);
	border: 2px solid var(--color-bg);
	box-shadow: 0 0 0 2px var(--color-border);
	flex-shrink: 0;
	z-index: 1;
	transition: all var(--transition-fast);
}

.timelineDotSuccess {
	background: var(--color-success);
	box-shadow: 0 0 0 2px var(--color-success-tint);
}

.timelineDotDanger {
	background: var(--color-danger);
	box-shadow: 0 0 0 2px var(--color-danger-tint);
}

.timelineDotWarning {
	background: var(--color-warning);
	box-shadow: 0 0 0 2px var(--color-warning-tint);
	animation: pulseDot 1.5s ease-in-out infinite;
}

@keyframes pulseDot {
	0%,
	100% {
		box-shadow: 0 0 0 2px var(--color-warning-tint);
	}
	50% {
		box-shadow: 0 0 0 4px var(--color-warning-tint);
	}
}

.timelineLine {
	width: 2px;
	flex: 1;
	background: var(--color-border-light);
	margin-top: -2px;
}

.stepContent {
	flex: 1;
	padding-bottom: var(--spacing-sm);
	min-width: 0;
}

/* Sidebar */
.sidebar {
	width: 360px;
	border-left: 1px solid var(--color-border-light);
	overflow-y: auto;
	background: var(--color-bg-light);
	flex-shrink: 0;
}

.sidebarCard {
	border-bottom: 1px solid var(--color-border-light);
}

.sidebarCardError {
	border-left: 3px solid var(--color-danger);
}

.sidebarCardHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-sm) var(--spacing-md);
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text);
	cursor: pointer;
	background: none;
	border: none;
	width: 100%;
	text-align: left;
	font-family: inherit;
	transition: background var(--transition-fast);
	gap: var(--spacing-xs);
}

.sidebarCardHeader:hover {
	background: var(--color-bg-medium);
}

.sidebarCardTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	flex: 1;
}

.sidebarCardBody {
	padding: 0 var(--spacing-md) var(--spacing-md);
}

.chevron {
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
	transition: transform var(--transition-fast);
}

.chevronUp {
	transform: rotate(180deg);
}

.eventCount {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text-lighter);
	background: var(--color-bg-medium);
	padding: 1px 6px;
	border-radius: var(--radius-xl);
	min-width: 16px;
	text-align: center;
}

.resumeTime {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-sm);
	color: var(--color-info-shade);
	background: var(--color-info-tint);
	padding: var(--spacing-xs) var(--spacing-sm);
	border-radius: var(--radius-md);
}

.emptyEvents {
	font-size: var(--font-size-sm);
	color: var(--color-text-placeholder);
	font-style: italic;
}

.eventsList {
	max-height: 300px;
	overflow-y: auto;
}

.eventItem {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
	padding: var(--spacing-2xs) 0;
	border-bottom: 1px solid var(--color-border-light);
}

.eventItem:last-child {
	border-bottom: none;
}

.eventType {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-2xs);
	color: var(--color-primary);
	background: var(--color-primary-tint-2);
	padding: var(--spacing-3xs) var(--spacing-2xs);
	border-radius: var(--radius-sm);
}

.eventDetail {
	font-size: var(--font-size-2xs);
	color: var(--color-text-lighter);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
