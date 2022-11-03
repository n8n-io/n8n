import { STORES } from "@/constants";
import { HistoryState } from "@/Interface";
import { defineStore } from "pinia";

export const useHistoryStore = defineStore(STORES.HISTORY, {
	state: (): HistoryState => ({
	}),
	getters: {
	},
	actions: {
	},
});
