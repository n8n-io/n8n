import { getTemplateById } from '@/api/templates-mock';
import { ActionContext, Module } from 'vuex';
import {
	IRootState,
	IN8nTemplateResponse,
	IN8nTemplateWorkflow,
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
				const response: IN8nTemplateResponse = await getTemplateById(templateId);
				const data: IN8nTemplateWorkflow = response.data;
				const template: IN8nTemplate = data.workflow;

				context.commit('setTemplate', template);
				return template;
			} catch(e) {
				return;
			}
		},
	},
};

export default module;
