import { getTemplateById, getTemplates } from '@/api/templates';
import { ActionContext, Module } from 'vuex';
import {
	IRootState,
	IN8nTemplate,
	IN8nTemplateResponse,
	IN8nTemplateWorkflow,
	ITemplateCategory,
	ITemplateCollection,
	ITemplateState,
	ISearchPayload,
	ISearchResults,

} from '../Interface';

import Vue from 'vue';

const module: Module<ITemplateState, IRootState> = {
	namespaced: true,
	state: {
		categories: [],
		collections: [],
		templates: [],
		totalworkflow: null,
	},
	getters: {
		getCategories(state: ITemplateState) {
			return state.categories;
		},
		getCollections(state: ITemplateState) {
			return state.collections;
		},
		getTemplates(state: ITemplateState) {
			return state.templates;
		},
		getTotalWorkflows(state: ITemplateState) {
			return state.totalworkflow;
		},
	},
	mutations: {
		appendWorkflows(state: ITemplateState, templates: IN8nTemplate[]) {
			Vue.set(state, 'templates', state.templates.concat(templates));
		},
		setCategories(state: ITemplateState, categories: ITemplateCategory[]) {
			Vue.set(state, 'categories', categories);
		},
		setCollections(state: ITemplateState, collections: ITemplateCollection[]) {
			Vue.set(state, 'collections', collections);
		},
		setTemplate(state: ITemplateState, template: IN8nTemplate) {
			state.templates.push(template);
		},
		setTotalWorkflows(state: ITemplateState, totalworkflow: number) {
			state.totalworkflow = totalworkflow;
		},
		setWorkflows(state: ITemplateState, templates: IN8nTemplate[]) {
			Vue.set(state, 'templates', templates);
		},
	},
	actions: {
		async getTemplateById(context: ActionContext<ITemplateState, IRootState>, templateId: string) {
			try {
				const response: IN8nTemplateResponse = await getTemplateById(templateId);
				const data: IN8nTemplateWorkflow = response.data;
				const template: IN8nTemplate = data.workflow;

				context.commit('setTemplate', template);
				return template;
			} catch(e) {
				return;
			}
		},
		async getSearchResults(context: ActionContext<ITemplateState, IRootState>, { numberOfResults = 10, search , category, skip = 0, fetchCategories = false }) {
			const searchQuery = search.length || category ? true : false;
			const allData = fetchCategories ? fetchCategories : !searchQuery;
			try {
				const payload: ISearchPayload = await getTemplates(numberOfResults, skip, category, search, allData, !allData);
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
					context.commit('setTotalWorkflows', results.totalworkflow);
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
