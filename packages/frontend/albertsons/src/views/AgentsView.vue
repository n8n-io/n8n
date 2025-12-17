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
				<input type="text" placeholder="Search workflows" />
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
					</tr>
				</thead>

				<tbody>
					<tr v-for="item in userAgentMappingsData" :key="item.id">
						<td>
							<strong>{{ item.workflow.name }}</strong
							><br />
							<small>{{ item.workflow.nodes.length }} nodes</small>
						</td>
						<td>Inventory Management Automation</td>
						<td>
							<span :class="['status', 'Active']">Active</span>
						</td>
						<td>Every 15 min</td>
						<td>ec 13, 04:45 PM</td>
						<td>
							<div class="progress">
								<div class="bar" :style="{ width: item.rate + '%' }"></div>
							</div>
							90%
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<style scoped>
.search-bar {
	display: flex;
	gap: 12px;
	align-items: center;
}

.search-input {
	display: flex;
	align-items: center;
	border: 1px solid skyblue;
	border-radius: 8px;
	padding: 8px 12px;
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
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 8px 14px;
	border: 1px solid #ddd;
	border-radius: 8px;
	background: white;
	cursor: pointer;
}

.icon {
	font-size: 14px;
}

.card {
	background: var(--color--background);
	padding: 16px;
	border-radius: 10px;
	border: 0.6px solid skyblue;
	margin: 10px 0;
}

table {
	width: 100%;
	border-collapse: collapse;
}

th,
td {
	padding: 12px;
	text-align: left;
}

thead {
	background: var(--color--background);
	border-bottom: 0.3px solid skyblue;
	padding: 10px 0;
}

.status {
	padding: 4px 10px;
	border-radius: 12px;
	font-size: 12px;
}

.Active {
	background: #c4efd3;
	color: #0f2f11;
}

.Error {
	background: #f0c9c5;
	color: #b41e1e;
}

.progress {
	height: 6px;
	background: #eee;
	border-radius: 5px;
	margin-bottom: 4px;
}

.bar {
	height: 6px;
	background: #2ecc71;
	border-radius: 5px;
}

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
.tabs {
	display: flex;
	gap: 16px;
	margin-bottom: 16px;
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
