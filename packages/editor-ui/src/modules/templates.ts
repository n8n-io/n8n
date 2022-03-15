import { getCategories, getCollectionById, getCollections, getTemplateById, getWorkflows, getWorkflowTemplate } from '@/api/templates';
import { ActionContext, Module } from 'vuex';
import {
	IRootState,
	ITemplatesCollection,
	ITemplatesWorkflow,
	ITemplatesCategory,
	ITemplateState,
	ITemplatesQuery,
	ITemplatesWorkflowFull,
	ITemplatesCollectionFull,
	IWorkflowTemplate,
} from '../Interface';

import Vue from 'vue';

const TEMPLATES_PAGE_SIZE = 10;

function getSearchKey(query: ITemplatesQuery): string {
	return JSON.stringify([query.search || '', [...query.categories].sort()]);
}

const module: Module<ITemplateState, IRootState> = {
	namespaced: true,
	state: {
		categories: {},
		collections: {},
		workflows: {},
		collectionSearches: {},
		workflowSearches: {},
		currentSessionId: '',
		previousSessionId: '',
	},
	getters: {
		allCategories(state: ITemplateState) {
			return Object.values(state.categories).sort((a: ITemplatesCategory, b: ITemplatesCategory) => a.name > b.name ? 1: -1);
		},
		getTemplateById(state: ITemplateState) {
			return (id: string): null | ITemplatesWorkflow => state.workflows[id];
		},
		getCollectionById(state: ITemplateState) {
			return (id: string): null | ITemplatesCollection => state.collections[id];
		},
		getCategoryById(state: ITemplateState) {
			return (id: string): null | ITemplatesCategory => state.categories[id];
		},
		getSearchedCollections(state: ITemplateState) {
			return (query: ITemplatesQuery) => {
				const searchKey = getSearchKey(query);
				const search = state.collectionSearches[searchKey];
				if (!search) {
					return null;
				}

				return search.collectionIds.map((collectionId: string) => state.collections[collectionId]);
			};
		},
		getSearchedWorkflows(state: ITemplateState) {
			return (query: ITemplatesQuery) => {
				const searchKey = getSearchKey(query);
				const search = state.workflowSearches[searchKey];
				if (!search) {
					return null;
				}

				return search.workflowIds.map((workflowId: string) => state.workflows[workflowId]);
			};
		},
		getSearchedWorkflowsTotal(state: ITemplateState) {
			return (query: ITemplatesQuery) => {
				const searchKey = getSearchKey(query);
				const search = state.workflowSearches[searchKey];

				return search ? search.totalWorkflows : 0;
			};
		},
		isSearchLoadingMore(state: ITemplateState) {
			return (query: ITemplatesQuery) => {
				const searchKey = getSearchKey(query);
				const search = state.workflowSearches[searchKey];

				return Boolean(search && search.loadingMore);
			};
		},
		isSearchFinished(state: ITemplateState) {
			return (query: ITemplatesQuery) => {
				const searchKey = getSearchKey(query);
				const search = state.workflowSearches[searchKey];

				return Boolean(search && !search.loadingMore && search.totalWorkflows === search.workflowIds.length);
			};
		},
		currentSessionId(state: ITemplateState) {
			return state.currentSessionId;
		},
		previousSessionId(state: ITemplateState) {
			return state.previousSessionId;
		},
	},
	mutations: {
		addCategories(state: ITemplateState, categories: ITemplatesCategory[]) {
			categories.forEach((category: ITemplatesCategory) => {
				Vue.set(state.categories, category.id, category);
			});
		},
		addCollections(state: ITemplateState, collections: Array<ITemplatesCollection | ITemplatesCollectionFull>) {
			collections.forEach((collection) => {
				const workflows = (collection.workflows || []).map((workflow) => ({id: workflow.id}));
				const cachedCollection = state.collections[collection.id] || {};
				Vue.set(state.collections, collection.id, {
					...cachedCollection,
					...collection,
					workflows,
				});
			});
		},
		addWorkflows(state: ITemplateState, workflows: Array<ITemplatesWorkflow | ITemplatesWorkflowFull>) {
			workflows.forEach((workflow: ITemplatesWorkflow) => {
				const cachedWorkflow = state.workflows[workflow.id] || {};
				Vue.set(state.workflows, workflow.id, {
					...cachedWorkflow,
					...workflow,
				});
			});
		},
		addCollectionSearch(state: ITemplateState, data: {collections: ITemplatesCollection[], query: ITemplatesQuery}) {
			const collectionIds = data.collections.map((collection) => collection.id);
			const searchKey = getSearchKey(data.query);
			Vue.set(state.collectionSearches, searchKey, {
				collectionIds,
			});
		},
		addWorkflowsSearch(state: ITemplateState, data: {totalWorkflows: number; workflows: ITemplatesWorkflow[], query: ITemplatesQuery}) {
			const workflowIds = data.workflows.map((workflow) => workflow.id);
			const searchKey = getSearchKey(data.query);
			const cachedResults = state.workflowSearches[searchKey];
			if (!cachedResults) {
				Vue.set(state.workflowSearches, searchKey, {
					workflowIds,
					totalWorkflows: data.totalWorkflows,
				});

				return;
			}

			Vue.set(state.workflowSearches, searchKey, {
				workflowIds: [...cachedResults.workflowIds, ...workflowIds],
				totalWorkflows: data.totalWorkflows,
			});
		},
		setWorkflowSearchLoading(state: ITemplateState, query: ITemplatesQuery) {
			const searchKey = getSearchKey(query);
			const cachedResults = state.workflowSearches[searchKey];
			if (!cachedResults) {
				return;
			}

			Vue.set(state.workflowSearches[searchKey], 'loadingMore', true);
		},
		setWorkflowSearchLoaded(state: ITemplateState, query: ITemplatesQuery) {
			const searchKey = getSearchKey(query);
			const cachedResults = state.workflowSearches[searchKey];
			if (!cachedResults) {
				return;
			}

			Vue.set(state.workflowSearches[searchKey], 'loadingMore', false);
		},
		resetSessionId(state: ITemplateState) {
			state.previousSessionId = state.currentSessionId;
			state.currentSessionId = '';
		},
		setSessionId(state: ITemplateState) {
			if (!state.currentSessionId) {
				state.currentSessionId = `templates-${Date.now()}`;
			}
		},
	},
	actions: {
		async getTemplateById(context: ActionContext<ITemplateState, IRootState>, templateId: string): Promise<ITemplatesWorkflowFull> {
			const apiEndpoint: string = context.rootGetters['settings/templatesHost'];
			const versionCli: string = context.rootGetters['versionCli'];
			const response = await getTemplateById(apiEndpoint, templateId, { 'n8n-version': versionCli });
			const template: ITemplatesWorkflowFull = {
				...response.workflow,
				full: true,
			};

			context.commit('addWorkflows', [template]);
			return template;
		},
		async getCollectionById(context: ActionContext<ITemplateState, IRootState>, collectionId: string): Promise<ITemplatesCollection> {
			const apiEndpoint: string = context.rootGetters['settings/templatesHost'];
			const versionCli: string = context.rootGetters['versionCli'];
			const response = await getCollectionById(apiEndpoint, collectionId, { 'n8n-version': versionCli });
			const collection: ITemplatesCollectionFull = {
				...response.collection,
				full: true,
			};

			context.commit('addCollections', [collection]);
			context.commit('addWorkflows', response.collection.workflows);

			return context.getters.getCollectionById(collectionId);
		},
		async getCategories(context: ActionContext<ITemplateState, IRootState>): Promise<ITemplatesCategory[]> {
			const cachedCategories: ITemplatesCategory[] = context.getters.allCategories;
			if (cachedCategories.length) {
				return cachedCategories;
			}
			const apiEndpoint: string = context.rootGetters['settings/templatesHost'];
			const versionCli: string = context.rootGetters['versionCli'];
			const response = await getCategories(apiEndpoint, { 'n8n-version': versionCli });
			const categories = response.categories;

			context.commit('addCategories', categories);

			return categories;
		},
		async getCollections(context: ActionContext<ITemplateState, IRootState>, query: ITemplatesQuery): Promise<ITemplatesCollection[]> {
			const cachedResults: ITemplatesCollection[] | null = context.getters.getSearchedCollections(query);
			if (cachedResults) {
				return cachedResults;
			}

			const apiEndpoint: string = context.rootGetters['settings/templatesHost'];
			const versionCli: string = context.rootGetters['versionCli'];
			const response = await getCollections(apiEndpoint, query, { 'n8n-version': versionCli });
			const collections = response.collections;

			context.commit('addCollections', collections);
			context.commit('addCollectionSearch', {query, collections});
			collections.forEach((collection: ITemplatesCollection) => context.commit('addWorkflows', collection.workflows));

			return collections;
		},
		async getWorkflows(context: ActionContext<ITemplateState, IRootState>, query: ITemplatesQuery): Promise<ITemplatesWorkflow[]> {
			const cachedResults: ITemplatesWorkflow[] = context.getters.getSearchedWorkflows(query);
			if (cachedResults) {
				return cachedResults;
			}

			const apiEndpoint: string = context.rootGetters['settings/templatesHost'];
			const versionCli: string = context.rootGetters['versionCli'];

			const payload = await getWorkflows(apiEndpoint, {...query, skip: 0, limit: TEMPLATES_PAGE_SIZE}, { 'n8n-version': versionCli });

			context.commit('addWorkflows', payload.workflows);
			context.commit('addWorkflowsSearch', {...payload, query});

			return context.getters.getSearchedWorkflows(query);
		},
		async getMoreWorkflows(context: ActionContext<ITemplateState, IRootState>, query: ITemplatesQuery): Promise<ITemplatesWorkflow[]> {
			if (context.getters.isSearchLoadingMore(query) && !context.getters.isSearchFinished(query)) {
				return [];
			}
			const cachedResults: ITemplatesWorkflow[] = context.getters.getSearchedWorkflows(query) || [];
			const apiEndpoint: string = context.rootGetters['settings/templatesHost'];

			context.commit('setWorkflowSearchLoading', query);
			try {
				const payload = await getWorkflows(apiEndpoint, {...query, skip: cachedResults.length, limit: TEMPLATES_PAGE_SIZE});

				context.commit('setWorkflowSearchLoaded', query);
				context.commit('addWorkflows', payload.workflows);
				context.commit('addWorkflowsSearch', {...payload, query});

				return context.getters.getSearchedWorkflows(query);
			} catch (e) {
				context.commit('setWorkflowSearchLoaded', query);
				throw e;
			}
		},
		getWorkflowTemplate: async (context: ActionContext<ITemplateState, IRootState>, templateId: string): Promise<IWorkflowTemplate> => {
			const apiEndpoint: string = context.rootGetters['settings/templatesHost'];
			const versionCli: string = context.rootGetters['versionCli'];
			return await getWorkflowTemplate(apiEndpoint, templateId, { 'n8n-version': versionCli });
		},
	},
};

export default module;
