<template>
	<!-- PAGE WRAPPER WITH INTERNAL SCROLL -->
	<div class="page-shell">
		<div class="page-inner">
			<div class="dashboard-scroll">
				<div class="dashboard">
					<!-- HEADER -->
					<div class="header">
						<h2 class="page-title">Pulse</h2>

						<div class="search-wrapper">
							<svg
								class="search-icon"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<circle cx="11" cy="11" r="8"></circle>
								<path d="m21 21-4.35-4.35"></path>
							</svg>
							<input type="text" placeholder="Search workflows, projects..." class="search-input" />
						</div>

						<div class="header-right">
							<button class="notification-btn">
								<span class="badge">4</span>
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
									<path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
								</svg>
							</button>
						</div>
					</div>

					<!-- METRICS GRID -->
					<div class="metrics-row">
						<!-- System Health Card -->
						<div class="metric-card health-card">
							<div class="health-value">92<span class="percent">%</span></div>
							<div class="health-label">
								<svg
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<polyline points="20 6 9 17 4 12"></polyline>
								</svg>
								<span>System Health</span>
							</div>
							<div class="health-status">Good</div>
							<div class="health-time">
								<svg
									width="10"
									height="10"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<circle cx="12" cy="12" r="10"></circle>
									<polyline points="12 6 12 12 16 14"></polyline>
								</svg>
								Updated 2s ago
							</div>
						</div>

						<!-- Executions Card -->
						<div class="metric-card compact-card">
							<div class="compact-header">
								<span class="card-label">EXECUTIONS (7D)</span>
								<div class="mini-chart blue">
									<div class="bar" style="height: 40%"></div>
									<div class="bar" style="height: 60%"></div>
									<div class="bar" style="height: 80%"></div>
									<div class="bar" style="height: 50%"></div>
									<div class="bar" style="height: 90%"></div>
									<div class="bar" style="height: 70%"></div>
									<div class="bar" style="height: 100%"></div>
								</div>
							</div>
							<div class="compact-value">10,816</div>
							<div class="compact-change positive">
								<svg
									width="8"
									height="8"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
								</svg>
								+12.3%
							</div>
						</div>

						<!-- Success Rate Card -->
						<div class="metric-card compact-card">
							<div class="compact-header">
								<span class="card-label">SUCCESS RATE</span>
								<div class="mini-chart green">
									<div class="bar" style="height: 90%"></div>
									<div class="bar" style="height: 95%"></div>
									<div class="bar" style="height: 85%"></div>
									<div class="bar" style="height: 92%"></div>
									<div class="bar" style="height: 97%"></div>
									<div class="bar" style="height: 93%"></div>
									<div class="bar" style="height: 98%"></div>
								</div>
							</div>
							<div class="compact-value">97.4%</div>
							<div class="compact-change positive">
								<svg
									width="8"
									height="8"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
								</svg>
								+2.1%
							</div>
						</div>

						<!-- Failures Card -->
						<div class="metric-card compact-card">
							<div class="compact-header">
								<span class="card-label">FAILURES (7D)</span>
								<div class="mini-chart red">
									<div class="bar" style="height: 70%"></div>
									<div class="bar" style="height: 50%"></div>
									<div class="bar" style="height: 90%"></div>
									<div class="bar" style="height: 60%"></div>
									<div class="bar" style="height: 40%"></div>
									<div class="bar" style="height: 55%"></div>
									<div class="bar" style="height: 45%"></div>
								</div>
							</div>
							<div class="compact-value">254</div>
							<div class="compact-change negative">
								<svg
									width="8"
									height="8"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
								</svg>
								-5.2%
							</div>
						</div>

						<!-- Active Agents Card -->
						<div class="metric-card compact-card">
							<div class="compact-header">
								<span class="card-label">ACTIVE AGENTS</span>
							</div>
							<div class="compact-value">7</div>
							<div class="compact-change positive">
								<svg
									width="8"
									height="8"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
								</svg>
								+16.7%
							</div>
						</div>
					</div>

					<!-- ACTION BUTTONS -->
					<div class="action-buttons">
						<button class="action-btn primary" @click="goToNewWorkflow">
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<line x1="12" y1="5" x2="12" y2="19"></line>
								<line x1="5" y1="12" x2="19" y2="12"></line>
							</svg>
							Create Agent
						</button>
						<button class="action-btn secondary">
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<polygon points="5 3 19 12 5 21 5 3"></polygon>
							</svg>
							View Executions
						</button>
						<button class="action-btn secondary">
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
							</svg>
							Projects
						</button>
					</div>

					<!-- ROW: NEEDS ATTENTION + MVP AGENTS (SIDE BY SIDE) -->
					<div class="attention-mvp-row">
						<!-- NEEDS ATTENTION -->
						<div class="needs-attention">
							<div class="needs-header">
								<div class="needs-title">
									<svg
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<circle cx="12" cy="12" r="10"></circle>
										<line x1="12" y1="8" x2="12" y2="12"></line>
										<line x1="12" y1="16" x2="12.01" y2="16"></line>
									</svg>
									<span>Needs Attention</span>
								</div>
							</div>

							<div class="needs-list">
								<!-- Card 1 -->
								<div class="needs-item critical">
									<div class="needs-left">
										<div class="needs-badge critical-badge">Critical</div>
										<div class="needs-main">
											<div class="needs-name">Expense Anomaly Detection</div>
											<div class="needs-desc">
												Database connection timeout &mdash; unable to fetch expense records
											</div>
										</div>
									</div>
									<div class="needs-right">
										<div class="needs-date">Last run: 13/12/2024</div>
										<button class="needs-btn fix">Fix Now</button>
									</div>
								</div>

								<!-- Card 2 -->
								<div class="needs-item warning">
									<div class="needs-left">
										<div class="needs-badge warning-badge">Warning</div>
										<div class="needs-main">
											<div class="needs-name">Expense Anomaly Detection</div>
											<div class="needs-desc">Success rate dropped to 82.1%</div>
										</div>
									</div>
									<div class="needs-right">
										<div class="needs-date">Last run: 13/12/2024</div>
										<button class="needs-btn review">Review</button>
									</div>
								</div>
							</div>
						</div>

						<!-- MVP AGENTS -->
						<div class="mvp-card">
							<div class="mvp-header">
								<div class="mvp-title">MVP Agents</div>
								<button class="mvp-view-all">View all agents</button>
							</div>

							<div class="mvp-list">
								<div class="mvp-item" v-for="agent in mvpAgents" :key="agent.rank">
									<div class="mvp-rank">{{ agent.rank }}</div>
									<div class="mvp-main">
										<div class="mvp-name">{{ agent.name }}</div>
										<div class="mvp-metrics">
											<span class="mvp-runs">{{ agent.runs }} runs</span>
											<span class="mvp-success">{{ agent.successRate }}% SR</span>
										</div>
									</div>
									<div class="mvp-right">
										<div class="mvp-badge" :class="{ 'mvp-hot': agent.hot }">
											{{ agent.badge }}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- BOTTOM GRID: ACTIVITY + 7-DAY TREND -->
					<div class="bottom-grid">
						<div class="bottom-left">
							<div class="activity-section">
								<div class="activity-header">
									<div class="activity-title">
										<span class="live-dot"></span>
										<span class="live-text">LIVE</span>
										Activity Stream
									</div>
									<a href="#" class="view-all">
										View all
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
										>
											<line x1="5" y1="12" x2="19" y2="12"></line>
											<polyline points="12 5 19 12 12 19"></polyline>
										</svg>
									</a>
								</div>

								<div class="activity-list">
									<div v-if="loading" class="activity-placeholder">
										<div class="placeholder-icon">⏳</div>
										<div class="placeholder-text">Loading activities...</div>
									</div>
									<div
										v-else
										v-for="activity in activities"
										:key="activity.id"
										class="activity-item"
										@click="activity.id !== 'placeholder-1' && openWorkflow(activity.id)"
										:class="{ clickable: activity.id !== 'placeholder-1' }"
									>
										<div class="activity-icon" :class="activity.type">
											{{ activity.icon }}
										</div>
										<div class="activity-info">
											<div class="activity-name">{{ activity.title }}</div>
											<div class="activity-desc">
												{{ activity.subtitle }}
											</div>
										</div>
										<div class="activity-time">
											<div class="time-date">{{ activity.date }}</div>
											<div class="time-duration" v-if="activity.time">
												{{ activity.time }}
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						<div class="bottom-right">
							<div class="trend-card">
								<div class="trend-header">
									<div class="trend-title">7-Day Trend</div>
								</div>
								<div class="trend-body">
									<div class="trend-legend">
										<span class="legend-item">
											<span class="legend-dot success-dot"></span> Success
										</span>
										<span class="legend-item">
											<span class="legend-dot failure-dot"></span> Failures
										</span>
									</div>
									<div class="trend-chart">
										<div class="trend-column" v-for="(day, idx) in trendData" :key="idx">
											<div class="trend-bars">
												<div class="trend-bar success" :style="{ height: day.success + '%' }"></div>
												<div class="trend-bar failure" :style="{ height: day.failure + '%' }"></div>
											</div>
											<div class="trend-label">{{ day.label }}</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<!-- END dashboard inner -->
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useTemplatesStore } from '../stores/templates.store';

const router = useRouter();
const workflowsStore = useWorkflowsStore();
const templatesStore = useTemplatesStore();

/* n8n bindings – DO NOT TOUCH */
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

// Dashboard data - computed from real workflows
const activities = computed(() => {
	if (!workflows.value || workflows.value.length === 0) {
		return [
			{
				id: 'placeholder-1',
				type: 'info',
				icon: '📋',
				title: 'No activities yet',
				subtitle: 'Create your first agent to see activity here',
				date: new Date().toLocaleDateString('en-GB'),
				time: '',
			},
		];
	}

	return workflows.value
		.slice()
		.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
		.slice(0, 4)
		.map((workflow) => {
			const updatedDate = new Date(workflow.updatedAt);
			const createdDate = new Date(workflow.createdAt);
			const isNew = updatedDate - createdDate < 60000;

			return {
				id: workflow.id,
				type: isNew ? 'success' : 'info',
				icon: isNew ? '✨' : '📋',
				title: workflow.name || 'Untitled Workflow',
				subtitle: isNew ? 'Workflow Created' : 'Workflow Updated',
				date: updatedDate.toLocaleDateString('en-GB'),
				time: updatedDate.toLocaleTimeString('en-GB', {
					hour: '2-digit',
					minute: '2-digit',
				}),
			};
		});
});

const mvpAgents = [
	{
		rank: 1,
		name: 'Reward Points Calculator',
		runs: '15,732',
		successRate: '99.8',
		badge: '132 runs successful in a row',
		hot: true,
	},
	{
		rank: 2,
		name: 'Delivery Tracking Updates',
		runs: '3,421',
		successRate: '99.1',
		badge: 'Top performer',
		hot: false,
	},
	{
		rank: 3,
		name: 'Low Stock Alert',
		runs: '1,245',
		successRate: '99.2',
		badge: 'Stable',
		hot: false,
	},
	{
		rank: 4,
		name: 'Daily Inventory Sync',
		runs: '342',
		successRate: '98.5',
		badge: 'On track',
		hot: false,
	},
	{
		rank: 5,
		name: 'Shift Assignment Notifier',
		runs: '89',
		successRate: '100.0',
		badge: 'New',
		hot: false,
	},
];

const trendData = [
	{ label: 'Thu', success: 85, failure: 20 },
	{ label: 'Fri', success: 90, failure: 25 },
	{ label: 'Sat', success: 92, failure: 18 },
	{ label: 'Sun', success: 95, failure: 15 },
	{ label: 'Mon', success: 97, failure: 12 },
	{ label: 'Tue', success: 96, failure: 14 },
	{ label: 'Wed', success: 98, failure: 10 },
];

onMounted(() => {
	loadWorkflows();
});
</script>

<style scoped>
* {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
}

/* outer shell to give internal scroll */
.page-shell {
	width: 100%;
	height: 100vh;
	background: var(--color--background);
	display: flex;
	justify-content: center;
	align-items: stretch;
}

.page-inner {
	flex: 1;
	display: flex;
}

.dashboard-scroll {
	flex: 1;
	overflow-y: auto;
}

/* main dashboard content */
.dashboard {
	width: 100%;
	min-height: 100%;
	padding: 20px;
}

/* HEADER */
.header {
	background: var(--color--background--light-3);
	padding: 10px 24px; /* was 16px 24px */
	border-radius: var(--radius--lg);
	margin-bottom: 16px; /* slightly smaller gap below */
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px; /* a bit tighter */
	box-shadow: var(--shadow--light);
}

.page-title {
	font-size: 20px;
	font-weight: 600;
	color: var(--color--text--shade-1);
	flex-shrink: 0;
}

.search-wrapper {
	position: relative;
	flex: 1;
	max-width: 500px;
	margin: 0 auto;
}

.search-icon {
	position: absolute;
	left: 12px;
	top: 50%;
	transform: translateY(-50%);
	color: var(--color--text--tint-1);
}

.search-input {
	width: 100%;
	padding: 6px 12px 6px 34px;
	border: var(--border);
	border-radius: var(--radius);
	font-size: 13px;
	color: var(--color--text--shade-1);
	background: var(--color--background--light-3);
	outline: none;
	transition: border-color 0.2s;
}

.search-input::placeholder {
	color: var(--color--text--tint-1);
}

.search-input:focus {
	border-color: var(--color--primary);
}

.header-right {
	flex-shrink: 0;
}

.notification-btn {
	position: relative;
	width: 40px;
	height: 40px;
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--background--light-3);
	color: var(--color--text);
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s;
}

.notification-btn:hover {
	background: var(--color--background--light-2);
}

.badge {
	position: absolute;
	top: -4px;
	right: -4px;
	background: var(--color--primary);
	color: var(--color--text--tint-3);
	font-size: 9px;
	font-weight: 600;
	padding: 2px 5px;
	border-radius: 8px;
	line-height: 1;
}

/* METRICS ROW */
.metrics-row {
	display: flex;
	gap: 20px;
	margin-bottom: 20px;
	overflow-x: auto;
}

.metric-card {
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: 20px;
	transition: all 0.2s;
	box-shadow: var(--shadow--light);
	flex: 1;
	min-width: 160px;
}

.metric-card:hover {
	box-shadow: var(--shadow);
}

/* Health Card */
.health-card {
	border: 2px solid var(--color--success);
}

.health-value {
	font-size: 48px;
	font-weight: 700;
	color: var(--color--text--shade-1);
	line-height: 1;
	margin-bottom: 10px;
}

.percent {
	font-size: 24px;
}

.health-label {
	display: flex;
	align-items: center;
	gap: 5px;
	font-size: 12px;
	color: var(--color--text);
	margin-bottom: 8px;
}

.health-label svg {
	stroke: var(--color--success);
}

.health-status {
	display: inline-block;
	background: var(--color--success--tint-4);
	color: var(--color--success--shade-1);
	padding: 3px 10px;
	border-radius: 10px;
	font-size: 11px;
	font-weight: 600;
	margin-bottom: 8px;
}

.health-time {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 10px;
	color: var(--color--text--tint-1);
}

/* Compact Cards */
.compact-card {
	display: flex;
	flex-direction: column;
}

.compact-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
}

.card-label {
	font-size: 10px;
	font-weight: 600;
	color: var(--color--text);
	letter-spacing: 0.3px;
}

.mini-chart {
	display: flex;
	align-items: flex-end;
	gap: 2px;
	height: 18px;
}

.mini-chart .bar {
	width: 3.5px;
	border-radius: 2px;
	transition: all 0.2s;
}

.mini-chart.blue .bar {
	background: var(--color--primary--tint-1);
}

.mini-chart.green .bar {
	background: var(--color--success--tint-1);
}

.mini-chart.red .bar {
	background: var(--color--danger--tint-1);
}

.compact-value {
	font-size: 32px;
	font-weight: 700;
	color: var(--color--text--shade-1);
	margin-bottom: 6px;
	line-height: 1;
}

.compact-change {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	font-weight: 600;
}

.compact-change.positive {
	color: var(--color--success);
}

.compact-change.negative {
	color: var(--color--danger);
}

/* ACTION BUTTONS */
.action-buttons {
	display: flex;
	gap: 10px;
	margin-bottom: 16px;
}

.action-btn {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 8px 16px;
	border-radius: var(--radius);
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s;
	border: none;
}

.action-btn.primary {
	background: var(--button--color--background--primary);
	color: var(--button--color--text--primary);
	border: 1px solid var(--button--border-color--primary);
}

.action-btn.primary:hover {
	background: var(--button--color--background--primary--hover-active-focus);
	border-color: var(--button--border-color--primary--hover-active);
}

.action-btn.secondary {
	background: var(--button--color--background--secondary);
	color: var(--button--color--text--secondary);
	border: 1px solid var(--button--border-color--secondary);
}

.action-btn.secondary:hover {
	background: var(--button--color--background--secondary--hover);
	color: var(--button--color--text--secondary--hover-active-focus);
	border-color: var(--button--border-color--secondary--hover-active-focus);
}

/* ROW: Needs Attention + MVP */
.attention-mvp-row {
	display: grid;
	grid-template-columns: minmax(0, 2.1fr) minmax(280px, 1fr);
	gap: 20px;
	margin-bottom: 10px;
	align-items: start;
}

/* NEEDS ATTENTION */
.needs-attention {
	background: var(--color--background--light-3);
	border-radius: 12px; /* a bit more rounded like design */
	border: 1px solid var(--color--danger--tint-1);
	padding: 12px 16px 10px; /* reduced bottom padding */
	box-shadow: var(--shadow--light);
}

.needs-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8px; /* smaller gap below title */
}

.needs-list {
	background: #fff; /* light inner panel like first image */
	border-radius: 10px;
	padding: 4px 4px 6px; /* very small internal padding */
	display: flex;
	flex-direction: column;
	gap: 6px; /* tight gap between the two items */
}

.needs-title svg {
	stroke: var(--color--danger);
}

.needs-list {
	display: flex;
	flex-direction: column;
	gap: 6px; /* was 8px – reduces visual gap */
}

.needs-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 6px 12px; /* was 8px 12px */
	border-radius: var(--radius);
	background: var(--color--background--light-2);
	border: 1px solid var(--color--background--light-1);
}

.needs-item.critical {
	background: rgba(248, 113, 113, 0.04);
	border-color: var(--color--danger--tint-2);
}

.needs-item.warning {
	background: rgba(249, 200, 115, 0.06);
	border-color: var(--color--warning--tint-2);
}

.needs-left {
	display: flex;
	align-items: flex-start;
	gap: 10px;
}

.needs-badge {
	font-size: 10px;
	font-weight: 700;
	padding: 3px 8px;
	border-radius: 999px;
	white-space: nowrap;
	margin-top: 2px;
}

.critical-badge {
	background: var(--color--danger--tint-4);
	color: var(--color--danger--shade-1);
}

.warning-badge {
	background: var(--color--warning--tint-4);
	color: var(--color--warning--shade-1);
}

.needs-main {
	display: flex;
	flex-direction: column;
	gap: 0; /* remove extra gap between title and subtitle */
}

.needs-name {
	font-size: 13px;
	font-weight: 600;
	color: var(--color--text--shade-1);
	margin: 0; /* IMPORTANT: remove default margin */
	line-height: 1.2;
}

.needs-desc {
	font-size: 11px;
	color: var(--color--text--tint-1);
	margin: 2px 0 0; /* tiny space under title, none below */
	line-height: 1.2;
}

.needs-right {
	text-align: right;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 3px; /* was 6px */
}

.needs-date {
	font-size: 11px;
	color: var(--color--text--tint-1);
}

.needs-btn {
	font-size: 11px;
	font-weight: 600;
	border-radius: 999px;
	padding: 4px 12px;
	border: none;
	cursor: pointer;
	transition: all 0.2s;
}

.needs-btn.fix {
	background: var(--color--danger);
	color: var(--color--text--tint-3);
}

.needs-btn.fix:hover {
	opacity: 0.9;
}

.needs-btn.review {
	background: var(--color--background--light-3);
	color: var(--color--text--shade-1);
	border: 1px solid var(--color--border--subtle);
}

/* MVP AGENTS */
.mvp-card {
	background: var(--color--background--light-3);
	border-radius: var(--radius--lg);
	border: var(--border);
	padding: 18px;
	box-shadow: var(--shadow--light);
}

.mvp-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8px;
}

.mvp-title {
	font-size: 13px;
	font-weight: 600;
	color: var(--color--text--shade-1);
}

.mvp-view-all {
	font-size: 11px;
	color: var(--link--color--secondary);
	background: transparent;
	border: none;
	cursor: pointer;
	padding: 0;
}

.mvp-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin-top: 6px;
}

.mvp-item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 6px;
	border-radius: var(--radius);
}

.mvp-item:hover {
	background: var(--color--background--light-2);
}

.mvp-rank {
	width: 18px;
	height: 18px;
	border-radius: 999px;
	font-size: 11px;
	font-weight: 600;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color--background--light-2);
	color: var(--color--text--shade-1);
	flex-shrink: 0;
}

.mvp-main {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.mvp-name {
	font-size: 12px;
	font-weight: 600;
	color: var(--color--text--shade-1);
}

.mvp-metrics {
	font-size: 11px;
	color: var(--color--text--tint-1);
	display: flex;
	gap: 8px;
}

.mvp-right {
	display: flex;
	align-items: center;
	justify-content: flex-end;
}

.mvp-badge {
	font-size: 10px;
	padding: 3px 8px;
	border-radius: 999px;
	background: var(--color--background--light-2);
	color: var(--color--text--shade-1);
	white-space: nowrap;
}

.mvp-hot {
	background: var(--color--success--tint-4);
	color: var(--color--success--shade-1);
}

/* BOTTOM GRID */
.bottom-grid {
	display: grid;
	grid-template-columns: minmax(0, 2.1fr) minmax(280px, 1fr);
	gap: 20px;
	align-items: flex-start;
	margin-top: 0px; /* 👈 adjust once (120–160px range) */
}

.bottom-left {
	display: flex;
	flex-direction: column;
	margin-top: -140px;
}

.bottom-right {
	display: flex;
	flex-direction: column;
	margin-top: -0px;
}

/* ACTIVITY STREAM */
.activity-section {
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: 20px;
	box-shadow: var(--shadow--light);
}

.activity-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;
}

.activity-title {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 14px;
	font-weight: 600;
	color: var(--color--text--shade-1);
}

.live-dot {
	width: 6px;
	height: 6px;
	background: var(--color--danger);
	border-radius: 50%;
	animation: pulse 2s infinite;
}

@keyframes pulse {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
}

.live-text {
	color: var(--color--danger);
	font-size: 10px;
	font-weight: 700;
	letter-spacing: 0.5px;
}

.view-all {
	display: flex;
	align-items: center;
	gap: 3px;
	color: var(--link--color--secondary);
	text-decoration: none;
	font-size: 12px;
	font-weight: 500;
	transition: color 0.2s;
}

.view-all:hover {
	color: var(--link--color--secondary--hover);
}

.activity-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.activity-item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px;
	border-radius: var(--radius);
	transition: background 0.2s;
}

.activity-item.clickable {
	cursor: pointer;
}

.activity-item.clickable:hover {
	background: var(--color--background--light-2);
}

.activity-placeholder {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 20px;
	text-align: center;
}

.placeholder-icon {
	font-size: 48px;
	margin-bottom: 12px;
	opacity: 0.5;
}

.placeholder-text {
	font-size: 14px;
	color: var(--color--text);
	font-weight: 500;
}

.activity-icon {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 16px;
	flex-shrink: 0;
}

.activity-icon.alert {
	background: var(--color--warning--tint-2);
}

.activity-icon.success {
	background: var(--color--success--tint-4);
}

.activity-icon.info {
	background: var(--color--info--tint-2);
}

.activity-icon.error {
	background: var(--color--danger--tint-4);
}

.activity-info {
	flex: 1;
}

.activity-name {
	font-size: 13px;
	font-weight: 600;
	color: var(--color--text--shade-1);
	margin-bottom: 2px;
}

.activity-desc {
	font-size: 12px;
	color: var(--color--text);
}

.activity-time {
	text-align: right;
	flex-shrink: 0;
}

.time-date {
	font-size: 11px;
	color: var(--color--text);
}

.time-duration {
	font-size: 10px;
	color: var(--color--text--tint-1);
	margin-top: 1px;
}

/* 7-DAY TREND */
.trend-card {
	background: var(--color--background--light-3);
	border-radius: var(--radius--lg);
	border: var(--border);
	padding: 18px;
	box-shadow: var(--shadow--light);
}

.trend-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 10px;
}

.trend-title {
	font-size: 13px;
	font-weight: 600;
	color: var(--color--text--shade-1);
}

.trend-body {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.trend-legend {
	display: flex;
	justify-content: flex-start;
	gap: 16px;
	font-size: 10px;
	color: var(--color--text--tint-1);
}

.legend-item {
	display: flex;
	align-items: center;
	gap: 4px;
}

.legend-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
}

.success-dot {
	background: var(--color--success);
}

.failure-dot {
	background: var(--color--danger);
}

.trend-chart {
	margin-top: 4px;
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 4px;
	height: 120px;
}

.trend-column {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
	gap: 4px;
	flex: 1;
}

.trend-bars {
	display: flex;
	align-items: flex-end;
	gap: 3px;
	width: 100%;
	justify-content: center;
	height: 100%;
}

.trend-bar {
	width: 6px;
	border-radius: 3px;
}

.trend-bar.success {
	background: var(--color--success--tint-1);
}

.trend-bar.failure {
	background: var(--color--danger--tint-1);
}

.trend-label {
	font-size: 10px;
	color: var(--color--text--tint-1);
}

/* RESPONSIVE */
@media (max-width: 1200px) {
	.attention-mvp-row,
	.bottom-grid {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 768px) {
	.dashboard {
		padding: 12px;
	}

	.header {
		flex-wrap: wrap;
		gap: 10px;
	}

	.action-buttons {
		flex-wrap: wrap;
		margin-top: 12px;
	}

	.action-btn {
		flex: 1;
		min-width: 140px;
		justify-content: center;
	}
}
</style>
