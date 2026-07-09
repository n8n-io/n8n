import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type {
	IInstanceAiExampleWorkflow,
	IInstanceAiExamplesQuery,
	ITemplatesCategory,
} from '@n8n/rest-api-client/api/templates';
import { getInstanceAiExamples } from '@n8n/rest-api-client/api/templates';
import { useRootStore } from '@n8n/stores/useRootStore';
import { FEATURED_DEFAULTS } from './featuredDefaults';

const PAGE_SIZE = 4;

export const useInstanceAiTemplateExamplesStore = defineStore('instanceAiTemplateExamples', () => {
	const rootStore = useRootStore();

	const categories = ref<ITemplatesCategory[]>([]);
	const subcategoriesMap = ref<Record<string, string[]>>({});
	const selectedCategoryId = ref<string>('');
	const selectedSubcategory = ref<string>('');
	const currentPage = ref(1);
	const workflows = ref<IInstanceAiExampleWorkflow[]>([]);
	const totalWorkflows = ref(0);
	const isLoading = ref(false);
	const hasLoadFailed = ref(false);
	const hasLoadedOnce = ref(false);
	const hoveredPrompt = ref<string | null>(null);

	const totalPages = computed(() => Math.ceil(totalWorkflows.value / PAGE_SIZE));
	const hasNextPage = computed(() => currentPage.value < totalPages.value);
	const hasPrevPage = computed(() => currentPage.value > 1);

	const subcategories = computed<string[]>(() => {
		const selectedCategory = categories.value.find(
			(c) => String(c.id) === selectedCategoryId.value,
		);
		if (!selectedCategory) return [];
		return subcategoriesMap.value[selectedCategory.name] ?? [];
	});

	let latestRequestId = 0;

	async function fetchWorkflows(): Promise<boolean> {
		const requestId = ++latestRequestId;
		isLoading.value = true;
		try {
			const selectedCategory = categories.value.find(
				(c) => String(c.id) === selectedCategoryId.value,
			);

			const isDefaultView = !selectedCategory && !selectedSubcategory.value;

			// Page 1 of default view shows curated featured examples
			if (isDefaultView && currentPage.value === 1) {
				const response = await getInstanceAiExamples(rootStore.restApiContext, {
					page: 1,
					limit: 1,
				});

				if (requestId !== latestRequestId) return true;

				if (categories.value.length === 0) {
					categories.value = response.categories.map((name, index) => ({
						id: index + 1,
						name,
					}));
				}
				subcategoriesMap.value = response.subcategories;
				workflows.value = FEATURED_DEFAULTS;
				totalWorkflows.value = response.totalWorkflows + FEATURED_DEFAULTS.length;
				hasLoadedOnce.value = true;
				return true;
			}

			const apiPage = isDefaultView ? currentPage.value - 1 : currentPage.value;

			const query: IInstanceAiExamplesQuery = {
				page: apiPage,
				limit: PAGE_SIZE,
			};

			if (selectedCategory) {
				query.category = selectedCategory.name;
			}
			if (selectedSubcategory.value) {
				query.subcategory = selectedSubcategory.value;
			}

			const response = await getInstanceAiExamples(rootStore.restApiContext, query);

			if (requestId !== latestRequestId) return true;

			if (categories.value.length === 0) {
				categories.value = response.categories.map((name, index) => ({
					id: index + 1,
					name,
				}));
			}
			subcategoriesMap.value = response.subcategories;

			workflows.value = response.workflows;
			totalWorkflows.value = isDefaultView
				? response.totalWorkflows + FEATURED_DEFAULTS.length
				: response.totalWorkflows;
			hasLoadedOnce.value = true;
			return true;
		} catch {
			if (requestId !== latestRequestId) return true;

			if (!hasLoadedOnce.value) {
				workflows.value = [];
				totalWorkflows.value = 0;
				hasLoadFailed.value = true;
			}
			return false;
		} finally {
			if (requestId === latestRequestId) {
				isLoading.value = false;
			}
		}
	}

	async function fetchCategories() {
		if (categories.value.length > 0) return;
		await fetchWorkflows();
	}

	async function selectCategory(categoryId: string) {
		const previousCategoryId = selectedCategoryId.value;
		const previousSubcategory = selectedSubcategory.value;
		const previousPage = currentPage.value;
		selectedCategoryId.value = categoryId;
		selectedSubcategory.value = '';
		currentPage.value = 1;
		const succeeded = await fetchWorkflows();
		if (!succeeded) {
			selectedCategoryId.value = previousCategoryId;
			selectedSubcategory.value = previousSubcategory;
			currentPage.value = previousPage;
		}
	}

	async function selectSubcategory(subcategory: string) {
		const previousSubcategory = selectedSubcategory.value;
		const previousPage = currentPage.value;
		selectedSubcategory.value = subcategory;
		currentPage.value = 1;
		const succeeded = await fetchWorkflows();
		if (!succeeded) {
			selectedSubcategory.value = previousSubcategory;
			currentPage.value = previousPage;
		}
	}

	async function nextPage() {
		if (!hasNextPage.value) return;
		currentPage.value++;
		const succeeded = await fetchWorkflows();
		if (!succeeded) {
			currentPage.value--;
		}
	}

	async function prevPage() {
		if (!hasPrevPage.value) return;
		currentPage.value--;
		const succeeded = await fetchWorkflows();
		if (!succeeded) {
			currentPage.value++;
		}
	}

	async function initialize() {
		await fetchWorkflows();
	}

	return {
		categories,
		selectedCategoryId,
		selectedSubcategory,
		subcategories,
		currentPage,
		workflows,
		totalWorkflows,
		totalPages,
		isLoading,
		hasLoadFailed,
		hasNextPage,
		hasPrevPage,
		hoveredPrompt,
		fetchCategories,
		fetchWorkflows,
		selectCategory,
		selectSubcategory,
		nextPage,
		prevPage,
		initialize,
	};
});
