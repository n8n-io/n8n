import { getInstalledCommunityNodes, installNewPackage, uninstallPackage, updatePackage } from '@/api/communityNodes';
import { getAvailableCommunityPackageCount } from '@/api/settings';
import { ICommunityNodesState, ICommunityPackageMap, IRootState } from '@/Interface';
import { PublicInstalledPackage } from 'n8n-workflow';
import Vue from 'vue';
import { ActionContext, Module } from 'vuex';

const LOADER_DELAY = 300;

const module: Module<ICommunityNodesState, IRootState> = {
	namespaced: true,
	state: {
		// -1 means that package count has not been fetched yet
		availablePackageCount: -1,
		installedPackages: {},
	},
	mutations: {
		setAvailablePackageCount: (state: ICommunityNodesState, count: number) => {
			state.availablePackageCount = count;
		},
		setInstalledPackages: (state: ICommunityNodesState, packages: PublicInstalledPackage[]) => {
			state.installedPackages = packages.reduce((packageMap: ICommunityPackageMap, pack: PublicInstalledPackage) => {
				packageMap[pack.packageName] = pack;
				return packageMap;
			}, {});
		},
		removePackageByName(state: ICommunityNodesState, name: string) {
			Vue.delete(state.installedPackages, name);
		},
	},
	getters: {
		availablePackageCount(state: ICommunityNodesState): number {
			return state.availablePackageCount;
		},
		getInstalledPackages(state: ICommunityNodesState): PublicInstalledPackage[] {
			return Object.values(state.installedPackages).sort((a, b) => a.packageName.localeCompare(b.packageName));
		},
		getInstalledPackageByName(state: ICommunityNodesState) {
			return (name: string) => state.installedPackages[name];
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
		async uninstallPackage(context: ActionContext<ICommunityNodesState, IRootState>, packageName: string) {
			context.commit('setLoading', true);
			try {
				await uninstallPackage(context.rootGetters.getRestApiContext, packageName);
				context.commit('removePackageByName', packageName);
			} catch(error) {
				throw(error);
			} finally {
				context.commit('setLoading', false);
			}
		},
		async updatePackage(context: ActionContext<ICommunityNodesState, IRootState>, packageName: string) {
			context.commit('setLoading', true);
			try {
				const packageToUpdate = context.getters.getInstalledPackageByName(packageName);
				await updatePackage(context.rootGetters.getRestApiContext, packageToUpdate.packageName);
				// TODO: Use new back-end response to substitute the existing object in the store
				packageToUpdate.installedVersion = packageToUpdate.updateAvailable;
				delete packageToUpdate.updateAvailable;
			} catch (error) {
				throw(error);
			} finally {
				context.commit('setLoading', false);
			}
		},
	},
};

export default module;
