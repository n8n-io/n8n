import { getNewWorkflow } from '@/api/workflows';
import { DUPLICATE_POSTFFIX, MAX_WORKFLOW_NAME_LENGTH, DEFAULT_NEW_WORKFLOW_NAME } from '@/constants';
import { ActionContext, Module } from 'vuex';
import {
	IRootState,
	IWorkflowsState,
} from '../Interface';

const module: Module<IWorkflowsState, IRootState> = {
	namespaced: true,
	state: {},
	actions: {
		setNewWorkflowName: async (context: ActionContext<IWorkflowsState, IRootState>, name?: string): Promise<void> => {
			let newName = '';
			try {
				const newWorkflow = await getNewWorkflow(context.rootGetters.getRestApiContext, name);
				newName = newWorkflow.name;
			}
			catch (e) {
				// in case of error, default to original name
				newName = name || DEFAULT_NEW_WORKFLOW_NAME;
			}

			context.commit('setWorkflowName', { newName }, { root: true });
		},

		getDuplicateCurrentWorkflowName: async (context: ActionContext<IWorkflowsState, IRootState>): Promise<string> => {
			const currentWorkflowName = context.rootGetters.workflowName;

			if (currentWorkflowName && (currentWorkflowName.length + DUPLICATE_POSTFFIX.length) >= MAX_WORKFLOW_NAME_LENGTH) {
				return currentWorkflowName;
			}

			let newName = `${currentWorkflowName}${DUPLICATE_POSTFFIX}`;

			try {
				const newWorkflow = await getNewWorkflow(context.rootGetters.getRestApiContext, newName );
				newName = newWorkflow.name;
			}
			catch (e) {
			}

			return newName;
		},
	},
};

export default module;
