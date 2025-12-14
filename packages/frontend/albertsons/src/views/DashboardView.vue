<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import albertsonsLogo from '../assets/albertsons-logo.png';
import { useTemplatesStore } from '../stores/templates.store';

const router = useRouter();
const workflowsStore = useWorkflowsStore();
const templatesStore = useTemplatesStore();

// ✅ CORRECT n8n bindings
const workflows = computed(() => workflowsStore.allWorkflows);
const loading = computed(() => workflowsStore.isLoading);

async function loadWorkflows() {
	await workflowsStore.fetchWorkflows();
}

function goToNewWorkflow() {
	router.push('/workflow/new');
}

function openWorkflow(id) {
	router.push(`/workflow/${id}`);
}

function publishAsTemplate(id) {
	templatesStore.publishAsTemplate(id);
}

onMounted(() => {
	loadWorkflows();
});
</script>

<template>
	<div class="dashboard">
		<!-- HEADER -->
		<div class="header">
			<img :src="albertsonsLogo" class="logo" />
			<h1>Welcome to Albertsons AI Agent Space</h1>
		</div>

		<!-- METRICS -->
		<div class="metrics">
			<div class="metric-card">
				<span class="metric-label">Total Executions</span>
				<span class="metric-value">2</span>
				<span class="metric-sub">All time</span>
			</div>

			<div class="metric-card success">
				<span class="metric-label">Successful</span>
				<span class="metric-value">2</span>
				<span class="metric-sub">100% success rate</span>
			</div>

			<div class="metric-card danger">
				<span class="metric-label">Failed</span>
				<span class="metric-value">0</span>
				<span class="metric-sub">0% failure rate</span>
			</div>

			<div class="metric-card">
				<span class="metric-label">Avg Duration</span>
				<span class="metric-value">3.1s</span>
				<span class="metric-sub">Per execution</span>
			</div>
		</div>

		<!-- TABS -->
		<div class="tabs">
			<button class="active">My Workflows</button>
			<button disabled>Credentials</button>
			<button disabled>Executions</button>
			<button disabled>Variables</button>
			<button disabled>Data Tables</button>
		</div>

		<!-- ACTIONS -->
		<div class="actions">
			<button class="primary" @click="goToNewWorkflow">+ New Workflow</button>
			<button class="secondary" @click="loadWorkflows">Refresh</button>
		</div>

		<!-- LIST -->
		<div class="list">
			<div v-if="loading" class="state">Loading workflows…</div>
			<div v-else-if="!workflows.length" class="state">No workflows found</div>

			<div
				v-else
				v-for="wf in workflows"
				:key="wf.id"
				class="workflow"
				@click="router.push(`/workflow/${wf.id}`)"
			>
				<h3>{{ wf.name || 'Untitled Workflow' }}</h3>
				<p>Last updated: {{ wf.updatedAt }} · Created: {{ wf.createdAt }}</p>
			</div>
		</div>
	</div>
</template>

<style scoped>
.dashboard {
	padding: 24px;
	background: var(--color--background);
}

.header {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 24px;
}

.logo {
	width: 40px;
	height: 40px;
}

h1 {
	font-size: 24px;
	font-weight: 600;
	color: var(--color--text--shade-1);
}

.metrics {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 16px;
	margin-bottom: 24px;
}

.metric-card {
	background: var(--color--background--light-3);
	border: 1px solid var(--border-color--light);
	border-radius: var(--radius--lg);
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.metric-label {
	font-size: 14px;
	color: var(--color--text--tint-1);
}

.metric-value {
	font-size: 24px;
	font-weight: 700;
	color: var(--color--text--shade-1);
}

.metric-sub {
	font-size: 12px;
	color: var(--color--text--tint-1);
}

.metric-card.success .metric-value {
	color: var(--color--success);
}

.metric-card.danger .metric-value {
	color: var(--color--danger);
}

.tabs {
	display: flex;
	gap: 16px;
	margin-bottom: 16px;
}

.tabs button {
	background: none;
	border: none;
	font-weight: 600;
	color: var(--color--text--tint-1);
	padding-bottom: 6px;
	cursor: pointer;
}

.tabs .active {
	color: var(--color--primary);
	border-bottom: 2px solid var(--color--primary);
}

/* ACTIONS */
.actions {
	display: flex;
	gap: 12px;
	margin-bottom: 24px;
}

.primary {
	background: var(--button--color--background--primary);
	color: var(--button--color--text--primary);
	border-radius: var(--radius);
	padding: 8px 16px;
	border: none;
}

.secondary {
	background: var(--button--color--background--secondary);
	color: var(--button--color--text--secondary);
	border-radius: var(--radius);
	padding: 8px 16px;
	border: var(--border);
}

/* LIST */
.list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.workflow {
	padding: 16px;
	border-radius: var(--radius--lg);
	border: 1px solid var(--border-color--light);
	background: var(--color--background--light-3);
	cursor: pointer;
	font-size: 12px;
	font-weight: 500;
	white-space: nowrap;
	margin-left: 10px;
}

.publish-btn:disabled {
	border-color: #ccc;
	background: #f3f4f6;
	color: #999;
	cursor: default;
}

.workflow:hover {
	background: var(--color--background--light-2);
}

.workflow h3 {
	margin: 0 0 4px;
	font-size: 16px;
	color: var(--color--text--shade-1);
}

.workflow p {
	margin: 0;
	font-size: 12px;
	color: var(--color--text--tint-1);
}

.state {
	font-size: 14px;
	color: var(--color--text--tint-1);
	padding: 24px;
}

/* RESPONSIVE */
@media (max-width: 1024px) {
	.metrics {
		grid-template-columns: repeat(2, 1fr);
	}
}

@media (max-width: 640px) {
	.metrics {
		grid-template-columns: 1fr;
	}
}
</style>
