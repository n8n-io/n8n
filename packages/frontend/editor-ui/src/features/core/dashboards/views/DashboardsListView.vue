<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nButton, N8nLoading, N8nIcon, N8nInput } from '@n8n/design-system';

import { useDashboardsStore } from '@/features/core/dashboards/dashboards.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useMessage } from '@/app/composables/useMessage';
import { ADD_DASHBOARD_MODAL_KEY, DASHBOARD_DETAILS } from '@/features/core/dashboards/constants';
import { hasPermission } from '@/app/utils/rbac/permissions';
import type { DashboardListItem } from '@/features/core/dashboards/dashboards.types';

const message = useMessage();

const route = useRoute();
const router = useRouter();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const dashboardsStore = useDashboardsStore();

const search = ref('');

const projectId = computed(
	() =>
		(route.params.projectId as string | undefined) ??
		projectsStore.currentProjectId ??
		projectsStore.personalProject?.id ??
		'',
);

const canCreate = computed(() => hasPermission(['rbac'], { rbac: { scope: 'dashboard:create' } }));

const filtered = computed(() => {
	const q = search.value.trim().toLowerCase();
	if (!q) return dashboardsStore.dashboards;
	return dashboardsStore.dashboards.filter(
		(d) => d.name.toLowerCase().includes(q) || (d.description ?? '').toLowerCase().includes(q),
	);
});

onMounted(async () => {
	if (projectId.value) {
		await dashboardsStore.fetchDashboards(projectId.value, { take: 50 });
	}
});

function openCreateModal() {
	uiStore.openModal(ADD_DASHBOARD_MODAL_KEY);
}

function openDashboard(id: string) {
	void router.push({ name: DASHBOARD_DETAILS, params: { projectId: projectId.value, id } });
}

function iconBgFor(idx: number) {
	const palette = [
		'linear-gradient(135deg, var(--color--orange-400), var(--color--orange-300))',
		'linear-gradient(135deg, var(--color--purple-600), var(--color--purple-500))',
		'linear-gradient(135deg, var(--color--blue-500), var(--color--blue-200))',
		'linear-gradient(135deg, var(--color--green-600), var(--color--green-300))',
	];
	return palette[idx % palette.length];
}

function widgetCount(d: DashboardListItem): number {
	// We don't fetch full spec in list responses, so this is best-effort.
	// Falls back to 0; the detail view shows the real count.
	return (d as unknown as { spec?: { widgets?: unknown[] } }).spec?.widgets?.length ?? 0;
}

function tagCount(d: DashboardListItem): number {
	return d.tags?.length ?? 0;
}

function timeAgo(iso: string): string {
	const ms = Date.now() - new Date(iso).getTime();
	const m = Math.floor(ms / 60_000);
	if (m < 1) return 'just now';
	if (m < 60) return `${m} min ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	const d = Math.floor(h / 24);
	if (d === 1) return 'yesterday';
	if (d < 7) return `${d} days ago`;
	return new Date(iso).toLocaleDateString();
}

async function renameDashboard(d: DashboardListItem) {
	const result = await message.prompt('Rename dashboard', 'Rename dashboard', {
		confirmButtonText: 'Rename',
		cancelButtonText: 'Cancel',
		inputValue: d.name,
		inputValidator: (val: string) => !!val?.trim() || 'Name is required',
	});
	if (typeof result === 'string' || result.action !== 'confirm') return;
	const next = result.value?.trim();
	if (!next || next === d.name) return;
	await dashboardsStore.updateDashboard(projectId.value, d.id, { name: next });
}

async function duplicateDashboard(d: DashboardListItem) {
	const full = await dashboardsStore.fetchDashboard(projectId.value, d.id);
	if (!full) return;
	await dashboardsStore.createDashboard(projectId.value, {
		name: `${d.name} (copy)`,
		description: full.description ?? undefined,
		spec: full.spec,
		tags: full.tags ?? undefined,
	});
}

async function archiveDashboard(d: DashboardListItem) {
	await dashboardsStore.updateDashboard(projectId.value, d.id, {
		archived: !d.archived,
	});
}

async function deleteDashboard(d: DashboardListItem) {
	const result = await message.confirm(
		`The dashboard "${d.name}" and all its views and widgets will be removed. This cannot be undone.`,
		'Delete dashboard?',
		{
			confirmButtonText: 'Delete',
			cancelButtonText: 'Cancel',
			type: 'warning',
		},
	);
	if (result !== 'confirm') return;
	await dashboardsStore.deleteDashboard(projectId.value, d.id);
}
</script>

<template>
	<div class="dashboards-list">
		<header class="dashboards-list__header">
			<div class="dashboards-list__title">
				<h1>Dashboards</h1>
				<span class="dashboards-list__subtitle"> Interactive views over your data tables </span>
			</div>
			<div class="dashboards-list__actions">
				<N8nButton
					v-if="canCreate"
					type="primary"
					icon="circle-plus"
					label="New dashboard"
					@click="openCreateModal"
				/>
			</div>
		</header>

		<div v-if="!dashboardsStore.loading" class="dashboards-list__toolbar">
			<N8nInput v-model="search" placeholder="Search dashboards…" class="dashboards-list__search" />
		</div>

		<N8nLoading v-if="dashboardsStore.loading" :loading="true" :rows="3" />

		<div v-else-if="filtered.length === 0 && !search" class="dashboards-list__empty">
			<div class="dashboards-list__empty-icon">
				<N8nIcon icon="chart-column-decreasing" size="xlarge" />
			</div>
			<h2>Turn your data into a dashboard</h2>
			<p>
				Describe what you want in plain English. Each dashboard reads from your data tables and can
				fire n8n workflows from any row.
			</p>
			<N8nButton
				v-if="canCreate"
				type="primary"
				label="Create your first dashboard"
				@click="openCreateModal"
			/>
		</div>

		<div v-else class="dashboards-list__grid">
			<div
				v-for="(dashboard, idx) in filtered"
				:key="dashboard.id"
				class="dashboard-card"
				role="link"
				tabindex="0"
				@click="openDashboard(dashboard.id)"
				@keyup.enter="openDashboard(dashboard.id)"
			>
				<div class="dashboard-card__head">
					<span class="dashboard-card__icon" :style="{ background: iconBgFor(idx) }">
						<N8nIcon icon="grid-2x2" size="medium" />
					</span>
					<div class="dashboard-card__title">
						<span class="dashboard-card__name">{{ dashboard.name }}</span>
						<span v-if="dashboard.description" class="dashboard-card__desc">
							{{ dashboard.description }}
						</span>
					</div>
				</div>
				<div class="dashboard-card__chips">
					<span class="dashboard-card__chip">
						<N8nIcon icon="grid-2x2" size="xsmall" />
						{{ widgetCount(dashboard) }} widgets
					</span>
					<span v-if="tagCount(dashboard) > 0" class="dashboard-card__chip">
						{{ tagCount(dashboard) }} tags
					</span>
					<span class="dashboard-card__pill" :class="dashboard.archived ? 'is-draft' : 'is-active'">
						<span class="dashboard-card__pill-dot" />
						{{ dashboard.archived ? 'archived' : 'active' }}
					</span>
				</div>
				<footer class="dashboard-card__footer">
					<span class="dashboard-card__updated"> Updated {{ timeAgo(dashboard.updatedAt) }} </span>
					<div class="dashboard-card__menu">
						<button
							class="dashboard-card__icon-btn"
							title="Rename"
							@click.stop="renameDashboard(dashboard)"
						>
							<N8nIcon icon="square-pen" size="xsmall" />
						</button>
						<button
							class="dashboard-card__icon-btn"
							title="Duplicate"
							@click.stop="duplicateDashboard(dashboard)"
						>
							<N8nIcon icon="clipboard-list" size="xsmall" />
						</button>
						<button
							class="dashboard-card__icon-btn"
							:title="dashboard.archived ? 'Unarchive' : 'Archive'"
							@click.stop="archiveDashboard(dashboard)"
						>
							<N8nIcon
								:icon="dashboard.archived ? 'archive-restore' : 'file-archive'"
								size="xsmall"
							/>
						</button>
						<button
							class="dashboard-card__icon-btn dashboard-card__icon-btn--danger"
							title="Delete"
							@click.stop="deleteDashboard(dashboard)"
						>
							<N8nIcon icon="trash-2" size="xsmall" />
						</button>
					</div>
				</footer>
			</div>

			<button v-if="canCreate" class="dashboard-card dashboard-card--new" @click="openCreateModal">
				<N8nIcon icon="circle-plus" size="large" />
				<span class="dashboard-card__new-title">New dashboard</span>
				<span class="dashboard-card__new-sub">From prompt, JSON, or template</span>
			</button>
		</div>
	</div>
</template>

<style scoped lang="scss">
.dashboards-list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--lg);
	max-width: 1400px;
}

.dashboards-list__header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.dashboards-list__title h1 {
	margin: 0;
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	letter-spacing: -0.01em;
	color: var(--color--text--shade-1);
}

.dashboards-list__subtitle {
	color: var(--color--text);
	font-size: var(--font-size--sm);
}

.dashboards-list__actions {
	display: flex;
	gap: var(--spacing--2xs);
}

.dashboards-list__toolbar {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}

.dashboards-list__search {
	max-width: 320px;
}

.dashboards-list__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
	gap: var(--spacing--md);
}

.dashboards-list__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--3xl) var(--spacing--lg);
	text-align: center;
}

.dashboards-list__empty-icon {
	width: 64px;
	height: 64px;
	border-radius: var(--radius--md);
	background: var(--color--background--shade-1);
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color--text--tint-1);
	margin-bottom: var(--spacing--sm);
}

.dashboards-list__empty h2 {
	margin: 0;
	font-size: var(--font-size--xl);
}

.dashboards-list__empty p {
	max-width: 460px;
	margin: 0 0 var(--spacing--sm);
	color: var(--color--text);
	font-size: var(--font-size--sm);
	line-height: 1.55;
}

.dashboard-card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--md);
	background: var(--color--background--light-3);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--sm);
	text-align: left;
	cursor: pointer;
	transition:
		border-color var(--duration--snappy),
		box-shadow var(--duration--snappy);
	min-height: 160px;
}

.dashboard-card:hover {
	border-color: var(--color--foreground--shade-1);
	box-shadow: var(--shadow--card-hover);
}

.dashboard-card__head {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: flex-start;
}

.dashboard-card__icon {
	width: 36px;
	height: 36px;
	border-radius: var(--radius--xs);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	color: var(--color--neutral-white);
	flex-shrink: 0;
}

.dashboard-card__title {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.dashboard-card__name {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
}

.dashboard-card__desc {
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
	line-height: 1.4;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.dashboard-card__chips {
	display: flex;
	gap: var(--spacing--4xs);
	flex-wrap: wrap;
	align-items: center;
}

.dashboard-card__chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 2px 8px;
	border-radius: var(--radius--full);
	background: var(--color--background--shade-1);
	border: 1px solid var(--color--foreground--tint-1);
	color: var(--color--text);
	font-size: var(--font-size--2xs);
}

.dashboard-card__pill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 2px 8px;
	border-radius: var(--radius--full);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
}

.dashboard-card__pill.is-active {
	background: var(--color--green-50);
	color: var(--color--green-800);
}

.dashboard-card__pill.is-active .dashboard-card__pill-dot {
	background: var(--color--green-600);
}

.dashboard-card__pill.is-draft {
	background: var(--color--gold-50);
	color: var(--color--gold-600);
}

.dashboard-card__pill.is-draft .dashboard-card__pill-dot {
	background: var(--color--gold-500);
}

.dashboard-card__pill-dot {
	width: 6px;
	height: 6px;
	border-radius: var(--radius--full);
}

.dashboard-card__footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: auto;
	padding-top: var(--spacing--2xs);
	border-top: 1px solid var(--color--foreground--tint-1);
}

.dashboard-card__updated {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.dashboard-card__menu {
	display: flex;
	gap: var(--spacing--5xs);
	opacity: 0;
	transition: opacity var(--duration--snappy);
}

.dashboard-card:hover .dashboard-card__menu,
.dashboard-card:focus-within .dashboard-card__menu {
	opacity: 1;
}

.dashboard-card__icon-btn {
	background: none;
	border: none;
	padding: var(--spacing--4xs);
	border-radius: var(--radius--3xs);
	color: var(--color--text--tint-1);
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.dashboard-card__icon-btn:hover {
	background: var(--color--background--shade-1);
	color: var(--color--text--shade-1);
}

.dashboard-card__icon-btn--danger:hover {
	color: var(--color--text--danger);
	background: var(--color--red-50);
}

.dashboard-card--new {
	background: transparent;
	border-style: dashed;
	border-width: 1.5px;
	border-color: var(--color--foreground);
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--4xs);
	color: var(--color--text);
	min-height: 160px;
}

.dashboard-card__new-title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--shade-1);
}

.dashboard-card__new-sub {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}
</style>
