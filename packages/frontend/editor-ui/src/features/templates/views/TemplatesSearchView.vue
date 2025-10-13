<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import TemplatesInfoCarousel from '../components/TemplatesInfoCarousel.vue';
import TemplateFilters from '../components/TemplateFilters.vue';
import TemplateList from '../components/TemplateList.vue';
import TemplatesView from './TemplatesView.vue';

import type { ITemplatesCategory } from '@n8n/rest-api-client/api/templates';
import type { IDataObject } from 'n8n-workflow';
import { CREATOR_HUB_URL, VIEWS } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useTemplatesStore } from '@/features/templates/templates.store';
import { useToast } from '@/composables/useToast';
import { useDebounce } from '@/composables/useDebounce';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { useRoute, onBeforeRouteLeave, useRouter } from 'vue-router';
import { useTelemetry } from '@/composables/useTelemetry';

import { N8nButton, N8nHeading, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
interface ISearchEvent {
	search_string: string;
	workflow_results_count: number;
	collection_results_count: number;
	categories_applied: ITemplatesCategory[];
	wf_template_repo_session_id: string;
}

const areCategoriesPrepopulated = ref(false);
const categories = ref<ITemplatesCategory[]>([]);
const loadingCategories = ref(true);
const loadingCollections = ref(true);
const loadingWorkflows = ref(true);
const search = ref('');
const searchEventToTrack = ref<ISearchEvent | null>(null);
const errorLoadingWorkflows = ref(false);

const { callDebounced } = useDebounce();
const toast = useToast();
const documentTitle = useDocumentTitle();

const settingsStore = useSettingsStore();
const templatesStore = useTemplatesStore();
const usersStore = useUsersStore();
const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const telemetry = useTelemetry();

const createQueryObject = (categoryId: 'name' | 'id') => {
	// We are using category names for template search and ids for collection search
	return {
		categories: categories.value.map((category) =>
			categoryId === 'name' ? category.name : String(category.id),
		),
		search: search.value,
	};
};

const totalWorkflows = computed(() =>
	templatesStore.getSearchedWorkflowsTotal(createQueryObject('name')),
);

const workflows = computed(
	() => templatesStore.getSearchedWorkflows(createQueryObject('name')) ?? [],
);

const collections = computed(
	() => templatesStore.getSearchedCollections(createQueryObject('id')) ?? [],
);

const endOfSearchMessage = computed(() => {
	if (loadingWorkflows.value) {
		return null;
	}
	if (!loadingCollections.value && workflows.value.length === 0 && collections.value.length === 0) {
		if (!settingsStore.isTemplatesEndpointReachable && errorLoadingWorkflows.value) {
			return i18n.baseText('templates.connectionWarning');
		}
		return i18n.baseText('templates.noSearchResults');
	}

	return null;
});

const updateQueryParam = (search: string, category: string) => {
	const query = Object.assign({}, route.query);

	if (category.length) {
		query.categories = category;
	} else {
		delete query.categories;
	}

	if (search.length) {
		query.search = search;
	} else {
		delete query.search;
	}

	void router.replace({ query });
};

const updateSearch = () => {
	updateQueryParam(search.value, categories.value.map((category) => category.id).join(','));
	void loadWorkflowsAndCollections(false);
};

const loadWorkflows = async () => {
	try {
		loadingWorkflows.value = true;
		await templatesStore.getWorkflows({
			search: search.value,
			categories: categories.value.map((category) => category.name),
		});
		errorLoadingWorkflows.value = false;
	} catch (e) {
		errorLoadingWorkflows.value = true;
	}

	loadingWorkflows.value = false;
};

const loadCollections = async () => {
	try {
		loadingCollections.value = true;
		await templatesStore.getCollections({
			categories: categories.value.map((category) => String(category.id)),
			search: search.value,
		});
	} catch (e) {}

	loadingCollections.value = false;
};

const updateSearchTracking = (search: string, categories: number[]) => {
	if (!search) {
		return;
	}
	if (searchEventToTrack.value && searchEventToTrack.value.search_string.length > search.length) {
		return;
	}

	searchEventToTrack.value = {
		search_string: search,
		workflow_results_count: workflows.value.length,
		collection_results_count: collections.value.length,
		categories_applied: categories.map((categoryId) =>
			templatesStore.getCategoryById(categoryId.toString()),
		) as ITemplatesCategory[],
		wf_template_repo_session_id: templatesStore.currentSessionId,
	};
};

const trackCategories = () => {
	if (categories.value.length) {
		telemetry.track('User changed template filters', {
			search_string: search.value,
			categories_applied: categories.value,
			wf_template_repo_session_id: templatesStore.currentSessionId,
		});
	}
};

const loadWorkflowsAndCollections = async (initialLoad: boolean) => {
	const _categories = [...categories.value];
	const _search = search.value;
	await Promise.all([loadWorkflows(), loadCollections()]);
	if (!initialLoad) {
		updateSearchTracking(
			_search,
			_categories.map((category) => category.id),
		);
	}
};

const navigateTo = (e: MouseEvent, page: string, id: number) => {
	if (e.metaKey || e.ctrlKey) {
		const route = router.resolve({ name: page, params: { id } });
		window.open(route.href, '_blank');
		return;
	} else {
		void router.push({ name: page, params: { id } });
	}
};

const onOpenCollection = ({ event, id }: { event: MouseEvent; id: number }) => {
	navigateTo(event, VIEWS.COLLECTION, id);
};

const onOpenTemplate = ({ event, id }: { event: MouseEvent; id: number }) => {
	navigateTo(event, VIEWS.TEMPLATE, id);
};

const trackSearch = () => {
	if (searchEventToTrack.value) {
		telemetry.track(
			'User searched workflow templates',
			searchEventToTrack.value as unknown as IDataObject,
		);
		searchEventToTrack.value = null;
	}
};

const onSearchInput = (searchText: string) => {
	loadingWorkflows.value = true;
	loadingCollections.value = true;
	search.value = searchText;
	void callDebounced(updateSearch, {
		debounceTime: 500,
		trailing: true,
	});

	if (searchText.length === 0) {
		trackSearch();
	}
};

const onCategorySelected = (selected: ITemplatesCategory) => {
	categories.value = categories.value.concat(selected);
	updateSearch();
	trackCategories();
};

const onCategoryUnselected = (selected: ITemplatesCategory) => {
	categories.value = categories.value.filter((category) => category.id !== selected.id);
	updateSearch();
	trackCategories();
};

const onCategoriesCleared = () => {
	categories.value = [];
	updateSearch();
};

const onLoadMore = async () => {
	if (workflows.value.length >= totalWorkflows.value) {
		return;
	}
	try {
		loadingWorkflows.value = true;
		await templatesStore.getMoreWorkflows({
			categories: categories.value.map((category) => category.name),
			search: search.value,
		});
	} catch (e) {
		toast.showMessage({
			title: 'Error',
			message: 'Could not load more workflows',
			type: 'error',
		});
	} finally {
		loadingWorkflows.value = false;
	}
};

const loadCategories = async () => {
	try {
		await templatesStore.getCategories();
	} catch (e) {}
	loadingCategories.value = false;
};

const scrollTo = (position: number, behavior: ScrollBehavior = 'smooth') => {
	setTimeout(() => {
		const contentArea = document.getElementById('content');
		if (contentArea) {
			contentArea.scrollTo({
				top: position,
				behavior,
			});
		}
	}, 0);
};

const restoreSearchFromRoute = () => {
	let shouldUpdateSearch = false;
	if (route.query.search && typeof route.query.search === 'string') {
		search.value = route.query.search;
		shouldUpdateSearch = true;
	}
	if (typeof route.query.categories === 'string' && route.query.categories.length) {
		const categoriesFromURL = route.query.categories.split(',');
		categories.value = templatesStore.allCategories.filter((category) =>
			categoriesFromURL.includes(category.id.toString()),
		);
		shouldUpdateSearch = true;
	}
	if (shouldUpdateSearch) {
		updateSearch();
		trackCategories();
		areCategoriesPrepopulated.value = true;
	}
};

onMounted(async () => {
	documentTitle.set('Templates');
	await loadCategories();
	void loadWorkflowsAndCollections(true);
	void usersStore.showPersonalizationSurvey();

	restoreSearchFromRoute();

	// Check if templates are enabled and check if the local templates store is available
	if (settingsStore.isTemplatesEnabled) {
		settingsStore.testTemplatesEndpoint().catch(() => {});
	}

	setTimeout(() => {
		// Check if there is scroll position saved in route and scroll to it
		const scrollOffset = route.meta?.scrollOffset;
		if (typeof scrollOffset === 'number' && scrollOffset > 0) {
			scrollTo(scrollOffset, 'auto');
		}
	}, 100);
});

onBeforeRouteLeave((_to, _from, next) => {
	const contentArea = document.getElementById('content');
	if (contentArea) {
		// When leaving this page, store current scroll position in route data
		route.meta?.setScrollPosition?.(contentArea.scrollTop);
	}

	trackSearch();
	next();
});

watch(workflows, (newWorkflows) => {
	if (newWorkflows.length === 0) {
		window.scrollTo(0, 0);
	}
});
</script>

<template>
	<TemplatesView>
		<template #header>
			<div :class="$style.wrapper">
				<div :class="$style.title">
					<N8nHeading tag="h1" size="2xlarge">
						{{ i18n.baseText('templates.heading') }}
					</N8nHeading>
				</div>
				<div :class="$style.button">
					<N8nButton
						size="large"
						type="secondary"
						element="a"
						:href="CREATOR_HUB_URL"
						:label="i18n.baseText('templates.shareWorkflow')"
						target="_blank"
					/>
				</div>
			</div>
		</template>
		<template #content>
			<div :class="$style.contentWrapper">
				<div :class="$style.filters">
					<TemplateFilters
						:categories="templatesStore.allCategories"
						:sort-on-populate="areCategoriesPrepopulated"
						:selected="categories"
						:loading="loadingCategories"
						@clear="onCategoryUnselected"
						@clear-all="onCategoriesCleared"
						@select="onCategorySelected"
					/>
				</div>
				<div :class="$style.search">
					<N8nInput
						:model-value="search"
						:placeholder="i18n.baseText('templates.searchPlaceholder')"
						clearable
						data-test-id="template-search-input"
						@update:model-value="onSearchInput"
						@blur="trackSearch"
					>
						<template #prefix>
							<N8nIcon icon="search" />
						</template>
					</N8nInput>
					<div v-show="collections.length || loadingCollections" :class="$style.carouselContainer">
						<div :class="$style.header">
							<N8nHeading :bold="true" size="medium" color="text-light">
								{{ i18n.baseText('templates.collections') }}
								<span
									v-if="!loadingCollections"
									data-test-id="collection-count-label"
									v-text="`(${collections.length})`"
								/>
							</N8nHeading>
						</div>
						<TemplatesInfoCarousel
							:collections="collections"
							:loading="loadingCollections"
							@open-collection="onOpenCollection"
						/>
					</div>
					<TemplateList
						:infinite-scroll-enabled="true"
						:loading="loadingWorkflows"
						:workflows="workflows"
						:total-count="totalWorkflows"
						@load-more="onLoadMore"
						@open-template="onOpenTemplate"
					/>
					<div v-if="endOfSearchMessage" :class="$style.endText">
						<N8nText size="medium" color="text-base">
							<span v-n8n-html="endOfSearchMessage" />
						</N8nText>
					</div>
				</div>
			</div>
		</template>
	</TemplatesView>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	justify-content: space-between;
}

.contentWrapper {
	display: flex;
	justify-content: space-between;

	@media (max-width: $breakpoint-xs) {
		flex-direction: column;
	}
}

.filters {
	width: 200px;
	margin-bottom: var(--spacing--xl);
	margin-right: var(--spacing--2xl);
}

.search {
	width: 100%;

	> * {
		margin-bottom: var(--spacing--lg);
	}

	@media (max-width: $breakpoint-xs) {
		padding-left: 0;
	}
}

.header {
	margin-bottom: var(--spacing--2xs);
}
</style>
