<script setup lang="ts">
import { LLM_USAGE_RANGE_DAYS } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nEmptyState,
	N8nHeading,
	N8nOption,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { onMounted } from 'vue';

import LlmUsageCallsTable from './components/LlmUsageCallsTable.vue';
import LlmUsageSpendChart from './components/LlmUsageSpendChart.vue';
import LlmUsageSummary from './components/LlmUsageSummary.vue';
import LlmUsageTopSpenders from './components/LlmUsageTopSpenders.vue';
import { useLlmUsageStore } from './llm-usage.store';

const i18n = useI18n();
const store = useLlmUsageStore();
const { showError } = useToast();

async function load(days?: number) {
	try {
		await store.fetchAll(days);
	} catch (error) {
		showError(error, i18n.baseText('settings.llmUsage.loadError'));
	}
}

onMounted(async () => await load());
</script>

<template>
	<N8nSettingsLayout full-width>
		<div :class="$style.page">
			<div :class="$style.header">
				<N8nSettingsPageHeader
					:title="i18n.baseText('settings.llmUsage.title')"
					:description="i18n.baseText('settings.llmUsage.description')"
					:show-docs-link="false"
				/>
				<N8nSelect
					:class="$style.range"
					:model-value="store.days"
					:aria-label="i18n.baseText('settings.llmUsage.range.label')"
					data-test-id="llm-usage-range"
					@update:model-value="load"
				>
					<N8nOption
						v-for="days in LLM_USAGE_RANGE_DAYS"
						:key="days"
						:value="days"
						:label="i18n.baseText('settings.llmUsage.range.days', { interpolate: { days } })"
					/>
				</N8nSelect>
			</div>

			<N8nEmptyState
				v-if="store.summary?.totals.calls === 0"
				:heading="
					i18n.baseText('settings.llmUsage.empty.heading', {
						interpolate: { days: store.days },
					})
				"
				:description="i18n.baseText('settings.llmUsage.empty.description')"
			/>
			<template v-else-if="store.summary">
				<LlmUsageSummary :totals="store.summary.totals" />

				<section :class="[$style.section, $style.panel]">
					<N8nHeading tag="h2" size="small" bold>
						{{ i18n.baseText('settings.llmUsage.chart.title') }}
					</N8nHeading>
					<LlmUsageSpendChart :daily="store.summary.daily" :days="store.days" />
				</section>

				<section :class="$style.section">
					<N8nHeading tag="h2" size="small" bold>
						{{ i18n.baseText('settings.llmUsage.top.title') }}
					</N8nHeading>
					<LlmUsageTopSpenders
						:top="store.summary.top"
						:total-cost-usd="store.summary.totals.costUsd"
					/>
				</section>

				<section :class="$style.section">
					<N8nHeading tag="h2" size="small" bold>
						{{ i18n.baseText('settings.llmUsage.calls.title') }}
					</N8nHeading>
					<LlmUsageCallsTable />
				</section>
			</template>
		</div>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
}

/* One full-width row, so the title lines up with the content instead of the centered header column. */
.header {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.range {
	/* Wide enough for the longest range label; no width token fits a select. */
	width: 12rem;
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.panel {
	padding: var(--spacing--md) var(--spacing--lg);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
}
</style>
