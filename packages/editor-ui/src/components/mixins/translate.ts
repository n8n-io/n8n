import Vue from 'vue';
import { TranslateResult } from 'vue-i18n';

export const translate = Vue.extend({
	computed: {
		nodeType (): string {
			return this.$store.getters.activeNode.type;
		},
	},
	methods: {
		translate({ key, fallback }: { key: string, fallback: string }): TranslateResult {
			return this.$te(key) ? this.$t(key) : fallback;
		},
		$translateDisplayName(displayName: string) {
			return this.translate({
				key: `${this.nodeType}.${displayName}`,
				fallback: displayName,
			});
		},
		$translateOptionName(optionsGroupName: string, optionName: string) {
			return this.translate({
				key: `${this.nodeType}.options.${optionsGroupName}.${optionName}`,
				fallback: optionName,
			});
		},
		$translateDescription(description: string) {
			return this.translate({
				key: `${this.nodeType}['${description}']`,
				fallback: description,
			});
		},
	},
});
