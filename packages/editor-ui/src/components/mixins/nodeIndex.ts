import Vue from 'vue';

export const nodeIndex = Vue.extend({
	methods: {
		getNodeIndex (nodeName: string): string {
			let uniqueId = this.$store.getters.getNodeIndex(nodeName);

			if (uniqueId === -1) {
				this.$store.commit('addToNodeIndex', nodeName);
				uniqueId = this.$store.getters.getNodeIndex(nodeName);
			}

			// We return as string as draggable and jsplumb seems to make problems
			// when numbers are given
			return uniqueId.toString();
		},
	},
});
