<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import albertsonsLogo from '../assets/albertsons-logo.png';
import { useTemplatesStore } from '../stores/templates.store';

const router = useRouter();
const templatesStore = useTemplatesStore();

const workflows = ref([]);
const loading = ref(true);

async function loadWorkflows() {
	loading.value = true;
	try {
		const res = await fetch('/rest/workflows');
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

			<div v-else>
				<div v-for="wf in workflows" :key="wf.id" class="workflow-card">
					<div class="workflow-content" @click="openWorkflow(wf.id)">
						<h3>{{ wf.name || 'Untitled Workflow' }}</h3>
						<p>
							Last updated: {{ wf.updatedAt || 'N/A' }} · Created:
							{{ wf.createdAt || 'N/A' }}
						</p>
					</div>

					<button
						class="publish-btn"
						:disabled="templatesStore.isTemplate(wf.id)"
						@click.stop="publishAsTemplate(wf.id)"
					>
						{{ templatesStore.isTemplate(wf.id) ? '✓ Published' : 'Publish' }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.dashboard-page {
	padding: 30px 40px;
}

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

.workflow-list {
	margin-top: 20px;
}

.workflow-card {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 15px;
	border: 1px solid #ddd;
	margin-bottom: 12px;
	border-radius: 6px;
	background: white;
}

.workflow-content {
	cursor: pointer;
	flex: 1;
}

.workflow-content:hover {
	opacity: 0.8;
}

.workflow-card h3 {
	margin: 0;
}

.workflow-card p {
	margin: 5px 0 0 0;
	font-size: 12px;
	color: #666;
}

.publish-btn {
	padding: 6px 14px;
	border: 1px solid #2563eb;
	background: #eff6ff;
	color: #2563eb;
	border-radius: 4px;
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

.publish-btn:hover:not(:disabled) {
	background: #dbeafe;
}

.loading-text,
.empty-state {
	font-size: 14px;
	color: #666;
	padding: 20px;
}
</style>
