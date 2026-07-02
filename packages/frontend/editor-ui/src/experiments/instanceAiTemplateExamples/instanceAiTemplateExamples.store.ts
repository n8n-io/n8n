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

const NATIVE_NODES = new Set([
	'n8n-nodes-base.code',
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.html',
	'n8n-nodes-base.crypto',
	'n8n-nodes-base.editImage',
	'n8n-nodes-base.ftp',
	'n8n-nodes-base.evaluation',
	'n8n-nodes-base.emailSend',
	'n8n-nodes-base.sms77',
	'n8n-nodes-base.apiTemplateIo',
]);

function hasVisibleNodes(nodes: Array<{ name: string }>): boolean {
	return nodes.some(
		(n) => !NATIVE_NODES.has(n.name) && !n.name.startsWith('@n8n/n8n-nodes-langchain.'),
	);
}

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

	async function fetchWorkflows() {
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

				if (categories.value.length === 0) {
					categories.value = response.categories.map((name, index) => ({
						id: index + 1,
						name,
					}));
				}
				subcategoriesMap.value = response.subcategories;
				workflows.value = FEATURED_DEFAULTS;
				totalWorkflows.value = response.totalWorkflows + FEATURED_DEFAULTS.length;
				return;
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

			if (categories.value.length === 0) {
				categories.value = response.categories.map((name, index) => ({
					id: index + 1,
					name,
				}));
			}
			subcategoriesMap.value = response.subcategories;

			const sortedWorkflows = [...response.workflows].sort((a, b) => {
				const aScore = a.relevanceScore ?? 3;
				const bScore = b.relevanceScore ?? 3;
				if (bScore !== aScore) return bScore - aScore;

				const aHasNodes = hasVisibleNodes(a.nodes);
				const bHasNodes = hasVisibleNodes(b.nodes);
				if (aHasNodes && !bHasNodes) return -1;
				if (!aHasNodes && bHasNodes) return 1;
				return 0;
			});

			workflows.value = sortedWorkflows;
			totalWorkflows.value = isDefaultView
				? response.totalWorkflows + FEATURED_DEFAULTS.length
				: response.totalWorkflows;
		} catch {
			workflows.value = [];
			totalWorkflows.value = 0;
			hasLoadFailed.value = true;
		} finally {
			isLoading.value = false;
		}
	}

	async function fetchCategories() {
		if (categories.value.length > 0) return;
		await fetchWorkflows();
	}

	async function selectCategory(categoryId: string) {
		selectedCategoryId.value = categoryId;
		selectedSubcategory.value = '';
		currentPage.value = 1;
		await fetchWorkflows();
	}

	async function selectSubcategory(subcategory: string) {
		selectedSubcategory.value = subcategory;
		currentPage.value = 1;
		await fetchWorkflows();
	}

	async function nextPage() {
		if (!hasNextPage.value) return;
		currentPage.value++;
		await fetchWorkflows();
	}

	async function prevPage() {
		if (!hasPrevPage.value) return;
		currentPage.value--;
		await fetchWorkflows();
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
