<script setup lang="ts">
import {
	LLM_USAGE_TOP_GROUPS,
	type LlmUsageGroup,
	type LlmUsageSummaryResponse,
	type LlmUsageTopGroup,
} from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

import { formatCount, formatUsd } from '../llm-usage.format';
import { dynamicLlmUsageText } from '../llm-usage.i18n';

const props = defineProps<{ top: LlmUsageSummaryResponse['top']; totalCostUsd: number }>();

const i18n = useI18n();

const TITLE_KEYS: Record<LlmUsageTopGroup, BaseTextKey> = {
	workflow: 'settings.llmUsage.top.workflow',
	agent: 'settings.llmUsage.top.agent',
	model: 'settings.llmUsage.top.model',
	caller: 'settings.llmUsage.top.caller',
	user: 'settings.llmUsage.top.user',
};

/** The display name of a group. A caller group shows its caller type. A group with no name shows "Not set". */
const groupLabel = ({ caller, label }: LlmUsageGroup) =>
	caller
		? dynamicLlmUsageText(i18n, `caller.${caller}`)
		: label || i18n.baseText('settings.llmUsage.notSet');

const lists = computed(() =>
	LLM_USAGE_TOP_GROUPS.map((group) => ({
		group,
		title: i18n.baseText(TITLE_KEYS[group]),
		rows: props.top[group].map((entry) => ({
			key: entry.key,
			label: groupLabel(entry),
			cost: formatUsd(entry.costUsd),
			calls: i18n.baseText('settings.llmUsage.callCount', {
				adjustToNumber: entry.calls,
				interpolate: { count: formatCount(entry.calls) },
			}),
			sharePercent: props.totalCostUsd ? (entry.costUsd / props.totalCostUsd) * 100 : 0,
		})),
	})),
);
</script>

<template>
	<div :class="$style.grid">
		<section
			v-for="list in lists"
			:key="list.group"
			:class="$style.card"
			:data-test-id="`llm-usage-top-${list.group}`"
		>
			<N8nText tag="h3" size="small" bold color="text-dark">{{ list.title }}</N8nText>
			<ol :class="$style.rows">
				<li v-for="row in list.rows" :key="row.key" :class="$style.row">
					<div :class="$style.line">
						<N8nText size="small" color="text-dark" :class="$style.label" :title="row.label">
							{{ row.label }}
						</N8nText>
						<N8nText size="small" color="text-dark">{{ row.cost }}</N8nText>
					</div>
					<div :class="$style.line">
						<div :class="$style.track">
							<div :class="$style.bar" :style="{ width: `${row.sharePercent}%` }" />
						</div>
						<N8nText size="xsmall" color="text-light">{{ row.calls }}</N8nText>
					</div>
				</li>
			</ol>
		</section>
	</div>
</template>

<style lang="scss" module>
.grid {
	display: grid;
	/* The narrowest card that keeps a name and its cost on one line; no size token fits. */
	grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
	gap: var(--spacing--sm);
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
}

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.row {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.line {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.track {
	flex: 1;
	/* A thin bar: the smallest height token is 8px, so this uses the 4px spacing step. */
	height: var(--spacing--4xs);
	border-radius: var(--radius--full);
	background-color: var(--background--subtle);
	overflow: hidden;
}

.bar {
	height: 100%;
	border-radius: var(--radius--full);
	background-color: var(--background--brand);
}
</style>
