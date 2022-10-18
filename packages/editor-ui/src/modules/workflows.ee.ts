import Vue from 'vue';
import {ActionContext, Module} from 'vuex';
import {
	IRootState, IUser,
} from '../Interface';
import {setWorkflowSharedWith} from "@/api/workflows.ee";
import {EnterpriseEditionFeature} from "@/constants";

// @TODO Move to workflows store as part of workflows store refactoring
//
export const workflowsEEModule: Module<IRootState, IRootState> = {
	mutations: {
		setWorkflowOwnedBy(state: IRootState, payload: { workflowId: string, ownedBy: Partial<IUser> }) {
			Vue.set(state.workflowsById[payload.workflowId], 'ownedBy', payload.ownedBy);
		},
		setWorkflowSharedWith(state: IRootState, payload: { workflowId: string, sharedWith: Array<Partial<IUser>> }) {
			Vue.set(state.workflowsById[payload.workflowId], 'sharedWith', payload.sharedWith);
		},
		addWorkflowSharee(state: IRootState, payload: { workflowId: string, sharee: Partial<IUser> }) {
			Vue.set(
				state.workflowsById[payload.workflowId],
				'sharedWith',
				(state.workflowsById[payload.workflowId].sharedWith || []).concat([payload.sharee]),
			);
		},
		removeWorkflowSharee(state: IRootState, payload: { workflowId: string, sharee: Partial<IUser> }) {
			Vue.set(
				state.workflowsById[payload.workflowId],
				'sharedWith',
				(state.workflowsById[payload.workflowId].sharedWith || [])
					.filter((sharee) => sharee.id !== payload.sharee.id),
			);
		},
	},
	actions: {
		setWorkflowSharedWith: async (context: ActionContext<IRootState, IRootState>, payload: { sharedWith: IUser[]; workflowId: string; }) => {
			if (context.rootGetters['settings/isEnterpriseFeatureEnabled'](EnterpriseEditionFeature.Sharing)) {
				await setWorkflowSharedWith(
					context.rootGetters.getRestApiContext,
					payload.workflowId,
					{
						shareWithIds: payload.sharedWith.map((sharee) => sharee.id),
					},
				);

				context.commit('setWorkflowSharedWith', {
					workflowId: payload.workflowId,
					sharedWith: payload.sharedWith,
				});
			}
		},
	},
};
