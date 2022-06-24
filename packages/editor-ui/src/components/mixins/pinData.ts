import Vue from 'vue';
import { INodeUi } from "@/Interface";
import { IDataObject } from "n8n-workflow";

interface PinDataContext extends Vue {
	node?: INodeUi;
}

export const pinData = Vue.extend({
	computed: {
		pinData (): IDataObject {
			return !!(this as PinDataContext).node && this.$store.getters['pinDataByNodeName']((this as PinDataContext).node!.name);
		},
		hasPinData (): boolean {
			return !!(this as PinDataContext).node && typeof this.pinData !== 'undefined';
		},
	},
});
