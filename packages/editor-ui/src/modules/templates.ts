import { getTemplateById } from '@/api/templates';
import { ActionContext, Module } from 'vuex';
import {
	IRootState,
	IN8nTemplateResponse,
	IN8nTemplateWorkflow,
	IN8nTemplate,
	ITemplateState,
} from '../Interface';

const module: Module<ITemplateState, IRootState> = {
	namespaced: true,
	state: {
		templates: [],
	},
	getters: {
		getTemplates(state: ITemplateState) {
			return state.templates;
		},
	},
	mutations: {
		setTemplate(state: ITemplateState, template: IN8nTemplate) {
			state.templates.push(template);
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
