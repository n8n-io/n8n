<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from '@/app/composables/useToast';
import { albertsonsRestApiRequest } from '@src/utils/albertsonsRestApiRequest';
import { VIEWS } from '@/app/constants';

interface ExecutionRow {
	id: string;
	workflowId: string;
	workflowName: string | null;
	status: string;
	mode?: string;
	startedAt: string | null;
	finishedAt?: string | null;
	durationMs?: number;
	retryOf?: string | number | null;
	retrySuccessId?: string | number | null;
}

const toast = useToast();
const router = useRouter();

/* top search */
const globalSearch = ref('');

/* in-card search */
const search = ref('');
const statusFilter = ref<'all' | 'success' | 'error' | 'running' | 'waiting'>('all');
const isLoading = ref(false);
const executions = ref<ExecutionRow[]>([]);
const total = ref(0);

async function fetchExecutions() {
	try {
		isLoading.value = true;

		const params = new URLSearchParams();
		if (search.value) params.append('search', search.value);
		if (statusFilter.value !== 'all') params.append('status', statusFilter.value);

		const endpoint =
			params.toString().length > 0
				? `/v1/executions/list?${params.toString()}`
				: '/v1/executions/list';

		const res = await albertsonsRestApiRequest('GET', endpoint);

		const payload = (res as any).data ?? res;
		const data = payload.data ?? payload;

		const items: ExecutionRow[] = (data.items ?? []).map((row: any) => {
			let durationMs: number | undefined = row.durationMs;

			if (row.durationMs !== undefined && row.durationMs !== null) {
				durationMs = Number(row.durationMs);
			} else if (row.startedAt && row.stoppedAt) {
				try {
					const start = new Date(row.startedAt).getTime();
					const stop = new Date(row.stoppedAt).getTime();
					if (!isNaN(start) && !isNaN(stop) && stop >= start) {
						durationMs = Math.max(stop - start, 0);
					}
				} catch (e) {
					console.warn('Failed to parse dates for duration calculation:', e);
				}
			} else if (row.status === 'running' || row.status === 'waiting') {
				durationMs = 0;
			}

			return {
				id: row.id,
				workflowId: row.workflowId,
				workflowName: row.workflowName,
				status: row.status,
				mode: row.mode,
				startedAt: row.startedAt,
				finishedAt: row.stoppedAt ?? row.finishedAt ?? null,
				durationMs,
				retryOf: row.retryOf,
				retrySuccessId: row.retrySuccessId,
			};
		});

		executions.value = items;
		total.value = data.total ?? items.length;
	} catch (error) {
		toast.showError(error, 'Failed to fetch executions');
	} finally {
		isLoading.value = false;
	}
}

function onRefresh() {
	fetchExecutions();
}

/* re-query when filters or in-card search change */
watch([search, statusFilter], () => {
	fetchExecutions();
});

onMounted(() => {
	fetchExecutions();
});

/** Open the executions tab for that workflow, like n8n */
function openExecution(row: ExecutionRow) {
	router.push({
		name: VIEWS.EXECUTION_PREVIEW, // -> /workflow/:name/executions/:executionId/:nodeId?
		params: {
			name: row.workflowId, // matches :name in route
			executionId: row.id, // matches :executionId
			// nodeId is optional; omit it
		},
	});
}

function formatStatus(status: string) {
	if (!status) return '-';
	return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDuration(ms?: number) {
	if (ms === undefined || ms === null) return '-';

	const msNum = Number(ms);
	if (isNaN(msNum) || msNum < 0) return '-';

	if (msNum === 0) {
		const execution = executions.value.find((e) => e.durationMs === ms);
		if (execution && (execution.status === 'running' || execution.status === 'waiting')) {
			return '-';
		}
		return '0s';
	}

	if (msNum < 1000) {
		return `${msNum}ms`;
	}

	const seconds = Math.floor(msNum / 1000);
	if (seconds < 60) {
		return `${seconds}s`;
	}

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;

	if (remainingSeconds > 0) {
		return `${minutes}m ${remainingSeconds}s`;
	}

	return `${minutes}m`;
}

function formatDate(dateString: string | null) {
	if (!dateString) return '–';

	try {
		const date = new Date(dateString);
		const monthNames = [
			'Jan',
			'Feb',
			'Mar',
			'Apr',
			'May',
			'Jun',
			'Jul',
			'Aug',
			'Sep',
			'Oct',
			'Nov',
			'Dec',
		];
		const month = monthNames[date.getMonth()];
		const day = date.getDate();

		let hours = date.getHours();
		const minutes = date.getMinutes().toString().padStart(2, '0');
		const seconds = date.getSeconds().toString().padStart(2, '0');
		const ampm = hours >= 12 ? 'PM' : 'AM';

		hours = hours % 12;
		hours = hours ? hours : 12;

		return `${month} ${day}, ${hours}:${minutes}:${seconds} ${ampm}`;
	} catch (e) {
		return dateString;
	}
}
</script>

<template>
	<div class="executions-page">
		<!-- Top header with title + global search -->
		<header class="main-header">
			<div class="main-header-content">
				<div class="main-header-row">
					<div>
						<h1 class="main-title">Executions</h1>
						<p class="main-subtitle">Monitor agent execution history</p>
					</div>

					<div class="main-header-right">
						<input
							v-model="globalSearch"
							type="text"
							class="global-search-input"
							placeholder="Search workflows, projects..."
						/>
					</div>
				</div>
			</div>
		</header>

		<!-- Executions container -->
		<div class="executions-container">
			<!-- Executions header with card search + filters + refresh (inside card) -->
			<div class="executions-header">
				<div class="executions-header-left">
					<h2 class="executions-title">Executions</h2>
					<p class="executions-subtitle">Monitor agent execution history</p>
				</div>

				<div class="executions-header-right">
					<div class="search-container">
						<input
							v-model="search"
							type="text"
							class="search-input"
							placeholder="Search executions..."
						/>
					</div>
					<button type="button" class="filters-btn-icon">
						<svg
							class="filter-icon"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
						</svg>
					</button>
					<button type="button" class="refresh-btn" @click="onRefresh">Refresh</button>
				</div>
			</div>

			<!-- Status filters -->
			<div class="status-filters">
				<button
					class="status-filter"
					:class="{ 'status-filter--active': statusFilter === 'all' }"
					@click="statusFilter = 'all'"
				>
					All
				</button>
				<button
					class="status-filter"
					:class="{ 'status-filter--active': statusFilter === 'success' }"
					@click="statusFilter = 'success'"
				>
					Success
				</button>
				<button
					class="status-filter"
					:class="{ 'status-filter--active': statusFilter === 'error' }"
					@click="statusFilter = 'error'"
				>
					Error
				</button>
				<button
					class="status-filter"
					:class="{ 'status-filter--active': statusFilter === 'running' }"
					@click="statusFilter = 'running'"
				>
					Running
				</button>
				<button
					class="status-filter"
					:class="{ 'status-filter--active': statusFilter === 'waiting' }"
					@click="statusFilter = 'waiting'"
				>
					Waiting
				</button>

				<div class="runs-count">{{ total }} runs</div>
			</div>

			<!-- Table container -->
			<div class="table-container">
				<table class="executions-table">
					<thead>
						<tr>
							<th class="col-status">STATUS</th>
							<th class="col-agent">AGENT</th>
							<th class="col-project">PROJECT</th>
							<th class="col-triggered">TRIGGERED BY</th>
							<th class="col-started">STARTED</th>
							<th class="col-duration">DURATION</th>
							<th class="col-retries">RETRIES</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in executions"
							:key="row.id"
							:class="{ 'row-error': row.status === 'error' }"
						>
							<td class="col-status">
								<span :class="['status-badge', `status-badge--${row.status}`]">
									{{ formatStatus(row.status) }}
								</span>
							</td>

							<!-- clickable agent name -->
							<td class="col-agent clickable" @click="openExecution(row)">
								<strong>{{ row.workflowName || row.workflowId }}</strong>
							</td>

							<td class="col-project">–</td>
							<td class="col-triggered">{{ formatStatus(row.mode || 'manual') }}</td>
							<td class="col-started">{{ formatDate(row.startedAt) }}</td>
							<td class="col-duration">
								<strong>{{ formatDuration(row.durationMs) }}</strong>
							</td>
							<td class="col-retries">{{ row.retryOf ? 1 : 0 }}</td>
						</tr>

						<tr v-if="!isLoading && executions.length === 0">
							<td colspan="7" class="empty-state">No executions to display</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<style scoped>
/* Base styles */
.executions-page {
	min-height: 100vh;
	background-color: #f8fafc;
	padding: 0;
	width: 100%;
	overflow-x: hidden;
	overflow-y: auto;
}

/* Main header (top of page) */
.main-header {
	padding: 20px 24px;
	background-color: #ffffff;
	border-bottom: 1px solid #e2e8f0;
	width: 100%;
	box-sizing: border-box;
}

.main-header-content {
	width: 100%;
}

.main-header-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 24px;
}

.main-title {
	margin: 0 0 4px 0;
	font-size: 24px;
	font-weight: 600;
	color: #1e293b;
}

.main-subtitle {
	margin: 0;
	font-size: 14px;
	color: #64748b;
}

/* right side of top header */
.main-header-right {
	display: flex;
	align-items: center;
	gap: 12px;
}

/* global search */
.global-search-input {
	width: 360px;
	padding: 8px 16px;
	border-radius: 999px;
	border: 1px solid #e2e8f0;
	background-color: #f8fafc;
	font-size: 14px;
	color: #1e293b;
}

.global-search-input::placeholder {
	color: #94a3b8;
}

/* Executions container (main card) */
.executions-container {
	margin: 20px 24px;
	border-radius: 12px;
	background-color: #ffffff;
	border: 1px solid #e2e8f0;
	box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	width: calc(100% - 48px);
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	max-height: calc(100vh - 140px);
}

/* Executions header */
.executions-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16px 20px 8px;
	border-bottom: 1px solid #e2e8f0;
	width: 100%;
	box-sizing: border-box;
}

.executions-header-left {
	flex: 1;
}

.executions-title {
	margin: 0 0 4px 0;
	font-size: 18px;
	font-weight: 600;
	color: #1e293b;
}

.executions-subtitle {
	margin: 0;
	font-size: 13px;
	color: #64748b;
}

/* card search + filters + refresh inside card */
.executions-header-right {
	display: flex;
	align-items: center;
	gap: 12px;
	justify-content: flex-start;
}

.search-container {
	position: relative;
	width: 260px;
}

.search-input {
	width: 100%;
	padding: 8px 16px;
	padding-left: 40px;
	border-radius: 6px;
	border: 1px solid #e2e8f0;
	background-color: #f8fafc;
	font-size: 14px;
	color: #1e293b;
	height: 36px;
	box-sizing: border-box;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'%3E%3C/circle%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'%3E%3C/line%3E%3C/svg%3E");
	background-repeat: no-repeat;
	background-position: 12px center;
	background-size: 16px;
}

.search-input::placeholder {
	color: #94a3b8;
}

.filters-btn-icon {
	padding: 8px;
	border-radius: 6px;
	border: 1px solid #e2e8f0;
	background-color: #ffffff;
	color: #475569;
	cursor: pointer;
	font-weight: 500;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
}

.filters-btn-icon:hover {
	background-color: #f1f5f9;
}

.filter-icon {
	width: 16px;
	height: 16px;
	color: #64748b;
}

.refresh-btn {
	padding: 8px 16px;
	border-radius: 999px;
	border: 1px solid #e2e8f0;
	background-color: #ffffff;
	font-size: 14px;
	color: #475569;
	cursor: pointer;
	font-weight: 500;
	min-width: 80px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.refresh-btn:hover {
	background-color: #f1f5f9;
}

/* Status filters - pills like wireframe */
.status-filters {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 20px 12px;
	border-bottom: 1px solid #e5e7eb;
	justify-content: flex-end;
}

.status-filter {
	padding: 6px 18px;
	border-radius: 999px;
	border: 1px solid #e5e7eb;
	background-color: #ffffff;
	font-size: 14px;
	color: #4b5563;
	cursor: pointer;
	font-weight: 500;
	line-height: 1;
	transition:
		background-color 0.15s ease,
		color 0.15s ease,
		border-color 0.15s ease;
}

/* ACTIVE pill */
.status-filter--active {
	background-color: #01529f;
	border-color: #01529f;
	color: #ffffff;
}

/* Hover only for inactive pills */
.status-filter:hover:not(.status-filter--active) {
	background-color: #f9fafb;
}

.runs-count {
	margin-left: 16px;
	font-size: 14px;
	color: #64748b;
	font-weight: 500;
}

/* Table container */
.table-container {
	width: 100%;
	overflow-x: auto;
	overflow-y: auto;
	flex: 1;
	padding: 0;
	box-sizing: border-box;
}

.executions-table {
	width: 100%;
	border-collapse: collapse;
	table-layout: fixed;
}

/* Header cells */
.executions-table th {
	font-family:
		Inter,
		system-ui,
		-apple-system,
		BlinkMacSystemFont,
		'Segoe UI',
		sans-serif;
	font-weight: 600;
	color: #6b7280;
	text-transform: uppercase;
	font-size: 12px;
	letter-spacing: 0.06em;
	padding: 16px 20px;
	background-color: #f8fafc;
	white-space: nowrap;
	border-bottom: 1px solid #e2e8f0;
	text-align: left;
	box-sizing: border-box;
}

/* Body cells */
.executions-table td {
	font-family:
		Inter,
		system-ui,
		-apple-system,
		BlinkMacSystemFont,
		'Segoe UI',
		sans-serif;
	color: #4b5563;
	font-size: 14px;
	line-height: 1.5;
	vertical-align: middle;
	white-space: nowrap;
	overflow: visible;
	text-overflow: clip;
	padding: 12px 20px;
	border-bottom: 1px solid #e2e8f0;
	box-sizing: border-box;
}

/* clickable agent */
.clickable {
	cursor: pointer;
}

/* Error row background like n8n */
.row-error {
	background-color: #fef2f2;
}

.row-error:hover {
	background-color: #fee2e2;
}

/* Agent column: bold, darker */
.col-agent {
	width: 20%;
	min-width: 180px;
	color: #1a1a1a;
	font-weight: 600;
	letter-spacing: -0.01em;
}

.col-agent strong {
	font-weight: 600;
}

/* Supporting columns: lighter secondary text */
.col-project,
.col-triggered,
.col-started,
.col-retries {
	color: #6b7280;
	font-weight: 400;
}

/* Duration column: bold */
.col-duration {
	width: 10%;
	min-width: 100px;
	color: #1a1a1a;
	font-weight: 600;
}

/* Widths for other columns */
.col-status {
	width: 10%;
	min-width: 100px;
}

.col-project {
	width: 15%;
	min-width: 120px;
}

.col-triggered {
	width: 15%;
	min-width: 120px;
}

.col-started {
	width: 20%;
	min-width: 180px;
}

.col-retries {
	width: 10%;
	min-width: 80px;
}

.executions-table tr:last-child td {
	border-bottom: none;
}

.empty-state {
	text-align: center;
	padding: 40px 0;
	color: #64748b;
	font-size: 14px;
}

/* Status badges */
.status-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 4px 12px;
	border-radius: 999px;
	font-size: 12px;
	font-weight: 600;
	min-width: 70px;
	text-transform: capitalize;
	white-space: nowrap;
}

.status-badge--success {
	background-color: #d1fae5;
	color: #065f46;
	border: 1px solid #a7f3d0;
}

.status-badge--error {
	background-color: #fee2e2;
	color: #991b1b;
	border: 1px solid #fecaca;
}

.status-badge--running {
	background-color: #dbeafe;
	color: #1e40af;
	border: 1px solid #bfdbfe;
}

.status-badge--waiting {
	background-color: #fef3c7;
	color: #92400e;
	border: 1px solid #fde68a;
}

/* Responsive adjustments */
@media (max-width: 768px) {
	.main-header-row {
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}

	.main-header-right {
		width: 100%;
		justify-content: flex-start;
	}

	.global-search-input {
		width: 100%;
	}

	.executions-header {
		flex-direction: column;
		gap: 16px;
	}

	.executions-header-right {
		width: 100%;
		justify-content: flex-start;
	}

	.search-container {
		flex: 1;
	}

	.status-filters {
		justify-content: flex-start;
		flex-wrap: wrap;
	}
}
</style>
