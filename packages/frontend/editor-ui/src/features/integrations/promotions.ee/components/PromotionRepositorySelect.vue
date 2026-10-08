<script setup lang="ts">
import type { PromotionRepository } from '@n8n/api-types';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nOption, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useDebounceFn } from '@vueuse/core';
import { computed, onUnmounted, ref, watch } from 'vue';

import { DEBOUNCE_TIME } from '@/app/constants/durations';
import { fetchPromotionRepositories } from '../promotionsSettings.api';

const props = defineProps<{
	providerId: string;
	disabled?: boolean;
}>();

/** The remote URL of the selected repository. */
const remoteUrl = defineModel<string>({ required: true });

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const repositories = ref<PromotionRepository[]>([]);
const isLoading = ref(false);
const nextCursor = ref<string | null>(null);
const searchText = ref('');
const hasLoadError = ref(false);

// The saved remote may not be in the loaded results, so keep it as an option.
const options = computed(() => {
	const selected = remoteUrl.value;
	if (!selected || repositories.value.some((repository) => repository.remoteUrl === selected)) {
		return repositories.value;
	}
	return [{ id: selected, fullPath: selected, remoteUrl: selected }, ...repositories.value];
});

// Responses can arrive out of order, so only the latest request may update the list.
let latestRequest = 0;

async function load(cursor?: string) {
	const request = ++latestRequest;
	const providerId = props.providerId;
	isLoading.value = true;
	hasLoadError.value = false;
	try {
		const page = await fetchPromotionRepositories(rootStore.publicApiContext, providerId, {
			search: searchText.value || undefined,
			...(cursor && { cursor }),
		});
		if (request !== latestRequest) return;
		repositories.value = cursor
			? [
					...new Map(
						[...repositories.value, ...page.data].map((repository) => [repository.id, repository]),
					).values(),
				]
			: page.data;
		nextCursor.value = page.nextCursor;
	} catch (error) {
		if (request !== latestRequest) return;
		hasLoadError.value = true;
		if (!cursor) repositories.value = [];
		toast.showError(error, i18n.baseText('settings.promotions.connection.form.repository.error'));
	} finally {
		if (request === latestRequest) isLoading.value = false;
	}
}

const debouncedLoad = useDebounceFn(async (request: number) => {
	if (request === latestRequest) await load();
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

function search(query: string) {
	const text = query.trim();
	// The select can repeat a query when it opens or clears its input after selection.
	if (text === searchText.value) return;
	// Invalidate in-flight results before the debounce delay starts.
	searchText.value = text;
	repositories.value = [];
	nextCursor.value = null;
	isLoading.value = true;
	void debouncedLoad(++latestRequest);
}

async function loadMore() {
	if (nextCursor.value && !isLoading.value && !props.disabled) await load(nextCursor.value);
}

watch(
	() => props.providerId,
	async () => {
		searchText.value = '';
		hasLoadError.value = false;
		repositories.value = [];
		nextCursor.value = null;
		await load();
	},
	{ immediate: true, flush: 'sync' },
);

onUnmounted(() => {
	++latestRequest;
});
</script>

<template>
	<N8nSelect
		v-model="remoteUrl"
		filterable
		remote
		:remote-method="search"
		:loading="isLoading"
		:disabled="disabled"
		:placeholder="i18n.baseText('settings.promotions.connection.form.repository.placeholder')"
		:no-data-text="
			i18n.baseText(
				hasLoadError
					? 'settings.promotions.connection.form.repository.error'
					: 'settings.promotions.connection.form.repository.noData',
			)
		"
		data-test-id="promotion-connection-repository-select"
	>
		<template v-if="nextCursor || hasLoadError" #footer>
			<N8nButton
				v-if="hasLoadError && !nextCursor"
				type="button"
				variant="outline"
				size="small"
				:disabled="disabled || isLoading"
				data-test-id="promotion-connection-repository-retry"
				@mousedown.prevent
				@click.stop="load()"
			>
				{{ i18n.baseText('generic.retry') }}
			</N8nButton>
			<N8nButton
				v-if="nextCursor"
				type="button"
				variant="outline"
				size="small"
				:loading="isLoading"
				:disabled="disabled || isLoading"
				data-test-id="promotion-connection-repository-load-more"
				@mousedown.prevent
				@click.stop="loadMore"
			>
				{{ i18n.baseText('settings.promotions.connection.form.repository.loadMore') }}
			</N8nButton>
		</template>
		<N8nOption
			v-for="repository in options"
			:key="repository.id"
			:value="repository.remoteUrl"
			:label="repository.fullPath"
			data-test-id="promotion-connection-repository-option"
		/>
	</N8nSelect>
</template>
