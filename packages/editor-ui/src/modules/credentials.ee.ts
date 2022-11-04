import Vue from 'vue';
import {ActionContext, Module} from 'vuex';
import {
	ICredentialsState,
	IRootState, IUser,
} from '../Interface';
import {setCredentialSharedWith} from "@/api/credentials.ee";
import {EnterpriseEditionFeature} from "@/constants";
import { useSettingsStore } from '@/stores/settings';
import { useRootStore } from '@/stores/n8nRootStore';

export const credentialsEEModule: Module<ICredentialsState, IRootState> = {
	mutations: {
		setCredentialOwnedBy(state: ICredentialsState, payload: { credentialId: string, ownedBy: Partial<IUser> }) {
			Vue.set(state.credentials[payload.credentialId], 'ownedBy', payload.ownedBy);
		},
		setCredentialSharedWith(state: ICredentialsState, payload: { credentialId: string, sharedWith: Array<Partial<IUser>> }) {
			Vue.set(state.credentials[payload.credentialId], 'sharedWith', payload.sharedWith);
		},
		addCredentialSharee(state: ICredentialsState, payload: { credentialId: string, sharee: Partial<IUser> }) {
			Vue.set(
				state.credentials[payload.credentialId],
				'sharedWith',
				(state.credentials[payload.credentialId].sharedWith || []).concat([payload.sharee]),
			);
		},
		removeCredentialSharee(state: ICredentialsState, payload: { credentialId: string, sharee: Partial<IUser> }) {
			Vue.set(
				state.credentials[payload.credentialId],
				'sharedWith',
				(state.credentials[payload.credentialId].sharedWith || [])
					.filter((sharee) => sharee.id !== payload.sharee.id),
			);
		},
	},
	actions: {
		setCredentialSharedWith: async (context: ActionContext<ICredentialsState, IRootState>, payload: { sharedWith: IUser[]; credentialId: string; }) => {
			if(useSettingsStore().isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)) {
				await setCredentialSharedWith(
					useRootStore().getRestApiContext,
					payload.credentialId,
					{
						shareWithIds: payload.sharedWith.map((sharee) => sharee.id),
					},
				);

				context.commit('setCredentialSharedWith', {
					credentialId: payload.credentialId,
					sharedWith: payload.sharedWith,
				});
			}
		},
	},
};
