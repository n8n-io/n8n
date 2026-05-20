<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nInput, N8nTabs, N8nText, N8nBadge } from '@n8n/design-system';

import ActionListSection from '@/features/core/dashboards/components/edit/ActionListSection.vue';
import type {
	Dashboard,
	DashboardAction,
	NormalizedDashboardSpec,
} from '@/features/core/dashboards/dashboards.types';

const props = defineProps<{
	open: boolean;
	dashboard: Dashboard | null;
	spec: NormalizedDashboardSpec | null;
	projectId: string;
}>();

const emit = defineEmits<{
	(e: 'close'): void;
	(
		e: 'save',
		payload: {
			name?: string;
			description?: string | null;
			tags?: string[];
			dashboardActions?: DashboardAction[];
		},
	): void;
}>();

const activeTab = ref<'general' | 'actions' | 'data'>('general');
const localName = ref('');
const localDescription = ref('');
const localTagsText = ref('');
const localDashboardActions = ref<DashboardAction[]>([]);

watch(
	() => [props.open, props.dashboard?.id, props.spec],
	() => {
		if (!props.open || !props.dashboard) return;
		localName.value = props.dashboard.name;
		localDescription.value = props.dashboard.description ?? '';
		localTagsText.value = (props.dashboard.tags ?? []).join(', ');
		localDashboardActions.value = [...(props.spec?.actions ?? [])];
	},
	{ immediate: true },
);

const tabs = computed(() => [
	{ value: 'general' as const, label: 'General' },
	{
		value: 'actions' as const,
		label: 'Actions',
		extraInfo: localDashboardActions.value.length
			? String(localDashboardActions.value.length)
			: undefined,
	},
	{ value: 'data' as const, label: 'Data sources' },
]);

const dataTableIds = computed<string[]>(() => {
	if (!props.spec) return [];
	const ids = new Set<string>();
	for (const view of props.spec.views) {
		for (const w of view.widgets) {
			if (w.dataSource?.dataTableId) ids.add(w.dataSource.dataTableId);
		}
	}
	return [...ids];
});

function save() {
	const tags = localTagsText.value
		.split(',')
		.map((t) => t.trim())
		.filter((t) => t.length > 0);
	emit('save', {
		name: localName.value.trim() || undefined,
		description: localDescription.value.trim() || null,
		tags,
		dashboardActions: localDashboardActions.value,
	});
}

function onActionsUpdate(next: DashboardAction[]) {
	localDashboardActions.value = next;
}
</script>

<template>
	<aside v-if="open && dashboard" class="settings-drawer">
		<header class="settings-drawer__header">
			<N8nText tag="h3" size="medium" bold>Dashboard settings</N8nText>
			<N8nButton type="tertiary" size="mini" icon="circle-x" label="" @click="emit('close')" />
		</header>

		<N8nTabs
			:options="tabs"
			:model-value="activeTab"
			variant="modern"
			size="small"
			class="settings-drawer__tabs"
			@update:model-value="(v) => (activeTab = v as 'general' | 'actions' | 'data')"
		/>

		<div class="settings-drawer__body">
			<section v-if="activeTab === 'general'" class="settings-drawer__section">
				<label>
					<N8nText size="small" color="text-light">Name</N8nText>
					<N8nInput v-model="localName" />
				</label>
				<label>
					<N8nText size="small" color="text-light">Description</N8nText>
					<N8nInput v-model="localDescription" type="textarea" :rows="3" />
				</label>
				<label>
					<N8nText size="small" color="text-light">Tags</N8nText>
					<N8nInput v-model="localTagsText" placeholder="comma, separated, tags" />
					<N8nText size="xsmall" color="text-light">
						Used for filtering dashboards across the project.
					</N8nText>
				</label>
			</section>

			<section v-else-if="activeTab === 'actions'" class="settings-drawer__section">
				<N8nText size="small" color="text-light">
					Dashboard-wide actions appear as buttons in the header. They fire a workflow without a row
					context — use them for things like "Send daily digest" or "Refresh all data".
				</N8nText>
				<ActionListSection
					:actions="localDashboardActions"
					:project-id="projectId"
					@update:actions="onActionsUpdate"
				/>
			</section>

			<section v-else-if="activeTab === 'data'" class="settings-drawer__section">
				<N8nText size="small" color="text-light">
					Data tables referenced by widgets in this dashboard.
				</N8nText>
				<ul class="settings-drawer__data-list">
					<li v-for="id in dataTableIds" :key="id" class="settings-drawer__data-item">
						<code>{{ id }}</code>
						<N8nBadge
							v-if="dashboard.brokenRefs?.some((r) => r.dataTableId === id)"
							theme="danger"
							size="small"
						>
							broken
						</N8nBadge>
					</li>
					<li v-if="dataTableIds.length === 0" class="settings-drawer__empty">
						No data tables bound yet — add a widget first.
					</li>
				</ul>
				<div v-if="dashboard.brokenRefs?.length" class="settings-drawer__warn">
					<N8nText size="xsmall">
						{{ dashboard.brokenRefs.length }} broken reference{{
							dashboard.brokenRefs.length === 1 ? '' : 's'
						}}
						detected. Open the affected widget and re-pick the column.
					</N8nText>
				</div>
			</section>
		</div>

		<footer class="settings-drawer__footer">
			<N8nButton type="tertiary" label="Cancel" @click="emit('close')" />
			<N8nButton type="primary" label="Save changes" @click="save" />
		</footer>
	</aside>
</template>

<style scoped lang="scss">
.settings-drawer {
	position: fixed;
	top: 0;
	right: 0;
	width: 440px;
	height: 100%;
	background: var(--color--background--light-3);
	border-left: 1px solid var(--color--foreground);
	display: flex;
	flex-direction: column;
	z-index: 200;
	box-shadow: var(--shadow--dark);
}

.settings-drawer__header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--sm) var(--spacing--md);
	border-bottom: 1px solid var(--color--foreground--tint-1);
}

.settings-drawer__tabs {
	padding: 0 var(--spacing--md);
	border-bottom: 1px solid var(--color--foreground--tint-1);
}

.settings-drawer__body {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--md);
}

.settings-drawer__section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.settings-drawer__section label {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.settings-drawer__data-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.settings-drawer__data-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--background--light-2);
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius--3xs);
}

.settings-drawer__data-item code {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
}

.settings-drawer__empty {
	padding: var(--spacing--xs);
	text-align: center;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
}

.settings-drawer__warn {
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--red-50);
	border: 1px solid var(--color--red-100);
	border-radius: var(--radius--3xs);
	color: var(--color--red-700);
}

.settings-drawer__footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--md);
	border-top: 1px solid var(--color--foreground--tint-1);
}
</style>
