import { TEMPLATES_URLS } from '@/constants';
import type { INodeUi } from '@/Interface';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { getTemplatePathByRole } from '@/utils/experiments';
import { getNodesWithNormalizedPosition } from '@/utils/nodeViewUtils';
import type {
	ITemplatesCategory,
	ITemplatesCollection,
	ITemplatesCollectionFull,
	ITemplatesQuery,
	ITemplatesWorkflow,
	ITemplatesWorkflowFull,
	IWorkflowTemplate,
} from '@n8n/rest-api-client/api/templates';
import * as templatesApi from '@n8n/rest-api-client/api/templates';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useSettingsStore } from './settings.store';
import { useUsersStore } from './users.store';
import { useWorkflowsStore } from './workflows.store';

export interface ITemplateState {
	categories: ITemplatesCategory[];
	collections: { [id: string]: ITemplatesCollection };
	workflows: { [id: string]: ITemplatesWorkflow | ITemplatesWorkflowFull };
	workflowSearches: {
		[search: string]: {
			workflowIds: string[];
			totalWorkflows: number;
			loadingMore?: boolean;
			categories?: ITemplatesCategory[];
		};
	};
	collectionSearches: {
		[search: string]: {
			collectionIds: string[];
		};
	};
	currentSessionId: string;
	previousSessionId: string;
	currentN8nPath: string;
}

const TEMPLATES_PAGE_SIZE = 20;

function getSearchKey(query: ITemplatesQuery): string {
	return JSON.stringify([query.search || '', [...query.categories].sort()]);
}

export type TemplatesStore = ReturnType<typeof useTemplatesStore>;

export const useTemplatesStore = defineStore(STORES.TEMPLATES, () => {
	const categories = ref<ITemplatesCategory[]>([]);
	const collections = ref<Record<string, ITemplatesCollection>>({});
	const workflows = ref<Record<string, ITemplatesWorkflow | ITemplatesWorkflowFull>>({});
	const workflowSearches = ref<
		Record<
			string,
			{
				workflowIds: string[];
				totalWorkflows: number;
				loadingMore?: boolean;
				categories?: ITemplatesCategory[];
			}
		>
	>({});
	const collectionSearches = ref<
		Record<
			string,
			{
				collectionIds: string[];
			}
		>
	>({});
	const currentSessionId = ref<string>('');
	const previousSessionId = ref<string>('');
	const currentN8nPath = ref<string>(
		`${window.location.protocol}//${window.location.host}${window.BASE_PATH}`,
	);

	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const userStore = useUsersStore();
	const cloudPlanStore = useCloudPlanStore();
	const workflowsStore = useWorkflowsStore();

	const allCategories = computed(() => {
		return categories.value.sort((a: ITemplatesCategory, b: ITemplatesCategory) =>
			a.name > b.name ? 1 : -1,
		);
	});

	const getTemplatesById = computed(() => {
		return (id: string): null | ITemplatesWorkflow => workflows.value[id];
	});

	const getFullTemplateById = computed(() => {
		return (id: string): null | ITemplatesWorkflowFull => {
			const template = workflows.value[id];
			return template && 'full' in template && template.full ? template : null;
		};
	});

	const getCollectionById = computed(() => collections.value);

	const getCategoryById = computed(() => {
		return (id: string): null | ITemplatesCategory => categories.value[id as unknown as number];
	});

	const getSearchedCollections = computed(() => {
		return (query: ITemplatesQuery) => {
			const searchKey = getSearchKey(query);
			const search = collectionSearches.value[searchKey];
			if (!search) {
				return null;
			}

			return search.collectionIds.map((collectionId: string) => collections.value[collectionId]);
		};
	});

	const getSearchedWorkflows = computed(() => {
		return (query: ITemplatesQuery) => {
			const searchKey = getSearchKey(query);
			const search = workflowSearches.value[searchKey];
			if (!search) {
				return null;
			}

			return search.workflowIds.map((workflowId: string) => workflows.value[workflowId]);
		};
	});

	const getSearchedWorkflowsTotal = computed(() => {
		return (query: ITemplatesQuery) => {
			const searchKey = getSearchKey(query);
			const search = workflowSearches.value[searchKey];

			return search ? search.totalWorkflows : 0;
		};
	});

	const isSearchLoadingMore = computed(() => {
		return (query: ITemplatesQuery) => {
			const searchKey = getSearchKey(query);
			const search = workflowSearches.value[searchKey];

			return Boolean(search?.loadingMore);
		};
	});

	const isSearchFinished = computed(() => {
		return (query: ITemplatesQuery) => {
			const searchKey = getSearchKey(query);
			const search = workflowSearches.value[searchKey];

			return Boolean(
				search && !search.loadingMore && search.totalWorkflows === search.workflowIds.length,
			);
		};
	});

	const hasCustomTemplatesHost = computed(() => {
		return settingsStore.templatesHost !== TEMPLATES_URLS.DEFAULT_API_HOST;
	});

	const userRole = computed(
		() =>
			cloudPlanStore.currentUserCloudInfo?.role ??
			(userStore.currentUser?.personalizationAnswers &&
			'role' in userStore.currentUser.personalizationAnswers
				? userStore.currentUser.personalizationAnswers.role
				: undefined),
	);

	const websiteTemplateRepositoryParameters = computed(() => {
		const defaultParameters: Record<string, string> = {
			...TEMPLATES_URLS.UTM_QUERY,
			utm_instance: currentN8nPath.value,
			utm_n8n_version: rootStore.versionCli,
			utm_awc: String(workflowsStore.activeWorkflows.length),
		};
		if (userRole.value) {
			defaultParameters.utm_user_role = userRole.value;
		}
		return new URLSearchParams({
			...defaultParameters,
		});
	});

	const websiteTemplateRepositoryURL = computed(
		() =>
			`${TEMPLATES_URLS.BASE_WEBSITE_URL}${getTemplatePathByRole(userRole.value)}?${websiteTemplateRepositoryParameters.value.toString()}`,
	);

	const constructTemplateRepositoryURL = (params: URLSearchParams, category?: string): string => {
		const baseUrl = category
			? `${TEMPLATES_URLS.BASE_WEBSITE_URL}${category}`
			: TEMPLATES_URLS.BASE_WEBSITE_URL;
		return `${baseUrl}?${params.toString()}`;
	};

	const addCategories = (_categories: ITemplatesCategory[]): void => {
		categories.value = _categories;
	};

	const addCollections = (
		_collections: Array<ITemplatesCollection | ITemplatesCollectionFull>,
	): void => {
		_collections.forEach((collection) => {
			const workflows = (collection.workflows || []).map((workflow) => ({ id: workflow.id }));
			const cachedCollection = collections.value[collection.id] || {};

			collections.value[collection.id] = {
				...cachedCollection,
				...collection,
				workflows,
			};
		});
	};

	const addWorkflows = (_workflows: Array<ITemplatesWorkflow | ITemplatesWorkflowFull>): void => {
		_workflows.forEach((workflow) => {
			const cachedWorkflow = workflows.value[workflow.id] || {};
			workflows.value[workflow.id.toString()] = { ...cachedWorkflow, ...workflow };
		});
	};

	const addCollectionsSearch = (data: {
		_collections: ITemplatesCollection[];
		query: ITemplatesQuery;
	}) => {
		const collectionIds = data._collections.map((collection) => String(collection.id));
		const searchKey = getSearchKey(data.query);

		collectionSearches.value[searchKey] = {
			collectionIds,
		};
	};

	const addWorkflowsSearch = (data: {
		totalWorkflows: number;
		workflows: ITemplatesWorkflow[];
		query: ITemplatesQuery;
	}) => {
		const workflowIds = data.workflows.map((workflow) => workflow.id);
		const searchKey = getSearchKey(data.query);
		const cachedResults = workflowSearches.value[searchKey];
		if (!cachedResults) {
			workflowSearches.value[searchKey] = {
				workflowIds: workflowIds as unknown as string[],
				totalWorkflows: data.totalWorkflows,
				categories: categories.value,
			};
			return;
		}

		workflowSearches.value[searchKey] = {
			workflowIds: [...cachedResults.workflowIds, ...workflowIds] as string[],
			totalWorkflows: data.totalWorkflows,
			categories: categories.value,
		};
	};

	const setWorkflowSearchLoading = (query: ITemplatesQuery): void => {
		const searchKey = getSearchKey(query);
		const cachedResults = workflowSearches.value[searchKey];
		if (!cachedResults) {
			return;
		}

		workflowSearches.value[searchKey] = {
			...workflowSearches.value[searchKey],
			loadingMore: true,
		};
	};

	const setWorkflowSearchLoaded = (query: ITemplatesQuery): void => {
		const searchKey = getSearchKey(query);
		const cachedResults = workflowSearches.value[searchKey];
		if (!cachedResults) {
			return;
		}

		workflowSearches.value[searchKey] = {
			...workflowSearches.value[searchKey],
			loadingMore: false,
		};
	};

	const resetSessionId = (): void => {
		previousSessionId.value = currentSessionId.value;
		currentSessionId.value = '';
	};

	const setSessionId = (): void => {
		if (!currentSessionId.value) {
			currentSessionId.value = `templates-${Date.now()}`;
		}
	};

	const fetchTemplateById = async (templateId: string): Promise<ITemplatesWorkflowFull> => {
		const apiEndpoint: string = settingsStore.templatesHost;
		const versionCli: string = rootStore.versionCli;
		const response = await templatesApi.getTemplateById(apiEndpoint, templateId, {
			'n8n-version': versionCli,
		});

		const template: ITemplatesWorkflowFull = {
			...response.workflow,
			full: true,
		};
		addWorkflows([template]);

		return template;
	};

	const fetchCollectionById = async (
		collectionId: string,
	): Promise<ITemplatesCollection | null> => {
		const apiEndpoint: string = settingsStore.templatesHost;
		const versionCli: string = rootStore.versionCli;
		const response = await templatesApi.getCollectionById(apiEndpoint, collectionId, {
			'n8n-version': versionCli,
		});
		const collection: ITemplatesCollectionFull = {
			...response.collection,
			full: true,
		};

		addCollections([collection]);
		addWorkflows(response.collection.workflows);
		return getCollectionById.value[collectionId];
	};

	const getCategories = async (): Promise<ITemplatesCategory[]> => {
		const cachedCategories = allCategories.value;
		if (cachedCategories.length) {
			return cachedCategories;
		}
		const apiEndpoint: string = settingsStore.templatesHost;
		const versionCli: string = rootStore.versionCli;
		const response = await templatesApi.getCategories(apiEndpoint, {
			'n8n-version': versionCli,
		});
		const categories = response.categories;

		addCategories(categories);
		return categories;
	};

	const getCollections = async (query: ITemplatesQuery): Promise<ITemplatesCollection[]> => {
		const cachedResults = getSearchedCollections.value(query);
		if (cachedResults) {
			return cachedResults;
		}

		const apiEndpoint: string = settingsStore.templatesHost;
		const versionCli: string = rootStore.versionCli;
		const response = await templatesApi.getCollections(apiEndpoint, query, {
			'n8n-version': versionCli,
		});
		const collections = response.collections;

		addCollections(collections);
		addCollectionsSearch({ query, _collections: collections });
		collections.forEach((collection) => addWorkflows(collection.workflows as ITemplatesWorkflow[]));

		return collections;
	};

	const getWorkflows = async (query: ITemplatesQuery): Promise<ITemplatesWorkflow[]> => {
		const cachedResults = getSearchedWorkflows.value(query);
		if (cachedResults) {
			categories.value = workflowSearches.value[getSearchKey(query)].categories ?? [];
			return cachedResults;
		}

		const apiEndpoint: string = settingsStore.templatesHost;
		const versionCli: string = rootStore.versionCli;
		const payload = await templatesApi.getWorkflows(
			apiEndpoint,
			{ ...query, page: 1, limit: TEMPLATES_PAGE_SIZE },
			{ 'n8n-version': versionCli },
		);

		addWorkflows(payload.workflows);
		addWorkflowsSearch({ ...payload, query });
		return getSearchedWorkflows.value(query) || [];
	};

	const getMoreWorkflows = async (query: ITemplatesQuery): Promise<ITemplatesWorkflow[]> => {
		if (isSearchLoadingMore.value(query) && !isSearchFinished.value(query)) {
			return [];
		}
		const cachedResults = getSearchedWorkflows.value(query) || [];
		const apiEndpoint: string = settingsStore.templatesHost;

		setWorkflowSearchLoading(query);
		try {
			const payload = await templatesApi.getWorkflows(apiEndpoint, {
				...query,
				page: cachedResults.length / TEMPLATES_PAGE_SIZE + 1,
				limit: TEMPLATES_PAGE_SIZE,
			});

			setWorkflowSearchLoaded(query);
			addWorkflows(payload.workflows);
			addWorkflowsSearch({ ...payload, query });

			return getSearchedWorkflows.value(query) || [];
		} catch (e) {
			setWorkflowSearchLoaded(query);
			throw e;
		}
	};

	const getWorkflowTemplate = async (templateId: string): Promise<IWorkflowTemplate> => {
		const apiEndpoint: string = settingsStore.templatesHost;
		const versionCli: string = rootStore.versionCli;
		return await templatesApi.getWorkflowTemplate(apiEndpoint, templateId, {
			'n8n-version': versionCli,
		});
	};

	const getFixedWorkflowTemplate = async (
		templateId: string,
	): Promise<IWorkflowTemplate | undefined> => {
		const template = await getWorkflowTemplate(templateId);
		if (template?.workflow?.nodes) {
			template.workflow.nodes = getNodesWithNormalizedPosition(
				template.workflow.nodes,
			) as INodeUi[];
			template.workflow.nodes?.forEach((node) => {
				if (node.credentials) {
					delete node.credentials;
				}
			});
		}

		return template;
	};

	return {
		categories,
		collections,
		workflows,
		workflowSearches,
		collectionSearches,
		currentSessionId,
		previousSessionId,
		currentN8nPath,
		allCategories,
		getTemplatesById,
		getFullTemplateById,
		getCollectionById,
		getCategoryById,
		getSearchedCollections,
		getSearchedWorkflows,
		getSearchedWorkflowsTotal,
		isSearchLoadingMore,
		isSearchFinished,
		hasCustomTemplatesHost,
		websiteTemplateRepositoryURL,
		constructTemplateRepositoryURL,
		websiteTemplateRepositoryParameters,
		addCategories,
		addCollections,
		addWorkflows,
		addCollectionsSearch,
		addWorkflowsSearch,
		setWorkflowSearchLoading,
		setWorkflowSearchLoaded,
		resetSessionId,
		setSessionId,
		fetchTemplateById,
		fetchCollectionById,
		getCategories,
		getCollections,
		getWorkflows,
		getMoreWorkflows,
		getWorkflowTemplate,
		getFixedWorkflowTemplate,
	};
});
