<script lang="ts" setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { VIEWS } from '@/app/constants';
import { PageViewLayout } from '@/app/components/layouts';
import { useDashboardsStore } from '../dashboards/dashboards.store';
import { WIDGET_QUERY_MODAL_KEY } from '../dashboards/dashboards.constants';
import { useUIStore } from '@/app/stores/ui.store';
import type { WidgetChartType } from '../dashboards/dashboards.types';
import WidgetChart from '../dashboards/components/WidgetChart.vue';
import { N8nButton, N8nIcon, N8nIconButton } from '@n8n/design-system';

const route = useRoute();
const router = useRouter();
const dashboardsStore = useDashboardsStore();
const uiStore = useUIStore();
const documentTitle = useDocumentTitle();

const dashboardId = computed(() => route.params.dashboardId as string);
const projectId = computed(() => route.params.projectId as string | undefined);
const dashboard = computed(() => dashboardsStore.getById(dashboardId.value));
const widgets = computed(() => dashboard.value?.widgets ?? []);

const isEditingName = ref(false);
const editName = ref('');
const nameInputRef = ref<HTMLInputElement | null>(null);

const editingWidgetId = ref<string | null>(null);
const editWidgetName = ref('');
const widgetNameInputRef = ref<HTMLInputElement | null>(null);

const chartDropdownWidgetId = ref<string | null>(null);

const chartOptions: Array<{ type: WidgetChartType; label: string; icon: string }> = [
	{ type: 'table', label: 'Table', icon: 'table' },
	{ type: 'bar', label: 'Bar chart', icon: 'chart-bar' },
	{ type: 'line', label: 'Line chart', icon: 'trending-up' },
	{ type: 'pie', label: 'Pie chart', icon: 'circle-dot' },
];

function toggleChartDropdown(widgetId: string) {
	chartDropdownWidgetId.value = chartDropdownWidgetId.value === widgetId ? null : widgetId;
}

function selectChartType(widgetId: string, chartType: WidgetChartType) {
	dashboardsStore.setWidgetChartType(dashboardId.value, widgetId, chartType);
	chartDropdownWidgetId.value = null;
}

function onClickOutsideChartDropdown(event: MouseEvent) {
	if (!chartDropdownWidgetId.value) return;
	const target = event.target as HTMLElement;
	if (
		!target.closest('[data-test-id="widget-chart-dropdown"]') &&
		!target.closest('[data-test-id="widget-chart-button"]')
	) {
		chartDropdownWidgetId.value = null;
	}
}

onBeforeUnmount(() => {
	document.removeEventListener('click', onClickOutsideChartDropdown);
});

const backRoute = computed(() => {
	if (projectId.value) {
		return { name: VIEWS.PROJECTS_DASHBOARDS, params: { projectId: projectId.value } };
	}
	return { name: VIEWS.HOME_DASHBOARDS };
});

function startEditingName() {
	if (!dashboard.value) return;
	editName.value = dashboard.value.name;
	isEditingName.value = true;
	void nextTick(() => {
		nameInputRef.value?.focus();
	});
}

function confirmEditingName() {
	if (!dashboard.value) return;
	const trimmed = editName.value.trim();
	if (trimmed) {
		dashboardsStore.rename(dashboard.value.id, trimmed);
	}
	isEditingName.value = false;
}

function cancelEditingName() {
	isEditingName.value = false;
}

function onNameKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter') {
		confirmEditingName();
	} else if (event.key === 'Escape') {
		cancelEditingName();
	}
}

function addWidget() {
	dashboardsStore.addWidget(dashboardId.value);
}

function openQueryEditor(widgetId: string) {
	uiStore.openModalWithData({
		name: WIDGET_QUERY_MODAL_KEY,
		data: { dashboardId: dashboardId.value, widgetId },
	});
}

function startEditingWidget(widgetId: string, currentName: string) {
	editingWidgetId.value = widgetId;
	editWidgetName.value = currentName;
	void nextTick(() => {
		const el = widgetNameInputRef.value;
		const input = Array.isArray(el) ? el[0] : el;
		input?.focus();
	});
}

function confirmEditingWidget() {
	if (!editingWidgetId.value) return;
	const trimmed = editWidgetName.value.trim();
	if (trimmed) {
		dashboardsStore.renameWidget(dashboardId.value, editingWidgetId.value, trimmed);
	}
	editingWidgetId.value = null;
}

function cancelEditingWidget() {
	editingWidgetId.value = null;
}

function onWidgetNameKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter') {
		confirmEditingWidget();
	} else if (event.key === 'Escape') {
		cancelEditingWidget();
	}
}

onMounted(() => {
	document.addEventListener('click', onClickOutsideChartDropdown);
	if (!dashboard.value) {
		void router.replace(backRoute.value);
		return;
	}
	documentTitle.set(dashboard.value.name);
});
</script>

<template>
	<PageViewLayout>
		<template #header>
			<div :class="$style.header">
				<div :class="$style.headerLeft">
					<N8nIconButton
						icon="arrow-left"
						variant="ghost"
						size="medium"
						data-test-id="dashboard-back-button"
						@click="router.push(backRoute)"
					/>
					<div
						v-if="dashboard"
						:class="[$style.dashboardTitle, isEditingName && $style.dashboardTitleEditing]"
						@click="!isEditingName && startEditingName()"
					>
						<input
							v-if="isEditingName"
							ref="nameInputRef"
							v-model="editName"
							:class="$style.dashboardNameInput"
							:size="Math.max(editName.length, 1)"
							data-test-id="dashboard-name-input"
							@blur="cancelEditingName"
							@keydown="onNameKeydown"
						/>
						<span v-else :class="$style.dashboardNameText" data-test-id="dashboard-name">
							{{ dashboard.name }}
						</span>
						<N8nIconButton
							v-if="isEditingName"
							icon="check"
							variant="ghost"
							size="small"
							data-test-id="dashboard-confirm-button"
							@mousedown.prevent="confirmEditingName"
						/>
						<N8nIconButton
							v-else
							:class="$style.dashboardEditBtn"
							icon="pencil"
							variant="ghost"
							size="small"
							data-test-id="dashboard-rename-button"
						/>
					</div>
				</div>
				<N8nButton
					v-if="widgets.length > 0"
					size="medium"
					data-test-id="add-widget-header-button"
					@click="addWidget"
				>
					Add new widget
					<template #append>
						<N8nIconButton icon="plus" variant="ghost" size="xsmall" />
					</template>
				</N8nButton>
			</div>
		</template>

		<!-- Empty state -->
		<div v-if="widgets.length === 0" :class="$style.empty">
			<N8nButton size="large" data-test-id="add-widget-empty-button" @click="addWidget">
				Add a new widget
				<template #append>
					<N8nIconButton icon="plus" variant="ghost" size="xsmall" />
				</template>
			</N8nButton>
		</div>

		<!-- Widget grid -->
		<div v-else :class="$style.grid">
			<div
				v-for="widget in widgets"
				:key="widget.id"
				:class="[$style.widget, widget.fullWidth && $style.widgetFull]"
				data-test-id="widget-card"
			>
				<div :class="$style.widgetHeader">
					<div
						:class="[
							$style.widgetTitle,
							editingWidgetId === widget.id && $style.widgetTitleEditing,
						]"
						@click="editingWidgetId !== widget.id && startEditingWidget(widget.id, widget.name)"
					>
						<input
							v-if="editingWidgetId === widget.id"
							ref="widgetNameInputRef"
							v-model="editWidgetName"
							:class="$style.widgetNameInput"
							:size="Math.max(editWidgetName.length, 1)"
							data-test-id="widget-name-input"
							@blur="cancelEditingWidget"
							@keydown="onWidgetNameKeydown"
						/>
						<span v-else :class="$style.widgetNameText">{{ widget.name }}</span>
						<N8nIconButton
							v-if="editingWidgetId === widget.id"
							icon="check"
							variant="ghost"
							size="xsmall"
							data-test-id="widget-confirm-button"
							@mousedown.prevent="confirmEditingWidget"
						/>
						<N8nIconButton
							v-else
							:class="$style.widgetEditBtn"
							icon="pencil"
							variant="ghost"
							size="xsmall"
							data-test-id="widget-rename-button"
						/>
					</div>
					<div :class="$style.widgetActions">
						<div :class="$style.chartDropdownWrap">
							<N8nIconButton
								icon="chart-bar"
								variant="ghost"
								size="xsmall"
								data-test-id="widget-chart-button"
								@click="toggleChartDropdown(widget.id)"
							/>
							<div
								v-if="chartDropdownWidgetId === widget.id"
								:class="$style.chartDropdown"
								data-test-id="widget-chart-dropdown"
							>
								<div
									v-for="opt in chartOptions"
									:key="opt.type"
									:class="[
										$style.chartDropdownItem,
										widget.chartType === opt.type && $style.chartDropdownItemActive,
									]"
									@click="selectChartType(widget.id, opt.type)"
								>
									<N8nIcon :icon="opt.icon" size="small" />
									<span>{{ opt.label }}</span>
								</div>
							</div>
						</div>
						<N8nIconButton
							icon="cog"
							variant="ghost"
							size="xsmall"
							data-test-id="widget-settings-button"
							@click="openQueryEditor(widget.id)"
						/>
						<N8nIconButton
							:icon="widget.fullWidth ? 'compress' : 'expand'"
							variant="ghost"
							size="xsmall"
							data-test-id="widget-resize-button"
							@click="dashboardsStore.toggleWidgetFullWidth(dashboardId, widget.id)"
						/>
						<N8nIconButton
							icon="trash"
							variant="ghost"
							size="xsmall"
							data-test-id="widget-delete-button"
							@click="dashboardsStore.removeWidget(dashboardId, widget.id)"
						/>
					</div>
				</div>
				<div :class="$style.widgetBody">
					<div v-if="widget.queryResult" :class="$style.widgetResults">
						<WidgetChart :chart-type="widget.chartType" :query-result="widget.queryResult" />
					</div>
					<div v-else :class="$style.widgetEmpty">
						<N8nButton
							variant="outline"
							size="medium"
							data-test-id="widget-configure-button"
							@click="openQueryEditor(widget.id)"
						>
							<template #prepend>
								<N8nIcon icon="cog" size="small" />
							</template>
							Configure
						</N8nButton>
					</div>
				</div>
			</div>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: var(--spacing--3xl);
}

.headerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.dashboardTitle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border-radius: var(--radius--lg);
	cursor: pointer;
	transition: background-color 0.15s ease;

	&:hover {
		background-color: rgba(255, 255, 255, 0.1);

		.dashboardEditBtn {
			opacity: 1;
		}
	}
}

.dashboardTitleEditing {
	background-color: rgba(255, 255, 255, 0.1);
	cursor: default;
}

.dashboardNameText,
.dashboardNameInput {
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	font-family: var(--font-family);
	line-height: var(--line-height--xl);
	color: var(--color--text);
}

.dashboardNameInput {
	all: unset;
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	font-family: var(--font-family);
	line-height: var(--line-height--xl);
	color: var(--color--text);
}

.dashboardEditBtn {
	opacity: 0;
	transition: opacity 0.15s ease;
}

.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 400px;
}

.grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	align-items: start;
	gap: var(--spacing--lg);
	padding-top: var(--spacing--sm);
	padding-bottom: var(--spacing--3xl);
}

.widget {
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.widgetHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--3xs) var(--spacing--xs);
}

.widgetTitle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border-radius: var(--radius--lg);
	cursor: pointer;
	transition: background-color 0.15s ease;

	&:hover {
		background-color: rgba(255, 255, 255, 0.1);

		.widgetEditBtn {
			opacity: 1;
		}
	}
}

.widgetTitleEditing {
	background-color: rgba(255, 255, 255, 0.1);
	cursor: default;
}

.widgetNameText,
.widgetNameInput {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	font-family: var(--font-family);
	line-height: var(--line-height--sm);
	color: var(--color--text);
}

.widgetNameInput {
	all: unset;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	font-family: var(--font-family);
	line-height: var(--line-height--sm);
	color: var(--color--text);
}

.widgetEditBtn {
	opacity: 0;
	transition: opacity 0.15s ease;
}

.widgetActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	opacity: 0;
	transition: opacity 0.15s ease;

	.widget:hover & {
		opacity: 1;
	}
}

.chartDropdownWrap {
	position: relative;
}

.chartDropdown {
	position: absolute;
	top: 100%;
	right: 0;
	z-index: 10;
	display: flex;
	flex-direction: column;
	min-width: 140px;
	padding: var(--spacing--3xs);
	background-color: var(--color--background);
	border: var(--border);
	border-radius: var(--radius);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.chartDropdownItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius);
	cursor: pointer;
	font-size: var(--font-size--2xs);
	white-space: nowrap;
	transition: background-color 0.1s ease;

	&:hover {
		background-color: var(--color--background--shade-1);
	}
}

.chartDropdownItemActive {
	font-weight: var(--font-weight--bold);
}

.widgetFull {
	grid-column: 1 / -1;
}

.widgetBody {
	position: relative;
	aspect-ratio: 10 / 7;
	overflow: hidden;

	.widgetFull & {
		aspect-ratio: 20 / 7;
	}
}

.widgetResults {
	width: 100%;
	height: 100%;
	overflow: auto;
}

.widgetEmpty {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	padding-bottom: var(--spacing--xl);
}
</style>
