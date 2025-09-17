/* eslint-disable @typescript-eslint/no-this-alias */
import type { INodeProperties, INodePropertyCollection, INodePropertyOptions } from 'n8n-workflow';
import { ref } from 'vue';
import { createI18n } from 'vue-i18n';

import englishBaseText from './locales/en.json';
import type { BaseTextKey, LocaleMessages, INodeTranslationHeaders } from './types';
import {
	deriveMiddleKey,
	isNestedInCollectionLike,
	normalize,
	insertOptionsAndValues,
} from './utils';

export type * from './types';

export const i18nInstance = createI18n({
	legacy: false,
	locale: 'en',
	fallbackLocale: 'en',
	messages: { en: englishBaseText },
	warnHtmlMessage: false,
});

// Reactive version to signal i18n message updates to Vue computations
export const i18nVersion = ref(0);

type BaseTextOptions = {
	adjustToNumber?: number;
	interpolate?: Record<string, string | number>;
};

export class I18nClass {
	private baseTextCache = new Map<string, string>();

	private get i18n() {
		return i18nInstance.global;
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

	get locale() {
		return i18nInstance.global.locale.value;
	}

	// ----------------------------------
	//        render methods
	// ----------------------------------

	/**
	 * Render a string of base text, i.e. a string with a fixed path to the localized value. Optionally allows for [interpolation](https://kazupon.github.io/vue-i18n/guide/formatting.html#named-formatting) when the localized value contains a string between curly braces.
	 */
	baseText(key: BaseTextKey, options?: BaseTextOptions): string {
		// Track reactive version so computed properties re-evaluate when messages change
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		i18nVersion.value;

		// Create a unique cache key, scoped by version
		const cacheKey = `${i18nVersion.value}|${key}-${JSON.stringify(options)}`;

		// Check if the result is already cached
		if (this.baseTextCache.has(cacheKey)) {
			return this.baseTextCache.get(cacheKey) ?? key;
		}

		const interpolate = { ...options?.interpolate };
		let result: string;
		if (options?.adjustToNumber !== undefined) {
			result = this.i18n.t(key, interpolate, options.adjustToNumber).toString();
		} else {
			result = this.i18n.t(key, interpolate).toString();
		}

		// Store the result in the cache
		this.baseTextCache.set(cacheKey, result);

		return result;
	}

	/**
	 * Clear cached baseText results. Useful when locale messages are updated at runtime (e.g. HMR) or locale changes.
	 */
	clearCache() {
		this.baseTextCache.clear();
		i18nVersion.value++;
	}

	/**
	 * Render a string of dynamic text, i.e. a string with a constructed path to the localized value.
	 */
	private dynamicRender({ key, fallback }: { key: string; fallback?: string }) {
		return this.i18n.te(key) ? this.i18n.t(key).toString() : (fallback ?? '');
	}

	displayTimer(msPassed: number, showMs = false): string {
		if (msPassed > 0 && msPassed < 1000 && showMs) {
			return `${msPassed}${this.baseText('genericHelpers.millis')}`;
		}

		const parts = [];
		const second = 1000;
		const minute = 60 * second;
		const hour = 60 * minute;

		let remainingMs = msPassed;

		if (remainingMs >= hour) {
			parts.push(`${Math.floor(remainingMs / hour)}${this.baseText('genericHelpers.hrsShort')}`);
			remainingMs = remainingMs % hour;
		}

		if (parts.length > 0 || remainingMs >= minute) {
			parts.push(`${Math.floor(remainingMs / minute)}${this.baseText('genericHelpers.minShort')}`);
			remainingMs = remainingMs % minute;
		}

		const remainingSec = showMs ? remainingMs / second : Math.floor(remainingMs / second);

		parts.push(`${remainingSec}${this.baseText('genericHelpers.secShort')}`);

		return parts.join(' ');
	}

	/**
	 * Render a string of header text (a node's name and description),
	 * used variously in the nodes panel, under the node icon, etc.
	 */
	headerText(arg: { key: string; fallback: string }) {
		return this.dynamicRender(arg);
	}

	/**
	 * Namespace for methods to render text in the credentials details modal.
	 */
	credText(credentialType: string | null) {
		const credentialPrefix = `n8n-nodes-base.credentials.${credentialType}`;
		const context = this;

		return {
			/**
			 * Display name for a top-level param.
			 */
			inputLabelDisplayName({ name: parameterName, displayName }: INodeProperties) {
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
			hint({ name: parameterName, hint }: INodeProperties) {
				return context.dynamicRender({
					key: `${credentialPrefix}.${parameterName}.hint`,
					fallback: hint,
				});
			},

			/**
			 * Description (tooltip text) for an input label param.
			 */
			inputLabelDescription({ name: parameterName, description }: INodeProperties) {
				return context.dynamicRender({
					key: `${credentialPrefix}.${parameterName}.description`,
					fallback: description,
				});
			},

			/**
			 * Display name for an option inside an `options` or `multiOptions` param.
			 */
			optionsOptionDisplayName(
				{ name: parameterName }: INodeProperties,
				{ value: optionName, name: displayName }: INodePropertyOptions,
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
				{ name: parameterName }: INodeProperties,
				{ value: optionName, description }: INodePropertyOptions,
			) {
				return context.dynamicRender({
					key: `${credentialPrefix}.${parameterName}.options.${optionName}.description`,
					fallback: description,
				});
			},

			/**
			 * Placeholder for a `string` param.
			 */
			placeholder({ name: parameterName, placeholder }: INodeProperties) {
				return context.dynamicRender({
					key: `${credentialPrefix}.${parameterName}.placeholder`,
					fallback: placeholder,
				});
			},
		};
	}

	/**
	 * Namespace for methods to render text in the node details view,
	 * except for `eventTriggerDescription`.
	 */
	nodeText(activeNodeType?: string | null) {
		const shortNodeType = activeNodeType ? this.shortNodeType(activeNodeType) : ''; // unused in eventTriggerDescription
		const initialKey = `n8n-nodes-base.nodes.${shortNodeType}.nodeView`;
		const context = this;

		return {
			/**
			 * Display name for an input label, whether top-level or nested.
			 */
			inputLabelDisplayName(parameter: INodeProperties | INodePropertyCollection, path: string) {
				const middleKey = deriveMiddleKey(path, parameter);

				return context.dynamicRender({
					key: `${initialKey}.${middleKey}.displayName`,
					fallback: parameter.displayName,
				});
			},

			/**
			 * Description (tooltip text) for an input label, whether top-level or nested.
			 */
			inputLabelDescription(parameter: INodeProperties, path: string) {
				const middleKey = deriveMiddleKey(path, parameter);

				return context.dynamicRender({
					key: `${initialKey}.${middleKey}.description`,
					fallback: parameter.description,
				});
			},

			/**
			 * Hint for an input, whether top-level or nested.
			 */
			hint(parameter: INodeProperties, path: string) {
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
			placeholder(parameter: INodeProperties, path: string) {
				let middleKey = parameter.name;

				if (isNestedInCollectionLike(path)) {
					const pathSegments = normalize(path).split('.');
					middleKey = insertOptionsAndValues(pathSegments).join('.');
				}

				return context.dynamicRender({
					key: `${initialKey}.${middleKey}.placeholder`,
					fallback: parameter.placeholder,
				});
			},

			/**
			 * Display name for an option inside an `options` or `multiOptions` param,
			 * whether top-level or nested.
			 */
			optionsOptionDisplayName(
				parameter: INodeProperties,
				{ value: optionName, name: displayName }: INodePropertyOptions,
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
				parameter: INodeProperties,
				{ value: optionName, description }: INodePropertyOptions,
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
				parameter: INodeProperties,
				{ name: optionName, displayName }: INodePropertyCollection,
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
			multipleValueButtonText({ name: parameterName, typeOptions }: INodeProperties) {
				return context.dynamicRender({
					key: `${initialKey}.${parameterName}.multipleValueButtonText`,
					fallback: typeOptions?.multipleValueButtonText,
				});
			},

			eventTriggerDescription(nodeType: string, eventTriggerDescription: string) {
				return context.dynamicRender({
					key: `n8n-nodes-base.nodes.${nodeType}.nodeView.eventTriggerDescription`,
					fallback: eventTriggerDescription,
				});
			},
		};
	}

	localizeNodeName(language: string, nodeName: string, type: string) {
		if (language === 'en') return nodeName;

		const nodeTypeName = this.shortNodeType(type);

		return this.headerText({
			key: `headers.${nodeTypeName}.displayName`,
			fallback: nodeName,
		});
	}

	autocompleteUIValues: Record<string, string | undefined> = {
		docLinkLabel: this.baseText('expressionEdit.learnMore'),
	};
}

const loadedLanguages: string[] = [];

export function setLanguage(locale: string) {
	i18nInstance.global.locale.value = locale as 'en';
	document.querySelector('html')!.setAttribute('lang', locale);

	// Invalidate cached baseText results on locale change
	i18n.clearCache();

	return locale;
}

export function loadLanguage(locale: string, messages: LocaleMessages) {
	if (loadedLanguages.includes(locale)) {
		return setLanguage(locale);
	}

	const { numberFormats, ...rest } = messages;

	i18nInstance.global.setLocaleMessage(locale, rest);

	if (numberFormats) {
		i18nInstance.global.setNumberFormat(locale, numberFormats);
	}

	loadedLanguages.push(locale);

	return setLanguage(locale);
}

/**
 * Add a node translation to the i18n instance's `messages` object.
 */
export function addNodeTranslation(
	nodeTranslation: { [nodeType: string]: object },
	language: string,
) {
	const newMessages = {
		'n8n-nodes-base': {
			nodes: nodeTranslation,
		},
	};

	i18nInstance.global.mergeLocaleMessage(language, newMessages);
}

/**
 * Dev/runtime helper to replace messages for a locale without import side-effects.
 * Used by editor UI HMR to apply updated translation JSON.
 */
export function updateLocaleMessages(locale: string, messages: LocaleMessages) {
	const { numberFormats, ...rest } = messages;

	i18nInstance.global.setLocaleMessage(locale, rest);
	if (numberFormats) i18nInstance.global.setNumberFormat(locale, numberFormats);

	// Ensure subsequent reads recompute
	i18n.clearCache();
}

/**
 * Add a credential translation to the i18n instance's `messages` object.
 */
export function addCredentialTranslation(
	nodeCredentialTranslation: { [credentialType: string]: object },
	language: string,
) {
	const newMessages = {
		'n8n-nodes-base': {
			credentials: nodeCredentialTranslation,
		},
	};

	i18nInstance.global.mergeLocaleMessage(language, newMessages);
}

/**
 * Add a node's header strings to the i18n instance's `messages` object.
 */
export function addHeaders(headers: INodeTranslationHeaders, language: string) {
	i18nInstance.global.mergeLocaleMessage(language, { headers });
}

export const i18n: I18nClass = new I18nClass();

export function useI18n() {
	return i18n;
}
