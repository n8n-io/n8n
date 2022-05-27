import { getCommunityPackageCount } from '@/api/settings';
import { ICommunityNodesState, IRootState } from '@/Interface';
import Vue from 'vue';
import { ActionContext, Module } from 'vuex';

const module: Module<ICommunityNodesState, IRootState> = {
	namespaced: true,
	state: {
		featureAvailable: true,
		availablePackageCount: 0,
	},
	mutations: {
		setFeatureAvailable: (state: ICommunityNodesState, isAvailable: boolean) => {
			state.featureAvailable = isAvailable;
		},
		setPackageCount: (state: ICommunityNodesState, count: number) => {
			state.availablePackageCount = count;
		},
	},
	getters: {
		isFeatureAvailable(state: ICommunityNodesState): boolean {
			return state.featureAvailable;
		},
		packageCount(state: ICommunityNodesState): number {
			return state.availablePackageCount;
		},
	},
	actions: {
		async fetchAvailableCommunityPackageCount(context: ActionContext<ICommunityNodesState, IRootState>) {
			const packageCount = await getCommunityPackageCount();
			context.commit('setPackageCount', packageCount);
		},
	},
};

export default module;
