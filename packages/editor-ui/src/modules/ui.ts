import { CREDENTIAL_EDIT_MODAL_KEY, DUPLICATE_MODAL_KEY, TAGS_MANAGER_MODAL_KEY, VERSIONS_MODAL_KEY, WORKLOW_OPEN_MODAL_KEY, CREDENTIAL_SELECT_MODAL_KEY } from '@/constants';
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
			[CREDENTIAL_EDIT_MODAL_KEY]: {
				open: false,
				mode: '',
				activeId: null,
			},
			[DUPLICATE_MODAL_KEY]: {
				open: false,
			},
			[TAGS_MANAGER_MODAL_KEY]: {
				open: false,
			},
			[WORKLOW_OPEN_MODAL_KEY]: {
				open: false,
			},
			[VERSIONS_MODAL_KEY]: {
				open: false,
			},
			[CREDENTIAL_SELECT_MODAL_KEY]: {
				open: false,
			},
		},
		modalStack: [],
		sidebarMenuCollapsed: true,
		isPageLoading: true,
	},
	getters: {
		isVersionsOpen: (state: IUiState) => {
			return state.modals[VERSIONS_MODAL_KEY].open;
		},
		isModalOpen: (state: IUiState) => {
			return (name: string) => state.modals[name].open;
		},
		isModalActive: (state: IUiState) => {
			return (name: string) => state.modalStack.length > 0 && name === state.modalStack[0];
		},
		getModalActiveId: (state: IUiState) => {
			return (name: string) => state.modals[name].activeId;
		},
		getModalMode: (state: IUiState) => {
			return (name: string) => state.modals[name].mode;
		},
		sidebarMenuCollapsed: (state: IUiState): boolean => state.sidebarMenuCollapsed,
	},
	mutations: {
		setMode: (state: IUiState, params: {name: string, mode: string}) => {
			const { name, mode } = params;
			Vue.set(state.modals[name], 'mode', mode);
		},
		setActiveId: (state: IUiState, params: {name: string, id: string}) => {
			const { name, id } = params;
			Vue.set(state.modals[name], 'activeId', id);
		},
		openModal: (state: IUiState, name: string) => {
			Vue.set(state.modals[name], 'open', true);
			state.modalStack = [name].concat(state.modalStack);
		},
		closeTopModal: (state: IUiState) => {
			const name = state.modalStack[0];
			Vue.set(state.modals[name], 'open', false);
			if (state.modals.mode) {
				Vue.set(state.modals[name], 'mode', '');
			}
			if (state.modals.activeId) {
				Vue.set(state.modals[name], 'activeId', '');
			}

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
		openUpdatesPanel: async (context: ActionContext<IUiState, IRootState>) => {
			context.commit('openModal', VERSIONS_MODAL_KEY);
		},
		openExisitngCredential: async (context: ActionContext<IUiState, IRootState>, { id }: {id: string}) => {
			context.commit('setActiveId', {name: CREDENTIAL_EDIT_MODAL_KEY, id});
			context.commit('setMode', {name: CREDENTIAL_EDIT_MODAL_KEY, mode: 'edit'});
			context.commit('openModal', CREDENTIAL_EDIT_MODAL_KEY);
		},
		openNewCredential: async (context: ActionContext<IUiState, IRootState>, { type }: {type: string}) => {
			context.commit('setActiveId', {name: CREDENTIAL_EDIT_MODAL_KEY, id: type});
			context.commit('setMode', {name: CREDENTIAL_EDIT_MODAL_KEY, mode: 'new'});
			context.commit('openModal', CREDENTIAL_EDIT_MODAL_KEY);
		},
		openCredentialsSelectModal: async (context: ActionContext<IUiState, IRootState>) => {
			context.commit('openModal', CREDENTIAL_SELECT_MODAL_KEY);
		},
	},
};

export default module;
