import { getNewWorkflow } from '@/api/workflows';
import { NEW_WORKFLOW_NAME } from '@/constants';
import { ActionContext, Module } from 'vuex';
import {
	IRootState,
	IWorkflowsState,
} from '../Interface';

const module: Module<IWorkflowsState, IRootState> = {
	namespaced: true,
	state: {},
	actions: {
		setNewWorkflowName: async (context: ActionContext<IWorkflowsState, IRootState>) => {
			let newName = NEW_WORKFLOW_NAME;

			try {
				const newWorkflow = await getNewWorkflow(context.rootGetters.getRestApiContext, { name: NEW_WORKFLOW_NAME, offset: 0});
				newName = newWorkflow.name;
			}
			catch (e) {
				// in case of error, default to original name
			}

			context.commit('setWorkflowName', { newName, setStateDirty: false }, { root: true });
		},
	},
};

export default module;