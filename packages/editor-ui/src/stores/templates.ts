import { defineStore } from 'pinia';
import { STORES } from '@/constants';
import {
	ITemplatesCategory,
	ITemplatesCollection,
	ITemplatesCollectionFull,
	ITemplatesQuery,
	ITemplateState,
	ITemplatesWorkflow,
	ITemplatesWorkflowFull,
	IWorkflowTemplate,
} from '@/Interface';
import Vue from 'vue';
import { useSettingsStore } from './settings';
import {
	getCategories,
	getCollectionById,
	getCollections,
	getTemplateById,
	getWorkflows,
	getWorkflowTemplate,
} from '@/api/templates';

const TEMPLATES_PAGE_SIZE = 10;

function getSearchKey(query: ITemplatesQuery): string {
	return JSON.stringify([query.search || '', [...query.categories].sort()]);
}

export const useTemplatesStore = defineStore(STORES.TEMPLATES, {
	state: (): ITemplateState => ({
		categories: {},
		collections: {},
		workflows: {},
		collectionSearches: {},
		workflowSearches: {},
		currentSessionId: '',
		previousSessionId: '',
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
	},
	actions: {
		addCategories(categories: ITemplatesCategory[]): void {
			categories.forEach((category: ITemplatesCategory) => {
				Vue.set(this.categories, category.id, category);
			});
		},
		addCollections(collections: Array<ITemplatesCollection | ITemplatesCollectionFull>): void {
			collections.forEach((collection) => {
				const workflows = (collection.workflows || []).map((workflow) => ({ id: workflow.id }));
				const cachedCollection = this.collections[collection.id] || {};
				Vue.set(this.collections, collection.id, {
					...cachedCollection,
					...collection,
					workflows,
				});
			});
		},
		addWorkflows(workflows: Array<ITemplatesWorkflow | ITemplatesWorkflowFull>): void {
			workflows.forEach((workflow: ITemplatesWorkflow) => {
				const cachedWorkflow = this.workflows[workflow.id] || {};
				Vue.set(this.workflows, workflow.id, {
					...cachedWorkflow,
					...workflow,
				});
			});
		},
		addCollectionSearch(data: {
			collections: ITemplatesCollection[];
			query: ITemplatesQuery;
		}): void {
			const collectionIds = data.collections.map((collection) => collection.id);
			const searchKey = getSearchKey(data.query);
			Vue.set(this.collectionSearches, searchKey, {
				collectionIds,
			});
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
				Vue.set(this.workflowSearches, searchKey, {
					workflowIds,
					totalWorkflows: data.totalWorkflows,
				});

				return;
			}

			Vue.set(this.workflowSearches, searchKey, {
				workflowIds: [...cachedResults.workflowIds, ...workflowIds],
				totalWorkflows: data.totalWorkflows,
			});
		},
		setWorkflowSearchLoading(query: ITemplatesQuery): void {
			const searchKey = getSearchKey(query);
			const cachedResults = this.workflowSearches[searchKey];
			if (!cachedResults) {
				return;
			}

			Vue.set(this.workflowSearches[searchKey], 'loadingMore', true);
		},
		setWorkflowSearchLoaded(query: ITemplatesQuery): void {
			const searchKey = getSearchKey(query);
			const cachedResults = this.workflowSearches[searchKey];
			if (!cachedResults) {
				return;
			}

			Vue.set(this.workflowSearches[searchKey], 'loadingMore', false);
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
		async fetchTemplateById(
			templateId: string,
		): Promise<ITemplatesWorkflow | ITemplatesWorkflowFull> {
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
				return cachedResults;
			}

			const settingsStore = useSettingsStore();
			const apiEndpoint: string = settingsStore.templatesHost;
			const versionCli: string = settingsStore.versionCli;

			const payload = await getWorkflows(
				apiEndpoint,
				{ ...query, skip: 0, limit: TEMPLATES_PAGE_SIZE },
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
					skip: cachedResults.length,
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
	},
});
