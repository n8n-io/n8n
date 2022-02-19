import { getCollectionById, getTemplateById, getTemplates } from '@/api/templates';
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
		searchResults: {},
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
		getSearchResults(state: ITemplateState) {
			return (query: {categories: number[], search: string}): IN8nSearchData | null => {
				const searchKey = JSON.stringify(query);
				if (!state.searchResults[searchKey]) {
					return null;
				}

				const results = state.searchResults[searchKey];

				const collectionIds = results.collectionIds || [];
				const collections = collectionIds.map((id) => state.collections[id]);

				const templateIds = results.workflowIds || [];
				const workflows = templateIds.map((id) => state.templates[id]);

				const totalWorkflows = results.totalWorkflows;

				return {
					collections,
					workflows,
					totalWorkflows,
				};
			};
		},
	},
	mutations: {
		appendSearchResults(state: ITemplateState, data: {query: ITemplatesQuery, results: IN8nSearchData}) {
			const categories = data.results.categories || [];
			categories.forEach((category: ITemplateCategory) => {
				Vue.set(state.categories, category.id, category);
			});

			const collectionIds = data.results.collections.map((collection) => collection.id);
			const workflowIds = data.results.workflows.map((workflow) => workflow.id);
			const totalWorkflows = data.results.totalWorkflows;

			const searchKey = JSON.stringify(data.query);
			const cachedResults = state.searchResults[searchKey];
			if (!cachedResults) {
				state.searchResults[searchKey] = {
					collectionIds,
					workflowIds,
					totalWorkflows,
				};

				return;
			}

			state.searchResults[searchKey] = {
				collectionIds: [...cachedResults.collectionIds, ...collectionIds],
				workflowIds: [...cachedResults.workflowIds, ...workflowIds],
				totalWorkflows,
			};
		},
		setCollection(state: ITemplateState, collection: IN8nCollection) {
			Vue.set(state.collections, collection.id, collection);
		},
		setTemplate(state: ITemplateState, template: IN8nTemplate) {
			Vue.set(state.templates, template.id, template);
		},
	},
	actions: {
		async getCollectionById(context: ActionContext<ITemplateState, IRootState>, collectionId: string) {
			const apiEndpoint: string = context.rootGetters['settings/templatesHost'];
			const response: IN8nCollectionResponse = await getCollectionById(collectionId, apiEndpoint);
			const collection: IN8nCollection = response.data.collection;

			context.commit('setCollection', collection);
			return collection;
		},
		async getTemplateById(context: ActionContext<ITemplateState, IRootState>, templateId: string) {
			const apiEndpoint: string = context.rootGetters['settings/templatesHost'];
			const response: IN8nTemplateResponse = await getTemplateById(templateId, apiEndpoint);
			const template: IN8nTemplate = response.data.workflow;

			context.commit('setTemplate', template);
			return template;
		},
		async getSearchResults(context: ActionContext<ITemplateState, IRootState>, { pageSize = 10, search = '', categories, skip = 0 }: {pageSize: number, search: string, categories: number[], skip: number}): Promise<IN8nSearchData | null> {
			const cachedResults: IN8nSearchData | null = context.getters.getSearchResults({categories, search});
			if (cachedResults && cachedResults.workflows.length < skip) {
				return cachedResults;
			}

			const apiEndpoint: string = context.rootGetters['settings/templatesHost'];

			// todo search and alldata always true because new endpoints will behave like that
			const payload: IN8nSearchResponse = await getTemplates(pageSize, skip, categories, search, true, false, apiEndpoint);
			const results : IN8nSearchData = payload.data;

			context.commit('setSearchResults', {query: {search, categories}, results});

			return context.getters.getSearchResults({categories, search});
		},
	},
};

export default module;
