import Vue from 'vue';
import { INodeUi } from "@/Interface";
import { IDataObject } from "n8n-workflow";

export const pinData = Vue.extend({
	props: ['name'],
	computed: {
		node (): INodeUi | undefined {
			return this.$store.getters.nodesByName[this.name] as INodeUi | undefined;
		},
		pinData (): IDataObject {
			return !!this.node && this.$store.getters['pinDataByNodeName'](this.node.name);
		},
		hasPinData (): boolean {
			return !!this.node && typeof this.pinData !== 'undefined';
		},
	},
});
