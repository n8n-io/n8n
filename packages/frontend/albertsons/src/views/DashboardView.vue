<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import albertsonsLogo from '../assets/albertsons-logo.png';

const router = useRouter();

const workflows = ref([]);
const loading = ref(true);

// ----------------------------------------
// DIRECT CALL TO n8n REST API (WORKS 100%)
// ----------------------------------------
async function loadWorkflows() {
	loading.value = true;

	try {
		const res = await fetch('http://localhost:8080/rest/workflows');
		const data = await res.json();

		workflows.value = data.data || [];
	} catch (err) {
		console.error('Error fetching workflows:', err);
	} finally {
		loading.value = false;
	}
}

function goToNewWorkflow() {
	router.push('/workflow/new');
}

onMounted(() => {
	loadWorkflows();
});
</script>

<template>
	<div class="dashboard-page">
		<!-- HEADER -->
		<div class="header">
			<img :src="albertsonsLogo" class="logo" alt="Albertsons" />
			<div class="title-block">
				<h1>Welcome to Albertsons AI Agent Space</h1>
			</div>
		</div>

		<!-- METRICS -->
		<div class="metrics">
			<div class="metric-box">
				<span class="label">Total Executions</span>
				<span class="value">2</span>
			</div>
			<div class="metric-box">
				<span class="label">Successful</span>
				<span class="value green">2</span>
			</div>
			<div class="metric-box">
				<span class="label">Failed</span>
				<span class="value red">0</span>
			</div>
			<div class="metric-box">
				<span class="label">Avg Duration</span>
				<span class="value">3.1s</span>
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

		<!-- ACTION BUTTONS -->
		<div class="actions">
			<button class="new-btn" @click="goToNewWorkflow">+ New Workflow</button>
			<button class="refresh-btn" @click="loadWorkflows">Refresh</button>
		</div>

		<!-- WORKFLOWS LIST -->
		<div class="workflow-list">
			<div v-if="loading" class="loading-text">Loading workflows...</div>

			<div v-else-if="workflows.length === 0" class="empty-state">
				No workflows found. Create your first workflow!
			</div>

			<div
				v-else
				v-for="wf in workflows"
				:key="wf.id"
				class="workflow-card"
				@click="router.push(`/workflow/${wf.id}`)"
			>
				<h3>{{ wf.name || 'Untitled Workflow' }}</h3>
				<p>Last updated: {{ wf.updatedAt || 'N/A' }} · Created: {{ wf.createdAt || 'N/A' }}</p>
			</div>
		</div>
	</div>
</template>

<style scoped>
.dashboard-page {
	padding: 30px 40px;
}

/* HEADER */
.header {
	display: flex;
	align-items: center;
	gap: 14px;
	margin-bottom: 30px;
}

.logo {
	height: 40px;
	width: 40px;
}

.title-block h1 {
	margin: 0;
	font-size: 24px;
	font-weight: 600;
	color: #111827;
}

/* METRICS */
.metrics {
	display: flex;
	gap: 20px;
	margin-bottom: 30px;
}

.metric-box {
	width: 200px;
	background: #fff;
	padding: 20px;
	border-radius: 10px;
	border: 1px solid #ddd;
}

.label {
	display: block;
	font-size: 14px;
	margin-bottom: 5px;
	color: #555;
}

.value {
	font-size: 24px;
	font-weight: bold;
}

.green {
	color: green;
}
.red {
	color: red;
}

/* TABS */
.tabs {
	display: flex;
	gap: 15px;
	margin-bottom: 20px;
}

.tabs button {
	background: none;
	border: none;
	padding: 10px 15px;
	cursor: pointer;
	font-weight: 600;
}

.tabs .active {
	border-bottom: 3px solid #0055ff;
}

/* ACTION BUTTONS */
.actions {
	display: flex;
	gap: 15px;
	margin-bottom: 20px;
}

.new-btn {
	background: #0066ff;
	color: #fff;
	padding: 8px 16px;
	border-radius: 6px;
	cursor: pointer;
	border: none;
}

.refresh-btn {
	padding: 8px 14px;
	border-radius: 6px;
	border: 1px solid #aaa;
	cursor: pointer;
}

/* WORKFLOW LIST */
.workflow-list {
	margin-top: 20px;
}

.workflow-card {
	padding: 15px;
	border: 1px solid #ddd;
	margin-bottom: 12px;
	border-radius: 6px;
	background: white;
	cursor: pointer;
}

.workflow-card:hover {
	background: #f7faff;
}

/* Loading + Empty States */
.loading-text,
.empty-state {
	font-size: 14px;
	color: #666;
	padding: 20px;
}
</style>
