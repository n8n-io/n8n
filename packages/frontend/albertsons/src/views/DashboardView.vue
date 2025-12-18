<template>
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

		<!-- METRICS GRID - ALL IN ONE LINE -->
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
					-3.2%
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

		<!-- ACTIVITY STREAM -->
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
						<div class="activity-desc">{{ activity.subtitle }}</div>
					</div>
					<div class="activity-time">
						<div class="time-date">{{ activity.date }}</div>
						<div class="time-duration" v-if="activity.time">{{ activity.time }}</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import albertsonsLogo from '../assets/albertsons-logo.png';
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
		// Show placeholder if no workflows
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

	// Convert workflows to activities
	return workflows.value
		.slice() // Create a copy to avoid mutating original
		.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) // Sort by most recent
		.slice(0, 4) // Show only last 4
		.map((workflow) => {
			const updatedDate = new Date(workflow.updatedAt);
			const createdDate = new Date(workflow.createdAt);
			const isNew = updatedDate - createdDate < 60000; // Created in last minute

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

.dashboard {
	width: 100%;
	min-height: 100vh;
	background-color: var(--color--background);
	font-family:
		-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	padding: 20px;
}

/* HEADER */
.header {
	background: var(--color--background--light-3);
	padding: 16px 24px;
	border-radius: var(--radius--lg);
	margin-bottom: 20px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20px;
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
	padding: 8px 12px 8px 36px;
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

/* METRICS ROW - ALL IN ONE LINE */
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
	margin-bottom: 20px;
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

/* RESPONSIVE */
@media (max-width: 1024px) {
	.metrics-row {
		overflow-x: auto;
		scrollbar-width: thin;
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
	}

	.action-btn {
		flex: 1;
		min-width: 140px;
		justify-content: center;
	}
}
</style>
