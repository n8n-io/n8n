import { getTemplates } from '@/api/templates';
import { ActionContext, Module } from 'vuex';
import {
	IRootState,
	IN8nTemplate,
	ITemplateState,
	ISearchPayload,
	ISearchResults,
	ITemplateCategory,
	ITemplateCollection,
} from '../Interface';
import Vue from 'vue';

const module: Module<ITemplateState, IRootState> = {
	namespaced: true,
	state: {
		template: {},
		categories: [],
		collections: [],
		workflows: [],
	},
	getters: {
		getTemplate(state: ITemplateState) {
			return state.template;
		},
		getCategories(state: ITemplateState) {
			return state.categories;
		},
		getCollections(state: ITemplateState) {
			return state.collections;
		},
		getWorkflows(state: ITemplateState) {
			return state.workflows;
		},
	},
	mutations: {
		setTemplate(state: ITemplateState, template: IN8nTemplate) {
			Vue.set(state, 'template', template);
		},
		setCategories(state: ITemplateState, categories: ITemplateCategory[]) {
			Vue.set(state, 'categories', categories);
		},
		setCollections(state: ITemplateState, collections: ITemplateCollection[]) {
			Vue.set(state, 'collections', collections);
		},
		setWorkflows(state: ITemplateState, workflows: IN8nTemplate[]) {
			Vue.set(state, 'workflows', workflows);
		},
		appendWorkflows(state: ITemplateState, workflows: IN8nTemplate[]) {
			Vue.set(state, 'workflows', state.workflows.concat(workflows));
		},
	},
	actions: {
		async getSearchResults(context: ActionContext<ITemplateState, IRootState>, { search , category, skip = 0, fetchCategories = false }) {
			const searchQuery = search.length || category ? true : false;
			const allData = fetchCategories ? fetchCategories : !searchQuery;
			try {
				//todo constant pagination
				const payload: ISearchPayload = await getTemplates(20, skip, category, search, allData, !allData);
				const results : ISearchResults = payload.data;
				if (allData) {
					const categories = results.categories.map((category: ITemplateCategory) => {
						category.selected = false;
						return category;
					});
					context.commit('setCategories', categories);
				}
				context.commit('setCollections', results.collections);
				if (skip) {
					context.commit('appendWorkflows', results.workflows);
				} else {
					context.commit('setWorkflows', results.workflows);
				}
				return results;
			} catch(e) {
				return;
			}
		},
	},
};

export default module;
