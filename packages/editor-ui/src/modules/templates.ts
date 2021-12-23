import { getSearchResults } from '@/api/search-results-mock';
import { ActionContext, Module } from 'vuex';
import {
	IRootState,
	IN8nTemplate,
	ITemplateState,
	ISearchResults,
} from '../Interface';
import Vue from 'vue';

const module: Module<ITemplateState, IRootState> = {
	namespaced: true,
	state: {
		template: {},
		searchResults: {},
	},
	getters: {
		getTemplate(state: ITemplateState) {
			return state.template;
		},
	},
	mutations: {
		setTemplate(state: ITemplateState, template: IN8nTemplate) {
			Vue.set(state, 'template', template);
		},
		setResults(state: ITemplateState, results: ISearchResults) {
			Vue.set(state, 'results', results);
		},
	},
	actions: {
		async getSearchResults(context: ActionContext<ITemplateState, IRootState>, templateId: string) {
			try {
				const results: ISearchResults = await getSearchResults();
				console.log(results);
				context.commit('setResults', results);
				return results;
			} catch(e) {
				return;
			}
		},
	},
};

export default module;
