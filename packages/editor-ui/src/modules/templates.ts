import { getTemplates } from '@/api/templates';
import { ActionContext, Module } from 'vuex';
import {
	IRootState,
	IN8nTemplate,
	ITemplateState,
	ISearchPayload,
	ISearchResults,
	ITemplateCategory,
} from '../Interface';
import Vue from 'vue';

const module: Module<ITemplateState, IRootState> = {
	namespaced: true,
	state: {
		template: {},
		categories: [],
		searchResults: {},
	},
	getters: {
		getTemplate(state: ITemplateState) {
			return state.template;
		},
		getCategories(state: ITemplateState) {
			return state.categories;
		},
	},
	mutations: {
		setTemplate(state: ITemplateState, template: IN8nTemplate) {
			Vue.set(state, 'template', template);
		},
		setResults(state: ITemplateState, results: ISearchResults) {
			Vue.set(state, 'results', results);
		},
		setCategories(state: ITemplateState, categories: ITemplateCategory[]) {
			Vue.set(state, 'categories', categories);
		},
	},
	actions: {
		async getSearchResults(context: ActionContext<ITemplateState, IRootState>, templateId: string) {
			try {
				const payload: ISearchPayload = await getTemplates(10, 0, null, null);
				const results : ISearchResults = payload.data
				context.commit('setResults', results);
				const categories = results.categories.map((category: ITemplateCategory) => {
					category.selected = false;
					return category;
				});
				context.commit('setCategories', categories);
				return results;
			} catch(e) {
				return;
			}
		},
	},
};

export default module;
