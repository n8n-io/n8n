import { ALL_NODE_FILTER, STORES } from "@/constants";
import { INodeCreatorState } from "@/Interface";
import { defineStore } from "pinia";

export const useNodeCreatorStore = defineStore(STORES.NODE_CREATOR, {
	state: (): INodeCreatorState => ({
		itemsFilter: '',
		showTabs: true,
		showScrim: false,
		selectedType: ALL_NODE_FILTER,
	}),
});
