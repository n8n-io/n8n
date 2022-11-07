import { STORES } from "@/constants";
import { defineStore } from "pinia";
import { ALL_NODE_FILTER } from '@/constants';
import {
	INodeCreatorState,
	INodeFilterType,
} from '@/Interface';

export const useNodeCreatorStore = defineStore(STORES.NODE_CREATOR, {
	state: (): INodeCreatorState => ({
		itemsFilter: '',
		showTabs: true,
		showScrim: false,
		selectedType: ALL_NODE_FILTER,
	}),
	actions: {
		setShowTabs(isVisible: boolean) {
			this.showTabs = isVisible;
		},
		setShowScrim(isVisible: boolean) {
			this.showScrim = isVisible;
		},
		setSelectedType(selectedNodeType: INodeFilterType) {
			this.selectedType = selectedNodeType;
		},
		setFilter(search: string) {
			this.itemsFilter = search;
		},
	},
});
