import { getInstalledCommunityNodes, installNewPackage } from '@/api/communityNodes';
import { getAvailableCommunityPackageCount } from '@/api/settings';
import { ICommunityNodesState, IRootState } from '@/Interface';
import { PublicInstalledPackage } from 'n8n-workflow';
import { ActionContext, Module } from 'vuex';

const LOADER_DELAY = 300;

const module: Module<ICommunityNodesState, IRootState> = {
	namespaced: true,
	state: {
		// -1 means that package count has not been fetched yet
		availablePackageCount: -1,
		loading: true,
		installedPackages: [],
	},
	mutations: {
		setAvailablePackageCount: (state: ICommunityNodesState, count: number) => {
			state.availablePackageCount = count;
		},
		setInstalledPackages: (state: ICommunityNodesState, packages: PublicInstalledPackage[]) => {
			state.installedPackages = packages;
		},
		setLoading: (state: ICommunityNodesState, loading: boolean) => {
			state.loading = loading;
		},
	},
	getters: {
		availablePackageCount(state: ICommunityNodesState): number {
			return state.availablePackageCount;
		},
		getInstalledPackages(state: ICommunityNodesState): PublicInstalledPackage[] {
			return state.installedPackages;
		},
		isLoading(state: ICommunityNodesState): boolean {
			return state.loading;
		},
	},
	actions: {
		async fetchAvailableCommunityPackageCount(context: ActionContext<ICommunityNodesState, IRootState>) {
			if(context.state.availablePackageCount === -1) {
				const packageCount = await getAvailableCommunityPackageCount();
				context.commit('setAvailablePackageCount', packageCount);
			}
		},
		async fetchInstalledPackages(context: ActionContext<ICommunityNodesState, IRootState>) {
			context.commit('setLoading', true);
			const installedPackages = await getInstalledCommunityNodes(context.rootGetters.getRestApiContext);
			context.commit('setInstalledPackages', installedPackages);
			const timeout = installedPackages.length > 0 ? 0 : LOADER_DELAY;
			setTimeout(() => {
				context.commit('setLoading', false);
			}, timeout);
		},
		async installPackage(context: ActionContext<ICommunityNodesState, IRootState>, packageName: string) {
			context.commit('setLoading', true);
			try {
				await installNewPackage(context.rootGetters.getRestApiContext, packageName);
				await context.dispatch('communityNodes/fetchInstalledPackages');
			} catch(error) {
				throw(error);
			} finally {
				context.commit('setLoading', false);
			}
		},
	},
};

export default module;
