<script lang="ts" setup>
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { N8nButton, N8nSpinner, N8nText } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useExecutionsStore } from '../executions.store';

/**
 * Tells the user how much of the history a search has covered. A search stops before
 * the end of the history, so "no matches" must always come with the range it is for.
 */
const executionsStore = useExecutionsStore();
const i18n = useI18n();
const toast = useToast();

const numberFormat = new Intl.NumberFormat();

const matchesText = computed(() => {
	// In search mode the list holds matches only.
	const count = Object.keys(executionsStore.executionsById).length;
	return i18n.baseText('executionsSearch.status.matches', {
		adjustToNumber: count,
		interpolate: { count: numberFormat.format(count) },
	});
});

const statusText = computed(() => {
	const count = numberFormat.format(executionsStore.searchedCount);

	if (executionsStore.loading) {
		return i18n.baseText('executionsSearch.status.searching', { interpolate: { count } });
	}
	if (!executionsStore.hasMoreExecutions) {
		return i18n.baseText('executionsSearch.status.complete', {
			interpolate: { count, matches: matchesText.value },
		});
	}
	// The first step failed, so the search covered nothing.
	if (!executionsStore.searchedBackTo) return i18n.baseText('executionsSearch.status.notStarted');

	const { date, time } = convertToDisplayDate(executionsStore.searchedBackTo);
	return i18n.baseText('executionsSearch.status.partial', {
		adjustToNumber: executionsStore.searchedCount,
		interpolate: { count, date: `${date} ${time}`, matches: matchesText.value },
	});
});

async function keepSearching() {
	try {
		await executionsStore.loadMoreExecutions();
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsSearch.error.title'));
	}
}
</script>

<template>
	<div :class="$style.status" data-test-id="executions-search-status">
		<N8nSpinner v-if="executionsStore.loading" size="small" />
		<N8nText size="small" color="text-base" role="status" aria-live="polite">
			{{ statusText }}
		</N8nText>
		<N8nButton
			v-if="!executionsStore.loading && executionsStore.hasMoreExecutions"
			variant="outline"
			size="small"
			:label="i18n.baseText('executionsSearch.keepSearching')"
			data-test-id="executions-search-continue"
			@click="keepSearching"
		/>
	</div>
</template>

<style module lang="scss">
.status {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) 0;
	text-align: center;
}
</style>
