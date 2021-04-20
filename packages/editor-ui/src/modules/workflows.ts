
import { renameWorkflow } from '@/api/workflows';
import { ActionContext, Module } from 'vuex';
import {
	IRootState,
	ITag,
	IWorkflowsState,
} from '../Interface';

const module: Module<IWorkflowsState, IRootState> = {
	namespaced: true,
	state: {},
	actions: {
		renameCurrent: async (context: ActionContext<IWorkflowsState, IRootState>, {name, tags}: {name: string, tags: ITag[]}) => {
			const currentId = context.rootGetters.workflowId;

			await renameWorkflow(context, currentId, { name, tags });

			context.commit('setWorkflowName', { newName: name, setStateDirty: false }, { root: true });
			context.commit('setWorkflowTagIds', tags, {root: true});
		},
	},
};

export default module;