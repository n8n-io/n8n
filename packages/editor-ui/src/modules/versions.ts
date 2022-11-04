import { getNextVersions } from '@/api/versions';
import { useRootStore } from '@/stores/n8nRootStore';
import { ActionContext, Module } from 'vuex';
import {
	IRootState,
	IVersion,
	IVersionsState,
} from '../Interface';

const module: Module<IVersionsState, IRootState> = {
	namespaced: true,
	state: {
		versionNotificationSettings: {
			enabled: false,
			endpoint: '',
			infoUrl: '',
		},
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
		areNotificationsEnabled(state: IVersionsState) {
			return state.versionNotificationSettings.enabled;
		},
		infoUrl(state: IVersionsState) {
			return state.versionNotificationSettings.infoUrl;
		},
	},
	mutations: {
		setVersions(state: IVersionsState, {versions, currentVersion}: {versions: IVersion[], currentVersion: string}) {
			state.nextVersions = versions.filter((version) => version.name !== currentVersion);
			state.currentVersion = versions.find((version) => version.name === currentVersion);
		},
		setVersionNotificationSettings(state: IVersionsState, settings: {enabled: true, endpoint: string, infoUrl: string}) {
			state.versionNotificationSettings = settings;
		},
	},
	actions: {
		async fetchVersions(context: ActionContext<IVersionsState, IRootState>) {
			try {
				const { enabled, endpoint } = context.state.versionNotificationSettings;
				if (enabled && endpoint) {
					const rootStore = useRootStore();
					const currentVersion = rootStore.versionCli;
					const instanceId = rootStore.instanceId;
					const versions = await getNextVersions(endpoint, currentVersion, instanceId);
					context.commit('setVersions', {versions, currentVersion});
				}
			} catch (e) {
			}
		},
	},
};

export default module;
