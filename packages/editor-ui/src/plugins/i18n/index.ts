import _Vue from "vue";
import axios from 'axios';
import VueI18n from 'vue-i18n';
import { Store } from "vuex";
import Vue from 'vue';
import { INodeTranslationHeaders, IRootState } from '@/Interface';
const englishBaseText = require('./locales/en');

Vue.use(VueI18n);

const REUSABLE_DYNAMIC_TEXT_KEY = 'reusableDynamicText';
const CREDENTIALS_MODAL_KEY = 'credentialsModal';
const NODE_VIEW_KEY = 'nodeView';

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

	number(value: number, options: VueI18n.FormattedNumberPartType) {
		return this.i18n.n(value, options);
	}

	shortNodeType(longNodeType: string) {
		return longNodeType.replace('n8n-nodes-base.', '');
	}

	// ----------------------------------
	//        render methods
	// ----------------------------------

	/**
	 * Render a string of base text, i.e. a string with a fixed path to the localized value in the base text object. Optionally allows for [interpolation](https://kazupon.github.io/vue-i18n/guide/formatting.html#named-formatting) when the localized value contains a string between curly braces.
	 */
	baseText(
		key: string, options?: { interpolate: { [key: string]: string } },
	): string {
		return this.i18n.t(key, options && options.interpolate).toString();
	}

	/**
	 * Render a string of dynamic text, i.e. a string with a constructed path to the localized value in the node text object, in the credentials modal, in the node view, or in the headers. Unlike in `baseText`, the fallback has to be set manually for dynamic text.
	 */
	private dynamicRender(
		{ key, fallback }: { key: string; fallback: string; },
	) {
		return this.i18n.te(key) ? this.i18n.t(key).toString() : fallback;
	}

	/**
	 * Render a string of dynamic header text, used in the nodes panel and in the node view.
	 */
	headerText(arg: { key: string; fallback: string; }) {
		return this.dynamicRender(arg);
	}

	credText () {
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
					return context.dynamicRender({
						key: `${REUSABLE_DYNAMIC_TEXT_KEY}.oauth2.${parameterName}`,
						fallback: displayName,
					});
				}

				return context.dynamicRender({
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
				return context.dynamicRender({
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
				return context.dynamicRender({
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
				return context.dynamicRender({
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
				return context.dynamicRender({
					key: `${credentialPrefix}.${parameterName}.placeholder`,
					fallback: displayName,
				});
			},
		};
	}

	nodeText () {
		const type = this.$store.getters.activeNode.type;
		const nodePrefix = `${type}.${NODE_VIEW_KEY}`;
		const context = this;

		return {
			/**
			 * Display name for a top-level parameter in the node view.
			 */
			topParameterDisplayName(
				{ name: parameterName, displayName }: { name: string; displayName: string; },
			) {
				return context.dynamicRender({
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
				return context.dynamicRender({
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
				return context.dynamicRender({
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
				return context.dynamicRender({
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
				return context.dynamicRender({
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
				return context.dynamicRender({
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
				return context.dynamicRender({
					key: `${nodePrefix}.${parameterName}.placeholder`,
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
	nodeTranslation: { [key: string]: object },
	language: string,
) {
	const newNodesBase = {
		'n8n-nodes-base': Object.assign(
			i18nInstance.messages[language]['n8n-nodes-base'] || {},
			nodeTranslation,
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