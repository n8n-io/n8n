<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { albertsonsRestApiRequest } from '@src/utils/albertsonsRestApiRequest';

const router = useRouter();
const userAgentMappingsData = ref([]);

async function loadUserAgentMappingsData() {
	const result = await albertsonsRestApiRequest('GET', `/v1/userAgentMappings/all`);
	userAgentMappingsData.value = result;
	console.log('agents', userAgentMappingsData.value);
}

function goToNewWorkflow() {
	router.push('/workflow/new');
}

onMounted(() => {
	loadUserAgentMappingsData();
});
</script>

<template>
	<div class="dashboard">
		<!-- HEADER : Pulse -->
		<div class="header">
			<div class="header-text">
				<h1>Agents</h1>
				<p class="subtitle">Automate your business processes with intelligent agents</p>
			</div>
			<!-- PRIMARY ACTION -->
			<div class="primary-actions">
				<button class="primary" @click="goToNewWorkflow">+ New Agent</button>
			</div>
		</div>

		<!-- HEADER : Search and Filter -->
		<div class="search-bar">
			<div class="search-input">
				<span class="icon">🔍</span>
				<input type="text" placeholder="Search agents" />
			</div>

			<button class="filter-btn">
				<span class="icon">⏳</span>
				Filters
			</button>
		</div>

		<!-- Agent List -->
		<div class="card">
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Project</th>
						<th>Status</th>
						<th>Trigger</th>
						<th>Last Run</th>
						<th>Success Rate</th>
						<th></th>
					</tr>
				</thead>

				<tbody>
					<tr v-for="item in userAgentMappingsData" :key="item.id" class="workflow_entry">
						<td>
							<strong class="workflow_name">{{ item.workflow.name }}</strong
							><br />
							<small class="txt_secondary">{{ item.workflow.nodes.length }} nodes</small>
						</td>
						<td class="txt_secondary workflow_project">Inventory Management Automation</td>
						<td>
							<span :class="['status', 'Active']">✔️ Active</span>
						</td>
						<td class="txt_secondary">🕓 Schedule (Every 15 min)</td>
						<td class="txt_secondary">Dec 13, 04:45 PM</td>
						<td class="txt_secondary progress_bar">
							<div class="progress">
								<div class="bar" :style="{ width: item.rate + '%' }"></div>
							</div>
							<span> 90% </span>
						</td>
						<td class="txt_secondary">▶️ ⠇</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<style scoped>
.dashboard {
	padding: 24px;
	width: 100%;
	background: var(--color--background);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 24px;
}

.header-text h1 {
	font-size: 20px;
	font-weight: 600;
	color: var(--color-text-primary);
}

.subtitle {
	font-size: 13px;
	color: var(--color-text-secondary);
}

.success {
	color: var(--color--success);
}

.danger {
	color: var(--color--danger);
}

.primary {
	background: var(--color-primary-blue);
	color: var(--button--color--text--primary);
	border-radius: var(--radius);
	padding: 10px 18px;
	border: none;
	font-weight: 600;
	cursor: pointer;
}

/* PRIMARY ACTION */
.primary-actions {
	margin-bottom: 24px;
}
.tabs {
	display: flex;
	gap: 16px;
	margin-bottom: 16px;
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

.search-bar {
	display: flex;
	gap: 12px;
	align-items: center;
}

.search-input {
	background-color: var(--color--background--light-1);
	border: 1px solid var(--border-color--light);
	display: flex;
	align-items: center;
	border-radius: 8px;
	padding: 7px 15px;
	width: 280px;
}

.search-input input {
	background: transparent;
	border: none;
	outline: none;
	margin-left: 8px;
	width: 100%;
}

.filter-btn {
	font-size: 12px;
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 7px 15px;
	border-radius: 8px;
	cursor: pointer;
	color: var(--color-text-primary);
	background-color: var(--color--background--light-1);
	border: 1px solid var(--border-color--light);
}

.icon {
	font-size: 14px;
}

.card {
	border: 1px solid var(--border-color--light);
	background-color: var(--color--background--light-1);
	border-radius: 8px;
	margin: 10px 0;
}

table {
	width: 100%;
	border-collapse: collapse;
}

th {
	text-transform: uppercase;
	font-weight: 500;
	color: var(--color-text-secondary);
	border-bottom: 1px solid var(--border-color--light);
}

th,
td {
	font-size: 12px;
	padding: 20px;
	text-align: left;
	font-weight: 500;
}

thead {
	background: var(--color--background);
	border-bottom: 1px solid var(--color-border-base);
	padding: 10px 8px;
}

.workflow_entry {
	border-bottom: 1px solid var(--border-color--light);
}

.workflow_name .workflow_project {
	font-weight: 600;
	font-size: 14px;
}

.txt_secondary {
	color: var(--color-text-secondary);
}

.status {
	padding: 4px 10px;
	border-radius: 12px;
	font-size: 12px;
}

.Active {
	background: var(--color-light-green);
	color: var(--color--success);
	font-weight: 500;
	font-size: 11px;
}

.Error {
	background: #f0c9c5;
	color: #b41e1e;
}

.progress_bar {
	display: flex;
	align-items: center;
	gap: 2px;
}

.progress {
	height: 6px;
	background: #eee;
	border-radius: 5px;
	width: 3rem;
}

.bar {
	height: 6px;
	background: var(--color--success);
	border-radius: 8px;
}
</style>
