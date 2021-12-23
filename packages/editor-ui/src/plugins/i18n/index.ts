import _Vue from "vue";
import axios from 'axios';
import VueI18n from 'vue-i18n';
import { Store } from "vuex";
import Vue from 'vue';
import { INodeTranslationHeaders, IRootState } from '@/Interface';
import {
	isForCollection,
	isForFixedCollection,
	toSectionTitleKey,
	toFixedCollectionKey,
	toCollectionKey,
} from "./utils";

const englishBaseText = require('./locales/en');

Vue.use(VueI18n);

export function I18nPlugin(vue: typeof _Vue, store: Store<IRootState>): void {
	const i18n = new I18nClass(store);

	Object.defineProperty(vue, '$locale', {
		get() { return i18n; },
	});

	Object.defineProperty(vue.prototype, '$locale', {
		get() { return i18n; },
	});
}

export class I18nClass {
	$store: Store<IRootState>;

	constructor(store: Store<IRootState>) {
		this.$store = store;
	}

	private get i18n(): VueI18n {
		return i18nInstance;
	}

	// ----------------------------------
	//         helper methods
	// ----------------------------------

	exists(key: string) {
		return this.i18n.te(key);
	}

	shortNodeType(longNodeType: string) {
		return longNodeType.replace('n8n-nodes-base.', '');
	}

	// ----------------------------------
	//        render methods
	// ----------------------------------

	/**
	 * Render a string of base text, i.e. a string with a fixed path to the localized value. Optionally allows for [interpolation](https://kazupon.github.io/vue-i18n/guide/formatting.html#named-formatting) when the localized value contains a string between curly braces.
	 */
	baseText(
		key: string,
		options?: { interpolate: { [key: string]: string } },
	): string {
		return this.i18n.t(key, options && options.interpolate).toString();
	}

	/**
	 * Render a string of dynamic text, i.e. a string with a constructed path to the localized value.
	 */
	private dynamicRender(
		{ key, fallback }: { key: string; fallback: string; },
	) {
		return this.i18n.te(key) ? this.i18n.t(key).toString() : fallback;
	}

	headerText(arg: { key: string; fallback: string; }) {
		return this.dynamicRender(arg);
	}

	/**
	 * Namespace for methods to render text in the credentials modal.
	 */
	credText () {
		const credentialType = this.$store.getters.activeCredentialType;
		const credentialPrefix = `n8n-nodes-base.credentials.${credentialType}`;
		const context = this;

		return {

			/**
			 * Display name for a top-level param.
			 */
			topParameterDisplayName(
				{ name: parameterName, displayName }: { name: string; displayName: string; },
			) {
				if (['clientId', 'clientSecret'].includes(parameterName)) {
					return context.dynamicRender({
						key: `reusableDynamicText.oauth2.${parameterName}`,
						fallback: displayName,
					});
				}

				return context.dynamicRender({
					key: `${credentialPrefix}.${parameterName}.displayName`,
					fallback: displayName,
				});
			},

			/**
			 * Description for a top-level param.
			 */
			topParameterDescription(
				{ name: parameterName, description }: { name: string; description: string; },
			) {
				return context.dynamicRender({
					key: `${credentialPrefix}.${parameterName}.description`,
					fallback: description,
				});
			},

			/**
			 * Display name for an option inside an `options` or `multiOptions` param.
			 */
			optionsOptionDisplayName(
				{ name: parameterName }: { name: string; },
				{ value: optionName, name: displayName }: { value: string; name: string; },
			) {
				return context.dynamicRender({
					key: `${credentialPrefix}.${parameterName}.options.${optionName}.displayName`,
					fallback: displayName,
				});
			},

			/**
			 * Description for an option inside an `options` or `multiOptions` param.
			 */
			optionsOptionDescription(
				{ name: parameterName }: { name: string; },
				{ value: optionName, description }: { value: string; description: string; },
			) {
				return context.dynamicRender({
					key: `${credentialPrefix}.${parameterName}.options.${optionName}.description`,
					fallback: description,
				});
			},

			/**
			 * Placeholder for a `string` or `collection` or `fixedCollection` param.
			 * - For a `string` parameter, the placeholder is unselectable greyed-out sample text.
			 * - For a `collection` or `fixedCollection` parameter, the placeholder is the button text.
			 */
			placeholder(
				{ name: parameterName, displayName }: { name: string; displayName: string; },
			) {
				return context.dynamicRender({
					key: `${credentialPrefix}.${parameterName}.placeholder`,
					fallback: displayName,
				});
			},
		};
	}

	/**
	 * Namespace for methods to render text in the node view.
	 */
	nodeText () {
		const nodeType = this.shortNodeType(this.$store.getters.activeNode.type);
		const nodePrefix = `n8n-nodes-base.nodes.${nodeType}.nodeView`;
		const context = this;

		return {
			/**
			 * Display name for a top-level param.
			 */
			topParameterDisplayName(
				{ name: parameterName, displayName }: { name: string; displayName: string; },
				path?: string,
				{ isSectionTitle } = { isSectionTitle: false },
			) {
				let middleKey = parameterName;

				if (isSectionTitle) {
					middleKey = toSectionTitleKey(path!, parameterName);
				} else if (isForFixedCollection(path)) {
					middleKey = toFixedCollectionKey(path);
				} else if (isForCollection(path)) {
					middleKey = toCollectionKey(path);
				}

				return context.dynamicRender({
					key: `${nodePrefix}.${middleKey}.displayName`,
					fallback: displayName,
				});
			},

			/**
			 * Description for a top-level parameter.
			 */
			topParameterDescription(
				{ name: parameterName, description }: { name: string; description: string; },
				path?: string,
			) {
				let middleKey = parameterName;

				if (isForFixedCollection(path)) {
					middleKey = toFixedCollectionKey(path);
				} else if (isForCollection(path)) {
					middleKey = toCollectionKey(path);
				}

				return context.dynamicRender({
					key: `${nodePrefix}.${middleKey}.description`,
					fallback: description,
				});
			},

			/**
			 * Display name for an option inside a `collection` or `fixedCollection` param.
			 */
			collectionOptionDisplayName(
				{ name: parameterName }: { name: string; },
				{ name: optionName, displayName }: { name: string; displayName: string; },
			) {
				return context.dynamicRender({
					key: `${nodePrefix}.${parameterName}.options.${optionName}.displayName`,
					fallback: displayName,
				});
			},

			/**
			 * Display name for an option inside an `options` or `multiOptions` param.
			 */
			optionsOptionDisplayName(
				{ name: parameterName }: { name: string; },
				{ value: optionName, name: displayName }: { value: string; name: string; },
			) {
				return context.dynamicRender({
					key: `${nodePrefix}.${parameterName}.options.${optionName}.displayName`,
					fallback: displayName,
				});
			},

			/**
			 * Description for an option inside an `options` or `multiOptions` param.
			 */
			optionsOptionDescription(
				{ name: parameterName }: { name: string; },
				{ value: optionName, description }: { value: string; description: string; },
			) {
				return context.dynamicRender({
					key: `${nodePrefix}.${parameterName}.options.${optionName}.description`,
					fallback: description,
				});
			},

			/**
			 * Text for a button to add another option inside a `collection` or `fixedCollection` param having `multipleValues: true`.
			 */
			multipleValueButtonText(
				{ name: parameterName, typeOptions: { multipleValueButtonText } }:
				{ name: string; typeOptions: { multipleValueButtonText: string; } },
			) {
				return context.dynamicRender({
					key: `${nodePrefix}.${parameterName}.multipleValueButtonText`,
					fallback: multipleValueButtonText,
				});
			},

			/**
			 * Placeholder for a `string` or `collection` or `fixedCollection` param.
			 * - For a `string` parameter, the placeholder is unselectable greyed-out sample text.
			 * - For a `collection` or `fixedCollection` parameter, the placeholder is the button text.
			 */
			placeholder(
				{ name: parameterName, placeholder }: { name: string; placeholder: string; },
				path?: string,
			) {
				let middleKey = parameterName;

				if (isForFixedCollection(path)) {
					middleKey = toFixedCollectionKey(path);
				} else if (isForCollection(path)) {
					middleKey = toCollectionKey(path);
				}

				return context.dynamicRender({
					key: `${nodePrefix}.${middleKey}.placeholder`,
					fallback: placeholder,
				});
			},
		};
	}
}

const i18nInstance = new VueI18n({
	locale: 'en',
	fallbackLocale: 'en',
	messages: { en: englishBaseText },
	silentTranslationWarn: true,
});

const loadedLanguages = ['en'];

function setLanguage(language: string) {
	i18nInstance.locale = language;
	axios.defaults.headers.common['Accept-Language'] = language;
	document!.querySelector('html')!.setAttribute('lang', language);

	return language;
}

export async function loadLanguage(language?: string) {
	if (!language) return Promise.resolve();

	if (i18nInstance.locale === language) {
		return Promise.resolve(setLanguage(language));
	}

	if (loadedLanguages.includes(language)) {
		return Promise.resolve(setLanguage(language));
	}

	const { numberFormats, ...rest } = require(`./locales/${language}.json`);

	i18nInstance.setLocaleMessage(language, rest);

	if (numberFormats) {
		i18nInstance.setNumberFormat(language, numberFormats);
	}

	loadedLanguages.push(language);

	setLanguage(language);
}

export function addNodeTranslation(
	nodeTranslation: { [nodeType: string]: object },
	language: string,
) {
	const oldNodesBase = i18nInstance.messages[language]['n8n-nodes-base'] || {};

	const updatedNodes = {
		// @ts-ignore
		...oldNodesBase.nodes,
		...nodeTranslation,
	};

	const newNodesBase = {
		'n8n-nodes-base': Object.assign(
			oldNodesBase,
			{ nodes: updatedNodes },
		),
	};

	i18nInstance.setLocaleMessage(
		language,
		Object.assign(i18nInstance.messages[language], newNodesBase),
	);
}

export function addNodeCredentialTranslation(
	nodeCredentialTranslation: { [credentialType: string]: object },
	language: string,
) {
	const oldNodesBase = i18nInstance.messages[language]['n8n-nodes-base'] || {};

	const updatedCredentials = {
		// @ts-ignore
		...oldNodesBase.credentials,
		...nodeCredentialTranslation,
	};

	const newNodesBase = {
		'n8n-nodes-base': Object.assign(
			oldNodesBase,
			{ credentials: updatedCredentials },
		),
	};

	i18nInstance.setLocaleMessage(
		language,
		Object.assign(i18nInstance.messages[language], newNodesBase),
	);
}

export function addHeaders(
	headers: INodeTranslationHeaders,
	language: string,
) {
	i18nInstance.setLocaleMessage(
		language,
		Object.assign(i18nInstance.messages[language], { headers }),
	);
}
