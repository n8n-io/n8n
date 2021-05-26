import Vue from 'vue';

export const translate = Vue.extend({
	methods: {
		$translateDisplayName(displayName: string) {
			return this.$te(`${this.$store.getters.activeNode.type}.${displayName}`)
				? this.$t(`${this.$store.getters.activeNode.type}.${displayName}`)
				: displayName;
		},
	},
});
