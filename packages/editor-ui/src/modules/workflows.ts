
import { renameWorkflow } from '@/api/workflows';
import { ActionContext, Module } from 'vuex';
import {
	IRootState,
    IWorkflowsState,
} from '../Interface';

const module: Module<IWorkflowsState, IRootState> = {
	namespaced: true,
	state: {},
    actions: {
        renameCurrent: async (context: ActionContext<IWorkflowsState, IRootState>, name: string) => {
            const currentId = context.rootGetters.workflowId;

            await renameWorkflow(context, currentId, {name});

            context.commit('setWorkflowName', {newName: name, setStateDirty: false}, {root: true});
        }
    }
};

export default module;