import Vue from 'vue';

export const translate = Vue.extend({
	data() {
		// TODO: State in mixin advisable?
		return {
			_isCredential: false,
			_nodeType: '',
			_credentialName: '',
		};
	},

	computed: {
		nodeType (): string {
			return this._isCredential
				? this._nodeType
				: this.$store.getters.activeNode.type;
		},
	},

	methods: {
		/**
		 * Initialize the `translate` mixin with credentials data.
		 */
		initTranslate(
			{ credentialName, isCredential, nodeType }:
			{ credentialName: string, isCredential: boolean, nodeType: string },
		) {
			this._credentialName = credentialName;
			this._isCredential = isCredential;
			this._nodeType = nodeType;
		},

		/**
		 * Translate the value at the translation key, or return a fallback.
		 */
		translate({ key, fallback }: { key: string, fallback: string }): string {
			return this.$te(key) ? this.$t(key).toString() : fallback;
		},

		// ----------------------------------
		//            node-only
		// ----------------------------------

		/**
		 * Translate a top-level node property name, i.e. leftmost parameter in `NodeView.vue`,
		 * including those visually nested inside collections.
		 */
		$translateNodePropertyName(
			{ name: parameterName, displayName }: { name: string; displayName: string; },
		) {
			return this.translate({
				key: `${this.nodeType}.parameters.${parameterName}.displayName`,
				fallback: displayName,
			});
		},


		// ----------------------------------
		//         credentials-only
		// ----------------------------------

		/**
		 * Translate a credentials property name, i.e. leftmost parameter in `CredentialsEdit.vue`.
		 */
		 $translateCredentialsPropertyName(
			{ name: parameterName, displayName }: { name: string; displayName: string; },
		) {
			return this.translate({
				key: `${this.nodeType}.credentials.${this._credentialName}.${parameterName}.displayName`,
				fallback: displayName,
			});
		},

		/**
		 * Translate a credentials property description, i.e. tooltip in `CredentialsEdit.vue`.
		 */
		$translateCredentialsPropertyDescription(
			{ name: parameterName, description }: { name: string; description: string; },
		) {
			return this.translate({
				key: `${this.nodeType}.credentials.${this._credentialName}.${parameterName}.description`,
				fallback: description,
			});
		},


		// ----------------------------------
		//    description, placeholder and
		//     option name & description
		// ----------------------------------

		/**
		 * Translate a top-level (node or credential) parameter description.
		 */
		 $translateDescription(
			{ name: parameterName, description }: { name: string; description: string; },
		) {
			const key = this._isCredential
				? `${this.nodeType}.credentials.${this._credentialName}.description`
				: `${this.nodeType}.parameters.${parameterName}.description`;

			return this.translate({
				key,
				fallback: description,
			});
		},

		/**
		 * Translate the placeholder inside the input field for a string-type parameter.
		 */
		$translatePlaceholder(
			{ name: parameterName, placeholder }: { name: string; placeholder: string; },
		) {
			const key = this._isCredential
				? `${this.nodeType}.credentials.${this._credentialName}.placeholder`
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
			const key = this._isCredential
				? `${this.nodeType}.credentials.${this._credentialName}.options.${optionName}.displayName`
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
			const key = this._isCredential
				? `${this.nodeType}.credentials.${this._credentialName}.options.${optionName}.description`
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
