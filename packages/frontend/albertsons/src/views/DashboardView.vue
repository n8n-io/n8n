<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import albertsonsLogo from '../assets/albertsons-logo.png';

const router = useRouter();
const workflowsStore = useWorkflowsStore();

/* n8n bindings – DO NOT TOUCH */
const workflows = computed(() => workflowsStore.allWorkflows);
const loading = computed(() => workflowsStore.isLoading);

async function loadWorkflows() {
	await workflowsStore.fetchWorkflows();
}

function goToNewWorkflow() {
	router.push('/workflow/new');
}

onMounted(() => {
	loadWorkflows();
});
</script>

<template>
	<div class="dashboard">
		<!-- HEADER : Pulse -->
		<div class="header">
			<img :src="albertsonsLogo" class="logo" />
			<div class="header-text">
				<h1>Pulse</h1>
				<p class="subtitle">System Health Dashboard</p>
			</div>
		</div>

		<!-- KPI CARDS -->
		<div class="metrics">
			<div class="metric-card highlight">
				<span class="metric-value">92%</span>
				<span class="metric-label">System Health</span>
				<span class="metric-sub success">Good</span>
			</div>

			<div class="metric-card">
				<span class="metric-value">2</span>
				<span class="metric-label">Total Workflows</span>
				<span class="metric-sub">All time</span>
			</div>

			<div class="metric-card">
				<span class="metric-value success">100%</span>
				<span class="metric-label">Success Rate</span>
				<span class="metric-sub">Last 24h</span>
			</div>

			<div class="metric-card">
				<span class="metric-value danger">0</span>
				<span class="metric-label">Failures</span>
				<span class="metric-sub">Last 24h</span>
			</div>
		</div>

		<!-- PRIMARY ACTION -->
		<div class="primary-actions">
			<button class="primary" @click="goToNewWorkflow">+ Create Agent</button>
		</div>

		<!-- WORKFLOWS SECTION -->
		<div class="section">
			<div class="section-header">
				<h2>My Workflows</h2>
				<button class="secondary" @click="loadWorkflows">Refresh</button>
			</div>

			<div class="list">
				<div v-if="loading" class="state">Loading workflows…</div>
				<div v-else-if="!workflows.length" class="state">No workflows created yet</div>

				<div
					v-else
					v-for="wf in workflows"
					:key="wf.id"
					class="workflow"
					@click="router.push(`/workflow/${wf.id}`)"
				>
					<div class="workflow-info">
						<h3>{{ wf.name || 'Untitled Workflow' }}</h3>
						<p>
							Updated: {{ wf.updatedAt }} · Created:
							{{ wf.createdAt }}
						</p>
					</div>
					<span class="status success">Active</span>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.dashboard {
	padding: 24px;
	width: 100%;
	background: var(--color--background);
}

/* HEADER */
.header {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 24px;
}

.logo {
	width: 36px;
	height: 36px;
}

.header-text h1 {
	font-size: 20px;
	font-weight: 600;
	color: var(--color--text--shade-1);
}

.subtitle {
	font-size: 13px;
	color: var(--color--text--tint-1);
}

/* METRICS */
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

.metric-card.highlight {
	border-left: 4px solid var(--color--primary);
}

.metric-value {
	font-size: 22px;
	font-weight: 700;
	color: var(--color--text--shade-1);
}

.metric-label {
	font-size: 13px;
	color: var(--color--text--tint-1);
}

.metric-sub {
	font-size: 12px;
	color: var(--color--text--tint-1);
}

.success {
	color: var(--color--success);
}

.danger {
	color: var(--color--danger);
}

/* PRIMARY ACTION */
.primary-actions {
	margin-bottom: 24px;
}

.primary {
	background: var(--button--color--background--primary);
	color: var(--button--color--text--primary);
	border-radius: var(--radius);
	padding: 10px 18px;
	border: none;
	font-weight: 600;
}

/* SECTION */
.section {
	background: var(--color--background--light-3);
	border: 1px solid var(--border-color--light);
	border-radius: var(--radius--lg);
	padding: 16px;
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
}

.section-header h2 {
	font-size: 16px;
	font-weight: 600;
}

.secondary {
	background: var(--button--color--background--secondary);
	color: var(--button--color--text--secondary);
	border-radius: var(--radius);
	padding: 6px 12px;
	border: var(--border);
}

/* WORKFLOW LIST */
.list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.workflow {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12px;
	border-radius: var(--radius);
	border: 1px solid var(--border-color--light);
	background: var(--color--background--light-2);
	cursor: pointer;
}

.workflow:hover {
	background: var(--color--background--light-1);
}

.workflow h3 {
	margin: 0;
	font-size: 14px;
}

.workflow p {
	margin: 0;
	font-size: 12px;
	color: var(--color--text--tint-1);
}

.status {
	font-size: 12px;
	font-weight: 600;
}

/* STATE */
.state {
	font-size: 14px;
	color: var(--color--text--tint-1);
	padding: 24px;
	text-align: center;
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
