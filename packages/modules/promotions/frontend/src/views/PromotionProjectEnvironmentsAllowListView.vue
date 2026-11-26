<script setup lang="ts">
import type { PromotionProjectEnvironmentsAllowListProject } from '@n8n/api-types';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nDataTableServer,
	N8nEmptyState,
	N8nIcon,
	N8nInput,
	N8nSelect2,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSwitch,
	N8nText,
	type SelectOptionBase,
	type TableHeader,
	type TableOptions,
} from '@n8n/design-system';
import { DEBOUNCE_TIME } from '@n8n/frontend-constants/durations';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useDebounceFn } from '@vueuse/core';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { PROMOTIONS_SETTINGS_VIEW } from '../promotions.constants';
import {
	getPromotionProjectEnvironmentsAllowList,
	updatePromotionProjectEnvironmentsAllowList,
} from '../promotionsSettings.api';

type AllowFilter = 'allowed' | 'notAllowed';

const PAGE_SIZE = 10;

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const rootStore = useRootStore();
const documentTitle = useDocumentTitle({
	releaseChannel: useSettingsStore().settings.releaseChannel,
});
// Only the newest load updates the page, so a slow earlier search cannot win.
const { next: nextLoad } = useLatestFetch();

const projects = ref<PromotionProjectEnvironmentsAllowListProject[]>([]);
const count = ref(0);
const loading = ref(true);
const loadFailed = ref(false);
const savingIds = reactive(new Set<string>());
const search = ref('');
const filter = ref<AllowFilter | ''>('');
const tableOptions = ref<TableOptions>({ page: 0, itemsPerPage: PAGE_SIZE, sortBy: [] });
/** Whether the shown page was loaded with a search text or a filter. */
const loadedFiltered = ref(false);

const headers = computed<Array<TableHeader<PromotionProjectEnvironmentsAllowListProject>>>(() => [
	{ title: i18n.baseText('generic.project'), key: 'name', disableSort: true },
	{
		title: i18n.baseText('settings.promotions.projectEnvironments.allowList.column.allow'),
		key: 'allowEnvironments',
		disableSort: true,
	},
]);

const filterOptions = computed<Array<SelectOptionBase<AllowFilter>>>(() => [
	{
		value: 'allowed',
		label: i18n.baseText('settings.promotions.projectEnvironments.allowList.filter.allowed'),
	},
	{
		value: 'notAllowed',
		label: i18n.baseText('settings.promotions.projectEnvironments.allowList.filter.notAllowed'),
	},
]);

/**
 * `keepRowsOnError` is only for the reload after a save, which keeps the rows on screen.
 * A failed page, search or filter change must not keep rows of another query.
 */
async function load({ keepRowsOnError = false } = {}) {
	const isLatest = nextLoad();
	const { page = 0, itemsPerPage = PAGE_SIZE } = tableOptions.value;
	const term = search.value.trim();
	loading.value = true;
	try {
		const result = await getPromotionProjectEnvironmentsAllowList(rootStore.restApiContext, {
			skip: page * itemsPerPage,
			take: itemsPerPage,
			...(term ? { search: term } : {}),
			...(filter.value ? { allowEnvironments: filter.value === 'allowed' } : {}),
		});
		if (!isLatest()) return;
		// A save under a filter can leave the page past the end.
		const lastPage = Math.max(0, Math.ceil(result.count / itemsPerPage) - 1);
		if (page > lastPage) {
			tableOptions.value = { ...tableOptions.value, page: lastPage };
			await load();
			return;
		}
		projects.value = result.data;
		count.value = result.count;
		loadedFiltered.value = term !== '' || filter.value !== '';
		loadFailed.value = false;
	} catch {
		if (!isLatest()) return;
		if (!keepRowsOnError) loadFailed.value = true;
	} finally {
		if (isLatest()) loading.value = false;
	}
}

async function onOptionsUpdate(options: TableOptions) {
	tableOptions.value = options;
	await load();
}

/** A new search or filter starts at the first page. */
async function resetPage() {
	tableOptions.value = { ...tableOptions.value, page: 0 };
	await load();
}

const onSearch = useDebounceFn(resetPage, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

async function onFilter(value: unknown) {
	filter.value = value === 'allowed' || value === 'notAllowed' ? value : '';
	await resetPage();
}

function setAllowed(projectId: string, allowEnvironments: boolean) {
	projects.value = projects.value.map((project) =>
		project.id === projectId ? { ...project, allowEnvironments } : project,
	);
}

async function onAllow(projectId: string, allowEnvironments: boolean) {
	const previous = projects.value.find((project) => project.id === projectId)?.allowEnvironments;
	if (previous === undefined) return;

	setAllowed(projectId, allowEnvironments);
	savingIds.add(projectId);
	try {
		const response = await updatePromotionProjectEnvironmentsAllowList(
			rootStore.restApiContext,
			projectId,
			{ allowEnvironments },
		);
		setAllowed(projectId, response.allowEnvironments);
		toast.showMessage({
			title: i18n.baseText('settings.promotions.projectAccess.toast.saved'),
			type: 'success',
		});
	} catch (error) {
		setAllowed(projectId, previous);
		toast.showError(
			error,
			i18n.baseText('settings.promotions.projectEnvironments.allowList.error.save'),
			{ message: i18n.baseText('settings.promotions.projectEnvironments.toast.error.description') },
		);
	} finally {
		savingIds.delete(projectId);
	}
	// The server can store the value and the response can still fail, so show what it stored.
	// The saved row can also leave the filter.
	void load({ keepRowsOnError: true });
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.promotions.projectEnvironments.allowList.title'));
	await load();
});
</script>

<template>
	<N8nSettingsLayout
		:class="$style.layout"
		full-width
		show-back
		:back-label="i18n.baseText('settings.promotions.environment.back')"
		data-test-id="promotion-project-environments-allow-list-view"
		@back="router.push({ name: PROMOTIONS_SETTINGS_VIEW })"
	>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.promotions.projectEnvironments.allowList.title')"
			:description="i18n.baseText('settings.promotions.projectEnvironments.allowList.description')"
			:show-docs-link="false"
		/>

		<div :class="$style.toolbar">
			<N8nInput
				v-model="search"
				:class="$style.search"
				:placeholder="i18n.baseText('settings.promotions.projectEnvironments.allowList.search')"
				clearable
				data-test-id="promotion-project-environments-allow-list-search"
				@update:model-value="onSearch"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>
			<N8nSelect2
				:class="$style.filter"
				:model-value="filter || undefined"
				:items="filterOptions"
				size="medium"
				clearable
				:placeholder="i18n.baseText('settings.promotions.projectEnvironments.allowList.filter.all')"
				:aria-label="
					i18n.baseText('settings.promotions.projectEnvironments.allowList.column.allow')
				"
				data-test-id="promotion-project-environments-allow-list-filter"
				@update:model-value="onFilter"
			/>
		</div>

		<N8nEmptyState
			v-if="loadFailed"
			:heading="i18n.baseText('settings.promotions.projectEnvironments.allowList.error.load')"
			:description="
				i18n.baseText('settings.promotions.projectEnvironments.toast.error.description')
			"
			:button-text="i18n.baseText('generic.retry')"
			data-test-id="promotion-project-environments-allow-list-load-error"
			@click:button="load()"
		/>
		<N8nDataTableServer
			v-else
			v-model:page="tableOptions.page"
			v-model:items-per-page="tableOptions.itemsPerPage"
			:headers="headers"
			:items="projects"
			:items-length="count"
			:loading="loading"
			:page-sizes="[10, 25, 50]"
			item-value="id"
			@update:options="onOptionsUpdate"
		>
			<template #[`item.name`]="{ item }">
				<N8nText>{{ item.name }}</N8nText>
			</template>
			<template #[`item.allowEnvironments`]="{ item }">
				<N8nSwitch
					:model-value="item.allowEnvironments"
					:disabled="savingIds.has(item.id)"
					:aria-label="
						i18n.baseText('settings.promotions.projectEnvironments.allowList.allowFor', {
							interpolate: { project: item.name },
						})
					"
					:data-test-id="`promotion-project-environments-allow-switch-${item.id}`"
					data-attr="promotion-project-environments-allow-switch"
					@update:model-value="onAllow(item.id, $event)"
				/>
			</template>
			<template v-if="!loading && count === 0" #cover>
				<div :class="$style.empty">
					<N8nText
						color="text-light"
						data-test-id="promotion-project-environments-allow-list-empty"
					>
						{{
							i18n.baseText(
								loadedFiltered
									? 'settings.promotions.projectEnvironments.allowList.noMatch'
									: 'settings.promotions.projectEnvironments.allowList.empty',
							)
						}}
					</N8nText>
				</div>
			</template>
		</N8nDataTableServer>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.layout {
	padding-top: 0;
}

/* Pin the back action to the top-left of the settings area so the heading lines up with the overview. */
.layout > div:first-child {
	position: absolute;
	top: var(--spacing--lg);
	left: var(--spacing--lg);
	width: auto;
}

.toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	min-width: 0;
}

/* Same width as the other settings search fields. No width token exists for it.
   It shrinks on narrow pages, so the filter stays inside the toolbar. */
.search {
	flex: 1 1 auto;
	min-width: 0;
	max-width: 20rem;
}

/* The select trigger is full width by default. Hug the label instead. */
.filter.filter {
	flex: none;
	width: fit-content;
	min-width: var(--spacing--4xl);
}

/* The cover cell has no padding or height. Match the height and inset of a row. */
.empty {
	display: flex;
	align-items: center;
	min-height: var(--spacing--2xl);
	padding: 0 var(--spacing--sm);
}
</style>
