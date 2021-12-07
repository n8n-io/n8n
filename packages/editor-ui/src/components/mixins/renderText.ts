
import Vue from 'vue';

const REUSABLE_DYNAMIC_TEXT_KEY = 'reusableDynamicText';
const CREDENTIALS_MODAL_KEY = 'credentialsModal';
const NODE_VIEW_KEY = 'nodeView';

export const renderText = Vue.extend({
	methods: {
		$shortNodeType(longNodeType: string) {
			return longNodeType.replace('n8n-nodes-base.', '');
		},

		/**
		 * Render a string of base text, i.e. a string with a fixed path to the localized value in the base text object. Optionally allows for [interpolation](https://kazupon.github.io/vue-i18n/guide/formatting.html#named-formatting) when the localized value contains a string between curly braces.
		 */
		$baseText(
			key: string, options?: { interpolate: { [key: string]: string } },
		): string {
			return this.$t(key, options && options.interpolate).toString();
		},

		/**
		 * Render a string of dynamic header text, used in the nodes panel and in the node view.
		 */
		$headerText(arg: { key: string; fallback: string; }) {
			return this.__render(arg);
		},

		/**
		 * Render a string of dynamic text, i.e. a string with a constructed path to the localized value in the node text object - in the credentials modal (`$i18n2.credText`), in the node view (`$i18n2.nodeText`), or in the headers (`$i18n2.headerText`) in the nodes panel and node view. _Private method_, to be called only from within this mixin.
		 *
		 * Unlike in `$i18n2.baseText`, the fallback has to be set manually for dynamic text.
		 */
		__render(
			{ key, fallback }: { key: string; fallback: string; },
		) {
			return this.$te(key) ? this.$t(key).toString() : fallback;
		},
	},

	computed: {
		$credText () {
			const { credentialTextRenderKeys: keys } = this.$store.getters;
			const nodeType = keys ? keys.nodeType : '';
			const credentialType = keys ? keys.credentialType : '';
			const credentialPrefix = `${nodeType}.${CREDENTIALS_MODAL_KEY}.${credentialType}`;
			const context = this;

			return {

				/**
				 * Display name for a top-level parameter in the credentials modal.
				 */
				topParameterDisplayName(
					{ name: parameterName, displayName }: { name: string; displayName: string; },
				) {
					if (['clientId', 'clientSecret'].includes(parameterName)) {
						return context.__render({
							key: `${REUSABLE_DYNAMIC_TEXT_KEY}.oauth2.${parameterName}`,
							fallback: displayName,
						});
					}

					return context.__render({
						key: `${credentialPrefix}.${parameterName}.displayName`,
						fallback: displayName,
					});
				},

				/**
				 * Description for a top-level parameter in the credentials modal.
				 */
				topParameterDescription(
					{ name: parameterName, description }: { name: string; description: string; },
				) {
					return context.__render({
						key: `${credentialPrefix}.${parameterName}.description`,
						fallback: description,
					});
				},

				/**
				 * Display name for an option inside an `options` or `multiOptions` parameter in the credentials modal.
				 */
				optionsOptionDisplayName(
					{ name: parameterName }: { name: string; },
					{ value: optionName, name: displayName }: { value: string; name: string; },
				) {
					return context.__render({
						key: `${credentialPrefix}.${parameterName}.options.${optionName}.displayName`,
						fallback: displayName,
					});
				},

				/**
				 * Description for an option inside an `options` or `multiOptions` parameter in the credentials modal.
				 */
				optionsOptionDescription(
					{ name: parameterName }: { name: string; },
					{ value: optionName, description }: { value: string; description: string; },
				) {
					return context.__render({
						key: `${credentialPrefix}.${parameterName}.options.${optionName}.description`,
						fallback: description,
					});
				},

				/**
				 * Placeholder for a `string` or `collection` or `fixedCollection` parameter in the credentials modal.
				 * - For a `string` parameter, the placeholder is unselectable greyed-out sample text.
				 * - For a `collection` or `fixedCollection` parameter, the placeholder is the button text.
				 */
				placeholder(
					{ name: parameterName, displayName }: { name: string; displayName: string; },
				) {
					return context.__render({
						key: `${credentialPrefix}.${parameterName}.placeholder`,
						fallback: displayName,
					});
				},
			};
		},

		$nodeText () {
			const nodePrefix = `${this.$store.getters.activeNode.type}.${NODE_VIEW_KEY}`;
			const context = this;

			return {
				/**
				 * Display name for a top-level parameter in the node view.
				 */
				topParameterDisplayName(
					{ name: parameterName, displayName }: { name: string; displayName: string; },
				) {
					return context.__render({
						key: `${nodePrefix}.${parameterName}.displayName`,
						fallback: displayName,
					});
				},

				/**
				 * Description for a top-level parameter in the node view in the node view.
				 */
				topParameterDescription(
					{ name: parameterName, description }: { name: string; description: string; },
				) {
					return context.__render({
						key: `${nodePrefix}.${parameterName}.description`,
						fallback: description,
					});
				},

				/**
				 * Display name for an option inside a `collection` or `fixedCollection` parameter in the node view.
				 */
				collectionOptionDisplayName(
					{ name: parameterName }: { name: string; },
					{ name: optionName, displayName }: { name: string; displayName: string; },
				) {
					return context.__render({
						key: `${nodePrefix}.${parameterName}.options.${optionName}.displayName`,
						fallback: displayName,
					});
				},

				/**
				 * Display name for an option inside an `options` or `multiOptions` parameter in the node view.
				 */
				optionsOptionDisplayName(
					{ name: parameterName }: { name: string; },
					{ value: optionName, name: displayName }: { value: string; name: string; },
				) {
					return context.__render({
						key: `${nodePrefix}.${parameterName}.options.${optionName}.displayName`,
						fallback: displayName,
					});
				},

				/**
				 * Description for an option inside an `options` or `multiOptions` parameter in the node view.
				 */
				optionsOptionDescription(
					{ name: parameterName }: { name: string; },
					{ value: optionName, description }: { value: string; description: string; },
				) {
					return context.__render({
						key: `${nodePrefix}.${parameterName}.options.${optionName}.description`,
						fallback: description,
					});
				},

				/**
				 * Text for a button to add another option inside a `collection` or `fixedCollection` parameter having`multipleValues: true` in the node view.
				 */
				multipleValueButtonText(
					{ name: parameterName, typeOptions: { multipleValueButtonText } }:
					{ name: string; typeOptions: { multipleValueButtonText: string; } },
				) {
					return context.__render({
						key: `${nodePrefix}.${parameterName}.multipleValueButtonText`,
						fallback: multipleValueButtonText,
					});
				},

				/**
				 * Placeholder for a `string` or `collection` or `fixedCollection` parameter in the node view.
				 * - For a `string` parameter, the placeholder is unselectable greyed-out sample text.
				 * - For a `collection` or `fixedCollection` parameter, the placeholder is the button text.
				 */
				placeholder(
					{ name: parameterName, placeholder }: { name: string; placeholder: string; },
				) {
					return context.__render({
						key: `${nodePrefix}.${parameterName}.placeholder`,
						fallback: placeholder,
					});
				},
			};
		},
	},
});
