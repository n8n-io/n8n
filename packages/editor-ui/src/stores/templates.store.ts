import { defineStore } from 'pinia';
import { STORES, TEMPLATES_URLS } from '@/constants';
import type {
	INodeUi,
	ITemplatesCategory,
	ITemplatesCollection,
	ITemplatesCollectionFull,
	ITemplatesQuery,
	ITemplateState,
	ITemplatesWorkflow,
	ITemplatesWorkflowFull,
	IWorkflowTemplate,
} from '@/Interface';
import { useSettingsStore } from './settings.store';
import {
	getCategories,
	getCollectionById,
	getCollections,
	getTemplateById,
	getWorkflows,
	getWorkflowTemplate,
} from '@/api/templates';
import { getFixedNodesList } from '@/utils/nodeViewUtils';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useUsersStore } from './users.store';
import { useWorkflowsStore } from './workflows.store';

const TEMPLATES_PAGE_SIZE = 20;

function getSearchKey(query: ITemplatesQuery): string {
	return JSON.stringify([query.search || '', [...query.categories].sort()]);
}

export type TemplatesStore = ReturnType<typeof useTemplatesStore>;

export const useTemplatesStore = defineStore(STORES.TEMPLATES, {
	state: (): ITemplateState => ({
		categories: [],
		collections: {},
		workflows: {},
		collectionSearches: {},
		workflowSearches: {},
		currentSessionId: '',
		previousSessionId: '',
		currentN8nPath: `${window.location.protocol}//${window.location.host}${window.BASE_PATH}`,
	}),
	getters: {
		allCategories(): ITemplatesCategory[] {
			return Object.values(this.categories).sort((a: ITemplatesCategory, b: ITemplatesCategory) =>
				a.name > b.name ? 1 : -1,
			);
		},
		getTemplateById() {
			return (id: string): null | ITemplatesWorkflow => this.workflows[id];
		},
		getFullTemplateById() {
			return (id: string): null | ITemplatesWorkflowFull => {
				const template = this.workflows[id];
				return template && 'full' in template && template.full ? template : null;
			};
		},
		getCollectionById() {
			return (id: string): null | ITemplatesCollection => this.collections[id];
		},
		getCategoryById() {
			return (id: string): null | ITemplatesCategory => this.categories[id];
		},
		getSearchedCollections() {
			return (query: ITemplatesQuery) => {
				const searchKey = getSearchKey(query);
				const search = this.collectionSearches[searchKey];
				if (!search) {
					return null;
				}

				return search.collectionIds.map((collectionId: string) => this.collections[collectionId]);
			};
		},
		getSearchedWorkflows() {
			return (query: ITemplatesQuery) => {
				const searchKey = getSearchKey(query);
				const search = this.workflowSearches[searchKey];
				if (!search) {
					return null;
				}

				return search.workflowIds.map((workflowId: string) => this.workflows[workflowId]);
			};
		},
		getSearchedWorkflowsTotal() {
			return (query: ITemplatesQuery) => {
				const searchKey = getSearchKey(query);
				const search = this.workflowSearches[searchKey];

				return search ? search.totalWorkflows : 0;
			};
		},
		isSearchLoadingMore() {
			return (query: ITemplatesQuery) => {
				const searchKey = getSearchKey(query);
				const search = this.workflowSearches[searchKey];

				return Boolean(search && search.loadingMore);
			};
		},
		isSearchFinished() {
			return (query: ITemplatesQuery) => {
				const searchKey = getSearchKey(query);
				const search = this.workflowSearches[searchKey];

				return Boolean(
					search && !search.loadingMore && search.totalWorkflows === search.workflowIds.length,
				);
			};
		},
		hasCustomTemplatesHost(): boolean {
			const settingsStore = useSettingsStore();
			return settingsStore.templatesHost !== TEMPLATES_URLS.DEFAULT_API_HOST;
		},
		/**
		 * Constructs URLSearchParams object based on the default parameters for the template repository
		 * and provided additional parameters
		 */
		websiteTemplateRepositoryParameters(roleOverride?: string) {
			const rootStore = useRootStore();
			const userStore = useUsersStore();
			const workflowsStore = useWorkflowsStore();
			const defaultParameters: Record<string, string> = {
				...TEMPLATES_URLS.UTM_QUERY,
				utm_instance: this.currentN8nPath,
				utm_n8n_version: rootStore.versionCli,
				utm_awc: String(workflowsStore.activeWorkflows.length),
			};
			const userRole: string | undefined =
				userStore.currentUserCloudInfo?.role ?? userStore.currentUser?.personalizationAnswers?.role;

			if (userRole) {
				defaultParameters.utm_user_role = userRole;
			}
			return (additionalParameters: Record<string, string> = {}) => {
				return new URLSearchParams({
					...defaultParameters,
					...additionalParameters,
				});
			};
		},
		/**
		 * Construct the URL for the template repository on the website
		 * @returns {string}
		 */
		websiteTemplateRepositoryURL(): string {
			return `${
				TEMPLATES_URLS.BASE_WEBSITE_URL
			}?${this.websiteTemplateRepositoryParameters().toString()}`;
		},
		/**
		 * Construct the URL for the template category page on the website for a given category id
		 */
		getWebsiteCategoryURL() {
			return (id?: string, roleOverride?: string) => {
				const payload: Record<string, string> = {};
				if (id) {
					payload.categories = id;
				}
				if (roleOverride) {
					payload.utm_user_role = roleOverride;
				}
				return `${TEMPLATES_URLS.BASE_WEBSITE_URL}/?${this.websiteTemplateRepositoryParameters(payload).toString()}`;
			};
		},
	},
	actions: {
		addCategories(categories: ITemplatesCategory[]): void {
			categories.forEach((category: ITemplatesCategory) => {
				this.categories = {
					...this.categories,
					[category.id]: category,
				};
			});
		},
		addCollections(collections: Array<ITemplatesCollection | ITemplatesCollectionFull>): void {
			collections.forEach((collection) => {
				const workflows = (collection.workflows || []).map((workflow) => ({ id: workflow.id }));
				const cachedCollection = this.collections[collection.id] || {};

				this.collections = {
					...this.collections,
					[collection.id]: {
						...cachedCollection,
						...collection,
						workflows,
					},
				};
			});
		},
		addWorkflows(workflows: Array<ITemplatesWorkflow | ITemplatesWorkflowFull>): void {
			workflows.forEach((workflow: ITemplatesWorkflow) => {
				const cachedWorkflow = this.workflows[workflow.id] || {};

				this.workflows = {
					...this.workflows,
					[workflow.id]: {
						...cachedWorkflow,
						...workflow,
					},
				};
			});
		},
		addCollectionSearch(data: {
			collections: ITemplatesCollection[];
			query: ITemplatesQuery;
		}): void {
			const collectionIds = data.collections.map((collection) => String(collection.id));
			const searchKey = getSearchKey(data.query);

			this.collectionSearches = {
				...this.collectionSearches,
				[searchKey]: {
					collectionIds,
				},
			};
		},
		addWorkflowsSearch(data: {
			totalWorkflows: number;
			workflows: ITemplatesWorkflow[];
			query: ITemplatesQuery;
		}): void {
			const workflowIds = data.workflows.map((workflow) => workflow.id);
			const searchKey = getSearchKey(data.query);
			const cachedResults = this.workflowSearches[searchKey];
			if (!cachedResults) {
				this.workflowSearches = {
					...this.workflowSearches,
					[searchKey]: {
						workflowIds: workflowIds as unknown as string[],
						totalWorkflows: data.totalWorkflows,
						categories: this.categories,
					},
				};

				return;
			}

			this.workflowSearches = {
				...this.workflowSearches,
				[searchKey]: {
					workflowIds: [...cachedResults.workflowIds, ...workflowIds] as string[],
					totalWorkflows: data.totalWorkflows,
					categories: this.categories,
				},
			};
		},
		setWorkflowSearchLoading(query: ITemplatesQuery): void {
			const searchKey = getSearchKey(query);
			const cachedResults = this.workflowSearches[searchKey];
			if (!cachedResults) {
				return;
			}

			this.workflowSearches[searchKey] = {
				...this.workflowSearches[searchKey],
				loadingMore: true,
			};
		},
		setWorkflowSearchLoaded(query: ITemplatesQuery): void {
			const searchKey = getSearchKey(query);
			const cachedResults = this.workflowSearches[searchKey];
			if (!cachedResults) {
				return;
			}

			this.workflowSearches[searchKey] = {
				...this.workflowSearches[searchKey],
				loadingMore: false,
			};
		},
		resetSessionId(): void {
			this.previousSessionId = this.currentSessionId;
			this.currentSessionId = '';
		},
		setSessionId(): void {
			if (!this.currentSessionId) {
				this.currentSessionId = `templates-${Date.now()}`;
			}
		},
		async fetchTemplateById(templateId: string): Promise<ITemplatesWorkflowFull> {
			const settingsStore = useSettingsStore();
			const apiEndpoint: string = settingsStore.templatesHost;
			const versionCli: string = settingsStore.versionCli;
			const response = await getTemplateById(apiEndpoint, templateId, {
				'n8n-version': versionCli,
			});

			const template: ITemplatesWorkflowFull = {
				...response.workflow,
				full: true,
			};
			this.addWorkflows([template]);

			return template;
		},
		async fetchCollectionById(collectionId: string): Promise<ITemplatesCollection | null> {
			const settingsStore = useSettingsStore();
			const apiEndpoint: string = settingsStore.templatesHost;
			const versionCli: string = settingsStore.versionCli;
			const response = await getCollectionById(apiEndpoint, collectionId, {
				'n8n-version': versionCli,
			});
			const collection: ITemplatesCollectionFull = {
				...response.collection,
				full: true,
			};

			this.addCollections([collection]);
			this.addWorkflows(response.collection.workflows);
			return this.getCollectionById(collectionId);
		},
		async getCategories(): Promise<ITemplatesCategory[]> {
			const cachedCategories = this.allCategories;
			if (cachedCategories.length) {
				return cachedCategories;
			}
			const settingsStore = useSettingsStore();
			const apiEndpoint: string = settingsStore.templatesHost;
			const versionCli: string = settingsStore.versionCli;
			const response = await getCategories(apiEndpoint, { 'n8n-version': versionCli });
			const categories = response.categories;

			this.addCategories(categories);
			return categories;
		},
		async getCollections(query: ITemplatesQuery): Promise<ITemplatesCollection[]> {
			const cachedResults = this.getSearchedCollections(query);
			if (cachedResults) {
				return cachedResults;
			}

			const settingsStore = useSettingsStore();
			const apiEndpoint: string = settingsStore.templatesHost;
			const versionCli: string = settingsStore.versionCli;
			const response = await getCollections(apiEndpoint, query, { 'n8n-version': versionCli });
			const collections = response.collections;

			this.addCollections(collections);
			this.addCollectionSearch({ query, collections });
			collections.forEach((collection) =>
				this.addWorkflows(collection.workflows as ITemplatesWorkflowFull[]),
			);

			return collections;
		},
		async getWorkflows(query: ITemplatesQuery): Promise<ITemplatesWorkflow[]> {
			const cachedResults = this.getSearchedWorkflows(query);
			if (cachedResults) {
				this.categories = this.workflowSearches[getSearchKey(query)].categories ?? [];
				return cachedResults;
			}

			const settingsStore = useSettingsStore();
			const apiEndpoint: string = settingsStore.templatesHost;
			const versionCli: string = settingsStore.versionCli;

			const payload = await getWorkflows(
				apiEndpoint,
				{ ...query, page: 1, limit: TEMPLATES_PAGE_SIZE },
				{ 'n8n-version': versionCli },
			);

			this.addWorkflows(payload.workflows);
			this.addWorkflowsSearch({ ...payload, query });
			return this.getSearchedWorkflows(query) || [];
		},
		async getMoreWorkflows(query: ITemplatesQuery): Promise<ITemplatesWorkflow[]> {
			if (this.isSearchLoadingMore(query) && !this.isSearchFinished(query)) {
				return [];
			}
			const cachedResults = this.getSearchedWorkflows(query) || [];
			const settingsStore = useSettingsStore();
			const apiEndpoint: string = settingsStore.templatesHost;

			this.setWorkflowSearchLoading(query);
			try {
				const payload = await getWorkflows(apiEndpoint, {
					...query,
					page: cachedResults.length / TEMPLATES_PAGE_SIZE + 1,
					limit: TEMPLATES_PAGE_SIZE,
				});

				this.setWorkflowSearchLoaded(query);
				this.addWorkflows(payload.workflows);
				this.addWorkflowsSearch({ ...payload, query });

				return this.getSearchedWorkflows(query) || [];
			} catch (e) {
				this.setWorkflowSearchLoaded(query);
				throw e;
			}
		},
		async getWorkflowTemplate(templateId: string): Promise<IWorkflowTemplate> {
			const settingsStore = useSettingsStore();
			const apiEndpoint: string = settingsStore.templatesHost;
			const versionCli: string = settingsStore.versionCli;
			return await getWorkflowTemplate(apiEndpoint, templateId, { 'n8n-version': versionCli });
		},

		async getFixedWorkflowTemplate(templateId: string): Promise<IWorkflowTemplate | undefined> {
			const template = await this.getWorkflowTemplate(templateId);
			if (template?.workflow?.nodes) {
				template.workflow.nodes = getFixedNodesList(template.workflow.nodes) as INodeUi[];
				template.workflow.nodes?.forEach((node) => {
					if (node.credentials) {
						delete node.credentials;
					}
				});
			}

			return template;
		},
	},
});
