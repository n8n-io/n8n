<script setup lang="ts">
import {
	LLM_USAGE_CALL_SORT_KEYS,
	type LlmUsageCallItem,
	type LlmUsageCallSortKey,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nDataTableServer, type TableHeader, type TableOptions } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed } from 'vue';

import { CALLS_PAGE_SIZES } from '../llm-usage.constants';
import { formatCount, formatDateTime, formatSeconds, formatUsd } from '../llm-usage.format';
import { dynamicLlmUsageText } from '../llm-usage.i18n';
import { callSource } from '../llm-usage.source';
import { useLlmUsageStore } from '../llm-usage.store';
import LlmUsageCallSource from './LlmUsageCallSource.vue';

const i18n = useI18n();
const store = useLlmUsageStore();
const usersStore = useUsersStore();
const { showError } = useToast();

const isSortKey = (id: string): id is LlmUsageCallSortKey =>
	LLM_USAGE_CALL_SORT_KEYS.some((key) => key === id);

// Built once per page: the table reads a row's source several times per render, and a link
// resolves its route again whenever it gets a new object.
const callSources = computed(() => {
	const texts = {
		untitledSession: i18n.baseText('settings.llmUsage.untitledSession'),
		notSet: i18n.baseText('settings.llmUsage.notSet'),
	};
	return new Map(
		store.calls.items.map((call) => [
			call.callId,
			callSource(call, usersStore.currentUserId, texts),
		]),
	);
});
// Rows always come from `store.calls.items`. The fallback only satisfies the type.
const sourceOf = (call: LlmUsageCallItem) => callSources.value.get(call.callId) ?? { title: '' };

function credentialLabel(call: LlmUsageCallItem) {
	if (call.managedBy === 'aiGateway') return i18n.baseText('settings.llmUsage.managedBy.aiGateway');
	if (call.managedBy === 'assistant') return i18n.baseText('settings.llmUsage.managedBy.assistant');
	return call.credentialName ?? i18n.baseText('settings.llmUsage.notSet');
}

const NUMERIC_COLUMNS = ['durationMs', 'inputTokens', 'outputTokens', 'estimatedCostUsd'];

/**
 * `width` is in pixels. The table stretches every column by the same ratio to fill its
 * container, so the widths set how the space is shared: names wide, numbers narrow.
 */
const column = (
	key: string,
	titleKey: BaseTextKey,
	width: number,
	value: (call: LlmUsageCallItem) => string,
): TableHeader<LlmUsageCallItem> => ({
	key,
	value,
	width,
	title: i18n.baseText(titleKey),
	resize: false,
	align: NUMERIC_COLUMNS.includes(key) ? 'end' : undefined,
});

const headers: Array<TableHeader<LlmUsageCallItem>> = [
	column('finishedAt', 'settings.llmUsage.column.date', 170, (call) =>
		formatDateTime(call.finishedAt),
	),
	column('name', 'settings.llmUsage.column.name', 210, (call) => sourceOf(call).title),
	column('caller', 'settings.llmUsage.column.caller', 110, (call) =>
		dynamicLlmUsageText(i18n, `caller.${call.callerType}`),
	),
	column('provider', 'settings.llmUsage.column.provider', 100, (call) => call.provider),
	column('model', 'settings.llmUsage.column.model', 170, (call) => call.model),
	{
		...column('credential', 'settings.llmUsage.column.credential', 140, credentialLabel),
		// The API sorts by its own keys only, and a credential name is not one of them.
		disableSort: true,
	},
	column('durationMs', 'settings.llmUsage.column.duration', 90, (call) =>
		call.durationMs === null ? '' : formatSeconds(call.durationMs),
	),
	column('inputTokens', 'settings.llmUsage.column.inputTokens', 110, (call) =>
		formatCount(call.inputTokens),
	),
	column('outputTokens', 'settings.llmUsage.column.outputTokens', 110, (call) =>
		formatCount(call.outputTokens),
	),
	column('estimatedCostUsd', 'settings.llmUsage.column.cost', 120, (call) =>
		call.priced && call.estimatedCostUsd !== null
			? formatUsd(call.estimatedCostUsd)
			: i18n.baseText('settings.llmUsage.unpriced'),
	),
];

// The store owns the sort. The table asks for changes through `update:options`, and the model
// binding keeps its header on the store's sort, also after a cleared sort that changes nothing.
const sortBy = computed({
	get: () => [{ id: store.callsQuery.sortBy, desc: store.callsQuery.sortOrder === 'desc' }],
	set: () => {},
});
const page = computed(() => store.callsQuery.skip / store.callsQuery.take);

async function onOptionsChange(options: TableOptions) {
	const [first] = options.sortBy;
	// Clearing the sort falls back to the newest calls first.
	const sorted = first !== undefined && isSortKey(first.id);
	const current = store.callsQuery;
	const nextSortBy = sorted ? first.id : 'finishedAt';
	const nextSortOrder = !sorted || first.desc ? 'desc' : 'asc';
	const sortChanged = nextSortBy !== current.sortBy || nextSortOrder !== current.sortOrder;
	// A new sort starts on the first page.
	const skip = sortChanged ? 0 : options.page * options.itemsPerPage;
	// The table also reports options that the store set itself, such as the page reset of a
	// new range. Those are loaded already.
	if (!sortChanged && skip === current.skip && options.itemsPerPage === current.take) return;
	try {
		await store.fetchCalls({
			skip,
			take: options.itemsPerPage,
			sortBy: nextSortBy,
			sortOrder: nextSortOrder,
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.llmUsage.loadError'));
	}
}
</script>

<template>
	<N8nDataTableServer
		:headers="headers"
		:items="store.calls.items"
		:items-length="store.calls.count"
		v-model:sort-by="sortBy"
		:page="page"
		:items-per-page="store.callsQuery.take"
		:page-sizes="CALLS_PAGE_SIZES"
		:loading="store.callsLoading"
		item-value="callId"
		data-test-id="llm-usage-calls"
		@update:options="onOptionsChange"
	>
		<template #[`item.name`]="{ item }">
			<LlmUsageCallSource :source="sourceOf(item)" />
		</template>
		<template #[`item.model`]="{ item }">
			<div :class="$style.ellipsis" :title="item.model">{{ item.model }}</div>
		</template>
		<template #[`item.credential`]="{ item }">
			<div :class="$style.ellipsis" :title="credentialLabel(item)">{{ credentialLabel(item) }}</div>
		</template>
		<template #[`item.provider`]="{ item }">
			<span :class="$style.badge">{{ item.provider }}</span>
		</template>
	</N8nDataTableServer>
</template>

<style lang="scss" module>
.ellipsis {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.badge {
	display: inline-block;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border-radius: var(--radius--full);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	background-color: var(--background--subtle);
	color: var(--text-color--subtle);
}
</style>
