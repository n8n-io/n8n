
import { Module } from 'vuex';
import {
	IRootState,
} from '../Interface';

interface IUiState {
    saveAsDialogOpen: boolean;
    renameDialogOpen: boolean;
    tagsManagerOpen: boolean;
};

const module: Module<IUiState, IRootState> = {
	namespaced: true,
	state: {
        saveAsDialogOpen: false,
        renameDialogOpen: false,
        tagsManagerOpen: false,
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
	},
};

export default module;