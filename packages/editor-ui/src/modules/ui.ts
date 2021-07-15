import { DUPLICATE_MODAL_KEY, TAGS_MANAGER_MODAL_KEY, WORKLOW_OPEN_MODAL_KEY } from '@/constants';
import Vue from 'vue';
import { ActionContext, Module } from 'vuex';
import {
	IRootState,
	IUiState,
} from '../Interface';

const module: Module<IUiState, IRootState> = {
	namespaced: true,
	state: {
		modals: {
			[DUPLICATE_MODAL_KEY]: {
				open: false,
			},
			[TAGS_MANAGER_MODAL_KEY]: {
				open: false,
			},
			[WORKLOW_OPEN_MODAL_KEY]: {
				open: false,
			},
		},
		modalStack: [],
		sidebarMenuCollapsed: true,
		isPageLoading: true,
	},
	getters: {
		isModalOpen: (state: IUiState) => {
			return (name: string) => state.modals[name].open;
		},
		isModalActive: (state: IUiState) => {
			return (name: string) => state.modalStack.length > 0 && name === state.modalStack[0];
		},
		sidebarMenuCollapsed: (state: IUiState): boolean => state.sidebarMenuCollapsed,
	},
	mutations: {
		openModal: (state: IUiState, name: string) => {
			Vue.set(state.modals[name], 'open', true);
			state.modalStack = [name].concat(state.modalStack);
		},
		closeTopModal: (state: IUiState) => {
			const name = state.modalStack[0];
			Vue.set(state.modals[name], 'open', false);

			state.modalStack = state.modalStack.slice(1);
		},
		toggleSidebarMenuCollapse: (state: IUiState) => {
			state.sidebarMenuCollapsed = !state.sidebarMenuCollapsed;
		},
	},
	actions: {
		openTagsManagerModal: async (context: ActionContext<IUiState, IRootState>) => {
			context.commit('openModal', TAGS_MANAGER_MODAL_KEY);
		},
		openWorklfowOpenModal: async (context: ActionContext<IUiState, IRootState>) => {
			context.commit('openModal', WORKLOW_OPEN_MODAL_KEY);
		},
		openDuplicateModal: async (context: ActionContext<IUiState, IRootState>) => {
			context.commit('openModal', DUPLICATE_MODAL_KEY);
		},
	},
};

export default module;