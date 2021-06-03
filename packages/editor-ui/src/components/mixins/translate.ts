import Vue from 'vue';
import { TranslateResult } from 'vue-i18n';

export const translate = Vue.extend({
	computed: {
		nodeType (): string {
			return this.$store.getters.activeNode.type;
		},
	},
	methods: {

		/**
		 * Translate the value at the translation key, or return a fallback.
		 */
		translate({ key, fallback }: { key: string, fallback: string }): TranslateResult {
			return this.$te(key) ? this.$t(key) : fallback;
		},

		// ----------------------------------
		//       parameter properties
		// ----------------------------------

		/**
		 * Translate the top-level parameter name, including options nested inside collections.
		 */
		$translateName({ name: parameterName }: { name: string }) {
			return this.translate({
				key: `${this.nodeType}.parameters.${parameterName}.displayName`,
				fallback: parameterName,
			});
		},

		/**
		 * Translate the parameter description in the tooltip for the circled question mark.
		 */
		$translateDescription(
			{ name: parameterName, description }:
			{ name: string; description: string; },
		) {
			return this.translate({
				key: `${this.nodeType}.parameters.${parameterName}.description`,
				fallback: description,
			});
		},

		// ----------------------------------
		//         value properties
		// ----------------------------------

		/**
		 * Translate the placeholder inside the input field for a string-type parameter.
		 */
		$translatePlaceholder(
			{ name: parameterName, placeholder }:
			{ name: string; placeholder: string; },
		) {
			return this.translate({
				key: `${this.nodeType}.parameters.${parameterName}.placeholder`,
				fallback: placeholder,
			});
		},

		/**
		 * Translate the name for an option inside the dropdown menu for an options-type parameter.
		 */
		$translateOptionName(parameterName: string, optionName: string) {
			return this.translate({
				key: `${this.nodeType}.parameters.${parameterName}.options.${optionName}.displayName`,
				fallback: optionName,
			});
		},

		/**
		 * Translate the description for an option inside the dropdown for an options-type parameter.
		 * An option's `value`, here `optionName`, is equivalent to a parameter's `name`.
		 */
		$translateOptionDescription(parameterName: string, optionName: string, description: string) {
			return this.translate({
				key: `${this.nodeType}.parameters.${parameterName}.options.${optionName}.description`,
				fallback: description,
			});
		},

		// ----------------------------------
		//           component
		// ----------------------------------

		/**
		 * Translate the label for a button to add another field-input pair to a collection.
		 */
		$translateMultipleValueButtonText(
			{ name: parameterName, typeOptions: { multipleValueButtonText } }:
			{ name: string, typeOptions: { multipleValueButtonText: string } },
		) {
			return this.translate({
				key: `${this.nodeType}.parameters.${parameterName}.multipleValueButtonText`,
				fallback: multipleValueButtonText,
			});
		},

	},
});
