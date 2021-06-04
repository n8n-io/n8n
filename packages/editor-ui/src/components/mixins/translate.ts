import Vue from 'vue';
import { TranslateResult } from 'vue-i18n';

export const translate = Vue.extend({
	data() {
		// TODO: State in mixin advisable?
		return {
			isCredentialParam: false,
			nodeTypeFromCredential: '',
			credentialNameForParam: '',
		};
	},

	computed: {
		nodeType (): string {
			return this.isCredentialParam
				? this.nodeTypeFromCredential
				: this.$store.getters.activeNode.type;
		},
	},

	methods: {
		initTranslate(
			{ isCredential, nodeType, credentialName }:
			{ isCredential: boolean, nodeType: string, credentialName: string },
		) {
			this.isCredentialParam = isCredential;
			this.nodeTypeFromCredential = nodeType;
			this.credentialNameForParam = credentialName;
		},

		/**
		 * Translate the value at the translation key, or return a fallback.
		 */
		translate({ key, fallback }: { key: string, fallback: string }): TranslateResult {
			return this.$te(key) ? this.$t(key) : fallback;
		},

		// ----------------------------------
		//     node parameter properties
		// ----------------------------------

		/**
		 * Translate the top-level parameter name, including options nested inside collections.
		 */
		$translateName(
			{ name: parameterName, displayName }: { name: string; displayName: string; },
		) {
			return this.translate({
				key: `${this.nodeType}.parameters.${parameterName}.displayName`,
				fallback: displayName,
			});
		},

		/**
		 * Translate the parameter description in the tooltip for the circled question mark.
		 */
		$translateDescription(
			{ name: parameterName, description }: { name: string; description: string; },
		) {
			return this.translate({
				key: `${this.nodeType}.parameters.${parameterName}.description`,
				fallback: description,
			});
		},

		// ----------------------------------
		//         input properties
		// ----------------------------------

		/**
		 * Translate the placeholder inside the input field for a string-type parameter.
		 */
		$translatePlaceholder(
			{ name: parameterName, placeholder }: { name: string; placeholder: string; },
		) {
			const key = this.isCredentialParam
				? `${this.nodeType}.credentials.${this.credentialNameForParam}.placeholder`
				: `${this.nodeType}.parameters.${parameterName}.placeholder`;

			return this.translate({
				key,
				fallback: placeholder,
			});
		},

		/**
		 * Translate the name for an option inside the dropdown menu for an options-type parameter.
		 */
		$translateOptionName(
			{ name: parameterName }: { name: string },
			{ value: optionName, name: displayName }: { value: string; name: string; },
		) {
			const key = this.isCredentialParam
				? `${this.nodeType}.credentials.${this.credentialNameForParam}.options.${optionName}.displayName`
				: `${this.nodeType}.parameters.${parameterName}.options.${optionName}.displayName`;

			return this.translate({
				key,
				fallback: displayName,
			});
		},

		/**
		 * Translate the description for an option inside the dropdown for an options-type parameter.
		 */
		$translateOptionDescription(
			{ name: parameterName }: { name: string },
			{ value: optionName, description }: { value: string; description: string; },
		) {
			const key = this.isCredentialParam
				? `${this.nodeType}.credentials.${this.credentialNameForParam}.options.${optionName}.description`
				: `${this.nodeType}.parameters.${parameterName}.options.${optionName}.description`;

			return this.translate({
				key,
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
			{ name: string, typeOptions: { multipleValueButtonText: string }; },
		) {
			return this.translate({
				key: `${this.nodeType}.parameters.${parameterName}.multipleValueButtonText`,
				fallback: multipleValueButtonText,
			});
		},

	},
});
