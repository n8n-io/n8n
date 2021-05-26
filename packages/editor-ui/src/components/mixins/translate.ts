import Vue from 'vue';

export const translate = Vue.extend({
	methods: {
		translate({ key, fallback }: { key: string, fallback: string }) {
			return this.$te(key) ? this.$t(key) : fallback;
		},
		$translateDisplayName(displayName: string) {
			return this.translate({
				key: `${this.$store.getters.activeNode.type}.${displayName}`,
				fallback: displayName,
			});
		},
		$translateOptionName(optionsGroupName: string, optionName: string) {
			return this.translate({
				key: `${this.$store.getters.activeNode.type}.options.${optionsGroupName}.${optionName}`,
				fallback: optionName,
			});
		},
		$translateDescription(description: string) {
			return this.translate({
				key: `${this.$store.getters.activeNode.type}['${description}']`,
				fallback: description,
			});
		},
	},
});
