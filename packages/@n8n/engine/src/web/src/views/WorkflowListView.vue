<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import StatusBadge from '../components/StatusBadge.vue';
import CodeEditor from '../components/CodeEditor.vue';
import { useExecutionStore, type ExecutionListItem } from '../stores/execution.store';
import { useWorkflowStore, type WorkflowListItem } from '../stores/workflow.store';

const router = useRouter();
const executionStore = useExecutionStore();
const workflowStore = useWorkflowStore();

const showCreateModal = ref(false);
const newName = ref('');
const newCode = ref(`import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
  name: 'My Workflow',
  async run(ctx) {
    const greeting = await ctx.step({
      name: 'greet',
      icon: 'message-circle',
      color: '#22c55e',
    }, async () => {
      return { message: 'Hello from Engine v2!', timestamp: Date.now() };
    });

    const result = await ctx.step({
      name: 'format',
      icon: 'file-text',
      color: '#8b5cf6',
    }, async () => {
      return { formatted: \`\${greeting.message} (at \${new Date(greeting.timestamp).toISOString()})\` };
    });

    return result;
  },
});
`);
const creating = ref(false);
const createError = ref<string | null>(null);

let refreshTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
	await Promise.all([workflowStore.fetchWorkflows(), executionStore.fetchExecutions()]);

	refreshTimer = setInterval(async () => {
		await Promise.all([workflowStore.fetchWorkflows(), executionStore.fetchExecutions()]);
	}, 5000);
});

onUnmounted(() => {
	if (refreshTimer) {
		clearInterval(refreshTimer);
		refreshTimer = null;
	}
});

function goToWorkflow(workflow: WorkflowListItem) {
	void router.push({ name: 'workflow-editor', params: { id: workflow.id } });
}

function goToExecution(execution: ExecutionListItem) {
	void router.push({ name: 'execution-inspector', params: { id: execution.id } });
}

function goToWorkflowFromExecution(execution: ExecutionListItem) {
	void router.push({ name: 'workflow-editor', params: { id: execution.workflowId } });
}

async function deleteExecution(id: string) {
	try {
		await executionStore.deleteExecution(id);
	} catch (e) {
		console.error('Failed to delete execution:', (e as Error).message);
	}
}

function openCreateModal() {
	newName.value = '';
	createError.value = null;
	showCreateModal.value = true;
}

async function createWorkflow() {
	creating.value = true;
	createError.value = null;
	try {
		const workflow = await workflowStore.createWorkflow({
			name: newName.value || 'Untitled Workflow',
			code: newCode.value,
		});
		showCreateModal.value = false;
		void router.push({ name: 'workflow-editor', params: { id: workflow.id } });
	} catch (e) {
		if (workflowStore.compilationErrors.length) {
			createError.value = workflowStore.compilationErrors.map((err) => err.message).join('\n');
		} else {
			createError.value = (e as Error).message;
		}
	} finally {
		creating.value = false;
	}
}

function formatTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	if (diffMins < 1) return 'Just now';
	if (diffMins < 60) return `${diffMins}m ago`;
	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString();
}

function formatDuration(ms: number | null): string {
	if (ms === null || ms === undefined) return '-';
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	const mins = Math.floor(ms / 60000);
	const secs = ((ms % 60000) / 1000).toFixed(0);
	return `${mins}m ${secs}s`;
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
			return '\u23F8';
		case 'paused':
			return '\u23F8';
		default:
			return '\u00B7';
	}
}
</script>

<template>
	<div :class="$style.page">
		<!-- Page header -->
		<div :class="$style.pageHeader">
			<div :class="$style.pageHeaderLeft">
				<h1 :class="$style.pageTitle">Workflows</h1>
				<span :class="$style.workflowCount" v-if="workflowStore.workflows.length">
					{{ workflowStore.workflows.length }}
				</span>
			</div>
			<button :class="[$style.btn, $style.btnPrimary]" @click="openCreateModal">
				+ New Workflow
			</button>
		</div>

		<!-- Workflows section -->
		<div :class="$style.section">
			<!-- Loading -->
			<div
				v-if="workflowStore.loading && !workflowStore.workflows.length"
				:class="$style.loadingState"
			>
				<div :class="$style.spinner" />
				<span>Loading workflows...</span>
			</div>

			<!-- Error -->
			<div
				v-else-if="workflowStore.error && !workflowStore.workflows.length"
				:class="$style.errorState"
			>
				{{ workflowStore.error }}
			</div>

			<!-- Empty state -->
			<div v-else-if="!workflowStore.workflows.length" :class="$style.emptyState">
				<div :class="$style.emptyIcon">
					<svg
						width="48"
						height="48"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
						<polyline points="14 2 14 8 20 8" />
						<line x1="12" y1="18" x2="12" y2="12" />
						<line x1="9" y1="15" x2="15" y2="15" />
					</svg>
				</div>
				<p :class="$style.emptyTitle">No workflows yet</p>
				<p :class="$style.emptyHint">Create your first workflow to get started</p>
				<button :class="[$style.btn, $style.btnPrimary, $style.btnLg]" @click="openCreateModal">
					+ Create Workflow
				</button>
			</div>

			<!-- Workflow list -->
			<div v-else :class="$style.workflowList">
				<div
					v-for="workflow in workflowStore.workflows"
					:key="workflow.id"
					:class="$style.workflowCard"
					@click="goToWorkflow(workflow)"
				>
					<div :class="$style.workflowCardLeft">
						<div :class="$style.statusDot">
							<span
								:class="[$style.dot, workflow.active ? $style.dotActive : $style.dotInactive]"
							/>
						</div>
						<div :class="$style.workflowInfo">
							<div :class="$style.workflowNameRow">
								<span :class="$style.workflowName">{{ workflow.name }}</span>
								<span :class="$style.versionPill">v{{ workflow.version }}</span>
								<span
									:class="[
										$style.statusLabel,
										workflow.active ? $style.statusActive : $style.statusInactive,
									]"
								>
									{{ workflow.active ? 'Active' : 'Inactive' }}
								</span>
							</div>
							<span :class="$style.workflowMeta">
								Created {{ formatTime(workflow.createdAt) }}
							</span>
						</div>
					</div>
					<div :class="$style.workflowCardRight">
						<span :class="$style.workflowArrow">&rarr;</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Recent executions section -->
		<div :class="$style.section">
			<div :class="$style.sectionHeader">
				<h2 :class="$style.sectionTitle">Recent Executions</h2>
				<button
					:class="[$style.btn, $style.btnGhost, $style.btnSm]"
					@click="executionStore.fetchExecutions()"
				>
					Refresh
				</button>
			</div>

			<div
				v-if="executionStore.loading && !executionStore.executions.length"
				:class="$style.loadingState"
			>
				<div :class="$style.spinner" />
				<span>Loading executions...</span>
			</div>

			<div v-else-if="executionStore.error" :class="$style.errorState">
				{{ executionStore.error }}
			</div>

			<div v-else-if="!executionStore.executions.length" :class="$style.emptyStateSmall">
				<p :class="$style.emptyTitle">No executions yet</p>
				<p :class="$style.emptyHint">Create a workflow and run it to see executions here</p>
			</div>

			<div v-else :class="$style.executionList">
				<div
					v-for="exec in executionStore.executions.slice(0, 20)"
					:key="exec.id"
					:class="$style.execRow"
					@click="goToExecution(exec)"
				>
					<span :class="[$style.execStatusIcon, $style['execStatus_' + exec.status]]">
						{{ statusIcon(exec.status) }}
					</span>
					<div :class="$style.execInfo">
						<button :class="$style.execWorkflowLink" @click.stop="goToWorkflowFromExecution(exec)">
							{{ exec.workflowId.slice(0, 8) }}...
						</button>
					</div>
					<span :class="$style.versionPill">v{{ exec.workflowVersion }}</span>
					<StatusBadge :status="exec.status" size="sm" />
					<span :class="$style.execDuration">{{ formatDuration(exec.durationMs) }}</span>
					<span :class="$style.execTime">{{ formatTime(exec.startedAt ?? exec.createdAt) }}</span>
					<button
						:class="$style.execDeleteBtn"
						@click.stop="deleteExecution(exec.id)"
						title="Delete execution"
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
				</div>
			</div>
		</div>

		<!-- Create workflow modal -->
		<Teleport to="body">
			<div
				v-if="showCreateModal"
				:class="$style.modalOverlay"
				@click.self="showCreateModal = false"
			>
				<div :class="$style.modal">
					<div :class="$style.modalHeader">
						<h2 :class="$style.modalTitle">Create Workflow</h2>
						<button :class="$style.modalClose" @click="showCreateModal = false">
							<svg
								width="20"
								height="20"
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
					<div :class="$style.modalBody">
						<label :class="$style.label">
							<span :class="$style.labelText">Name</span>
							<input
								v-model="newName"
								:class="$style.input"
								type="text"
								placeholder="My Workflow"
								autofocus
							/>
						</label>
						<label :class="$style.label">
							<span :class="$style.labelText">Code</span>
							<div :class="$style.codeEditorWrapper">
								<CodeEditor v-model="newCode" />
							</div>
						</label>
						<div v-if="createError" :class="$style.errorBanner">
							<pre :class="$style.errorText">{{ createError }}</pre>
						</div>
					</div>
					<div :class="$style.modalFooter">
						<button :class="[$style.btn, $style.btnGhost]" @click="showCreateModal = false">
							Cancel
						</button>
						<button
							:class="[$style.btn, $style.btnPrimary]"
							:disabled="creating"
							@click="createWorkflow"
						>
							{{ creating ? 'Creating...' : 'Create' }}
						</button>
					</div>
				</div>
			</div>
		</Teleport>
	</div>
</template>

<style module>
.page {
	max-width: 960px;
	margin: 0 auto;
	padding: var(--spacing-xl) var(--spacing-lg);
	display: flex;
	flex-direction: column;
	gap: var(--spacing-lg);
}

/* Page header */
.pageHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.pageHeaderLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
}

.pageTitle {
	font-size: var(--font-size-2xl);
	font-weight: var(--font-weight-bold);
	color: var(--color-text);
}

.workflowCount {
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text-lighter);
	background: var(--color-bg-medium);
	padding: var(--spacing-3xs) var(--spacing-xs);
	border-radius: var(--radius-xl);
	min-width: 20px;
	text-align: center;
}

/* Buttons */
.btn {
	padding: var(--spacing-xs) var(--spacing-md);
	border-radius: var(--radius-md);
	border: 1px solid transparent;
	font-size: var(--font-size-md);
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

.btnGhost {
	background: transparent;
	color: var(--color-text-light);
	border-color: var(--color-border);
}

.btnGhost:hover {
	background: var(--color-bg-medium);
	border-color: var(--color-border);
}

.btnSm {
	padding: var(--spacing-2xs) var(--spacing-sm);
	font-size: var(--font-size-sm);
}

.btnLg {
	padding: var(--spacing-sm) var(--spacing-lg);
	font-size: var(--font-size-lg);
}

/* Section */
.section {
	background: var(--color-bg);
	border: 1px solid var(--color-border-light);
	border-radius: var(--radius-lg);
	overflow: hidden;
	box-shadow: var(--shadow-sm);
}

.sectionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-md) var(--spacing-lg);
	border-bottom: 1px solid var(--color-border-light);
	background: var(--color-bg);
}

.sectionTitle {
	font-size: var(--font-size-lg);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text);
}

/* Workflow list */
.workflowList {
	display: flex;
	flex-direction: column;
}

.workflowCard {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-md) var(--spacing-lg);
	cursor: pointer;
	transition: background var(--transition-fast);
	border-bottom: 1px solid var(--color-border-light);
}

.workflowCard:last-child {
	border-bottom: none;
}

.workflowCard:hover {
	background: var(--color-bg-light);
}

.workflowCard:hover .workflowArrow {
	opacity: 1;
	transform: translateX(2px);
}

.workflowCardLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing-md);
	min-width: 0;
	flex: 1;
}

.workflowCardRight {
	flex-shrink: 0;
	padding-left: var(--spacing-md);
}

.workflowArrow {
	font-size: var(--font-size-lg);
	color: var(--color-text-placeholder);
	opacity: 0;
	transition: all var(--transition-fast);
}

.statusDot {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
}

.dot {
	display: block;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	transition: background var(--transition-fast);
}

.dotActive {
	background: var(--color-success);
	box-shadow: 0 0 0 3px var(--color-success-tint);
}

.dotInactive {
	background: var(--color-text-placeholder);
}

.workflowInfo {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-3xs);
	min-width: 0;
}

.workflowNameRow {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
}

.workflowName {
	font-weight: var(--font-weight-semibold);
	font-size: var(--font-size-md);
	color: var(--color-text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.versionPill {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-medium);
	color: var(--color-text-lighter);
	background: var(--color-bg-medium);
	padding: 1px 6px;
	border-radius: var(--radius-xl);
	flex-shrink: 0;
}

.statusLabel {
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-medium);
	flex-shrink: 0;
}

.statusActive {
	color: var(--color-success-shade);
}

.statusInactive {
	color: var(--color-text-placeholder);
}

.workflowMeta {
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
}

/* Execution list */
.executionList {
	display: flex;
	flex-direction: column;
}

.execRow {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	padding: var(--spacing-sm) var(--spacing-lg);
	cursor: pointer;
	transition: background var(--transition-fast);
	border-bottom: 1px solid var(--color-border-light);
}

.execRow:last-child {
	border-bottom: none;
}

.execRow:hover {
	background: var(--color-bg-light);
}

.execStatusIcon {
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	font-size: var(--font-size-xs);
	flex-shrink: 0;
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

.execInfo {
	flex: 1;
	min-width: 0;
}

.execWorkflowLink {
	background: none;
	border: none;
	color: var(--color-primary);
	font-family: var(--font-family-mono);
	font-size: var(--font-size-xs);
	cursor: pointer;
	padding: 0;
}

.execWorkflowLink:hover {
	text-decoration: underline;
}

.execDuration {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-xs);
	color: var(--color-text-light);
	min-width: 56px;
	text-align: right;
}

.execTime {
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
	min-width: 72px;
	text-align: right;
}

.execDeleteBtn {
	background: none;
	border: none;
	color: var(--color-text-placeholder);
	cursor: pointer;
	padding: var(--spacing-3xs);
	border-radius: var(--radius-sm);
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0;
	transition: all var(--transition-fast);
	flex-shrink: 0;
}

.execRow:hover .execDeleteBtn {
	opacity: 1;
}

.execDeleteBtn:hover {
	color: var(--color-danger-shade);
	background: var(--color-danger-tint);
}

/* States */
.loadingState {
	padding: var(--spacing-3xl) var(--spacing-lg);
	text-align: center;
	color: var(--color-text-lighter);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing-sm);
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

.errorState {
	padding: var(--spacing-3xl) var(--spacing-lg);
	text-align: center;
	color: var(--color-danger);
}

.emptyState {
	padding: var(--spacing-3xl) var(--spacing-lg);
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing-sm);
}

.emptyStateSmall {
	padding: var(--spacing-2xl) var(--spacing-lg);
	text-align: center;
}

.emptyIcon {
	color: var(--color-text-placeholder);
	margin-bottom: var(--spacing-xs);
}

.emptyTitle {
	font-size: var(--font-size-lg);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text-lighter);
	margin-bottom: var(--spacing-3xs);
}

.emptyHint {
	font-size: var(--font-size-sm);
	color: var(--color-text-placeholder);
}

/* Modal */
.modalOverlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 200;
	backdrop-filter: blur(4px);
	animation: fadeOverlayIn 0.15s ease;
}

@keyframes fadeOverlayIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

.modal {
	background: var(--color-bg);
	border-radius: var(--radius-lg);
	box-shadow: var(--shadow-lg);
	width: 700px;
	max-width: 90vw;
	max-height: 90vh;
	display: flex;
	flex-direction: column;
	animation: modalSlideIn 0.2s ease;
}

@keyframes modalSlideIn {
	from {
		opacity: 0;
		transform: translateY(8px) scale(0.98);
	}
	to {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
}

.modalHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-md) var(--spacing-lg);
	border-bottom: 1px solid var(--color-border-light);
}

.modalTitle {
	font-size: var(--font-size-xl);
	font-weight: var(--font-weight-semibold);
}

.modalClose {
	background: none;
	border: none;
	color: var(--color-text-lighter);
	cursor: pointer;
	padding: var(--spacing-2xs);
	border-radius: var(--radius-sm);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all var(--transition-fast);
}

.modalClose:hover {
	color: var(--color-text);
	background: var(--color-bg-medium);
}

.modalBody {
	padding: var(--spacing-lg);
	overflow-y: auto;
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing-md);
}

.modalFooter {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing-xs);
	padding: var(--spacing-md) var(--spacing-lg);
	border-top: 1px solid var(--color-border-light);
}

.label {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.labelText {
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-medium);
	color: var(--color-text-light);
}

.input {
	padding: var(--spacing-xs) var(--spacing-sm);
	border: 1px solid var(--color-border);
	border-radius: var(--radius-md);
	font-size: var(--font-size-md);
	font-family: inherit;
	background: var(--color-bg);
	color: var(--color-text);
	transition:
		border-color var(--transition-fast),
		box-shadow var(--transition-fast);
	outline: none;
}

.input:focus {
	border-color: var(--color-primary);
	box-shadow: 0 0 0 3px var(--color-primary-tint-2);
}

.input::placeholder {
	color: var(--color-text-placeholder);
}

.codeEditorWrapper {
	height: 360px;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-md);
	overflow: hidden;
}

.errorBanner {
	padding: var(--spacing-sm);
	background: var(--color-danger-tint);
	border: 1px solid var(--color-danger);
	border-radius: var(--radius-md);
}

.errorText {
	font-family: var(--font-family-mono);
	font-size: var(--font-size-xs);
	color: var(--color-danger-shade);
	white-space: pre-wrap;
	margin: 0;
}
</style>
