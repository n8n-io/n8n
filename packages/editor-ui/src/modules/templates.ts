import { getCategories, getCollectionById, getCollections, getTemplateById } from '@/api/templates';
import { ActionContext, Module } from 'vuex';
import {
	IRootState,
	IN8nCollectionResponse,
	IN8nCollection,
	IN8nSearchResponse,
	IN8nSearchData,
	IN8nTemplate,
	IN8nTemplateResponse,
	ITemplateCategory,
	ITemplateCollection,
	ITemplateState,
	ITemplatesQuery,
} from '../Interface';

import Vue from 'vue';

const module: Module<ITemplateState, IRootState> = {
	namespaced: true,
	state: {
		categories: {},
		collections: {},
		templates: {},
		collectionSearches: {},
		workflowSearches: {},
	},
	getters: {
		allCategories(state: ITemplateState) {
			return Object.values(state.categories);
		},
		getTemplateById(state: ITemplateState) {
			return (id: string): null | IN8nTemplate => state.templates[id];
		},
		getCollectionById(state: ITemplateState) {
			return (id: string): null | ITemplateCollection => state.collections[id];
		},
		getCategoryById(state: ITemplateState) {
			return (id: string): null | ITemplateCategory => state.categories[id];
		},
		getSearchedCollections(state: ITemplateState) {
			return (query: ITemplatesQuery) => {
				const searchKey = JSON.stringify(query);
				const search = state.collectionSearches[searchKey];
				if (!search) {
					return [];
				}

				return search.collectionIds.map((collectionId: string) => state.collections[collectionId]);
			};
		},
		// getSearchResults(state: ITemplateState) {
		// 	return (query: {categories: number[], search: string}): IN8nSearchData | null => {
		// 		const searchKey = JSON.stringify(query);
		// 		if (!state.searchResults[searchKey]) {
		// 			return null;
		// 		}

		// 		const results = state.searchResults[searchKey];

		// 		const collectionIds = results.collectionIds || [];
		// 		const collections = collectionIds.map((id) => state.collections[id]);

		// 		const templateIds = results.workflowIds || [];
		// 		const workflows = templateIds.map((id) => state.templates[id]);

		// 		const totalWorkflows = results.totalWorkflows;

		// 		return {
		// 			collections,
		// 			workflows,
		// 			totalWorkflows,
		// 		};
		// 	};
		// },
	},
	mutations: {
		addCategories(state: ITemplateState, categories: ITemplateCategory[]) {
			categories.forEach((category: ITemplateCategory) => {
				Vue.set(state.categories, category.id, category);
			});
		},
		addCollections(state: ITemplateState, collections: ITemplateCollection[]) {
			collections.forEach((collection: ITemplateCollection) => {
				const cachedCollection = state.collections[collection.id] || {};
				Vue.set(state.collections, collection.id, {
					...cachedCollection,
					...collection,
				});
			});
		},
		addWorkflows(state: ITemplateState, workflows: IN8nTemplate[]) {
			workflows.forEach((workflow: IN8nTemplate) => {
				const cachedWorkflow = state.templates[workflow.id] || {};
				Vue.set(state.templates, workflow.id, {
					...cachedWorkflow,
					...workflow,
				});
			});
		},
		addCollectionSearch(state: ITemplateState, data: {collections: ITemplateCollection[], query: ITemplatesQuery}) {
			const collectionIds = data.collections.map((collection) => collection.id);
			const searchKey = JSON.stringify(data.query);
			Vue.set(state.collectionSearches, searchKey, {
				collectionIds,
			});
		},
		// appendSearchResults(state: ITemplateState, data: {query: ITemplatesQuery, results: IN8nSearchData}) {
		// 	const collectionIds = data.results.collections.map((collection) => collection.id);
		// 	const workflowIds = data.results.workflows.map((workflow) => workflow.id);
		// 	const totalWorkflows = data.results.totalWorkflows;

		// 	const searchKey = JSON.stringify(data.query);
		// 	const cachedResults = state.searchResults[searchKey];
		// 	if (!cachedResults) {
		// 		state.searchResults[searchKey] = {
		// 			collectionIds,
		// 			workflowIds,
		// 			totalWorkflows,
		// 		};

		// 		return;
		// 	}

		// 	state.searchResults[searchKey] = {
		// 		collectionIds: [...cachedResults.collectionIds, ...collectionIds],
		// 		workflowIds: [...cachedResults.workflowIds, ...workflowIds],
		// 		totalWorkflows,
		// 	};
		// },
	},
	actions: {
		async getTemplateById(context: ActionContext<ITemplateState, IRootState>, templateId: string): Promise<IN8nTemplate> {
			const apiEndpoint: string = context.rootGetters['settings/templatesHost'];
			const response = await getTemplateById(apiEndpoint, templateId);
			const template: IN8nTemplate = response.data.workflow;

			context.commit('addWorkflows', [template]);
			return template;
		},
		async getCollectionById(context: ActionContext<ITemplateState, IRootState>, collectionId: string): Promise<IN8nCollection> {
			const apiEndpoint: string = context.rootGetters['settings/templatesHost'];
			const response = await getCollectionById(apiEndpoint, collectionId);
			const collection: IN8nCollection = response.data.collection;

			context.commit('addCollections', [collection]);
			return collection;
		},
		async getCategories(context: ActionContext<ITemplateState, IRootState>): Promise<ITemplateCategory[]> {
			const apiEndpoint: string = context.rootGetters['settings/templatesHost'];
			const response = await getCategories(apiEndpoint);
			const categories = response.data.categories;

			context.commit('addCategories', categories);

			return categories;
		},
		async getCollections(context: ActionContext<ITemplateState, IRootState>, query: ITemplatesQuery): Promise<IN8nCollection[]> {
			const cachedResults: IN8nCollection[] | null = context.getters.getSearchedCollections(query);
			console.log('search', query, cachedResults);
			if (cachedResults && cachedResults.length) {
				return cachedResults;
			}

			const apiEndpoint: string = context.rootGetters['settings/templatesHost'];
			const response = await getCollections(apiEndpoint, query);
			const collections = response.data.collections;

			context.commit('addCollections', collections);
			context.commit('addCollectionSearch', {query, collections});

			return collections;
		},
		// 	async getSearchResults(context: ActionContext<ITemplateState, IRootState>, { pageSize = 10, search = '', categories, skip = 0 }: {pageSize: number, search: string, categories: number[], skip: number}): Promise<IN8nSearchData | null> {
		// 		const cachedResults: IN8nSearchData | null = context.getters.getSearchResults({categories, search});
		// 		if (cachedResults && cachedResults.workflows.length < skip) {
		// 			return cachedResults;
		// 		}

		// 		const apiEndpoint: string = context.rootGetters['settings/templatesHost'];

		// 		// todo search and alldata always true because new endpoints will behave like that
		// 		const payload: IN8nSearchResponse = await getTemplates(pageSize, skip, categories, search, true, false, apiEndpoint);
		// 		const results : IN8nSearchData = payload.data;

		// 		context.commit('appendSearchResults', {query: {search, categories}, results});

	// 		return context.getters.getSearchResults({categories, search});
	// 	},
	},
};

export default module;
