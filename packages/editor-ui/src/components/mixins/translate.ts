// import { TranslationPath } from '@/Interface';
import Vue from 'vue';

/**
 * Mixin to translate:
 * - base strings, i.e. any string that is not node- or credentials-specific,
 * - specific strings,
 * 	- node-specific strings, i.e. those in `NodeView.vue`,
 * 	- credentials-specific strings, i.e. those in `EditCredentials.vue`.
 */
export const translate = Vue.extend({
	computed: {
		/**
		 * Node type for the active node in `NodeView.vue`.
		 */
		activeNodeType (): string {
			return this.$store.getters.activeNode.type;
		},
	},

	methods: {
		// -----------------------------------------
		//               main methods
		// -----------------------------------------

		/**
		 * Translate a base string. Called directly in Vue templates.
		 * Optionally, [interpolate a variable](https://kazupon.github.io/vue-i18n/guide/formatting.html#named-formatting).
		 */
		$baseText(
			key: string,
			options?: { interpolate?: { [key: string]: string } },
		): string {
			const translatedBaseString = options && options.interpolate
				? this.$t(key, options.interpolate)
				: this.$t(key);

			return translatedBaseString.toString();
		},

		/**
		 * Translate a node- or credentials-specific string.
		 * Called in-mixin by node- or credentials-specific methods,
		 * which are called directly in Vue templates.
		 */
		translateSpecific(
			{ key, fallback }: { key: string, fallback: string },
		): string {
			return this.$te(key) ? this.$t(key).toString() : fallback;
		},

		// -----------------------------------------
		//           node-specific methods
		// -----------------------------------------

		/**
		 * Translate a top-level node parameter name, i.e. leftmost parameter in `NodeView.vue`.
		 */
		$translateNodeParameterName(
			{ name: parameterName, displayName }: { name: string; displayName: string; },
		) {
			return this.translateSpecific({
				key: `${this.activeNodeType}.parameters.${parameterName}.displayName`,
				fallback: displayName,
			});
		},

		/**
		 * Translate a top-level parameter description for a node or for credentials.
		 */
		 $translateDescription(
			{ name: parameterName, description }: { name: string; description: string; },
		) {
			return this.translateSpecific({
				key: `${this.activeNodeType}.parameters.${parameterName}.description`,
				fallback: description,
			});
		},

		/**
		 * Translate the name for an option in a `collection` or `fixed collection` parameter,
		 * e.g. an option name in an "Additional Options" fixed collection.
		 */
		$translateCollectionOptionName(
			{ name: parameterName }: { name: string; },
			{ name: optionName, displayName }: { name: string; displayName: string; },
		) {
			return this.translateSpecific({
				key: `${this.activeNodeType}.parameters.${parameterName}.options.${optionName}.displayName`,
				fallback: displayName,
			});
		},

		/**
		 * Translate the label for a button that adds another field-input pair to a collection.
		 */
		$translateMultipleValueButtonText(
			{ name: parameterName, typeOptions: { multipleValueButtonText } }:
			{ name: string, typeOptions: { multipleValueButtonText: string } },
		) {
			return this.translateSpecific({
				key: `${this.activeNodeType}.parameters.${parameterName}.multipleValueButtonText`,
				fallback: multipleValueButtonText,
			});
		},

		// -----------------------------------------
		//          creds-specific methods
		// -----------------------------------------

		/**
		 * Translate a credentials property name, i.e. leftmost parameter in `CredentialsEdit.vue`.
		 */
		 $translateCredentialsPropertyName(
			{ name: parameterName, displayName }: { name: string; displayName: string; },
			{ nodeType, credentialsName }: { nodeType: string, credentialsName: string; },
		) {
			if (['clientId', 'clientSecret'].includes(parameterName)) {
				return this.$t(`oauth2.${parameterName}`);
			}

			return this.translateSpecific({
				key: `${nodeType}.credentials.${credentialsName}.${parameterName}.displayName`,
				fallback: displayName,
			});
		},

		/**
		 * Translate a credentials property description, i.e. label tooltip in `CredentialsEdit.vue`.
		 */
		$translateCredentialsPropertyDescription(
			{ name: parameterName, description }: { name: string; description: string; },
			{ nodeType, credentialsName }: { nodeType: string, credentialsName: string; },
		) {
			return this.translateSpecific({
				key: `${nodeType}.credentials.${credentialsName}.${parameterName}.description`,
				fallback: description,
			});
		},

		// -----------------------------------------
		//     node- and creds-specific methods
		// -----------------------------------------

		/**
		 * Translate the placeholder inside the input field for a string-type parameter.
		 */
		$translatePlaceholder(
			{ name: parameterName, placeholder }: { name: string; placeholder: string; },
			isCredential = false,
			{ nodeType, credentialsName } = { nodeType: '', credentialsName: '' },
		) {
			const key = isCredential
				? `${nodeType}.credentials.${credentialsName}.placeholder`
				: `${this.activeNodeType}.parameters.${parameterName}.placeholder`;

			return this.translateSpecific({
				key,
				fallback: placeholder,
			});
		},

		/**
		 * Translate the name for an option in an `options` parameter,
		 * e.g. an option name in a "Resource" or "Operation" dropdown menu.
		 */
		$translateOptionsOptionName(
			{ name: parameterName }: { name: string },
			{ value: optionName, name: displayName }: { value: string; name: string; },
			isCredential = false,
			{ nodeType, credentialsName } = { nodeType: '', credentialsName: '' },
		) {
			const key = isCredential
				? `${nodeType}.credentials.${credentialsName}.options.${optionName}.displayName`
				: `${this.activeNodeType}.parameters.${parameterName}.options.${optionName}.displayName`;

			return this.translateSpecific({
				key,
				fallback: displayName,
			});
		},

		/**
		 * Translate the description for an option in an `options` parameter,
		 * e.g. an option name in a "Resource" or "Operation" dropdown menu.
		 */
		$translateOptionsOptionDescription(
			{ name: parameterName }: { name: string },
			{ value: optionName, description }: { value: string; description: string; },
			isCredential = false,
			{ nodeType, credentialsName } = { nodeType: '', credentialsName: '' },
		) {
			const key = isCredential
				? `${nodeType}.credentials.${credentialsName}.options.${optionName}.description`
				: `${this.activeNodeType}.parameters.${parameterName}.options.${optionName}.description`;

			return this.translateSpecific({
				key,
				fallback: description,
			});
		},
	},
});
