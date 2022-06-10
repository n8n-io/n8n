import { getInstalledCommunityNodes, installNewPackage, uninstallPackage } from '@/api/communityNodes';
import { getAvailableCommunityPackageCount } from '@/api/settings';
import { ICommunityNodesState, IRootState } from '@/Interface';
import { PublicInstalledPackage } from 'n8n-workflow';
import { ActionContext, Module } from 'vuex';
import {
	COMMUNITY_PACKAGE_MANAGE_ACTIONS,
	COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY,
} from '../constants';

const LOADER_DELAY = 300;

const module: Module<ICommunityNodesState, IRootState> = {
	namespaced: true,
	state: {
		// -1 means that package count has not been fetched yet
		availablePackageCount: -1,
		loading: true,
		installedPackages: [],
		currentModalAction: COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL,
		currentModalPackage: {} as PublicInstalledPackage,
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
		setCurrentModalAction(state: ICommunityNodesState, action: string) {
			state.currentModalAction = action;
		},
		setCurrentModalPackage(state: ICommunityNodesState, pack: PublicInstalledPackage) {
			state.currentModalPackage = pack;
		},
		removePackageByName(state: ICommunityNodesState, name: string) {
			const packagesByName = state.installedPackages.filter(pack => pack.packageName === name);
			if(packagesByName.length > 0) {
				const index = state.installedPackages.indexOf(packagesByName[0]);
				state.installedPackages.splice(index, 1);
			}
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
		getCurrentModalAction(state: ICommunityNodesState): string {
			return state.currentModalAction;
		},
		getCurrentModalPackage(state: ICommunityNodesState): PublicInstalledPackage {
			return state.currentModalPackage;
		},
		getInstalledPackageByName(state: ICommunityNodesState, packageName: string): PublicInstalledPackage {
			return state.installedPackages.filter(pack => pack.packageName === packageName)[0];
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
		async installPackage(context: ActionContext<ICommunityNodesState, IRootState>, pack: PublicInstalledPackage) {
			context.commit('setLoading', true);
			try {
				await installNewPackage(context.rootGetters.getRestApiContext, pack.packageName);
				await context.dispatch('communityNodes/fetchInstalledPackages');
			} catch(error) {
				throw(error);
			} finally {
				context.commit('setLoading', false);
			}
		},
		async uninstallPackage(context: ActionContext<ICommunityNodesState, IRootState>) {
			context.commit('setLoading', true);
			try {
				await uninstallPackage(context.rootGetters.getRestApiContext, context.getters.getCurrentModalPackage.packageName);
				context.commit('removePackageByName', context.getters.getCurrentModalPackage.packageName);
			} catch(error) {
				throw(error);
			} finally {
				context.commit('setLoading', false);
			}
		},
		async openUninstallConfirmModal(context: ActionContext<ICommunityNodesState, IRootState>, pack: PublicInstalledPackage) {
			context.commit('setCurrentModalAction', COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL);
			context.commit('setCurrentModalPackage', pack);
			await context.dispatch('ui/openModal', COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, {root: true});
		},
		async openUpdateConfirmModal(context: ActionContext<ICommunityNodesState, IRootState>, pack: PublicInstalledPackage) {
			context.commit('setCurrentModalAction', COMMUNITY_PACKAGE_MANAGE_ACTIONS.UPDATE);
			context.commit('setCurrentModalPackage', pack);
			await context.dispatch('ui/openModal', COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, {root: true});
		},
	},
};

export default module;
