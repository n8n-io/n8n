import { getInstalledCommunityNodes } from '@/api/communityNodes';
import { getCommunityPackageCount } from '@/api/settings';
import { ICommunityNodesState, IRootState } from '@/Interface';
import { PublicInstalledPackage } from 'n8n-workflow';
import { ActionContext, Module } from 'vuex';

const module: Module<ICommunityNodesState, IRootState> = {
	namespaced: true,
	state: {
		availablePackageCount: 0,
		loading: true,
		installedPackages: [],
	},
	mutations: {
		setPackageCount: (state: ICommunityNodesState, count: number) => {
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
		packageCount(state: ICommunityNodesState): number {
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
			const packageCount = await getCommunityPackageCount();
			context.commit('setPackageCount', packageCount);
		},
		async fetchInstalledPackages(context: ActionContext<ICommunityNodesState, IRootState>) {
			context.commit('setLoading', true);
			const installedPackages = await getInstalledCommunityNodes();
			context.commit('setInstalledPackages', installedPackages);
			context.commit('setLoading', false);
		},
	},
};

export default module;
