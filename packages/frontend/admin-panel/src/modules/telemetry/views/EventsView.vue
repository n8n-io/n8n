<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { N8nHeading, N8nInput, N8nSelect, N8nButton, N8nCard, N8nIcon } from '@n8n/design-system';
import { useTelemetryStore } from '../stores/telemetry.store';
import { format } from 'date-fns';
import type { TelemetryEventDto } from '@n8n/api-types';

const router = useRouter();
const telemetryStore = useTelemetryStore();

const searchQuery = ref('');
const sourceFilter = ref<'all' | 'frontend' | 'backend'>('all');
const startDate = ref('');
const endDate = ref('');

const sourceOptions = [
	{ label: '全部来源', value: 'all' },
	{ label: '前端', value: 'frontend' },
	{ label: '后端', value: 'backend' },
];

const pageSizeOptions = [
	{ label: '20 条/页', value: 20 },
	{ label: '50 条/页', value: 50 },
	{ label: '100 条/页', value: 100 },
];

const currentPageSize = computed({
	get: () => telemetryStore.pagination.limit,
	set: (value: number) => {
		telemetryStore.setLimit(value);
		loadEvents();
	},
});

const pageNumbers = computed(() => {
	const total = telemetryStore.totalPages;
	const current = telemetryStore.pagination.page;
	const pages: (number | string)[] = [];

	if (total <= 7) {
		// 如果总页数少于7，显示所有页码
		for (let i = 1; i <= total; i++) {
			pages.push(i);
		}
	} else {
		// 否则显示: 1 ... current-1 current current+1 ... total
		pages.push(1);

		if (current > 3) {
			pages.push('...');
		}

		for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
			pages.push(i);
		}

		if (current < total - 2) {
			pages.push('...');
		}

		if (total > 1) {
			pages.push(total);
		}
	}

	return pages;
});

function formatDate(date: Date): string {
	return format(new Date(date), 'yyyy-MM-dd HH:mm:ss');
}

function formatProperties(properties: Record<string, unknown>): string {
	const entries = Object.entries(properties);
	if (entries.length === 0) return '-';
	if (entries.length <= 2) {
		return entries.map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ');
	}
	return `${entries.length} 个属性`;
}

function getSourceBadgeClass(source: 'frontend' | 'backend'): string {
	return source === 'frontend' ? 'sourceFrontend' : 'sourceBackend';
}

async function loadEvents() {
	await telemetryStore.fetchEvents();
}

function handleSearch() {
	const filters: Record<string, string> = {};

	if (searchQuery.value) {
		filters.eventName = searchQuery.value;
	}

	if (sourceFilter.value !== 'all') {
		filters.source = sourceFilter.value;
	}

	if (startDate.value) {
		filters.startDate = startDate.value;
	}

	if (endDate.value) {
		filters.endDate = endDate.value;
	}

	telemetryStore.setFilters(filters);
	telemetryStore.fetchEvents(true);
}

function handleClearFilters() {
	searchQuery.value = '';
	sourceFilter.value = 'all';
	startDate.value = '';
	endDate.value = '';
	telemetryStore.clearFilters();
	telemetryStore.fetchEvents(true);
}

function goToPage(page: number) {
	telemetryStore.setPage(page);
	loadEvents();
}

function viewEventDetail(event: TelemetryEventDto) {
	router.push({
		name: 'TelemetryEventDetail',
		params: { id: event.id },
	});
}

async function handleExport(format: 'csv' | 'json') {
	try {
		await telemetryStore.exportEvents(format);
	} catch (error) {
		console.error('Export failed:', error);
	}
}

onMounted(() => {
	loadEvents();
});
</script>

<template>
	<div :class="$style.container">
		<!-- Header -->
		<div :class="$style.header">
			<div>
				<N8nHeading tag="h1" size="2xlarge">事件列表</N8nHeading>
				<p :class="$style.subtitle">查看和搜索所有 Telemetry 事件</p>
			</div>
			<div :class="$style.exportButtons">
				<N8nButton type="secondary" size="small" icon="file-text" @click="handleExport('csv')">
					导出 CSV
				</N8nButton>
				<N8nButton type="secondary" size="small" icon="file-code" @click="handleExport('json')">
					导出 JSON
				</N8nButton>
			</div>
		</div>

		<!-- Filters -->
		<N8nCard :class="$style.filtersCard">
			<div :class="$style.filters">
				<div :class="$style.filterRow">
					<N8nInput
						v-model="searchQuery"
						placeholder="搜索事件名称..."
						:class="$style.searchInput"
						clearable
						@keyup.enter="handleSearch"
					>
						<template #prefix>
							<N8nIcon icon="search" size="small" />
						</template>
					</N8nInput>

					<N8nSelect
						v-model="sourceFilter"
						:options="sourceOptions"
						size="small"
						:class="$style.sourceFilter"
					/>

					<input v-model="startDate" type="date" :class="$style.dateInput" placeholder="开始日期" />

					<input v-model="endDate" type="date" :class="$style.dateInput" placeholder="结束日期" />
				</div>

				<div :class="$style.filterActions">
					<N8nButton type="primary" size="small" @click="handleSearch"> 搜索 </N8nButton>
					<N8nButton
						v-if="telemetryStore.hasFilters"
						type="secondary"
						size="small"
						@click="handleClearFilters"
					>
						清除筛选
					</N8nButton>
				</div>
			</div>
		</N8nCard>

		<!-- Results Info -->
		<div :class="$style.resultsInfo">
			<span>共 {{ telemetryStore.pagination.total.toLocaleString() }} 条记录</span>
			<N8nSelect
				v-model="currentPageSize"
				:options="pageSizeOptions"
				size="small"
				:class="$style.pageSizeSelect"
			/>
		</div>

		<!-- Events Table -->
		<N8nCard :class="$style.tableCard">
			<div v-if="telemetryStore.loading" :class="$style.loading">
				<N8nIcon icon="spinner" size="xlarge" />
				<p>加载中...</p>
			</div>

			<div v-else-if="telemetryStore.events.length === 0" :class="$style.empty">
				<N8nIcon icon="inbox" size="xlarge" />
				<p>暂无数据</p>
			</div>

			<div v-else :class="$style.tableWrapper">
				<table :class="$style.table">
					<thead>
						<tr>
							<th>时间</th>
							<th>事件名称</th>
							<th>来源</th>
							<th>用户 ID</th>
							<th>工作流 ID</th>
							<th>属性</th>
							<th>操作</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="event in telemetryStore.events" :key="event.id" :class="$style.row">
							<td :class="$style.dateCell">{{ formatDate(event.createdAt) }}</td>
							<td :class="$style.eventNameCell">
								<code>{{ event.eventName }}</code>
							</td>
							<td>
								<span :class="[$style.sourceBadge, $style[getSourceBadgeClass(event.source)]]">
									{{ event.source }}
								</span>
							</td>
							<td :class="$style.idCell">{{ event.userId || '-' }}</td>
							<td :class="$style.idCell">{{ event.workflowId || '-' }}</td>
							<td :class="$style.propertiesCell">{{ formatProperties(event.properties) }}</td>
							<td>
								<N8nButton type="tertiary" size="small" @click="viewEventDetail(event)">
									查看详情
								</N8nButton>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</N8nCard>

		<!-- Pagination -->
		<div v-if="telemetryStore.totalPages > 1" :class="$style.pagination">
			<N8nButton
				type="secondary"
				size="small"
				icon="chevron-left"
				:disabled="telemetryStore.pagination.page === 1"
				@click="goToPage(telemetryStore.pagination.page - 1)"
			/>

			<div :class="$style.pageNumbers">
				<button
					v-for="(page, index) in pageNumbers"
					:key="index"
					:class="[
						$style.pageButton,
						{
							[$style.active]: page === telemetryStore.pagination.page,
							[$style.ellipsis]: page === '...',
						},
					]"
					:disabled="page === '...'"
					@click="typeof page === 'number' && goToPage(page)"
				>
					{{ page }}
				</button>
			</div>

			<N8nButton
				type="secondary"
				size="small"
				icon="chevron-right"
				:disabled="telemetryStore.pagination.page === telemetryStore.totalPages"
				@click="goToPage(telemetryStore.pagination.page + 1)"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	padding: var(--spacing--xl);
	max-width: 1600px;
	margin: 0 auto;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: var(--spacing--lg);
}

.subtitle {
	margin-top: var(--spacing--xs);
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-2);
}

.exportButtons {
	display: flex;
	gap: var(--spacing--xs);
}

.filtersCard {
	margin-bottom: var(--spacing--md);
}

.filters {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.filterRow {
	display: flex;
	gap: var(--spacing--sm);
	align-items: center;
}

.searchInput {
	flex: 1;
	min-width: 300px;
}

.sourceFilter {
	width: 150px;
}

.dateInput {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	font-size: var(--font-size--sm);
	color: var(--color--text);
	background: var(--color--background);
	min-width: 150px;

	&:focus {
		outline: none;
		border-color: var(--color--primary);
	}
}

.filterActions {
	display: flex;
	gap: var(--spacing--xs);
}

.resultsInfo {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing--sm);
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-2);
}

.pageSizeSelect {
	width: 120px;
}

.tableCard {
	margin-bottom: var(--spacing--lg);
}

.loading,
.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--3xl);
	color: var(--color--text--tint-2);
	gap: var(--spacing--sm);

	svg {
		font-size: 48px;
	}
}

.tableWrapper {
	overflow-x: auto;
}

.table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size--sm);

	th {
		text-align: left;
		padding: var(--spacing--sm);
		background: var(--color--background--shade-1);
		color: var(--color--text--tint-2);
		font-weight: var(--font-weight--bold);
		border-bottom: var(--border);
		white-space: nowrap;
	}

	td {
		padding: var(--spacing--sm);
		border-bottom: var(--border);
		vertical-align: middle;
	}
}

.row {
	transition: background 0.2s;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.dateCell {
	color: var(--color--text--tint-2);
	white-space: nowrap;
	font-family: monospace;
	font-size: var(--font-size--xs);
}

.eventNameCell {
	code {
		padding: var(--spacing--4xs) var(--spacing--3xs);
		background: var(--color--foreground--tint-2);
		border-radius: var(--radius--sm);
		font-size: var(--font-size--xs);
		font-family: monospace;
		color: var(--color--primary);
	}
}

.sourceBadge {
	display: inline-block;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
}

.sourceFrontend {
	background: var(--color--primary--tint-3);
	color: var(--color--primary--shade-1);
}

.sourceBackend {
	background: var(--color--success--tint-3);
	color: var(--color--success--shade-1);
}

.idCell {
	font-family: monospace;
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-2);
	max-width: 150px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.propertiesCell {
	color: var(--color--text--tint-2);
	max-width: 200px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pagination {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: var(--spacing--sm);
}

.pageNumbers {
	display: flex;
	gap: var(--spacing--3xs);
}

.pageButton {
	min-width: 32px;
	height: 32px;
	padding: 0 var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--background);
	color: var(--color--text);
	font-size: var(--font-size--sm);
	cursor: pointer;
	transition: all 0.2s;

	&:hover:not(:disabled) {
		background: var(--color--foreground);
		border-color: var(--color--primary);
	}

	&.active {
		background: var(--color--primary);
		color: white;
		border-color: var(--color--primary);
	}

	&.ellipsis {
		border: none;
		cursor: default;

		&:hover {
			background: transparent;
		}
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
}
</style>
