
import Vue from 'vue';
import { Module } from 'vuex';
import {
	IModalNames,
	IRootState,
	IUiState,
} from '../Interface';

const module: Module<IUiState, IRootState> = {
	namespaced: true,
	state: {
		modals: {
			saveAs: {
				open: false,
			},
			rename: {
				open: false,
			},
			tagsManager: {
				open: false,
			},
			workflowOpen: {
				open: false,
			},
		},
		modalStack: [],
		sidebarMenuCollapsed: true,
	},
	getters: {
		isModalOpen: (state: IUiState) => {
			return (name: IModalNames) => state.modals[name].open;
		},
		isModalActive: (state: IUiState) => {
			return (name: IModalNames) => name === state.modalStack[0];
		},
		anyModalsOpen: (state: IUiState) => {
			return state.modalStack.length > 0;
		},
		sidebarMenuCollapsed: (state: IUiState): boolean => state.sidebarMenuCollapsed,
	},
	mutations: {
		openModal: (state: IUiState, name: IModalNames) => {
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
};

export default module;