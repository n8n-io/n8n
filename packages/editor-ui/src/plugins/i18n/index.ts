import _Vue from "vue";
import axios from 'axios';
import VueI18n from 'vue-i18n';
import { Store } from "vuex";
import Vue from 'vue';
import { INodeTranslationHeaders, IRootState } from '@/Interface';
import {
	deriveMiddleKey,
	isNestedInCollectionLike,
	normalize,
	insertOptionsAndValues,
} from "./utils";
import {
	locale,
} from 'n8n-design-system';

import englishBaseText from './locales/en.json';

Vue.use(VueI18n);
locale.use('en');

export let i18n: I18nClass;

export function I18nPlugin(vue: typeof _Vue, store: Store<IRootState>): void {
	i18n = new I18nClass(store);

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
		key: BaseTextKey,
		options?: { adjustToNumber?: number; interpolate?: { [key: string]: string } },
	): string {
		if (options && options.adjustToNumber) {
			return this.i18n.tc(key, options.adjustToNumber, options && options.interpolate).toString();
		}

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

	/**
	 * Render a string of header text (a node's name and description),
	 * used variously in the nodes panel, under the node icon, etc.
	 */
	headerText(arg: { key: string; fallback: string; }) {
		return this.dynamicRender(arg);
	}

	/**
	 * Namespace for methods to render text in the credentials details modal.
	 */
	credText () {
		const credentialType = this.$store.getters.activeCredentialType;
		const credentialPrefix = `n8n-nodes-base.credentials.${credentialType}`;
		const context = this;

		return {

			/**
			 * Display name for a top-level param.
			 */
			inputLabelDisplayName(
				{ name: parameterName, displayName }: { name: string; displayName: string; },
			) {
				if (['clientId', 'clientSecret'].includes(parameterName)) {
					return context.dynamicRender({
						key: `_reusableDynamicText.oauth2.${parameterName}`,
						fallback: displayName,
					});
				}

				return context.dynamicRender({
					key: `${credentialPrefix}.${parameterName}.displayName`,
					fallback: displayName,
				});
			},

			/**
			 * Hint for a top-level param.
			 */
			hint(
				{ name: parameterName, hint }: { name: string; hint?: string; },
			) {
				return context.dynamicRender({
					key: `${credentialPrefix}.${parameterName}.hint`,
					fallback: hint || '',
				});
			},

			/**
			 * Description (tooltip text) for an input label param.
			 */
			inputLabelDescription(
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
			 * Placeholder for a `string` param.
			 */
			placeholder(
				{ name: parameterName, placeholder }: { name: string; placeholder?: string; },
			) {
				return context.dynamicRender({
					key: `${credentialPrefix}.${parameterName}.placeholder`,
					fallback: placeholder || '',
				});
			},
		};
	}

	/**
	 * Namespace for methods to render text in the node details view,
	 * except for `eventTriggerDescription`.
	 */
	nodeText () {
		const activeNode = this.$store.getters.activeNode;
		const nodeType = activeNode ? this.shortNodeType(activeNode.type) : ''; // unused in eventTriggerDescription
		const initialKey = `n8n-nodes-base.nodes.${nodeType}.nodeView`;
		const context = this;

		return {
			/**
			 * Display name for an input label, whether top-level or nested.
			 */
			inputLabelDisplayName(
				parameter: { name: string; displayName: string; type: string },
				path: string,
			) {
				const middleKey = deriveMiddleKey(path, parameter);

				return context.dynamicRender({
					key: `${initialKey}.${middleKey}.displayName`,
					fallback: parameter.displayName,
				});
			},

			/**
			 * Description (tooltip text) for an input label, whether top-level or nested.
			 */
			inputLabelDescription(
				parameter: { name: string; description: string; type: string },
				path: string,
			) {
				const middleKey = deriveMiddleKey(path, parameter);

				return context.dynamicRender({
					key: `${initialKey}.${middleKey}.description`,
					fallback: parameter.description,
				});
			},

			/**
			 * Hint for an input, whether top-level or nested.
			 */
			hint(
				parameter: { name: string; hint: string; type: string },
				path: string,
			) {
				const middleKey = deriveMiddleKey(path, parameter);

				return context.dynamicRender({
					key: `${initialKey}.${middleKey}.hint`,
					fallback: parameter.hint,
				});
			},

			/**
			 * Placeholder for an input label or `collection` or `fixedCollection` param,
			 * whether top-level or nested.
			 * - For an input label, the placeholder is unselectable greyed-out sample text.
			 * - For a `collection` or `fixedCollection`, the placeholder is the button text.
			 */
			placeholder(
				parameter: { name: string; placeholder?: string; type: string },
				path: string,
			) {
				let middleKey = parameter.name;

				if (isNestedInCollectionLike(path)) {
					const pathSegments = normalize(path).split('.');
					middleKey = insertOptionsAndValues(pathSegments).join('.');
				}

				return context.dynamicRender({
					key: `${initialKey}.${middleKey}.placeholder`,
					fallback: parameter.placeholder || '',
				});
			},

			/**
			 * Display name for an option inside an `options` or `multiOptions` param,
			 * whether top-level or nested.
			 */
			optionsOptionDisplayName(
				parameter: { name: string; },
				{ value: optionName, name: displayName }: { value: string; name: string; },
				path: string,
			) {
				let middleKey = parameter.name;

				if (isNestedInCollectionLike(path)) {
					const pathSegments = normalize(path).split('.');
					middleKey = insertOptionsAndValues(pathSegments).join('.');
				}

				return context.dynamicRender({
					key: `${initialKey}.${middleKey}.options.${optionName}.displayName`,
					fallback: displayName,
				});
			},

			/**
			 * Description for an option inside an `options` or `multiOptions` param,
			 * whether top-level or nested.
			 */
			optionsOptionDescription(
				parameter: { name: string; },
				{ value: optionName, description }: { value: string; description: string; },
				path: string,
			) {
				let middleKey = parameter.name;

				if (isNestedInCollectionLike(path)) {
					const pathSegments = normalize(path).split('.');
					middleKey = insertOptionsAndValues(pathSegments).join('.');
				}

				return context.dynamicRender({
					key: `${initialKey}.${middleKey}.options.${optionName}.description`,
					fallback: description,
				});
			},

			/**
			 * Display name for an option in the dropdown menu of a `collection` or
			 * fixedCollection` param. No nesting support since `collection` cannot
			 * be nested in a `collection` or in a `fixedCollection`.
			 */
			collectionOptionDisplayName(
				parameter: { name: string; },
				{ name: optionName, displayName }: { name: string; displayName: string; },
				path: string,
			) {
				let middleKey = parameter.name;

				if (isNestedInCollectionLike(path)) {
					const pathSegments = normalize(path).split('.');
					middleKey = insertOptionsAndValues(pathSegments).join('.');
				}

				return context.dynamicRender({
					key: `${initialKey}.${middleKey}.options.${optionName}.displayName`,
					fallback: displayName,
				});
			},

			/**
			 * Text for a button to add another option inside a `collection` or
			 * `fixedCollection` param having `multipleValues: true`.
			 */
			multipleValueButtonText(
				{ name: parameterName, typeOptions: { multipleValueButtonText } }:
				{ name: string; typeOptions: { multipleValueButtonText: string; } },
			) {
				return context.dynamicRender({
					key: `${initialKey}.${parameterName}.multipleValueButtonText`,
					fallback: multipleValueButtonText,
				});
			},

			eventTriggerDescription(
				nodeType: string,
				eventTriggerDescription: string,
			) {
				return context.dynamicRender({
					key: `n8n-nodes-base.nodes.${nodeType}.nodeView.eventTriggerDescription`,
					fallback: eventTriggerDescription,
				});
			},
		};
	}
}

export const i18nInstance = new VueI18n({
	locale: 'en',
	fallbackLocale: 'en',
	messages: { en: englishBaseText },
	silentTranslationWarn: true,
});

locale.i18n((key: string, options?: {interpolate: object}) => i18nInstance.t(key, options && options.interpolate));

const loadedLanguages = ['en'];

function setLanguage(language: string) {
	i18nInstance.locale = language;
	axios.defaults.headers.common['Accept-Language'] = language;
	document!.querySelector('html')!.setAttribute('lang', language);

	// update n8n design system and element ui
	locale.use(language);

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

	const { numberFormats, ...rest } = (await import(`./locales/${language}.json`)).default;

	i18nInstance.setLocaleMessage(language, rest);

	if (numberFormats) {
		i18nInstance.setNumberFormat(language, numberFormats);
	}

	loadedLanguages.push(language);

	setLanguage(language);
}

/**
 * Add a node translation to the i18n instance's `messages` object.
 */
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

/**
 * Add a credential translation to the i18n instance's `messages` object.
 */
export function addCredentialTranslation(
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

/**
 * Add a node's header strings to the i18n instance's `messages` object.
 */
export function addHeaders(
	headers: INodeTranslationHeaders,
	language: string,
) {
	i18nInstance.setLocaleMessage(
		language,
		Object.assign(i18nInstance.messages[language], { headers }),
	);
}

// ----------------------------------
//             typings
// ----------------------------------

declare module 'vue/types/vue' {
	interface Vue {
		$locale: I18nClass;
	}
}

type GetBaseTextKey<T> = T extends `_${string}` ? never :  T;

export type BaseTextKey = GetBaseTextKey<keyof typeof englishBaseText>;

type GetCategoryName<T> = T extends `nodeCreator.categoryNames.${infer C}`
	? C
	: never;

export type CategoryName = GetCategoryName<keyof typeof englishBaseText>;
