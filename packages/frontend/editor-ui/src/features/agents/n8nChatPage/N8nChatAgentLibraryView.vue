<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { N8nEmptyState, N8nIcon, N8nInput, N8nPagination, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getDebounceTime } from '@n8n/composables/useDebounce';

import { DEBOUNCE_TIME, DEFAULT_WORKFLOW_PAGE_SIZE } from '@/app/constants';
import { AGENT_N8N_CHAT_SEARCH_MAX_LENGTH } from '../constants';
import { useAgentsN8nChatVariant } from '../composables/useAgentsN8nChatFlag';
import { useN8nChatAgents } from './composables/useN8nChatAgents';
import N8nChatAgentGrid from './components/N8nChatAgentGrid.vue';
import N8nChatPageLayout from './components/N8nChatPageLayout.vue';

const i18n = useI18n();

const searchInput = ref('');
const query = ref('');
const page = ref(1);
const pageSize = ref(DEFAULT_WORKFLOW_PAGE_SIZE);
// Same choices as the other n8n lists (`ResourcesListLayout`).
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const { agents, count, isLoading, loadFailed, retry } = useN8nChatAgents({ query, page, pageSize });

const onSearch = useDebounceFn((value: string) => {
	const trimmed = value.trim();
	if (trimmed === query.value) return;
	query.value = trimmed;
	page.value = 1;
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

function onSearchInput(value: string): void {
	searchInput.value = value;
	void onSearch(value);
}

const hasSearch = computed(() => query.value.length > 0);
const showPagination = computed(() => count.value > 0);

// Variant B lists the n8n Assistant as a chat option too, at the top of the unfiltered list.
const { isVariantB } = useAgentsN8nChatVariant();
const includeAssistant = computed(() => isVariantB.value && !hasSearch.value && page.value === 1);
// With the Assistant card there is always something to pick, so no empty state.
const showEmptyState = computed(
	() => !includeAssistant.value && !isLoading.value && !loadFailed.value && count.value === 0,
);

function onPageSizeChange(size: number): void {
	pageSize.value = size;
	page.value = 1;
}
</script>

<template>
	<N8nChatPageLayout>
		<N8nText tag="h1" size="xlarge" bold>
			{{ i18n.baseText('agents.n8nChatPage.library.title') }}
		</N8nText>

		<N8nInput
			:model-value="searchInput"
			:placeholder="i18n.baseText('agents.n8nChatPage.library.search.placeholder')"
			:maxlength="AGENT_N8N_CHAT_SEARCH_MAX_LENGTH"
			size="medium"
			clearable
			data-testid="n8n-chat-library-search"
			@update:model-value="onSearchInput"
		>
			<template #prefix>
				<N8nIcon icon="search" />
			</template>
		</N8nInput>

		<N8nEmptyState
			v-if="showEmptyState"
			data-testid="n8n-chat-library-empty"
			:icon="{ type: 'icon', value: 'bot' }"
			:heading="
				hasSearch
					? i18n.baseText('agents.n8nChatPage.library.empty.noResults.title')
					: i18n.baseText('agents.n8nChatPage.library.empty.noAgents.title')
			"
		/>
		<template v-else>
			<!-- A failed agent load must not hide the Assistant card: it's always a
			valid pick, independent of whether the agent list loaded. -->
			<N8nChatAgentGrid
				v-if="!loadFailed || includeAssistant"
				:agents="loadFailed ? [] : agents"
				:loading="!loadFailed && isLoading"
				:include-assistant="includeAssistant"
				source="library"
			/>
			<N8nEmptyState
				v-if="loadFailed"
				data-testid="n8n-chat-library-error"
				:icon="{ type: 'icon', value: 'circle-alert' }"
				:heading="i18n.baseText('agents.n8nChatPage.library.loadFailed.title')"
				:button-text="i18n.baseText('generic.retry')"
				@click:button="retry"
			/>
		</template>

		<N8nPagination
			v-if="showPagination"
			v-model:page="page"
			:class="$style.pagination"
			:items-per-page="pageSize"
			:total="count"
			:page-sizes="PAGE_SIZE_OPTIONS"
			data-test-id="n8n-chat-agent-library-pagination"
			@update:items-per-page="onPageSizeChange"
		/>
	</N8nChatPageLayout>
</template>

<style lang="scss" module>
.pagination {
	align-self: flex-end;
}
</style>
