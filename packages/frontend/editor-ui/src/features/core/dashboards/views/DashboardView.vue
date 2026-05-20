<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nActionDropdown, N8nBadge, N8nButton, N8nIcon, N8nLoading } from '@n8n/design-system';

import DashboardGrid from '@/features/core/dashboards/components/DashboardGrid.vue';
import ViewTabBar from '@/features/core/dashboards/components/ViewTabBar.vue';
import WidgetSettingsDrawer from '@/features/core/dashboards/components/edit/WidgetSettingsDrawer.vue';
import DashboardSettingsDrawer from '@/features/core/dashboards/components/edit/DashboardSettingsDrawer.vue';
import DashboardShareDialog from '@/features/core/dashboards/components/edit/DashboardShareDialog.vue';
import { useDashboardsStore } from '@/features/core/dashboards/dashboards.store';
import { useMessage } from '@/app/composables/useMessage';
import type { DashboardAction } from '@/features/core/dashboards/dashboards.types';

const message = useMessage();
const settingsOpen = ref(false);
const shareOpen = ref(false);
import type {
	DashboardView,
	DashboardWidget,
	NormalizedDashboardSpec,
} from '@/features/core/dashboards/dashboards.types';
import { PROJECT_DASHBOARDS } from '@/features/core/dashboards/constants';
import { hasPermission } from '@/app/utils/rbac/permissions';

const route = useRoute();
const router = useRouter();
const dashboardsStore = useDashboardsStore();

const projectId = computed(() => route.params.projectId as string);
const dashboardId = computed(() => route.params.id as string);

const dashboard = computed(() => dashboardsStore.activeDashboard);
const editingWidget = ref<DashboardWidget | null>(null);
const activeViewId = ref<string>('');

const canEdit = computed(() => hasPermission(['rbac'], { rbac: { scope: 'dashboard:update' } }));

const spec = computed<NormalizedDashboardSpec | null>(() => {
	if (!dashboard.value) return null;
	// `migrateSpec` already ran on fetch — assert the views shape.
	return dashboard.value.spec as unknown as NormalizedDashboardSpec;
});

const widgetCount = computed(() => {
	if (!spec.value) return 0;
	return spec.value.views.reduce((sum, v) => sum + v.widgets.length, 0);
});

const lastEdited = computed(() => {
	if (!dashboard.value?.updatedAt) return '';
	const ms = Date.now() - new Date(dashboard.value.updatedAt).getTime();
	const m = Math.floor(ms / 60_000);
	if (m < 1) return 'just now';
	if (m < 60) return `${m} min ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	return `${Math.floor(h / 24)} days ago`;
});

const overflowItems = computed(() => [
	{ id: 'duplicate', label: 'Duplicate', icon: 'clipboard-list' as const },
	{ id: 'export', label: 'Export JSON', icon: 'file-down' as const, divided: true },
	{
		id: 'archive',
		label: dashboard.value?.archived ? 'Unarchive' : 'Archive',
		icon: dashboard.value?.archived ? ('archive-restore' as const) : ('file-archive' as const),
	},
	{ id: 'delete', label: 'Delete', icon: 'trash-2' as const },
]);

onMounted(async () => {
	await dashboardsStore.fetchDashboard(projectId.value, dashboardId.value);
});

watch(spec, (next) => {
	if (!next) return;
	if (!activeViewId.value || !next.views.find((v) => v.id === activeViewId.value)) {
		activeViewId.value = next.views[0]?.id ?? '';
	}
});

function back() {
	void router.push({ name: PROJECT_DASHBOARDS, params: { projectId: projectId.value } });
}

function onEditWidget(widget: DashboardWidget) {
	if (!canEdit.value) return;
	editingWidget.value = widget;
}

async function persistSpec(next: NormalizedDashboardSpec) {
	if (!dashboard.value) return;
	await dashboardsStore.updateDashboard(projectId.value, dashboard.value.id, {
		spec: next as unknown as typeof dashboard.value.spec,
	});
}

async function saveWidget(updated: DashboardWidget) {
	if (!spec.value) return;
	const nextViews = spec.value.views.map((v) => ({
		...v,
		widgets: v.widgets.map((w) => (w.id === updated.id ? updated : w)),
	}));
	await persistSpec({ ...spec.value, views: nextViews });
	editingWidget.value = null;
}

async function deleteWidget(id: string) {
	if (!spec.value) return;
	const nextViews = spec.value.views.map((v) => ({
		...v,
		widgets: v.widgets.filter((w) => w.id !== id),
	}));
	await persistSpec({ ...spec.value, views: nextViews });
	editingWidget.value = null;
}

async function onAddView(view: DashboardView) {
	if (!spec.value) return;
	await persistSpec({ ...spec.value, views: [...spec.value.views, view] });
	activeViewId.value = view.id;
}

async function onRenameView({ id, name }: { id: string; name: string }) {
	if (!spec.value) return;
	const nextViews = spec.value.views.map((v) => (v.id === id ? { ...v, name } : v));
	await persistSpec({ ...spec.value, views: nextViews });
}

async function onDeleteView(id: string) {
	if (!spec.value || spec.value.views.length <= 1) return;
	const nextViews = spec.value.views.filter((v) => v.id !== id);
	await persistSpec({ ...spec.value, views: nextViews });
	if (activeViewId.value === id) {
		activeViewId.value = nextViews[0]?.id ?? '';
	}
}

async function saveSettings(payload: {
	name?: string;
	description?: string | null;
	tags?: string[];
	dashboardActions?: DashboardAction[];
}) {
	if (!dashboard.value || !spec.value) return;
	const patch: Parameters<typeof dashboardsStore.updateDashboard>[2] = {};
	if (payload.name !== undefined) patch.name = payload.name;
	if (payload.description !== undefined) patch.description = payload.description;
	if (payload.tags !== undefined) patch.tags = payload.tags;
	if (payload.dashboardActions !== undefined) {
		patch.spec = {
			...spec.value,
			actions: payload.dashboardActions,
		} as unknown as typeof dashboard.value.spec;
	}
	await dashboardsStore.updateDashboard(projectId.value, dashboard.value.id, patch);
	settingsOpen.value = false;
}

async function onOverflowAction(id: string) {
	if (!dashboard.value) return;
	if (id === 'duplicate') {
		await dashboardsStore.createDashboard(projectId.value, {
			name: `${dashboard.value.name} (copy)`,
			description: dashboard.value.description ?? undefined,
			spec: dashboard.value.spec,
			tags: dashboard.value.tags ?? undefined,
		});
	} else if (id === 'export') {
		const blob = new Blob([JSON.stringify(dashboard.value.spec, null, 2)], {
			type: 'application/json',
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${dashboard.value.name.replace(/\s+/g, '-').toLowerCase()}.dashboard.json`;
		a.click();
		URL.revokeObjectURL(url);
	} else if (id === 'archive') {
		await dashboardsStore.updateDashboard(projectId.value, dashboard.value.id, {
			archived: !dashboard.value.archived,
		});
	} else if (id === 'delete') {
		const result = await message.confirm(
			`The dashboard "${dashboard.value.name}" and all its views and widgets will be removed. This cannot be undone.`,
			'Delete dashboard?',
			{
				confirmButtonText: 'Delete',
				cancelButtonText: 'Cancel',
				type: 'warning',
			},
		);
		if (result !== 'confirm') return;
		await dashboardsStore.deleteDashboard(projectId.value, dashboard.value.id);
		back();
	}
}
</script>

<template>
	<div class="dashboard-view">
		<nav class="dashboard-view__breadcrumb">
			<button class="dashboard-view__crumb" @click="back">Dashboards</button>
			<N8nIcon icon="chevron-right" size="xsmall" />
			<strong v-if="dashboard">{{ dashboard.name }}</strong>
		</nav>

		<header v-if="dashboard" class="dashboard-view__header">
			<span class="dashboard-view__icon">
				<N8nIcon icon="grid-2x2" size="medium" />
			</span>
			<div class="dashboard-view__title">
				<h1>{{ dashboard.name }}</h1>
				<span class="dashboard-view__meta">
					<span v-if="dashboard.description">{{ dashboard.description }}</span>
					<span v-if="dashboard.description">·</span>
					<span>{{ widgetCount }} widget{{ widgetCount === 1 ? '' : 's' }}</span>
					<span>·</span>
					<span>last edited {{ lastEdited }}</span>
				</span>
			</div>
			<N8nBadge :theme="dashboard.archived ? 'warning' : 'success'" size="small">
				{{ dashboard.archived ? 'archived' : 'active' }}
			</N8nBadge>
			<div class="dashboard-view__actions">
				<N8nButton
					v-if="canEdit"
					type="tertiary"
					icon="sliders-horizontal"
					label="Configure"
					size="small"
					@click="settingsOpen = true"
				/>
				<N8nButton
					type="tertiary"
					icon="external-link"
					label="Share"
					size="small"
					@click="shareOpen = true"
				/>
				<N8nActionDropdown
					:items="overflowItems"
					activator-icon="ellipsis-vertical"
					placement="bottom-end"
					@select="onOverflowAction"
				/>
			</div>
		</header>

		<N8nLoading v-if="dashboardsStore.loading || !spec" :loading="true" :rows="4" />

		<aside
			v-else-if="dashboard?.brokenRefs && dashboard.brokenRefs.length > 0"
			class="dashboard-view__broken-banner"
		>
			<N8nIcon icon="triangle-alert" size="small" />
			<div>
				<strong
					>{{ dashboard.brokenRefs.length }} stale reference{{
						dashboard.brokenRefs.length === 1 ? '' : 's'
					}}</strong
				>
				detected. Some widgets may render empty until they're fixed via the widget settings drawer.
			</div>
		</aside>

		<template v-if="!dashboardsStore.loading && spec">
			<ViewTabBar
				:views="spec.views"
				:active-view-id="activeViewId"
				:editable="canEdit"
				@update:active-view-id="activeViewId = $event"
				@add-view="onAddView"
				@rename-view="onRenameView"
				@delete-view="onDeleteView"
			/>

			<DashboardGrid
				:spec="spec"
				:view-id="activeViewId"
				:project-id="projectId"
				:dashboard-id="dashboard?.id ?? ''"
				:editable="canEdit"
				@edit-widget="onEditWidget"
			/>
		</template>

		<WidgetSettingsDrawer
			:widget="editingWidget"
			:project-id="projectId"
			@close="editingWidget = null"
			@save="saveWidget"
			@delete="deleteWidget"
		/>

		<DashboardSettingsDrawer
			:open="settingsOpen"
			:dashboard="dashboard"
			:spec="spec"
			:project-id="projectId"
			@close="settingsOpen = false"
			@save="saveSettings"
		/>

		<DashboardShareDialog
			v-if="dashboard"
			:open="shareOpen"
			:dashboard-id="dashboard.id"
			:dashboard-name="dashboard.name"
			:project-id="projectId"
			@close="shareOpen = false"
		/>
	</div>
</template>

<style scoped lang="scss">
.dashboard-view {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--md) var(--spacing--lg);
	/* Fixed outer width so tab switches never reflow the viewport. */
	width: 100%;
	max-width: 1600px;
	margin: 0 auto;
	min-width: 0;
}

.dashboard-view__breadcrumb {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--xs);
	color: var(--color--text);
}

.dashboard-view__crumb {
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	color: var(--color--text);
	font-size: var(--font-size--xs);
}

.dashboard-view__crumb:hover {
	color: var(--color--text--shade-1);
	text-decoration: underline;
}

.dashboard-view__breadcrumb strong {
	color: var(--color--text--shade-1);
	font-weight: var(--font-weight--bold);
}

.dashboard-view__header {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.dashboard-view__icon {
	width: 42px;
	height: 42px;
	border-radius: var(--radius--xs);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, var(--color--orange-400), var(--color--orange-300));
	color: var(--color--neutral-white);
	flex-shrink: 0;
}

.dashboard-view__title {
	display: flex;
	flex-direction: column;
	gap: 2px;
	flex: 1;
	min-width: 0;
}

.dashboard-view__title h1 {
	margin: 0;
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	letter-spacing: -0.01em;
	color: var(--color--text--shade-1);
}

.dashboard-view__meta {
	display: inline-flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--xs);
}

.dashboard-view__actions {
	display: flex;
	gap: var(--spacing--4xs);
	align-items: center;
	flex-shrink: 0;
}

.dashboard-view__broken-banner {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: flex-start;
	padding: var(--spacing--xs) var(--spacing--sm);
	background: var(--color--gold-50);
	border: 1px solid var(--color--gold-100);
	border-radius: var(--radius--3xs);
	color: var(--color--gold-600);
	font-size: var(--font-size--xs);
}
</style>
