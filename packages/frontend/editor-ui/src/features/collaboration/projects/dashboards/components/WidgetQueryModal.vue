<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useDashboardsStore } from '../dashboards.store';
import { runQuery } from '../dashboards.api';
import { WIDGET_QUERY_MODAL_KEY } from '../dashboards.constants';
import type { QueryResult, WidgetChartType } from '../dashboards.types';
import type { IconName } from '@n8n/design-system/src/components/N8nIcon/icons';
import WidgetChart from './WidgetChart.vue';
import { N8nButton, N8nText, N8nBadge, N8nIcon } from '@n8n/design-system';

const props = defineProps<{
	dashboardId?: string;
	widgetId?: string;
}>();

const uiStore = useUIStore();
const dashboardsStore = useDashboardsStore();

const widget = computed(() => {
	if (!props.dashboardId || !props.widgetId) return undefined;
	const dashboard = dashboardsStore.getById(props.dashboardId);
	return dashboard?.widgets.find((w) => w.id === props.widgetId);
});

const queryText = ref('');
const result = ref<QueryResult | null>(null);
const error = ref<string | null>(null);
const isRunning = ref(false);
const hasRun = ref(false);

const previewChartType = ref<WidgetChartType>('table');
const chartDropdownOpen = ref(false);

const chartOptions: Array<{ type: WidgetChartType; label: string; icon: IconName }> = [
	{ type: 'table', label: 'Table', icon: 'table' },
	{ type: 'bar', label: 'Bar chart', icon: 'chart-column-decreasing' },
	{ type: 'line', label: 'Line chart', icon: 'trending-up' },
	{ type: 'pie', label: 'Pie chart', icon: 'circle-dot' },
];

function toggleChartDropdown() {
	chartDropdownOpen.value = !chartDropdownOpen.value;
}

function selectPreviewChartType(type: WidgetChartType) {
	previewChartType.value = type;
	chartDropdownOpen.value = false;
}

function onClickOutsideDropdown(event: MouseEvent) {
	if (!chartDropdownOpen.value) return;
	const target = event.target as HTMLElement;
	if (
		!target.closest('[data-test-id="modal-chart-dropdown"]') &&
		!target.closest('[data-test-id="modal-chart-button"]')
	) {
		chartDropdownOpen.value = false;
	}
}

onMounted(() => {
	queryText.value = widget.value?.query ?? '';
	previewChartType.value = widget.value?.chartType ?? 'table';
	document.addEventListener('click', onClickOutsideDropdown);
});

onBeforeUnmount(() => {
	document.removeEventListener('click', onClickOutsideDropdown);
});

async function handleRun() {
	if (!queryText.value.trim()) return;
	isRunning.value = true;
	error.value = null;
	result.value = null;
	try {
		result.value = await runQuery(queryText.value);
		hasRun.value = true;
	} catch (e: unknown) {
		hasRun.value = true;
		const err = e as { httpStatusCode?: number; message?: string };
		if (err.message) {
			const parts = err.message.split(': ');
			error.value = parts.length > 1 ? parts.slice(1).join(': ') : err.message;
		} else {
			error.value = 'An unexpected error occurred';
		}
	} finally {
		isRunning.value = false;
	}
}

function handleSave() {
	if (!props.dashboardId || !props.widgetId) return;
	dashboardsStore.setWidgetQuery(
		props.dashboardId,
		props.widgetId,
		queryText.value,
		result.value ?? undefined,
	);
	dashboardsStore.setWidgetChartType(props.dashboardId, props.widgetId, previewChartType.value);
	uiStore.closeModal(WIDGET_QUERY_MODAL_KEY);
}
</script>

<template>
	<Modal
		:name="WIDGET_QUERY_MODAL_KEY"
		title="Edit widget query"
		width="900px"
		max-height="80vh"
		:close-on-click-modal="false"
		:show-close="true"
	>
		<template #content>
			<div :class="[$style.body, hasRun && $style.bodySplit]">
				<textarea
					v-model="queryText"
					:class="$style.editor"
					placeholder="SELECT status, COUNT(*) FROM executions GROUP BY status"
					spellcheck="false"
				/>
				<div v-if="hasRun" :class="$style.results">
					<div v-if="isRunning" :class="$style.resultsPlaceholder">
						<N8nText color="text-light">Running...</N8nText>
					</div>
					<div v-else-if="error" :class="$style.resultsError">
						<N8nText color="danger">{{ error }}</N8nText>
					</div>
					<div v-else-if="result" :class="$style.resultsContent">
						<div :class="$style.resultsHeader">
							<div :class="$style.resultsMeta">
								<N8nText size="small" color="text-light">
									{{ result.rows.length }} row{{ result.rows.length !== 1 ? 's' : '' }} in
									{{ result.durationMs }}ms
								</N8nText>
								<N8nBadge v-if="result.truncated" theme="tertiary">Truncated</N8nBadge>
							</div>
							<div :class="$style.chartDropdownWrap">
								<div
									:class="$style.chartToggleBtn"
									data-test-id="modal-chart-button"
									@click="toggleChartDropdown"
								>
									<N8nIcon icon="chart-column-decreasing" size="small" />
								</div>
								<div
									v-if="chartDropdownOpen"
									:class="$style.chartDropdown"
									data-test-id="modal-chart-dropdown"
								>
									<div
										v-for="opt in chartOptions"
										:key="opt.type"
										:class="[
											$style.chartDropdownItem,
											previewChartType === opt.type && $style.chartDropdownItemActive,
										]"
										@click="selectPreviewChartType(opt.type)"
									>
										<N8nIcon :icon="opt.icon" size="small" />
										<span>{{ opt.label }}</span>
									</div>
								</div>
							</div>
						</div>
						<div :class="$style.resultsView">
							<WidgetChart :chart-type="previewChartType" :query-result="result" />
						</div>
					</div>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					:loading="isRunning"
					:disabled="!queryText.trim()"
					data-test-id="query-run-button"
					@click="handleRun"
				>
					Run
				</N8nButton>
				<N8nButton variant="outline" data-test-id="query-save-button" @click="handleSave">
					Save
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	min-height: 300px;
}

.bodySplit {
	flex-direction: row;
	gap: var(--spacing--sm);
}

.editor {
	all: unset;
	flex: 1;
	min-height: 200px;
	padding: var(--spacing--sm);
	font-family: monospace;
	font-size: var(--font-size--sm);
	line-height: 1.5;
	color: rgba(255, 255, 255, 0.85);
	background-color: #1a1a1a;
	border: var(--border);
	border-radius: var(--radius);
	resize: none;
	white-space: pre-wrap;
	word-break: break-word;
	overflow: auto;
	box-sizing: border-box;
}

.results {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
}

.resultsPlaceholder,
.resultsError {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	padding: var(--spacing--md);
}

.resultsContent {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.resultsHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--3xs) 0;
}

.resultsMeta {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.chartToggleBtn {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
	cursor: pointer;
	transition: background-color 0.1s ease;

	&:hover {
		background-color: var(--color--background--shade-1);
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

.resultsView {
	flex: 1;
	overflow: auto;
	border: var(--border);
	border-radius: var(--radius);
}

.footer {
	display: flex;
	justify-content: space-between;
	width: 100%;
}
</style>
