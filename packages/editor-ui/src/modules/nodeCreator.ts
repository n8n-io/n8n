import { ALL_NODE_FILTER } from '@/constants';
import { Module } from 'vuex';
import {
	IRootState,
	INodeCreatorState,
	INodeFilterType,
} from '@/Interface';

const module: Module<INodeCreatorState, IRootState> = {
	namespaced: true,
	state: {
		itemsFilter: '',
		showTabs: true,
		showScrim: false,
		selectedType: ALL_NODE_FILTER,
	},
	getters: {
		showTabs: (state: INodeCreatorState) => state.showTabs,
		showScrim: (state: INodeCreatorState) => state.showScrim,
		selectedType: (state: INodeCreatorState) => state.selectedType,
		itemsFilter: (state: INodeCreatorState) => state.itemsFilter,
	},
	mutations: {
		setShowTabs(state: INodeCreatorState, isVisible: boolean) {
			state.showTabs = isVisible;
		},
		setShowScrim(state: INodeCreatorState, isVisible: boolean) {
			state.showScrim = isVisible;
		},
		setSelectedType(state: INodeCreatorState, selectedNodeType: INodeFilterType) {
			state.selectedType = selectedNodeType;
		},
		setFilter(state: INodeCreatorState, search: INodeFilterType) {
			state.itemsFilter = search;
		},
	},
};

export default module;
