<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWorkflowStore } from '../stores/workflow.store';
import { useExecutionStore, type ExecutionListItem } from '../stores/execution.store';
import CodeEditor from '../components/CodeEditor.vue';
import GraphCanvas from '../components/GraphCanvas.vue';
import ExecutionGraph from '../components/ExecutionGraph.vue';
import StatusBadge from '../components/StatusBadge.vue';
import JsonViewer from '../components/JsonViewer.vue';

const route = useRoute();
const router = useRouter();
const workflowStore = useWorkflowStore();
const executionStore = useExecutionStore();

// ------------------------------------------------------------------
// State
// ------------------------------------------------------------------
const code = ref('');
const originalCode = ref('');
const workflowName = ref('');
const selectedStepId = ref<string | null>(null);
const selectedGraphNodeId = ref<string | null>(null);
const saving = ref(false);
const executing = ref(false);
const compilationErrors = ref<Array<{ message: string; line?: number; column?: number }>>([]);
const dropdownOpen = ref(false);

// Left pane width — persisted in localStorage
const STORAGE_KEY = 'engine-left-pane-width';
const leftPaneWidth = ref(parseInt(localStorage.getItem(STORAGE_KEY) ?? '500', 10));

function startPaneResize(e: MouseEvent) {
	e.preventDefault();
	const startX = e.clientX;
	const startWidth = leftPaneWidth.value;
	function onMouseMove(ev: MouseEvent) {
		const newWidth = Math.max(
			320,
			Math.min(window.innerWidth * 0.7, startWidth + ev.clientX - startX),
		);
		leftPaneWidth.value = newWidth;
	}
	function onMouseUp() {
		localStorage.setItem(STORAGE_KEY, String(leftPaneWidth.value));
		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('mouseup', onMouseUp);
	}
	document.addEventListener('mousemove', onMouseMove);
	document.addEventListener('mouseup', onMouseUp);
}
const dropdownSearch = ref('');
const togglingActive = ref(false);

// Webhook test state
const webhookTestBody = ref('{\n  "message": "Hello from test!"\n}');
const webhookTestResponse = ref<string | null>(null);
const webhookTestLoading = ref(false);
const leftTab = ref<'code' | 'webhook'>('code');
const webhookActiveTab = ref<'params' | 'headers' | 'body' | 'response'>('body');
const webhookResponseStatus = ref<number | null>(null);
const webhookHeaders = ref<Array<{ key: string; value: string }>>([
	{ key: 'Content-Type', value: 'application/json' },
]);
const webhookQueryParams = ref<Array<{ key: string; value: string }>>([]);

const filteredWorkflows = computed(() => {
	const q = dropdownSearch.value.toLowerCase().trim();
	if (!q) return workflowStore.workflows;
	return workflowStore.workflows.filter((wf) => wf.name.toLowerCase().includes(q));
});

const isDirty = computed(() => {
	if (!workflowStore.currentWorkflow) return false;
	return (
		code.value !== originalCode.value || workflowName.value !== workflowStore.currentWorkflow.name
	);
});

let refreshInterval: ReturnType<typeof setInterval> | undefined;
let eventSource: EventSource | null = null;

const DEFAULT_TEMPLATE = `import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
  name: 'New Workflow',
  async run(ctx) {
    const result = await ctx.step({
      name: 'Say Hello',
      icon: 'message-circle',
      color: '#22c55e',
      description: 'A simple greeting step',
    }, async () => {
      return { message: 'Hello!' };
    });
    return result;
  },
});
`;

// ------------------------------------------------------------------
// Computed
// ------------------------------------------------------------------
const currentWorkflowId = computed(() => route.params.id as string | undefined);
const currentExecId = computed(
	() => (route.params as Record<string, string>).execId as string | undefined,
);

const viewingExecution = computed(() => !!currentExecId.value);

const currentExecution = computed(() => executionStore.currentExecution);

const selectedStep = computed(() => {
	if (!selectedStepId.value) return null;
	return executionStore.steps.find((s) => s.stepId === selectedStepId.value) ?? null;
});

const selectedStepName = computed(() => {
	if (!selectedStepId.value) return null;
	const node = workflowStore.currentWorkflow?.graph?.nodes.find(
		(n) => n.id === selectedStepId.value,
	);
	return node?.name ?? null;
});

const graph = computed(() => workflowStore.currentWorkflow?.graph ?? null);

const isWorkflowActive = computed(() => workflowStore.currentWorkflow?.active ?? false);

const webhookTriggers = computed(() => {
	const triggers = workflowStore.currentWorkflow?.triggers ?? [];
	return (
		triggers as Array<{
			type?: string;
			config?: { path?: string; method?: string; responseMode?: string };
		}>
	)
		.filter((t) => t.type === 'webhook')
		.map((t) => ({
			path: t.config?.path ?? '',
			method: (t.config?.method ?? 'POST').toUpperCase(),
			responseMode: t.config?.responseMode ?? 'lastNode',
		}));
});

const isTerminal = computed(() => {
	const status = currentExecution.value?.status;
	return status === 'completed' || status === 'failed' || status === 'cancelled';
});

const isRunning = computed(() => currentExecution.value?.status === 'running');
const isPaused = computed(() => currentExecution.value?.status === 'paused');
const isWaiting = computed(() => currentExecution.value?.status === 'waiting');

// ------------------------------------------------------------------
// Lifecycle
// ------------------------------------------------------------------
onMounted(async () => {
	await workflowStore.fetchWorkflows();
	if (currentWorkflowId.value) {
		await loadWorkflow(currentWorkflowId.value);
	}
	if (currentExecId.value) {
		await loadExecution(currentExecId.value);
	}
	startRefreshInterval();
});

onUnmounted(() => {
	stopRefreshInterval();
	closeEventSource();
});

// ------------------------------------------------------------------
// Route watchers
// ------------------------------------------------------------------
watch(
	() => route.params.id,
	async (id) => {
		if (id) {
			await loadWorkflow(id as string);
		} else {
			workflowStore.currentWorkflow = null;
			code.value = '';
			workflowName.value = '';
			executionStore.executions = [];
			compilationErrors.value = [];
		}
		// Reset execution state when workflow changes
		if (!currentExecId.value) {
			selectedStepId.value = null;
			executionStore.currentExecution = null;
			executionStore.steps = [];
			closeEventSource();
		}
	},
);

watch(
	() => (route.params as Record<string, string>).execId,
	async (execId) => {
		if (execId) {
			await loadExecution(execId);
		} else {
			selectedStepId.value = null;
			executionStore.currentExecution = null;
			executionStore.steps = [];
			closeEventSource();
		}
	},
);

// Stop SSE/polling when execution finishes
watch(isTerminal, (terminal) => {
	if (terminal) {
		closeEventSource();
	}
});

// ------------------------------------------------------------------
// Data loading
// ------------------------------------------------------------------
async function loadWorkflow(id: string) {
	await workflowStore.fetchWorkflow(id);
	if (workflowStore.currentWorkflow) {
		code.value = workflowStore.currentWorkflow.code;
		workflowName.value = workflowStore.currentWorkflow.name;
		// Set originalCode after a tick to let CodeMirror settle
		await nextTick();
		originalCode.value = code.value;
		compilationErrors.value = [];
		await executionStore.fetchExecutions({ workflowId: id });
	}
}

async function loadExecution(execId: string) {
	closeEventSource();
	executionStore.clearEvents();
	await executionStore.fetchExecution(execId);
	await executionStore.fetchSteps(execId);

	// Load the workflow graph for the pinned version
	if (executionStore.currentExecution) {
		const { workflowId, workflowVersion } = executionStore.currentExecution;
		await workflowStore.fetchWorkflow(workflowId, workflowVersion);
	}

	// Subscribe to SSE for live updates
	if (!isTerminal.value) {
		eventSource = executionStore.subscribeSSE(execId);
	}
}

// ------------------------------------------------------------------
// Polling
// ------------------------------------------------------------------
function startRefreshInterval() {
	stopRefreshInterval();
	refreshInterval = setInterval(async () => {
		if (currentWorkflowId.value && !viewingExecution.value) {
			await executionStore.fetchExecutions({ workflowId: currentWorkflowId.value });
		}
		if (currentExecId.value && !isTerminal.value) {
			await executionStore.fetchExecution(currentExecId.value);
			await executionStore.fetchSteps(currentExecId.value);
		}
	}, 3000);
}

function stopRefreshInterval() {
	if (refreshInterval) {
		clearInterval(refreshInterval);
		refreshInterval = undefined;
	}
}

function closeEventSource() {
	if (eventSource) {
		eventSource.close();
		eventSource = null;
	}
}

// ------------------------------------------------------------------
// Actions
// ------------------------------------------------------------------
async function handleSave() {
	if (!currentWorkflowId.value || !isDirty.value) return;
	saving.value = true;
	compilationErrors.value = [];
	workflowStore.clearErrors();
	try {
		await workflowStore.saveWorkflow(currentWorkflowId.value, {
			name: workflowName.value,
			code: code.value,
		});
		// Re-fetch to get updated graph
		await workflowStore.fetchWorkflow(currentWorkflowId.value);
		if (workflowStore.currentWorkflow) {
			code.value = workflowStore.currentWorkflow.code;
			originalCode.value = workflowStore.currentWorkflow.code;
		}
		compilationErrors.value = [];
	} catch {
		if (workflowStore.compilationErrors.length) {
			compilationErrors.value = workflowStore.compilationErrors;
		}
	} finally {
		saving.value = false;
	}
}

async function handleExecute() {
	if (!currentWorkflowId.value) return;
	executing.value = true;
	try {
		if (isDirty.value) {
			await handleSave();
			if (compilationErrors.value.length > 0) return;
		}
		const { executionId } = await executionStore.startExecution(currentWorkflowId.value);
		await executionStore.fetchExecutions({ workflowId: currentWorkflowId.value });
		router.push(`/workflows/${currentWorkflowId.value}/executions/${executionId}`);
	} catch (err) {
		console.error('Execute failed:', err);
	} finally {
		executing.value = false;
	}
}

async function handleCreateWorkflow() {
	try {
		const wf = await workflowStore.createWorkflow({
			name: 'New Workflow',
			code: DEFAULT_TEMPLATE,
		});
		await workflowStore.fetchWorkflows();
		router.push(`/workflows/${wf.id}`);
	} catch (err) {
		console.error('Create failed:', err);
	}
}

async function handleDelete() {
	if (!currentWorkflowId.value) return;
	if (!confirm('Delete this workflow and all its executions?')) return;
	await workflowStore.deleteWorkflow(currentWorkflowId.value);
	await workflowStore.fetchWorkflows();
	router.push('/');
}

async function handleDeleteExecution(execId: string) {
	await executionStore.deleteExecution(execId);
	if (currentExecId.value === execId) {
		router.push(`/workflows/${currentWorkflowId.value}`);
	}
	if (currentWorkflowId.value) {
		await executionStore.fetchExecutions({ workflowId: currentWorkflowId.value });
	}
}

async function handleCancelExecution() {
	if (!currentExecId.value) return;
	await executionStore.cancelExecution(currentExecId.value);
}

async function handlePauseExecution() {
	if (!currentExecId.value) return;
	await executionStore.pauseExecution(currentExecId.value);
}

async function handleResumeExecution() {
	if (!currentExecId.value) return;
	await executionStore.resumeExecution(currentExecId.value);
}

async function handleDeleteCurrentExecution() {
	if (!currentExecId.value) return;
	if (!confirm('Delete this execution?')) return;
	await executionStore.deleteExecution(currentExecId.value);
	router.push(`/workflows/${currentWorkflowId.value}`);
	if (currentWorkflowId.value) {
		await executionStore.fetchExecutions({ workflowId: currentWorkflowId.value });
	}
}

async function handleApproveStep(stepId: string, approved: boolean) {
	await executionStore.approveStep(stepId, approved);
	if (currentExecId.value) {
		await executionStore.fetchSteps(currentExecId.value);
	}
}

async function handleToggleActive() {
	if (!currentWorkflowId.value || togglingActive.value) return;
	togglingActive.value = true;
	try {
		if (isWorkflowActive.value) {
			await workflowStore.deactivateWorkflow(currentWorkflowId.value);
		} else {
			await workflowStore.activateWorkflow(currentWorkflowId.value);
		}
		await workflowStore.fetchWorkflows();
	} catch (err) {
		console.error('Toggle active failed:', err);
	} finally {
		togglingActive.value = false;
	}
}

async function handleRerunStep() {
	if (!currentWorkflowId.value) return;
	await handleExecute();
}

async function handleSendWebhookTest(trigger: { path?: string; method?: string }) {
	if (!trigger.path || !currentWorkflowId.value) return;
	webhookTestLoading.value = true;
	webhookTestResponse.value = null;
	webhookResponseStatus.value = null;
	try {
		let parsedBody: unknown;
		try {
			parsedBody = JSON.parse(webhookTestBody.value);
		} catch {
			webhookTestResponse.value = 'Error: Invalid JSON in request body';
			webhookActiveTab.value = 'response';
			return;
		}
		// Build headers from the key-value rows
		const reqHeaders: Record<string, string> = {};
		for (const h of webhookHeaders.value) {
			if (h.key.trim()) reqHeaders[h.key.trim()] = h.value;
		}
		if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';

		// Build query string from params
		const queryParams = new URLSearchParams();
		for (const p of webhookQueryParams.value) {
			if (p.key.trim()) queryParams.set(p.key.trim(), p.value);
		}
		const qs = queryParams.toString();

		// Try webhook endpoint first; if 404 (not activated), use execution API
		const webhookUrl = `/webhook/${trigger.path.replace(/^\//, '')}${qs ? '?' + qs : ''}`;
		let res = await fetch(webhookUrl, {
			method: trigger.method ?? 'POST',
			headers: reqHeaders,
			body: JSON.stringify(parsedBody),
		});

		if (res.status === 404) {
			// Workflow not activated — execute via API with trigger data
			// Build query object from params
			const queryObj: Record<string, string> = {};
			for (const p of webhookQueryParams.value) {
				if (p.key.trim()) queryObj[p.key.trim()] = p.value;
			}
			const triggerData = {
				body: parsedBody,
				headers: reqHeaders,
				query: queryObj,
				method: (trigger.method ?? 'POST').toUpperCase(),
				path: trigger.path,
			};
			res = await fetch('/api/workflow-executions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					workflowId: currentWorkflowId.value,
					triggerData,
					mode: 'manual',
				}),
			});
			// Wait for execution to complete and fetch result
			if (res.ok) {
				const { executionId } = await res.json();
				// Poll for completion
				for (let i = 0; i < 30; i++) {
					await new Promise((r) => setTimeout(r, 500));
					const execRes = await fetch(`/api/workflow-executions/${executionId}`);
					if (execRes.ok) {
						const exec = await execRes.json();
						if (['completed', 'failed', 'cancelled'].includes(exec.status)) {
							webhookResponseStatus.value = exec.status === 'completed' ? 200 : 500;
							const resultText = JSON.stringify(exec.result ?? exec.error, null, 2);
							webhookTestResponse.value = resultText;
							webhookActiveTab.value = 'response';
							// Refresh executions list
							await executionStore.fetchExecutions({ workflowId: currentWorkflowId.value! });
							return;
						}
					}
				}
				webhookTestResponse.value = 'Timeout waiting for execution to complete';
				webhookActiveTab.value = 'response';
				return;
			}
		}

		webhookResponseStatus.value = res.status;
		const text = await res.text();
		let formatted: string;
		try {
			formatted = JSON.stringify(JSON.parse(text), null, 2);
		} catch {
			formatted = text;
		}
		webhookTestResponse.value = formatted;
		webhookActiveTab.value = 'response';
	} catch (err) {
		webhookTestResponse.value = `Error: ${(err as Error).message}`;
		webhookActiveTab.value = 'response';
	} finally {
		webhookTestLoading.value = false;
	}
}

// ------------------------------------------------------------------
// Navigation
// ------------------------------------------------------------------
const dropdownSearchInput = ref<HTMLInputElement | null>(null);

watch(dropdownOpen, (open) => {
	if (open) {
		dropdownSearch.value = '';
		nextTick(() => dropdownSearchInput.value?.focus());
	}
});

function selectWorkflow(id: string) {
	selectedStepId.value = null;
	dropdownOpen.value = false;
	router.push(`/workflows/${id}`);
}

function selectExecution(exec: ExecutionListItem) {
	selectedStepId.value = null;
	router.push(`/workflows/${currentWorkflowId.value}/executions/${exec.id}`);
}

function backToWorkflow() {
	selectedStepId.value = null;
	router.push(`/workflows/${currentWorkflowId.value}`);
}

const stepDetailRef = ref<HTMLElement | null>(null);

function handleSelectStep(stepId: string) {
	selectedStepId.value = stepId;
	// Auto-expand the step detail panel and scroll it into view
	if (stepDetailHeight.value < 300) {
		stepDetailHeight.value = 400;
	}
	nextTick(() => {
		stepDetailRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	});

	// Also navigate to the step's code in the editor
	const nodes = workflowStore.currentWorkflow?.graph?.nodes;
	if (!nodes) return;
	const node = nodes.find((n) => n.id === stepId);
	if (!node || node.type === 'trigger') return;

	navigateToStep(node.name);
}

// ------------------------------------------------------------------
// Formatting helpers
// ------------------------------------------------------------------
function formatMs(ms: number | null | undefined): string {
	if (ms == null) return '-';
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function webhookUrl(path: string): string {
	const cleanPath = path.replace(/^\//, '');
	return `${window.location.protocol}//${window.location.hostname}:3100/webhook/${cleanPath}`;
}

function timeAgo(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.floor(hrs / 24)}d ago`;
}

function statusIcon(status: string): string {
	switch (status) {
		case 'completed':
			return '\u2713';
		case 'failed':
			return '\u2717';
		case 'running':
			return '\u25B6';
		case 'cancelled':
			return '\u25A0';
		case 'waiting':
		case 'paused':
			return '\u23F8';
		default:
			return '\u00B7';
	}
}

// ------------------------------------------------------------------
// Step detail panel resize
// ------------------------------------------------------------------
const stepDetailHeight = ref(400);
const showStepInput = ref(false);
const showStepOutput = ref(false);

function startResize(e: MouseEvent) {
	e.preventDefault();
	const startY = e.clientY;
	const startHeight = stepDetailHeight.value;

	function onMouseMove(ev: MouseEvent) {
		const delta = startY - ev.clientY;
		stepDetailHeight.value = Math.max(100, Math.min(window.innerHeight * 0.8, startHeight + delta));
	}

	function onMouseUp() {
		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('mouseup', onMouseUp);
	}

	document.addEventListener('mousemove', onMouseMove);
	document.addEventListener('mouseup', onMouseUp);
}

// ------------------------------------------------------------------
// Code editor ref
// ------------------------------------------------------------------
const codeEditorRef = ref<InstanceType<typeof CodeEditor> | null>(null);

function handleFormat() {
	codeEditorRef.value?.format();
}

// ------------------------------------------------------------------
// Click-to-navigate: graph node click → scroll to code
// ------------------------------------------------------------------

/**
 * Find the range of a ctx.step() call in the source code by step name.
 * Returns { from, to } character offsets or null.
 */
function findStepRange(stepName: string): { from: number; to: number } | null {
	const src = code.value;
	const patterns = [`name: '${stepName}'`, `name: "${stepName}"`];
	let nameIdx = -1;
	for (const p of patterns) {
		const idx = src.indexOf(p);
		if (idx >= 0) {
			nameIdx = idx;
			break;
		}
	}
	if (nameIdx < 0) return null;

	// Walk backward to find `ctx.step(` or `await ctx.step(`
	const before = src.substring(0, nameIdx);
	const stepCallIdx = before.lastIndexOf('ctx.step(');
	const awaitIdx = before.lastIndexOf('await ctx.step(');
	const from =
		awaitIdx >= 0 && awaitIdx > stepCallIdx - 10
			? awaitIdx
			: stepCallIdx >= 0
				? stepCallIdx
				: nameIdx;

	// Walk forward to find the matching closing `);` by counting braces/parens
	let depth = 0;
	let to = nameIdx;
	for (let i = from; i < src.length; i++) {
		if (src[i] === '(') depth++;
		if (src[i] === ')') {
			depth--;
			if (depth === 0) {
				// Include the closing `)` and optional `;`
				to = src[i + 1] === ';' ? i + 2 : i + 1;
				break;
			}
		}
	}

	return { from, to };
}

function navigateToStep(stepName: string) {
	const range = findStepRange(stepName);
	if (!range) return;
	leftTab.value = 'code';
	nextTick(() => {
		codeEditorRef.value?.highlightRange(range.from, range.to);
	});
}

function handleGraphNodeClick(nodeId: string) {
	selectedGraphNodeId.value = nodeId;

	const nodes = workflowStore.currentWorkflow?.graph?.nodes;
	if (!nodes) return;
	const node = nodes.find((n) => n.id === nodeId);
	if (!node || node.type === 'trigger') return;

	navigateToStep(node.name);
}

// ------------------------------------------------------------------
// Error line extraction from step error stack traces
// ------------------------------------------------------------------
function extractErrorLine(error: unknown): number | null {
	if (!error || typeof error !== 'object') return null;
	const err = error as Record<string, unknown>;
	// Prefer originalLine from the engine (maps to source code)
	if (typeof err.originalLine === 'number') return err.originalLine;
	// Fallback: parse stack trace
	const stack =
		typeof err.stack === 'string' ? err.stack : typeof err.message === 'string' ? err.message : '';
	if (!stack) return null;
	// Look for patterns like "at line 5", ":5:", "workflow.ts:5", or "(eval:5:3)"
	const match = stack.match(/(?:line |:)(\d+)(?::|$|\))/);
	return match ? parseInt(match[1], 10) : null;
}

const errorLineNumber = computed(() => {
	if (!selectedStep.value?.error) return null;
	return extractErrorLine(selectedStep.value.error);
});

function navigateToErrorLine() {
	const lineNum = errorLineNumber.value;
	if (lineNum === null) return;
	leftTab.value = 'code';
	nextTick(() => {
		codeEditorRef.value?.scrollToLine(lineNum);
	});
}
</script>

<template>
	<div :class="$style.workspace">
		<!-- LEFT PANE (resizable) -->
		<div :class="$style.leftPane" :style="{ width: leftPaneWidth + 'px' }">
			<!-- Workflow selector -->
			<div :class="$style.selectorArea">
				<div :class="$style.selectorRow">
					<div :class="$style.dropdownWrapper">
						<button :class="$style.dropdownToggle" @click="dropdownOpen = !dropdownOpen">
							<span :class="$style.dropdownLabel">
								{{
									workflowStore.currentWorkflow
										? workflowStore.currentWorkflow.name
										: 'Select a workflow...'
								}}
							</span>
							<span :class="$style.dropdownCaret">&#9662;</span>
						</button>
						<div v-if="dropdownOpen" :class="$style.dropdownMenu">
							<div :class="$style.dropdownSearchWrap">
								<input
									ref="dropdownSearchInput"
									v-model="dropdownSearch"
									:class="$style.dropdownSearchInput"
									type="text"
									placeholder="Search workflows..."
									spellcheck="false"
									@keydown.escape="dropdownOpen = false"
								/>
							</div>
							<div :class="$style.dropdownItems">
								<div
									v-for="wf in filteredWorkflows"
									:key="wf.id"
									:class="[
										$style.dropdownItem,
										currentWorkflowId === wf.id ? $style.dropdownItemActive : '',
									]"
									@click="selectWorkflow(wf.id)"
								>
									<span
										:class="[
											$style.activeDot,
											wf.active ? $style.activeDotOn : $style.activeDotOff,
										]"
									/>
									<span :class="$style.dropdownItemName">{{ wf.name }}</span>
								</div>
								<div v-if="!filteredWorkflows.length" :class="$style.dropdownEmpty">
									{{ workflowStore.workflows.length ? 'No matches' : 'No workflows yet' }}
								</div>
							</div>
						</div>
					</div>
					<button :class="$style.iconBtn" @click="handleCreateWorkflow" title="New workflow">
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
					</button>
					<button
						v-if="currentWorkflowId"
						:class="$style.iconBtn"
						@click="handleDelete"
						title="Delete workflow"
					>
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
							<polyline points="3 6 5 6 21 6" />
							<path
								d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
							/>
						</svg>
					</button>
					<button
						v-if="currentWorkflowId"
						:class="[
							$style.statusToggle,
							workflowStore.currentWorkflow?.active ? $style.statusToggleActive : '',
						]"
						@click="handleToggleActive"
						:disabled="togglingActive"
						:title="
							workflowStore.currentWorkflow?.active ? 'Deactivate workflow' : 'Activate workflow'
						"
					>
						<span :class="$style.statusToggleTrack">
							<span :class="$style.statusToggleThumb" />
						</span>
						<span :class="$style.statusToggleLabel">
							{{ workflowStore.currentWorkflow?.active ? 'Active' : 'Inactive' }}
						</span>
					</button>
				</div>
			</div>
			<!-- Close dropdown when clicking outside -->
			<div v-if="dropdownOpen" :class="$style.dropdownBackdrop" @click="dropdownOpen = false" />

			<!-- Workflow name input -->
			<div v-if="currentWorkflowId" :class="$style.nameInputRow">
				<input
					v-model="workflowName"
					:class="$style.nameInput"
					type="text"
					placeholder="Workflow name"
				/>
			</div>

			<!-- Editor area with Code / Webhook tabs -->
			<div :class="$style.editorArea">
				<div v-if="currentWorkflowId" :class="$style.editorContainer">
					<!-- Tab bar -->
					<div :class="$style.editorHeader">
						<div :class="$style.editorTabs">
							<button
								:class="[$style.editorTab, leftTab === 'code' ? $style.editorTabActive : '']"
								@click="leftTab = 'code'"
							>
								Code
							</button>
							<button
								v-if="webhookTriggers.length"
								:class="[$style.editorTab, leftTab === 'webhook' ? $style.editorTabActive : '']"
								@click="leftTab = 'webhook'"
							>
								Webhook
							</button>
						</div>
						<div v-if="leftTab === 'code'" :class="$style.editorActions">
							<button :class="$style.editorActionBtn" @click="handleFormat" title="Re-indent code">
								Format
							</button>
							<button
								v-if="isDirty"
								:class="[$style.editorActionBtn, $style.editorSaveBtn]"
								:disabled="saving"
								@click="handleSave"
							>
								{{ saving ? 'Saving...' : 'Save' }}
							</button>
						</div>
					</div>

					<!-- Code tab -->
					<div v-show="leftTab === 'code'" :class="$style.editorBody">
						<CodeEditor ref="codeEditorRef" v-model="code" :errors="compilationErrors" />
					</div>

					<!-- Webhook tab -->
					<div
						v-if="leftTab === 'webhook' && webhookTriggers.length"
						:class="$style.webhookTabBody"
					>
						<div v-for="(trigger, idx) in webhookTriggers" :key="idx">
							<!-- URL bar -->
							<div :class="$style.webhookUrlBar">
								<span :class="$style.webhookMethod">{{ trigger.method }}</span>
								<input
									:class="$style.webhookUrlInput"
									:value="webhookUrl(trigger.path)"
									readonly
									@click="($event.target as HTMLInputElement).select()"
								/>
								<button
									:class="$style.webhookSendBtn"
									:disabled="webhookTestLoading"
									@click="handleSendWebhookTest(trigger)"
								>
									{{ webhookTestLoading ? 'Sending...' : 'Send' }}
								</button>
							</div>

							<!-- Request/Response tabs -->
							<div :class="$style.webhookTabs">
								<button
									:class="[
										$style.webhookInnerTab,
										webhookActiveTab === 'params' ? $style.webhookInnerTabActive : '',
									]"
									@click="webhookActiveTab = 'params'"
								>
									Params
								</button>
								<button
									:class="[
										$style.webhookInnerTab,
										webhookActiveTab === 'headers' ? $style.webhookInnerTabActive : '',
									]"
									@click="webhookActiveTab = 'headers'"
								>
									Headers
								</button>
								<button
									:class="[
										$style.webhookInnerTab,
										webhookActiveTab === 'body' ? $style.webhookInnerTabActive : '',
									]"
									@click="webhookActiveTab = 'body'"
								>
									Body
								</button>
								<button
									v-if="webhookTestResponse !== null"
									:class="[
										$style.webhookInnerTab,
										webhookActiveTab === 'response' ? $style.webhookInnerTabActive : '',
									]"
									@click="webhookActiveTab = 'response'"
								>
									Response
									<span
										v-if="webhookResponseStatus"
										:class="[
											$style.webhookStatusBadge,
											webhookResponseStatus < 300
												? $style.webhookStatusOk
												: $style.webhookStatusError,
										]"
										>{{ webhookResponseStatus }}</span
									>
								</button>
							</div>

							<!-- Params -->
							<div v-if="webhookActiveTab === 'params'" :class="$style.webhookContent">
								<div :class="$style.webhookHeaderRows">
									<div
										v-for="(param, pIdx) in webhookQueryParams"
										:key="pIdx"
										:class="$style.webhookHeaderRow"
									>
										<input
											v-model="param.key"
											:class="$style.webhookHeaderInput"
											placeholder="Param name"
											spellcheck="false"
										/>
										<input
											v-model="param.value"
											:class="$style.webhookHeaderInput"
											placeholder="Value"
											spellcheck="false"
										/>
										<button
											:class="$style.webhookHeaderRemove"
											@click="webhookQueryParams.splice(pIdx, 1)"
										>
											&times;
										</button>
									</div>
								</div>
								<button
									:class="$style.webhookAddHeaderBtn"
									@click="webhookQueryParams.push({ key: '', value: '' })"
								>
									+ Add Param
								</button>
							</div>

							<!-- Headers -->
							<div v-if="webhookActiveTab === 'headers'" :class="$style.webhookContent">
								<div :class="$style.webhookHeaderRows">
									<div
										v-for="(header, hIdx) in webhookHeaders"
										:key="hIdx"
										:class="$style.webhookHeaderRow"
									>
										<input
											v-model="header.key"
											:class="$style.webhookHeaderInput"
											placeholder="Header name"
											spellcheck="false"
										/>
										<input
											v-model="header.value"
											:class="$style.webhookHeaderInput"
											placeholder="Value"
											spellcheck="false"
										/>
										<button
											:class="$style.webhookHeaderRemove"
											@click="webhookHeaders.splice(hIdx, 1)"
										>
											&times;
										</button>
									</div>
								</div>
								<button
									:class="$style.webhookAddHeaderBtn"
									@click="webhookHeaders.push({ key: '', value: '' })"
								>
									+ Add Header
								</button>
							</div>

							<!-- Body -->
							<div v-if="webhookActiveTab === 'body'" :class="$style.webhookBodyEditor">
								<CodeEditor v-model="webhookTestBody" language="json" />
							</div>

							<!-- Response -->
							<div
								v-if="webhookActiveTab === 'response' && webhookTestResponse !== null"
								:class="$style.webhookContent"
							>
								<pre :class="$style.webhookResponsePre">{{ webhookTestResponse }}</pre>
							</div>
						</div>
					</div>
				</div>
				<div v-else :class="$style.emptyEditor">
					<p :class="$style.emptyTitle">No workflow selected</p>
					<p :class="$style.emptyHint">Select a workflow from the dropdown or create a new one</p>
				</div>

				<!-- Compilation errors (inside left pane, below editor) -->
				<div v-if="compilationErrors.length" :class="$style.errorsBar">
					<div :class="$style.errorBarHeader">
						<span :class="$style.errorBarTitle">Compilation Errors</span>
						<span :class="$style.errorBarCount">{{ compilationErrors.length }}</span>
					</div>
					<div :class="$style.errorBarItems">
						<div v-for="(err, idx) in compilationErrors" :key="idx" :class="$style.errorBarItem">
							<span v-if="err.line || err.column" :class="$style.errorBarLocation">
								<span v-if="err.line">Line {{ err.line }}</span>
								<span v-if="err.line && err.column">, </span>
								<span v-if="err.column">Col {{ err.column }}</span>
							</span>
							<span :class="$style.errorBarMessage">{{ err.message }}</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- PANE RESIZE HANDLE -->
		<div :class="$style.paneResizeHandle" @mousedown="startPaneResize" />

		<!-- RIGHT PANE -->
		<div :class="$style.rightPane">
			<!-- EXECUTION VIEW (viewing an execution) -->
			<template v-if="viewingExecution && currentExecution">
				<!-- Execution header -->
				<div :class="$style.execHeader">
					<div :class="$style.execHeaderLeft">
						<button :class="$style.backBtn" @click="backToWorkflow">
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
							Back to workflow
						</button>
						<span :class="$style.execHeaderSep" />
						<code :class="$style.execIdLabel">{{ currentExecution.id }}</code>
						<StatusBadge :status="currentExecution.status" size="sm" />
					</div>
					<div :class="$style.execHeaderRight">
						<span v-if="currentExecution.durationMs != null" :class="$style.execTiming">
							Total: {{ formatMs(currentExecution.durationMs) }}
						</span>
						<span v-if="currentExecution.computeMs != null" :class="$style.execTiming">
							Compute: {{ formatMs(currentExecution.computeMs) }}
						</span>
						<!-- Action buttons -->
						<template v-if="!isTerminal">
							<button
								v-if="isRunning"
								:class="[$style.btn, $style.btnDanger]"
								@click="handleCancelExecution"
							>
								Cancel
							</button>
							<button
								v-if="isRunning"
								:class="[$style.btn, $style.btnWarning]"
								@click="handlePauseExecution"
							>
								Pause
							</button>
							<button
								v-if="isPaused || isWaiting"
								:class="[$style.btn, $style.btnPrimary]"
								@click="handleResumeExecution"
							>
								Resume
							</button>
							<span :class="$style.liveIndicator">
								<span :class="$style.liveDot" />
								Live
							</span>
						</template>
						<button
							v-if="isTerminal"
							:class="[$style.btn, $style.btnDangerGhost]"
							@click="handleDeleteCurrentExecution"
						>
							Delete
						</button>
					</div>
				</div>

				<!-- Execution graph -->
				<div :class="$style.graphArea">
					<ExecutionGraph
						v-if="graph"
						:graph="graph"
						:steps="executionStore.steps"
						:selected-step-id="selectedStepId"
						@select-step="handleSelectStep"
					/>
					<div v-else :class="$style.graphEmpty">
						<p>No graph data available</p>
					</div>
				</div>

				<!-- Step detail panel (only shown when a step is selected) -->
				<template v-if="selectedStep">
					<div :class="$style.resizeHandle" @mousedown="startResize" />
					<div
						ref="stepDetailRef"
						:class="$style.stepDetailArea"
						:style="{ height: stepDetailHeight + 'px' }"
					>
						<div :class="$style.stepDetailHeader">
							<span v-if="selectedStepName" :class="$style.stepDetailDisplayName">{{
								selectedStepName
							}}</span>
							<span :class="$style.stepDetailId">{{ selectedStep.stepId }}</span>
							<StatusBadge :status="selectedStep.status" size="sm" />
							<span v-if="selectedStep.durationMs != null" :class="$style.stepDetailDuration">
								{{ formatMs(selectedStep.durationMs) }}
							</span>
							<span v-if="selectedStep.attempt > 1" :class="$style.stepDetailAttempt">
								Attempt {{ selectedStep.attempt }}
							</span>
							<button :class="$style.stepDetailClose" @click="selectedStepId = null" title="Close">
								&times;
							</button>
						</div>

						<!-- Approval actions -->
						<div v-if="selectedStep.status === 'waiting_approval'" :class="$style.approvalActions">
							<p :class="$style.approvalText">This step requires human approval to continue.</p>
							<div :class="$style.approvalButtons">
								<button
									:class="[$style.btn, $style.btnSuccess]"
									@click="handleApproveStep(selectedStep.id, true)"
								>
									Approve
								</button>
								<button
									:class="[$style.btn, $style.btnDanger]"
									@click="handleApproveStep(selectedStep.id, false)"
								>
									Decline
								</button>
							</div>
						</div>

						<div :class="$style.stepDetailBody">
							<div
								v-if="selectedStep.input !== null && selectedStep.input !== undefined"
								:class="$style.stepSection"
							>
								<button :class="$style.stepSectionToggle" @click="showStepInput = !showStepInput">
									<span
										:class="[
											$style.stepSectionChevron,
											showStepInput ? $style.stepSectionChevronOpen : '',
										]"
										>&#9656;</span
									>
									Input
								</button>
								<JsonViewer v-if="showStepInput" :data="selectedStep.input" />
							</div>
							<div
								v-if="selectedStep.output !== null && selectedStep.output !== undefined"
								:class="$style.stepSection"
							>
								<button :class="$style.stepSectionToggle" @click="showStepOutput = !showStepOutput">
									<span
										:class="[
											$style.stepSectionChevron,
											showStepOutput ? $style.stepSectionChevronOpen : '',
										]"
										>&#9656;</span
									>
									Output
								</button>
								<JsonViewer v-if="showStepOutput" :data="selectedStep.output" />
							</div>
							<div v-if="selectedStep.error" :class="$style.stepSection">
								<h4 :class="[$style.stepSectionTitle, $style.stepSectionTitleError]">
									Error
									<button
										v-if="errorLineNumber"
										:class="$style.errorLineBtn"
										@click="navigateToErrorLine"
									>
										Line {{ errorLineNumber }}
									</button>
								</h4>
								<div :class="$style.stepErrorBox">
									<JsonViewer :data="selectedStep.error" />
								</div>
							</div>
							<div v-if="isTerminal" :class="$style.stepSection">
								<button :class="[$style.btn, $style.btnSecondary]" @click="handleRerunStep">
									Re-run workflow
								</button>
							</div>
						</div>
					</div>
				</template>
			</template>

			<!-- WORKFLOW VIEW (not viewing an execution) -->
			<template v-else-if="currentWorkflowId">
				<!-- Graph canvas -->
				<div :class="$style.graphArea">
					<GraphCanvas
						:graph="graph"
						:triggers="
							(workflowStore.currentWorkflow?.triggers ?? []) as Array<{
								type: string;
								config?: { path?: string; method?: string };
							}>
						"
						:selected-node-id="selectedGraphNodeId"
						@node-click="handleGraphNodeClick"
					/>
				</div>

				<!-- Executions panel -->
				<div :class="$style.executionsPanel">
					<div :class="$style.executionsPanelHeader">
						<h3 :class="$style.executionsPanelTitle">Executions</h3>
						<div :class="$style.executionsPanelActions">
							<button
								v-if="isDirty"
								:class="[$style.btn, $style.btnSecondary]"
								:disabled="saving"
								@click="handleSave"
							>
								{{ saving ? 'Saving...' : 'Save' }}
							</button>
							<button
								:class="[$style.btn, $style.btnPrimary]"
								:disabled="executing"
								@click="handleExecute"
							>
								{{ executing ? 'Starting...' : 'Execute' }}
							</button>
						</div>
					</div>

					<div :class="$style.executionsTableWrapper">
						<table v-if="executionStore.executions.length" :class="$style.executionsTable">
							<thead>
								<tr>
									<th>Status</th>
									<th>Execution ID</th>
									<th>Duration</th>
									<th>Compute</th>
									<th>Started</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="exec in executionStore.executions"
									:key="exec.id"
									:class="$style.execTableRow"
									@click="selectExecution(exec)"
								>
									<td>
										<span :class="[$style.execStatusIcon, $style[`execStatus_${exec.status}`]]">
											{{ statusIcon(exec.status) }}
										</span>
									</td>
									<td>
										<code :class="$style.execTableId">{{ exec.id }}</code>
									</td>
									<td :class="$style.execTableMono">{{ formatMs(exec.durationMs) }}</td>
									<td :class="$style.execTableMono">-</td>
									<td :class="$style.execTableTime">
										{{ timeAgo(exec.startedAt ?? exec.createdAt) }}
									</td>
									<td>
										<button
											:class="$style.execTableDeleteBtn"
											@click.stop="handleDeleteExecution(exec.id)"
											title="Delete execution"
										>
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
												<line x1="18" y1="6" x2="6" y2="18" />
												<line x1="6" y1="6" x2="18" y2="18" />
											</svg>
										</button>
									</td>
								</tr>
							</tbody>
						</table>
						<div v-else :class="$style.executionsEmpty">
							No executions yet. Click Execute to run this workflow.
						</div>
					</div>
				</div>
			</template>

			<!-- NO WORKFLOW SELECTED -->
			<template v-else>
				<div :class="$style.rightEmpty">
					<p :class="$style.emptyTitle">Welcome to n8n Engine v2</p>
					<p :class="$style.emptyHint">Select or create a workflow to get started</p>
				</div>
			</template>
		</div>
	</div>
</template>

<style module>
.workspace {
	display: flex;
	height: 100vh;
	overflow: hidden;
}

/* ----------------------------------------------------------------
   LEFT PANE
   ---------------------------------------------------------------- */
.leftPane {
	height: 100%;
	display: flex;
	flex-direction: column;
	background: var(--color-bg);
	min-width: 320px;
	min-height: 0;
	flex-shrink: 0;
}

.paneResizeHandle {
	width: 4px;
	height: 100%;
	cursor: col-resize;
	background: var(--color-border);
	flex-shrink: 0;
	transition: background var(--transition-fast);
}

.paneResizeHandle:hover {
	background: var(--color-primary);
}

.selectorArea {
	padding: var(--spacing-sm) var(--spacing-md);
	border-bottom: 1px solid var(--color-border-light);
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
	flex-shrink: 0;
	position: relative;
}

.selectorRow {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
}

/* Custom dropdown */
.dropdownWrapper {
	flex: 1;
	position: relative;
}

.dropdownToggle {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing-xs) var(--spacing-sm);
	border: 1px solid var(--color-border);
	border-radius: var(--radius-md);
	background: var(--color-bg);
	font-size: var(--font-size-sm);
	font-family: inherit;
	color: var(--color-text);
	cursor: pointer;
	transition:
		border-color var(--transition-fast),
		box-shadow var(--transition-fast);
	outline: none;
}

.dropdownToggle:hover {
	border-color: var(--color-text-placeholder);
}

.dropdownToggle:focus {
	border-color: var(--color-primary);
	box-shadow: 0 0 0 3px var(--color-primary-tint-2);
}

.dropdownLabel {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.dropdownCaret {
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
	flex-shrink: 0;
	margin-left: var(--spacing-xs);
}

.dropdownBackdrop {
	position: fixed;
	inset: 0;
	z-index: 49;
}

.dropdownMenu {
	position: absolute;
	top: calc(100% + 6px);
	left: 0;
	right: 0;
	background: var(--color-bg);
	border: 1px solid var(--color-border);
	border-radius: var(--radius-lg);
	box-shadow: var(--shadow-lg);
	z-index: 50;
	animation: dropdownIn 0.15s ease;
	display: flex;
	flex-direction: column;
	max-height: 360px;
	overflow: hidden;
}

.dropdownSearchWrap {
	padding: var(--spacing-sm);
	flex-shrink: 0;
}

.dropdownSearchInput {
	width: 100%;
	padding: 8px 12px;
	border: none;
	border-radius: var(--radius-md);
	background: var(--color-bg-medium);
	color: var(--color-text);
	font-size: var(--font-size-sm);
	font-family: inherit;
	outline: none;
	transition: box-shadow var(--transition-fast);
}

.dropdownSearchInput:focus {
	box-shadow: inset 0 0 0 1px var(--color-border);
}

.dropdownSearchInput::placeholder {
	color: var(--color-text-placeholder);
}

.dropdownItems {
	overflow-y: auto;
	flex: 1;
	padding: var(--spacing-2xs) var(--spacing-2xs);
}

@keyframes dropdownIn {
	from {
		opacity: 0;
		transform: translateY(-4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.dropdownItem {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	padding: 8px 12px;
	cursor: pointer;
	transition: background var(--transition-fast);
	border-radius: var(--radius-md);
	font-size: var(--font-size-sm);
	margin-bottom: 1px;
}

.dropdownItem:hover {
	background: var(--color-bg-medium);
}

.dropdownItemActive {
	background: var(--color-bg-medium);
	font-weight: var(--font-weight-semibold);
}

.dropdownItemActive .dropdownItemName {
	color: var(--color-primary);
}

.dropdownItemName {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-text);
	font-weight: var(--font-weight-medium);
}

.dropdownEmpty {
	padding: var(--spacing-lg) var(--spacing-md);
	text-align: center;
	color: var(--color-text-placeholder);
	font-size: var(--font-size-sm);
	font-style: italic;
}

.iconBtn {
	background: none;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-md);
	padding: var(--spacing-2xs);
	width: 32px;
	height: 32px;
	cursor: pointer;
	color: var(--color-text-lighter);
	transition: all var(--transition-fast);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.iconBtn:hover {
	color: var(--color-primary);
	border-color: var(--color-primary);
	background: var(--color-primary-tint-2);
}

.nameInputRow {
	padding: var(--spacing-xs) var(--spacing-md);
	border-bottom: 1px solid var(--color-border-light);
	flex-shrink: 0;
}

.nameInput {
	width: 100%;
	padding: var(--spacing-2xs) var(--spacing-xs);
	border: 1px solid transparent;
	border-radius: var(--radius-md);
	font-size: var(--font-size-lg);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text);
	background: transparent;
	outline: none;
	font-family: inherit;
	transition: all var(--transition-fast);
}

.nameInput:hover {
	border-color: var(--color-border);
}

.nameInput:focus {
	border-color: var(--color-primary);
	background: var(--color-bg);
	box-shadow: 0 0 0 3px var(--color-primary-tint-2);
}

/* Editor area */
.editorArea {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
	overflow: hidden;
}

.editorContainer {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
	overflow: hidden;
}

.editorHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 var(--spacing-md);
	background: var(--color-bg-medium);
	border-bottom: 1px solid var(--color-border-light);
	flex-shrink: 0;
}

.editorTabs {
	display: flex;
	gap: 0;
}

.editorTab {
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text-lighter);
	background: none;
	border: none;
	border-bottom: 2px solid transparent;
	padding: var(--spacing-xs) var(--spacing-md);
	cursor: pointer;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	transition: all var(--transition-fast);
}

.editorTab:hover {
	color: var(--color-text-light);
}

.editorTabActive {
	color: var(--color-text);
	border-bottom-color: var(--color-primary);
}

.editorActions {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
}

.editorActionBtn {
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-medium);
	font-family: inherit;
	color: var(--color-text-lighter);
	background: none;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-md);
	padding: 3px 10px;
	cursor: pointer;
	transition: all var(--transition-fast);
	white-space: nowrap;
}

.editorActionBtn:hover:not(:disabled) {
	color: var(--color-text-light);
	background: var(--color-bg-medium);
	border-color: var(--color-text-placeholder);
}

.editorActionBtn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.editorSaveBtn {
	color: var(--color-primary);
	border-color: var(--color-primary);
}

.editorSaveBtn:hover:not(:disabled) {
	color: white;
	background: var(--color-primary);
	border-color: var(--color-primary);
}

.webhookTabBody {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	background: var(--color-bg);
}

.webhookContent {
	padding: var(--spacing-sm) var(--spacing-md);
}

.editorBody {
	flex: 1;
	min-height: 0;
	overflow: hidden;
	background: var(--color-bg);
	position: relative;
}

.emptyEditor {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing-xs);
	color: var(--color-text-lighter);
}

/* ----------------------------------------------------------------
   RIGHT PANE
   ---------------------------------------------------------------- */
.rightPane {
	flex: 1;
	height: 100%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background: var(--color-bg-light);
	min-width: 400px;
}

.rightEmpty {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing-xs);
}

/* ----------------------------------------------------------------
   GRAPH AREA (shared between workflow & execution views)
   ---------------------------------------------------------------- */
.graphArea {
	flex: 1;
	min-height: 0;
	overflow: auto;
}

/* Override component max-height so graphs fill their container */
.graphArea :global(.cm-editor) {
	height: 100%;
}

.graphEmpty {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color-text-placeholder);
	font-size: var(--font-size-sm);
}

/* ----------------------------------------------------------------
   EXECUTION HEADER (when viewing execution)
   ---------------------------------------------------------------- */
.execHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-xs) var(--spacing-md);
	background: var(--color-bg);
	border-bottom: 1px solid var(--color-border-light);
	flex-shrink: 0;
	gap: var(--spacing-sm);
	flex-wrap: wrap;
}

.execHeaderLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	min-width: 0;
}

.execHeaderRight {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	flex-shrink: 0;
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
	white-space: nowrap;
}

.backBtn:hover {
	background: var(--color-bg-medium);
}

.execHeaderSep {
	display: inline-block;
	width: 1px;
	height: 16px;
	background: var(--color-border);
}

.execIdLabel {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-xs);
	color: var(--color-text-light);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.execTiming {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
	white-space: nowrap;
}

.liveIndicator {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing-2xs);
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-medium);
	color: var(--color-success-shade);
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

/* ----------------------------------------------------------------
   STEP DETAIL AREA (when viewing execution)
   ---------------------------------------------------------------- */
.resizeHandle {
	height: 4px;
	background: var(--color-border-light);
	cursor: ns-resize;
	flex-shrink: 0;
	transition: background var(--transition-fast);
}

.resizeHandle:hover {
	background: var(--color-primary);
}
.stepDetailArea {
	flex: none;
	min-height: 100px;
	max-height: 80vh;
	overflow-y: auto;
	background: var(--color-bg);
}

.stepDetailHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	padding: var(--spacing-sm) var(--spacing-md);
	border-bottom: 1px solid var(--color-border-light);
	background: var(--color-bg);
}

.stepDetailDisplayName {
	font-weight: var(--font-weight-semibold);
	font-size: var(--font-size-md);
	color: var(--color-text);
}

.stepDetailId {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
	background: var(--color-bg-medium);
	padding: 1px 6px;
	border-radius: var(--radius-sm);
}

.stepDetailClose {
	margin-left: auto;
	background: none;
	border: none;
	font-size: 18px;
	color: var(--color-text-lighter);
	cursor: pointer;
	padding: 0 4px;
	line-height: 1;
}

.stepDetailClose:hover {
	color: var(--color-text);
}

.stepDetailDuration {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
}

.stepDetailAttempt {
	font-size: var(--font-size-xs);
	color: var(--color-warning-shade);
	background: var(--color-warning-tint);
	padding: var(--spacing-3xs) var(--spacing-2xs);
	border-radius: var(--radius-sm);
}

.stepDetailBody {
	padding: var(--spacing-sm) var(--spacing-md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing-sm);
	overflow-y: auto;
}

.stepSection {
	/* empty -- just a gap container */
}

.stepSectionToggle {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-semibold);
	font-family: inherit;
	color: var(--color-text-light);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	background: none;
	border: none;
	cursor: pointer;
	padding: var(--spacing-2xs) 0;
	margin-bottom: var(--spacing-2xs);
}

.stepSectionToggle:hover {
	color: var(--color-text);
}

.stepSectionChevron {
	font-size: 14px;
	transition: transform var(--transition-fast);
	display: inline-block;
}

.stepSectionChevronOpen {
	transform: rotate(90deg);
}

.stepSectionTitle {
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text-lighter);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	margin-bottom: var(--spacing-2xs);
}

.stepSectionTitleError {
	color: var(--color-danger-shade);
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
}

.errorLineBtn {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-semibold);
	color: var(--color-danger-shade);
	background: var(--color-danger-tint);
	border: 1px solid var(--color-danger);
	border-radius: var(--radius-sm);
	padding: 1px 8px;
	cursor: pointer;
	text-transform: none;
	letter-spacing: 0;
	transition: all var(--transition-fast);
}

.errorLineBtn:hover {
	background: var(--color-danger);
	color: white;
}

.stepErrorBox {
	border-left: 3px solid var(--color-danger);
	border-radius: var(--radius-sm);
}

.stepDetailEmpty {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing-2xl);
	color: var(--color-text-placeholder);
	font-size: var(--font-size-sm);
	font-style: italic;
	min-height: 100px;
}

.approvalActions {
	margin: var(--spacing-sm) var(--spacing-md);
	padding: var(--spacing-md);
	background: var(--color-info-tint);
	border-radius: var(--radius-md);
	border: 1px solid var(--color-info);
}

.approvalText {
	font-size: var(--font-size-sm);
	color: var(--color-info-shade);
	margin-bottom: var(--spacing-sm);
}

.approvalButtons {
	display: flex;
	gap: var(--spacing-xs);
}

/* ----------------------------------------------------------------
   EXECUTIONS PANEL (workflow view)
   ---------------------------------------------------------------- */
.executionsPanel {
	flex: none;
	min-height: 120px;
	max-height: 40%;
	height: 30%;
	display: flex;
	flex-direction: column;
	border-top: 1px solid var(--color-border-light);
	background: var(--color-bg);
	overflow: hidden;
}

.executionsPanelHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-xs) var(--spacing-md);
	border-bottom: 1px solid var(--color-border-light);
	flex-shrink: 0;
}

.executionsPanelTitle {
	font-size: var(--font-size-md);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text);
}

.executionsPanelActions {
	display: flex;
	gap: var(--spacing-xs);
}

.executionsTableWrapper {
	flex: 1;
	overflow-y: auto;
}

.executionsTable {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size-sm);
}

.executionsTable thead th {
	text-align: left;
	padding: var(--spacing-xs) var(--spacing-sm);
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text-lighter);
	text-transform: uppercase;
	letter-spacing: 0.3px;
	border-bottom: 1px solid var(--color-border-light);
	background: var(--color-bg-light);
	position: sticky;
	top: 0;
	z-index: 1;
}

.executionsTable tbody td {
	padding: var(--spacing-xs) var(--spacing-sm);
	border-bottom: 1px solid var(--color-border-light);
	vertical-align: middle;
}

.execTableRow {
	cursor: pointer;
	transition: background var(--transition-fast);
}

.execTableRow:hover {
	background: var(--color-bg-light);
}

.execTableRow:hover .execTableDeleteBtn {
	opacity: 1;
}

.execStatusIcon {
	width: 22px;
	height: 22px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
}

.execStatus_completed {
	color: var(--color-success-shade);
	background: var(--color-success-tint);
}

.execStatus_failed {
	color: var(--color-danger-shade);
	background: var(--color-danger-tint);
}

.execStatus_running {
	color: var(--color-warning-shade);
	background: var(--color-warning-tint);
}

.execStatus_cancelled {
	color: var(--color-text-lighter);
	background: var(--color-bg-medium);
}

.execStatus_waiting,
.execStatus_paused {
	color: var(--color-info-shade);
	background: var(--color-info-tint);
}

.execTableId {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-xs);
	color: var(--color-text-light);
}

.execTableMono {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
}

.execTableTime {
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
	white-space: nowrap;
}

.execTableDeleteBtn {
	background: none;
	border: none;
	color: var(--color-text-placeholder);
	cursor: pointer;
	padding: var(--spacing-2xs);
	border-radius: var(--radius-sm);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transition: all var(--transition-fast);
}

.execTableDeleteBtn:hover {
	color: var(--color-danger-shade);
	background: var(--color-danger-tint);
}

.executionsEmpty {
	padding: var(--spacing-xl) var(--spacing-md);
	text-align: center;
	color: var(--color-text-placeholder);
	font-size: var(--font-size-sm);
}

/* ----------------------------------------------------------------
   ERRORS BAR (full-width bottom)
   ---------------------------------------------------------------- */
.errorsBar {
	border-top: 2px solid var(--color-danger);
	background: var(--color-bg-medium);
	flex-shrink: 0;
	max-height: 180px;
	overflow-y: auto;
}

.errorBarHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-xs) var(--spacing-md);
	background: rgba(255, 73, 73, 0.08);
	border-bottom: 1px solid rgba(255, 73, 73, 0.15);
}

.errorBarTitle {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-semibold);
	color: #f38ba8;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.errorBarCount {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
	color: var(--color-bg);
	background: #f38ba8;
	padding: 1px 7px;
	border-radius: var(--radius-xl);
	min-width: 18px;
	text-align: center;
}

.errorBarItems {
	/* empty container */
}

.errorBarItem {
	display: flex;
	align-items: baseline;
	gap: var(--spacing-sm);
	padding: var(--spacing-2xs) var(--spacing-md);
	font-family: var(--font-family-mono);
	font-size: var(--font-size-xs);
	border-bottom: 1px solid rgba(255, 73, 73, 0.06);
}

.errorBarItem:last-child {
	border-bottom: none;
}

.errorBarLocation {
	color: #f9e2af;
	font-weight: var(--font-weight-semibold);
	white-space: nowrap;
	flex-shrink: 0;
}

.errorBarMessage {
	color: #f38ba8;
}

/* ----------------------------------------------------------------
   SHARED BUTTON STYLES
   ---------------------------------------------------------------- */
.btn {
	padding: var(--spacing-2xs) var(--spacing-md);
	border-radius: var(--radius-md);
	border: 1px solid transparent;
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-medium);
	cursor: pointer;
	transition: all var(--transition-fast);
	white-space: nowrap;
	font-family: inherit;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing-2xs);
}

.btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btnPrimary {
	background: var(--color-primary);
	color: white;
	border-color: var(--color-primary);
}

.btnPrimary:hover:not(:disabled) {
	background: var(--color-primary-shade);
	border-color: var(--color-primary-shade);
	transform: translateY(-1px);
	box-shadow: 0 2px 8px rgba(255, 109, 90, 0.3);
}

.btnPrimary:active:not(:disabled) {
	transform: translateY(0);
	box-shadow: none;
}

.btnSecondary {
	background: var(--color-bg);
	color: var(--color-text-light);
	border-color: var(--color-border);
}

.btnSecondary:hover:not(:disabled) {
	background: var(--color-bg-medium);
	border-color: var(--color-border);
}

.btnDanger {
	background: var(--color-danger);
	color: white;
	border-color: var(--color-danger);
}

.btnDanger:hover:not(:disabled) {
	background: var(--color-danger-shade);
}

.btnDangerGhost {
	background: transparent;
	color: var(--color-text-lighter);
	border-color: var(--color-border);
}

.btnDangerGhost:hover:not(:disabled) {
	color: var(--color-danger);
	border-color: var(--color-danger);
	background: var(--color-danger-tint);
}

.btnWarning {
	background: var(--color-warning);
	color: white;
	border-color: var(--color-warning);
}

.btnWarning:hover:not(:disabled) {
	background: var(--color-warning-shade);
}

.btnSuccess {
	background: var(--color-success);
	color: white;
	border-color: var(--color-success);
}

.btnSuccess:hover:not(:disabled) {
	background: var(--color-success-shade);
}

/* ----------------------------------------------------------------
   SHARED EMPTY STATE
   ---------------------------------------------------------------- */
.emptyTitle {
	font-size: var(--font-size-lg);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text-lighter);
}

.emptyHint {
	font-size: var(--font-size-sm);
	color: var(--color-text-placeholder);
}

/* ----------------------------------------------------------------
   ACTIVE/INACTIVE TOGGLE SWITCH
   ---------------------------------------------------------------- */
.statusToggle {
	display: flex;
	align-items: center;
	gap: 6px;
	background: none;
	border: none;
	cursor: pointer;
	padding: 4px 0;
	flex-shrink: 0;
}

.statusToggle:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.statusToggleTrack {
	width: 32px;
	height: 18px;
	border-radius: 9px;
	background: var(--color-border);
	position: relative;
	transition: background 0.2s ease;
}

.statusToggleActive .statusToggleTrack {
	background: var(--color-success);
}

.statusToggleThumb {
	position: absolute;
	top: 2px;
	left: 2px;
	width: 14px;
	height: 14px;
	border-radius: 50%;
	background: white;
	transition: transform 0.2s ease;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.statusToggleActive .statusToggleThumb {
	transform: translateX(14px);
}

.statusToggleLabel {
	font-size: 12px;
	font-weight: 500;
	color: var(--color-text-lighter);
}

.statusToggleActive .statusToggleLabel {
	color: var(--color-success);
}

.activeDot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	flex-shrink: 0;
}

.activeDotOn {
	background: var(--color-success);
	box-shadow: 0 0 4px var(--color-success);
}

.activeDotOff {
	background: var(--color-border);
}

/* ----------------------------------------------------------------
   WEBHOOK TEST PANEL
   ---------------------------------------------------------------- */
/* Webhook test panel (Postman-like) */
.webhookPanel {
	border-top: 1px solid var(--color-border-light);
	background: var(--color-bg);
	flex-shrink: 0;
}

.webhookUrlBar {
	display: flex;
	align-items: center;
	gap: 0;
	padding: var(--spacing-xs) var(--spacing-md);
	border-bottom: 1px solid var(--color-border-light);
}

.webhookMethod {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-bold);
	color: var(--color-success);
	background: var(--color-bg-medium);
	padding: 6px 12px;
	border: 1px solid var(--color-border);
	border-right: none;
	border-radius: var(--radius-md) 0 0 var(--radius-md);
	white-space: nowrap;
}

.webhookUrlInput {
	flex: 1;
	font-family: var(--font-family-mono);
	font-size: var(--font-size-sm);
	color: var(--color-text);
	background: var(--color-bg);
	border: 1px solid var(--color-border);
	border-right: none;
	padding: 6px 12px;
	outline: none;
}

.webhookUrlInput:focus {
	border-color: var(--color-primary);
}

.webhookSendBtn {
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-semibold);
	color: white;
	background: var(--color-primary);
	border: 1px solid var(--color-primary);
	border-radius: 0 var(--radius-md) var(--radius-md) 0;
	padding: 6px 20px;
	cursor: pointer;
	transition: background var(--transition-fast);
	white-space: nowrap;
}

.webhookSendBtn:hover:not(:disabled) {
	background: var(--color-primary-shade);
}

.webhookSendBtn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.webhookTabs {
	display: flex;
	border-bottom: 1px solid var(--color-border-light);
	padding: 0 var(--spacing-md);
	gap: 0;
}

.webhookInnerTab {
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-medium);
	color: var(--color-text-lighter);
	background: none;
	border: none;
	border-bottom: 2px solid transparent;
	padding: var(--spacing-xs) var(--spacing-md);
	cursor: pointer;
	transition: all var(--transition-fast);
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
}

.webhookInnerTab:hover {
	color: var(--color-text);
}

.webhookInnerTabActive {
	color: var(--color-primary);
	border-bottom-color: var(--color-primary);
}

.webhookStatusBadge {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
	padding: 1px 6px;
	border-radius: var(--radius-sm);
}

.webhookStatusOk {
	color: var(--color-success);
	background: var(--color-success-tint);
}

.webhookStatusError {
	color: var(--color-danger);
	background: var(--color-danger-tint);
}

.webhookTabContent {
	padding: var(--spacing-sm) var(--spacing-md);
	max-height: 220px;
	overflow-y: auto;
}

.webhookHeaderRows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.webhookHeaderRow {
	display: flex;
	gap: var(--spacing-2xs);
	align-items: center;
}

.webhookHeaderInput {
	flex: 1;
	font-family: var(--font-family-mono);
	font-size: var(--font-size-xs);
	padding: 5px 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-sm);
	background: var(--color-bg);
	outline: none;
	color: var(--color-text);
}

.webhookHeaderInput:focus {
	border-color: var(--color-primary);
}

.webhookHeaderInput::placeholder {
	color: var(--color-text-placeholder);
}

.webhookHeaderRemove {
	width: 24px;
	height: 24px;
	border: none;
	background: none;
	color: var(--color-text-lighter);
	cursor: pointer;
	font-size: 16px;
	line-height: 1;
	border-radius: var(--radius-sm);
	flex-shrink: 0;
}

.webhookHeaderRemove:hover {
	color: var(--color-danger);
	background: var(--color-danger-tint);
}

.webhookAddHeaderBtn {
	font-size: var(--font-size-xs);
	color: var(--color-primary);
	background: none;
	border: none;
	cursor: pointer;
	padding: var(--spacing-2xs) 0;
	margin-top: var(--spacing-2xs);
}

.webhookAddHeaderBtn:hover {
	text-decoration: underline;
}

.webhookBodyEditor {
	height: 250px;
	border-radius: var(--radius-md);
	overflow: hidden;
}

.webhookResponsePre {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-xs);
	line-height: 1.5;
	color: var(--color-text);
	background: var(--color-bg-medium);
	border: 1px solid var(--color-border);
	border-radius: var(--radius-md);
	padding: var(--spacing-sm);
	white-space: pre-wrap;
	word-break: break-all;
	margin: 0;
}
</style>
