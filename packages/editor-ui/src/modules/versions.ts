import { getNextVersions } from '@/api/versions';
import { versions } from 'process';
import { ActionContext, Module } from 'vuex';
import {
	IRootState,
	IVersion,
	IVersionsState,
} from '../Interface';

const module: Module<IVersionsState, IRootState> = {
	namespaced: true,
	state: {
		nextVersions: [],
		currentVersion: undefined,
	},
	getters: {
		hasVersionUpdates(state: IVersionsState) {
			return state.nextVersions.length > 0;
		},
		nextVersions(state: IVersionsState) {
			return state.nextVersions;
		},
		currentVersion(state: IVersionsState) {
			return state.currentVersion;
		},
	},
	mutations: {
		setVersions(state: IVersionsState, {versions, currentVersion}: {versions: IVersion[], currentVersion: string}) {
			state.nextVersions = versions.filter((version) => version.name !== currentVersion);
			state.currentVersion = versions.find((version) => version.name === currentVersion);
		},
	},
	actions: {
		async fetchVersions(context: ActionContext<IVersionsState, IRootState>) {
			const currentVersion = context.rootState.versionCli;
			const versions = await getNextVersions(currentVersion);
			context.commit('setVersions', {versions, currentVersion});
		},
	},
};

export default module;