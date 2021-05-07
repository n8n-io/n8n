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
			const tags = rootState.workflow.tags as string[];
			// @ts-ignore
			const tagsMap = rootState.tags.tags;

			return tags.filter((tagId) => !!tagsMap[tagId]);
		},
	},
};

export default module;