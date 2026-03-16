<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import GraphCanvas from '../components/GraphCanvas.vue';
import CodeEditor from '../components/CodeEditor.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { useWorkflowStore, type WorkflowVersion } from '../stores/workflow.store';
import { useExecutionStore, type ExecutionListItem } from '../stores/execution.store';

const DEFAULT_TEMPLATE = `import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
  name: 'My Workflow',
  async run(ctx) {
    const greeting = await ctx.step({
      name: 'Generate Greeting',
      icon: 'message-circle',
      color: '#22c55e',
      description: 'Creates a greeting message',
    }, async () => {
      return { message: 'Hello from Engine v2!', timestamp: Date.now() };
    });

    const result = await ctx.step({
      name: 'Format Message',
      icon: 'file-text',
      color: '#8b5cf6',
      description: 'Formats with timestamp',
    }, async () => {
      return { formatted: \`\${greeting.message} (at \${new Date(greeting.timestamp).toISOString()})\` };
    });

    return result;
  },
});
`;

const route = useRoute();
const router = useRouter();
const workflowStore = useWorkflowStore();
const executionStore = useExecutionStore();

const workflowId = computed(() => route.params.id as string);
const code = ref('');
const name = ref('');
const saving = ref(false);
const executing = ref(false);
const saveMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const showVersions = ref(false);
const activeTab = ref<'graph' | 'executions'>('graph');

onMounted(async () => {
	await loadWorkflow();
	await executionStore.fetchExecutions({ workflowId: workflowId.value });
});

watch(workflowId, async () => {
	await loadWorkflow();
});

async function loadWorkflow() {
	workflowStore.clearErrors();
	saveMessage.value = null;
	await workflowStore.fetchWorkflow(workflowId.value);
	if (workflowStore.currentWorkflow) {
		code.value = workflowStore.currentWorkflow.code;
		name.value = workflowStore.currentWorkflow.name;
	} else {
		code.value = DEFAULT_TEMPLATE;
		name.value = 'Untitled Workflow';
	}
}

async function save() {
	saving.value = true;
	saveMessage.value = null;
	workflowStore.clearErrors();
	try {
		const result = await workflowStore.saveWorkflow(workflowId.value, {
			name: name.value,
			code: code.value,
		});
		saveMessage.value = {
			type: 'success',
			text: `Saved as version ${result.version}`,
		};
		// Refresh full workflow data
		await workflowStore.fetchWorkflow(workflowId.value);
		if (workflowStore.currentWorkflow) {
			code.value = workflowStore.currentWorkflow.code;
		}
		setTimeout(() => {
			saveMessage.value = null;
		}, 3000);
	} catch {
		if (workflowStore.compilationErrors.length) {
			saveMessage.value = {
				type: 'error',
				text: 'Compilation failed',
			};
		} else {
			saveMessage.value = { type: 'error', text: workflowStore.error ?? 'Save failed' };
		}
	} finally {
		saving.value = false;
	}
}

async function execute() {
	executing.value = true;
	try {
		const result = await executionStore.startExecution(workflowId.value);
		void router.push({ name: 'execution-inspector', params: { id: result.executionId } });
	} catch (e) {
		saveMessage.value = { type: 'error', text: (e as Error).message };
	} finally {
		executing.value = false;
	}
}

async function toggleActive() {
	const wf = workflowStore.currentWorkflow;
	if (!wf) return;
	try {
		if (wf.active) {
			await workflowStore.deactivateWorkflow(workflowId.value);
		} else {
			await workflowStore.activateWorkflow(workflowId.value);
		}
	} catch (e) {
		saveMessage.value = { type: 'error', text: (e as Error).message };
	}
}

async function loadVersions() {
	showVersions.value = !showVersions.value;
	if (showVersions.value) {
		await workflowStore.fetchVersions(workflowId.value);
	}
}

async function loadVersion(version: WorkflowVersion) {
	await workflowStore.fetchWorkflow(workflowId.value, version.version);
	if (workflowStore.currentWorkflow) {
		code.value = workflowStore.currentWorkflow.code;
		name.value = workflowStore.currentWorkflow.name;
	}
	showVersions.value = false;
}

function goToExecution(exec: ExecutionListItem) {
	void router.push({ name: 'execution-inspector', params: { id: exec.id } });
}

async function handleDelete() {
	if (!confirm('Delete this workflow?')) return;
	try {
		await workflowStore.deleteWorkflow(workflowId.value);
		void router.push('/');
	} catch (e) {
		saveMessage.value = { type: 'error', text: (e as Error).message };
	}
}

function handleKeydown(event: KeyboardEvent) {
	if ((event.metaKey || event.ctrlKey) && event.key === 's') {
		event.preventDefault();
		void save();
	}
}

const currentVersion = computed(() => workflowStore.currentWorkflow?.version ?? 0);
const isActive = computed(() => workflowStore.currentWorkflow?.active ?? false);
const graph = computed(() => workflowStore.currentWorkflow?.graph ?? null);

function formatDuration(ms: number | null): string {
	if (ms === null || ms === undefined) return '-';
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	const mins = Math.floor(ms / 60000);
	const secs = ((ms % 60000) / 1000).toFixed(0);
	return `${mins}m ${secs}s`;
}

function formatTime(dateString: string): string {
	return new Date(dateString).toLocaleTimeString();
}
</script>

<template>
	<div :class="$style.page" @keydown="handleKeydown">
		<!-- Loading state -->
		<div v-if="workflowStore.loading && !workflowStore.currentWorkflow" :class="$style.loading">
			<div :class="$style.spinner" />
			Loading workflow...
		</div>

		<!-- Error state -->
		<div
			v-else-if="workflowStore.error && !workflowStore.currentWorkflow"
			:class="$style.errorPage"
		>
			<h2>Failed to load workflow</h2>
			<p>{{ workflowStore.error }}</p>
			<button :class="[$style.btn, $style.btnGhost]" @click="$router.push('/')">
				Back to Workflows
			</button>
		</div>

		<!-- Editor -->
		<template v-else>
			<!-- Top bar -->
			<div :class="$style.topBar">
				<div :class="$style.topBarLeft">
					<button :class="$style.backBtn" @click="$router.push('/')" title="Back to workflows">
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
							<polyline points="15 18 9 12 15 6" />
						</svg>
					</button>
					<input v-model="name" :class="$style.nameInput" type="text" placeholder="Workflow name" />
					<span :class="$style.versionBadge">v{{ currentVersion }}</span>
					<button :class="$style.versionBtn" @click="loadVersions" title="View version history">
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
					</button>
				</div>

				<div :class="$style.topBarRight">
					<!-- Delete workflow -->
					<button
						:class="[$style.btn, $style.btnDanger]"
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
							<line x1="10" y1="11" x2="10" y2="17" />
							<line x1="14" y1="11" x2="14" y2="17" />
						</svg>
						Delete
					</button>

					<!-- Save message -->
					<span
						v-if="saveMessage"
						:class="[
							$style.saveMsg,
							saveMessage.type === 'success' ? $style.saveMsgSuccess : $style.saveMsgError,
						]"
					>
						{{ saveMessage.text }}
					</span>

					<!-- Active toggle -->
					<button
						:class="[$style.toggleBtn, isActive ? $style.toggleActive : '']"
						@click="toggleActive"
						:title="isActive ? 'Deactivate workflow' : 'Activate workflow'"
					>
						<span :class="$style.toggleTrack">
							<span :class="$style.toggleThumb" />
						</span>
						{{ isActive ? 'Active' : 'Inactive' }}
					</button>

					<button :class="[$style.btn, $style.btnSecondary]" :disabled="saving" @click="save">
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
							<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
							<polyline points="17 21 17 13 7 13 7 21" />
							<polyline points="7 3 7 8 15 8" />
						</svg>
						{{ saving ? 'Saving...' : 'Save' }}
					</button>
					<button :class="[$style.btn, $style.btnPrimary]" :disabled="executing" @click="execute">
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
							<polygon points="5 3 19 12 5 21 5 3" />
						</svg>
						{{ executing ? 'Starting...' : 'Execute' }}
					</button>
				</div>
			</div>

			<!-- Version dropdown -->
			<div v-if="showVersions" :class="$style.versionPanel">
				<div :class="$style.versionPanelHeader">
					<h3>Version History</h3>
					<button :class="$style.closeBtn" @click="showVersions = false">
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
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
				<div
					v-for="v in workflowStore.versions"
					:key="v.version"
					:class="[
						$style.versionItem,
						v.version === currentVersion ? $style.versionItemActive : '',
					]"
					@click="loadVersion(v)"
				>
					<span :class="$style.versionLabel">v{{ v.version }}</span>
					<span :class="$style.versionName">{{ v.name }}</span>
					<span :class="$style.versionDate">{{ new Date(v.createdAt).toLocaleString() }}</span>
				</div>
				<div v-if="!workflowStore.versions.length" :class="$style.versionEmpty">
					No versions found
				</div>
			</div>

			<!-- Split pane: Code left, Graph right -->
			<div :class="$style.splitPane">
				<!-- Left: Code editor -->
				<div :class="$style.editorPane">
					<div :class="$style.editorHeader">
						<span :class="$style.editorTitle">Source Code</span>
						<span :class="$style.editorHint">Cmd+S to save</span>
					</div>
					<div :class="$style.editorContainer">
						<CodeEditor v-model="code" :errors="workflowStore.compilationErrors" />
					</div>
				</div>

				<!-- Right: Graph + Executions tabs -->
				<div :class="$style.rightPane">
					<div :class="$style.tabBar">
						<button
							:class="[$style.tab, activeTab === 'graph' ? $style.tabActive : '']"
							@click="activeTab = 'graph'"
						>
							Graph
						</button>
						<button
							:class="[$style.tab, activeTab === 'executions' ? $style.tabActive : '']"
							@click="
								activeTab = 'executions';
								executionStore.fetchExecutions({ workflowId: workflowId });
							"
						>
							Executions
						</button>
					</div>

					<div v-if="activeTab === 'graph'" :class="$style.graphPane">
						<GraphCanvas
							:graph="graph"
							:triggers="
								(workflowStore.currentWorkflow?.triggers ?? []) as Array<{
									type: string;
									config?: { path?: string; method?: string };
								}>
							"
						/>
					</div>

					<div v-if="activeTab === 'executions'" :class="$style.executionsPane">
						<div v-if="!executionStore.executions.length" :class="$style.emptyExec">
							No executions for this workflow
						</div>
						<div
							v-for="exec in executionStore.executions"
							:key="exec.id"
							:class="$style.execRow"
							@click="goToExecution(exec)"
						>
							<code :class="$style.execId">{{ exec.id.slice(0, 8) }}</code>
							<StatusBadge :status="exec.status" size="sm" />
							<span :class="$style.execMeta">v{{ exec.workflowVersion }}</span>
							<span :class="$style.execMeta">{{ formatDuration(exec.durationMs) }}</span>
							<span :class="$style.execMeta">{{
								formatTime(exec.startedAt ?? exec.createdAt)
							}}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Compilation errors panel (below both panes) -->
			<div v-if="workflowStore.compilationErrors.length" :class="$style.errorPanel">
				<div :class="$style.errorPanelHeader">
					<span :class="$style.errorPanelTitle">
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
						Compilation Errors
					</span>
					<span :class="$style.errorCount">{{ workflowStore.compilationErrors.length }}</span>
				</div>
				<div
					v-for="(err, idx) in workflowStore.compilationErrors"
					:key="idx"
					:class="$style.errorItem"
				>
					<span v-if="err.line || err.column" :class="$style.errorLocation">
						<span v-if="err.line">Line {{ err.line }}</span>
						<span v-if="err.line && err.column">, </span>
						<span v-if="err.column">Col {{ err.column }}</span>
					</span>
					<span :class="$style.errorMessage">{{ err.message }}</span>
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
}

.loading,
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

/* Top bar */
.topBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-xs) var(--spacing-lg);
	background: var(--color-bg);
	border-bottom: 1px solid var(--color-border-light);
	flex-shrink: 0;
	min-height: 48px;
}

.topBarLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
}

.topBarRight {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
}

.backBtn {
	background: none;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-md);
	padding: var(--spacing-2xs) var(--spacing-xs);
	cursor: pointer;
	color: var(--color-text-light);
	transition: all var(--transition-fast);
	display: flex;
	align-items: center;
	justify-content: center;
}

.backBtn:hover {
	background: var(--color-bg-medium);
	border-color: var(--color-border);
}

.nameInput {
	border: 1px solid transparent;
	border-radius: var(--radius-md);
	padding: var(--spacing-2xs) var(--spacing-xs);
	font-size: var(--font-size-lg);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text);
	background: transparent;
	outline: none;
	min-width: 200px;
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

.versionBadge {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-2xs);
	color: var(--color-text-lighter);
	background: var(--color-bg-medium);
	padding: 2px 8px;
	border-radius: var(--radius-xl);
	font-weight: var(--font-weight-medium);
}

.versionBtn {
	background: none;
	border: 1px solid transparent;
	cursor: pointer;
	padding: var(--spacing-2xs);
	border-radius: var(--radius-md);
	transition: all var(--transition-fast);
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color-text-lighter);
}

.versionBtn:hover {
	background: var(--color-bg-medium);
	color: var(--color-text-light);
	border-color: var(--color-border);
}

.saveMsg {
	font-size: var(--font-size-sm);
	padding: var(--spacing-2xs) var(--spacing-sm);
	border-radius: var(--radius-md);
	animation: fadeIn 0.2s ease;
	font-weight: var(--font-weight-medium);
}

@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(-4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.saveMsgSuccess {
	color: var(--color-success-shade);
	background: var(--color-success-tint);
}

.saveMsgError {
	color: var(--color-danger-shade);
	background: var(--color-danger-tint);
}

/* Active toggle -- styled as a switch */
.toggleBtn {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
	padding: var(--spacing-2xs) var(--spacing-sm);
	border-radius: var(--radius-xl);
	border: 1px solid var(--color-border);
	background: var(--color-bg);
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-medium);
	color: var(--color-text-lighter);
	cursor: pointer;
	transition: all var(--transition-fast);
	font-family: inherit;
}

.toggleBtn:hover {
	border-color: var(--color-text-placeholder);
}

.toggleActive {
	border-color: var(--color-success);
	color: var(--color-success-shade);
	background: var(--color-success-tint);
}

.toggleTrack {
	position: relative;
	width: 28px;
	height: 16px;
	border-radius: 8px;
	background: var(--color-text-placeholder);
	transition: background var(--transition-fast);
}

.toggleActive .toggleTrack {
	background: var(--color-success);
}

.toggleThumb {
	position: absolute;
	top: 2px;
	left: 2px;
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background: white;
	transition: transform var(--transition-fast);
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.toggleActive .toggleThumb {
	transform: translateX(12px);
}

/* Buttons */
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

.btnGhost {
	background: transparent;
	color: var(--color-text-light);
	border-color: var(--color-border);
}

.btnGhost:hover:not(:disabled) {
	background: var(--color-bg-medium);
}

.btnDanger {
	background: transparent;
	color: var(--color-text-lighter);
	border-color: transparent;
}

.btnDanger:hover:not(:disabled) {
	color: var(--color-danger-shade);
	background: var(--color-danger-tint);
	border-color: var(--color-danger-tint);
}

/* Version panel */
.versionPanel {
	position: absolute;
	top: 104px;
	left: var(--spacing-lg);
	width: 360px;
	max-height: 400px;
	overflow-y: auto;
	background: var(--color-bg);
	border: 1px solid var(--color-border);
	border-radius: var(--radius-lg);
	box-shadow: var(--shadow-lg);
	z-index: 50;
	animation: fadeIn 0.15s ease;
}

.versionPanelHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-sm) var(--spacing-md);
	border-bottom: 1px solid var(--color-border-light);
}

.versionPanelHeader h3 {
	font-size: var(--font-size-md);
	font-weight: var(--font-weight-semibold);
}

.closeBtn {
	background: none;
	border: none;
	color: var(--color-text-lighter);
	cursor: pointer;
	padding: var(--spacing-2xs);
	border-radius: var(--radius-sm);
	display: flex;
	align-items: center;
	transition: all var(--transition-fast);
}

.closeBtn:hover {
	color: var(--color-text);
	background: var(--color-bg-medium);
}

.versionItem {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	padding: var(--spacing-sm) var(--spacing-md);
	cursor: pointer;
	transition: background var(--transition-fast);
	border-bottom: 1px solid var(--color-border-light);
}

.versionItem:hover {
	background: var(--color-bg-light);
}

.versionItem:last-child {
	border-bottom: none;
}

.versionItemActive {
	background: var(--color-primary-tint-2);
}

.versionLabel {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-semibold);
	color: var(--color-primary);
	min-width: 36px;
}

.versionName {
	flex: 1;
	font-size: var(--font-size-sm);
	color: var(--color-text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.versionDate {
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
	flex-shrink: 0;
}

.versionEmpty {
	padding: var(--spacing-lg);
	text-align: center;
	color: var(--color-text-lighter);
	font-size: var(--font-size-sm);
}

/* Split pane */
.splitPane {
	display: flex;
	flex: 1;
	overflow: hidden;
}

.editorPane {
	width: 50%;
	display: flex;
	flex-direction: column;
	border-right: 1px solid var(--color-border);
}

.editorHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-xs) var(--spacing-md);
	background: #181825;
	border-bottom: 1px solid #313244;
	flex-shrink: 0;
}

.editorTitle {
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-semibold);
	color: #a6adc8;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.editorHint {
	font-size: var(--font-size-xs);
	color: #585b70;
}

/* Code editor container */
.editorContainer {
	flex: 1;
	background: #1e1e2e;
	overflow: hidden;
}

/* Compilation error panel */
.errorPanel {
	border-top: 2px solid var(--color-danger);
	background: #1e1e2e;
	flex-shrink: 0;
	max-height: 200px;
	overflow-y: auto;
}

.errorPanelHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-xs) var(--spacing-md);
	background: rgba(255, 73, 73, 0.08);
	border-bottom: 1px solid rgba(255, 73, 73, 0.15);
}

.errorPanelTitle {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-semibold);
	color: #f38ba8;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
}

.errorCount {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
	color: #1e1e2e;
	background: #f38ba8;
	padding: 1px 7px;
	border-radius: var(--radius-xl);
	min-width: 18px;
	text-align: center;
}

.errorItem {
	display: flex;
	align-items: baseline;
	gap: var(--spacing-sm);
	padding: var(--spacing-2xs) var(--spacing-md);
	font-family: var(--font-family-mono);
	font-size: var(--font-size-xs);
	border-bottom: 1px solid rgba(255, 73, 73, 0.06);
}

.errorItem:last-child {
	border-bottom: none;
}

.errorLocation {
	color: #f9e2af;
	font-weight: var(--font-weight-semibold);
	white-space: nowrap;
	flex-shrink: 0;
}

.errorMessage {
	color: #f38ba8;
}

/* Right pane */
.rightPane {
	width: 50%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.tabBar {
	display: flex;
	border-bottom: 1px solid var(--color-border-light);
	background: var(--color-bg);
	flex-shrink: 0;
}

.tab {
	padding: var(--spacing-xs) var(--spacing-md);
	border: none;
	background: none;
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-medium);
	color: var(--color-text-lighter);
	cursor: pointer;
	border-bottom: 2px solid transparent;
	margin-bottom: -1px;
	transition: all var(--transition-fast);
	font-family: inherit;
}

.tab:hover {
	color: var(--color-text);
}

.tabActive {
	color: var(--color-primary);
	border-bottom-color: var(--color-primary);
}

.graphPane {
	flex: 1;
	overflow: auto;
	padding: 0;
	background: #fafafa;
}

.executionsPane {
	flex: 1;
	overflow-y: auto;
}

.emptyExec {
	padding: var(--spacing-2xl);
	text-align: center;
	color: var(--color-text-lighter);
	font-size: var(--font-size-sm);
}

.execRow {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	padding: var(--spacing-sm) var(--spacing-md);
	border-bottom: 1px solid var(--color-border-light);
	cursor: pointer;
	transition: background var(--transition-fast);
}

.execRow:hover {
	background: var(--color-bg-light);
}

.execId {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-xs);
	color: var(--color-text-light);
	background: var(--color-bg-medium);
	padding: var(--spacing-3xs) var(--spacing-2xs);
	border-radius: var(--radius-xs);
}

.execMeta {
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
	font-family: var(--font-family-mono);
}
</style>
