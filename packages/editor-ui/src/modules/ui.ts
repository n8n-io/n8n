
import { Module } from 'vuex';
import {
	IRootState,
	IUiState,
} from '../Interface';

const module: Module<IUiState, IRootState> = {
	namespaced: true,
	state: {
		saveAsDialogOpen: false,
		renameDialogOpen: false,
		tagsManagerOpen: false,
		sidebarMenuCollapsed: true,
	},
	mutations: {
		openSaveAsDialog: (state: IUiState) => {
			state.saveAsDialogOpen = true;
		},
		closeSaveAsDialog: (state: IUiState) => {
			state.saveAsDialogOpen = false;
		},
		openRenameDialog: (state: IUiState) => {
			state.renameDialogOpen = true;
		},
		closeRenameDialog: (state: IUiState) => {
			state.renameDialogOpen = false;
		},
		openTagsManager: (state: IUiState) => {
			state.tagsManagerOpen = true;
		},
		closeTagsManager: (state: IUiState) => {
			state.tagsManagerOpen = false;
		},
		toggleSidebarMenuCollapse: (state: IUiState) => {
			state.sidebarMenuCollapsed = !state.sidebarMenuCollapsed;
		},
	},
};

export default module;