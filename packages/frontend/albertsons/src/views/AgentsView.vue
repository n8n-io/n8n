<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserAgentMappingsStore } from '@src/stores/userAgentMappings.store';
import { Play, EllipsisVertical, Clock, ClockCheck, Pause, Search, Funnel } from 'lucide-vue-next';
import dayjs from 'dayjs';
const router = useRouter();
const userAgentMappingsStore = useUserAgentMappingsStore();

onMounted(async () => {
	await userAgentMappingsStore.fetchUserAgentMappings();
});
const searchQuery = ref('');
const userAgentMappingsData = computed(() => {
	return userAgentMappingsStore.getUserAgentMappings();
});

const filteredUserAgentMappings = computed(() => {
	return userAgentMappingsData.value.filter((item) =>
		item?.workflow?.name?.toLowerCase().includes(searchQuery?.value?.toLowerCase()),
	);
});

function goToNewWorkflow() {
	router.push('/workflow/new');
}

function goToEditWorkflow(id) {
	router.push(`/workflow/${id}`);
}
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
				<Search size="14" color="gray" />
				<input v-model="searchQuery" type="text" placeholder="Search agents" />
			</div>

			<button class="filter-btn">
				<Funnel size="12" />
				Filters
			</button>
		</div>

		<!-- Agent List -->
		<div class="card">
			<table>
				<!-- Agent List : table header -->
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

				<!-- Agent List : table body -->
				<tbody>
					<tr v-for="item in filteredUserAgentMappings" :key="item.id" class="workflow_entry">
						<td class="workflow_name">
							{{ item.workflow.name }}
							<br />
							<small class="txt_secondary">{{ item.workflow.nodes.length }} nodes</small>
						</td>
						<td class="txt_secondary workflow_project">Inventory Management Automation</td>
						<td>
							<span
								:class="['status', item?.workflow?.active ? 'active' : 'inactive']"
								class="workflow_status"
							>
								<ClockCheck v-if="item?.workflow?.active" :size="11" />
								<Pause v-else :size="11" />
								{{ item?.workflow?.active ? 'Active' : 'Inactive' }}
							</span>
						</td>
						<td class="txt_secondary flex">
							<Clock class="clock_icon" />
							{{
								item?.workflow?.nodes?.[0]?.type
									?.split('.')
									?.pop()
									?.replace(/^\w/, (c) => c.toUpperCase()) || ''
							}}
						</td>
						<td class="txt_secondary">
							{{ dayjs(item?.last_execution?.startedAt).format('MMM DD, hh:mm A') }}
						</td>
						<td class="txt_secondary progress_bar">
							<div class="progress">
								<div class="bar" :style="{ width: item?.success_rate + '%' }"></div>
							</div>
							<span> {{ item?.success_rate }}%</span>
						</td>
						<td class="txt_secondary">
							<Play class="action_icons" />
							<EllipsisVertical @click="goToEditWorkflow(item?.workflowId)" class="action_icons" />
						</td>
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
	font-size: 12px;
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
	padding: 8px 15px;
	border-radius: 8px;
	cursor: pointer;
	color: var(--color-text-primary);
	background-color: var(--color--background--light-1);
	border: 1px solid var(--border-color--light);
}

.action_icons {
	height: 16px;
	cursor: pointer;
}

.flex {
	display: flex;
	align-items: center;
}

.clock_icon {
	height: 14px;
	margin-right: 1px;
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

.workflow_status {
	display: inline-flex;
	align-items: center;
	gap: 3px;
}

.txt_secondary {
	color: var(--color-text-secondary);
}

.status {
	padding: 4px 10px;
	border-radius: 12px;
	font-size: 12px;
}

.active {
	background: var(--color-light-green);
	color: var(--color--success);
	font-weight: 500;
	font-size: 11px;
}

.inactive {
	background: var(--color-light-orange);
	color: var(--color-warning-orange);
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
