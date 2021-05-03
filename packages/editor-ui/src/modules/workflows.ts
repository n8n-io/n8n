import { renameWorkflow } from '@/api/workflows';
import { ActionContext, GetterTree, Module } from 'vuex';
import {
	IRootState,
	ITag,
	IWorkflowsState,
} from '../Interface';

const module: Module<IWorkflowsState, IRootState> = {
	namespaced: true,
	state: {},
	getters: {
		currentWorkflowTagIds: (state: IWorkflowsState, getters: GetterTree<IWorkflowsState, IRootState>, rootState: IRootState): string[] => {
			const tags = (rootState.workflow.tags || []) as string[];
			// @ts-ignore
			const tagsMap = rootState.tags.tags;

			return tags.filter((tagId) => !!tagsMap[tagId]);
		},
	},
	actions: {
		renameCurrent: async (context: ActionContext<IWorkflowsState, IRootState>, { name, tags }: { name: string, tags: ITag[] }) => {
			const currentId = context.rootGetters.workflowId;

			await renameWorkflow(context.rootGetters.getRestApiContext, currentId, { name, tags });

			context.commit('setWorkflowName', { newName: name, setStateDirty: false }, { root: true });
			context.commit('setWorkflowTagIds', tags, { root: true });
		},
	},
};

export default module;