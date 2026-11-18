<script lang="ts" setup>
import type { McpServerAnalyticsDto } from '@n8n/api-types';
import { N8nHeading, N8nLoading, N8nSegmentControl, N8nText, N8nTooltip } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref, watch } from 'vue';

import { getMcpServerAnalytics } from '../mcpServers.api';
import { formatDate, formatDuration, formatNumber, formatPercent } from '../mcpServers.utils';
import McpServerBarList from './McpServerBarList.vue';

type Days = '7' | '30' | '90';

const props = defineProps<{
	serverId: string;
	liveTick: number;
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const days = ref<Days>('7');
const data = ref<McpServerAnalyticsDto | null>(null);
const loading = ref(true);

const dayOptions = computed(() => [
	{
		value: '7' as const,
		label: i18n.baseText('mcpServers.analytics.days', { interpolate: { count: 7 } }),
	},
	{
		value: '30' as const,
		label: i18n.baseText('mcpServers.analytics.days', { interpolate: { count: 30 } }),
	},
	{
		value: '90' as const,
		label: i18n.baseText('mcpServers.analytics.days', { interpolate: { count: 90 } }),
	},
]);

async function load() {
	try {
		data.value = await getMcpServerAnalytics(
			rootStore.restApiContext,
			props.serverId,
			Number(days.value),
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.analytics.loadError'));
	} finally {
		loading.value = false;
	}
}

watch(days, () => {
	loading.value = true;
	void load();
});
watch(
	() => props.liveTick,
	() => void load(),
);
onMounted(() => void load());

const tiles = computed(() => {
	if (!data.value) return [];
	return [
		{ label: i18n.baseText('mcpServers.analytics.calls'), value: formatNumber(data.value.calls) },
		{
			label: i18n.baseText('mcpServers.analytics.errorRate'),
			value: formatPercent(data.value.errorRate),
		},
		{
			label: i18n.baseText('mcpServers.analytics.medianDuration'),
			value: formatDuration(data.value.medianDurationMs),
		},
		{
			label: i18n.baseText('mcpServers.analytics.callers'),
			value: formatNumber(data.value.callers),
		},
	];
});

const maxDay = computed(() => Math.max(1, ...(data.value?.byDay ?? []).map((day) => day.calls)));
</script>

<template>
	<div :class="$style.analytics" data-testid="mcp-server-analytics-tab">
		<div :class="$style.toolbar">
			<N8nSegmentControl
				v-model="days"
				:options="dayOptions"
				size="small"
				data-testid="mcp-server-analytics-days"
			/>
		</div>

		<N8nLoading v-if="loading || !data" :rows="6" />
		<template v-else>
			<div :class="$style.tiles">
				<div v-for="tile in tiles" :key="tile.label" :class="$style.tile">
					<N8nText size="small" color="text-light">{{ tile.label }}</N8nText>
					<span :class="$style.tileValue">{{ tile.value }}</span>
				</div>
			</div>

			<section :class="$style.chartCard">
				<N8nHeading tag="h4" size="small" bold>
					{{ i18n.baseText('mcpServers.analytics.perDay') }}
				</N8nHeading>
				<N8nText v-if="data.byDay.length === 0" size="small" color="text-light">
					{{ i18n.baseText('mcpServers.analytics.empty') }}
				</N8nText>
				<div
					v-else
					:class="$style.chart"
					role="img"
					:aria-label="i18n.baseText('mcpServers.analytics.perDay')"
				>
					<N8nTooltip
						v-for="day in data.byDay"
						:key="day.date"
						:content="
							i18n.baseText('mcpServers.analytics.dayTooltip', {
								interpolate: {
									date: formatDate(day.date),
									calls: formatNumber(day.calls),
									errors: formatNumber(day.errors),
								},
							})
						"
					>
						<div :class="$style.column">
							<div :class="$style.columnBar" :style="{ height: `${(day.calls / maxDay) * 100}%` }">
								<div
									v-if="day.calls > 0"
									:class="$style.columnErrors"
									:style="{ height: `${(day.errors / day.calls) * 100}%` }"
								/>
							</div>
						</div>
					</N8nTooltip>
				</div>
				<div v-if="data.byDay.length" :class="$style.axis">
					<N8nText size="xsmall" color="text-light">{{ formatDate(data.byDay[0].date) }}</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{ formatDate(data.byDay[data.byDay.length - 1].date) }}
					</N8nText>
				</div>
			</section>

			<div :class="$style.lists">
				<McpServerBarList
					:title="i18n.baseText('mcpServers.analytics.byTool')"
					:items="data.byTool"
					:empty-text="i18n.baseText('mcpServers.analytics.empty')"
					mono
				/>
				<McpServerBarList
					:title="i18n.baseText('mcpServers.analytics.byClient')"
					:items="data.byClient"
					:empty-text="i18n.baseText('mcpServers.analytics.empty')"
				/>
				<McpServerBarList
					:title="i18n.baseText('mcpServers.analytics.byCaller')"
					:items="data.byCaller"
					:empty-text="i18n.baseText('mcpServers.analytics.empty')"
				/>
				<McpServerBarList
					:title="i18n.baseText('mcpServers.analytics.missingCapabilities')"
					:items="data.missingCapabilities"
					:empty-text="i18n.baseText('mcpServers.analytics.missingCapabilities.empty')"
				/>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.analytics {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.toolbar {
	display: flex;
	justify-content: flex-end;
}

.tiles {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	gap: var(--spacing--xs);
}

.tile {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
}

.tileValue {
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	font-variant-numeric: tabular-nums;
}

.chartCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
}

.chart {
	display: flex;
	align-items: flex-end;
	gap: var(--spacing--5xs);
	height: 160px;

	// N8nTooltip wraps each column in a span, which must fill the column slot.
	> * {
		display: flex;
		flex: 1;
		height: 100%;
		min-width: 0;
	}
}

.column {
	display: flex;
	align-items: flex-end;
	flex: 1;
	height: 100%;
	min-width: 0;
}

.columnBar {
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	width: 100%;
	min-height: 1px;
	border-radius: var(--radius--xs) var(--radius--xs) 0 0;
	background: var(--color--secondary);
	overflow: hidden;
}

.columnErrors {
	width: 100%;
	background: var(--color--danger);
}

.axis {
	display: flex;
	justify-content: space-between;
}

.lists {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	gap: var(--spacing--xs);
}
</style>
