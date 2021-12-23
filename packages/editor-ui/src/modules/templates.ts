import { getTemplateById } from '@/api/templates-mock';
import { ActionContext, Module } from 'vuex';
import {
	IRootState,
	IN8nTemplate,
	ITemplateState,
} from '../Interface';
import Vue from 'vue';

const module: Module<ITemplateState, IRootState> = {
	namespaced: true,
	state: {
		template: {},
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
	},
	actions: {
		async getTemplateById(context: ActionContext<ITemplateState, IRootState>, templateId: string) {
			try {
				const template: IN8nTemplate = await getTemplateById(templateId);
				context.commit('setTemplate', template);
				return template;
			} catch(e) {
				return;
			}
		},
	},
};

export default module;
