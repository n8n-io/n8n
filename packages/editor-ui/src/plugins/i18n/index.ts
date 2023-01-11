import Vue from 'vue';
import axios from 'axios';
import VueI18n from 'vue-i18n';
import { INodeTranslationHeaders, IRootState } from '@/Interface';
import {
	deriveMiddleKey,
	isNestedInCollectionLike,
	normalize,
	insertOptionsAndValues,
} from './utils';
import { locale } from 'n8n-design-system';

import englishBaseText from './locales/en.json';
import { useUIStore } from '@/stores/ui';
import { useNDVStore } from '@/stores/ndv';
import { INodeProperties, INodePropertyCollection, INodePropertyOptions } from 'n8n-workflow';

Vue.use(VueI18n);
locale.use('en');

export let i18n: I18nClass;

export function I18nPlugin(vue: typeof Vue): void {
	i18n = new I18nClass();

	Object.defineProperty(vue, '$locale', {
		get() {
			return i18n;
		},
	});

	Object.defineProperty(vue.prototype, '$locale', {
		get() {
			return i18n;
		},
	});
}

export class I18nClass {
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
	private dynamicRender({ key, fallback }: { key: string; fallback?: string }) {
		return this.i18n.te(key) ? this.i18n.t(key).toString() : fallback ?? '';
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
	credText() {
		const uiStore = useUIStore();
		const credentialType = uiStore.activeCredentialType;
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
	nodeText() {
		const ndvStore = useNDVStore();
		const activeNode = ndvStore.activeNode;
		const nodeType = activeNode ? this.shortNodeType(activeNode.type as string) : ''; // unused in eventTriggerDescription
		const initialKey = `n8n-nodes-base.nodes.${nodeType}.nodeView`;
		const context = this;

		return {
			/**
			 * Display name for an input label, whether top-level or nested.
			 */
			inputLabelDisplayName(parameter: INodeProperties, path: string) {
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

	rootVars: Record<string, string | undefined> = {
		$binary: this.baseText('codeNodeEditor.completer.binary'),
		$execution: this.baseText('codeNodeEditor.completer.$execution'),
		$input: this.baseText('codeNodeEditor.completer.$input'),
		'$jmespath()': this.baseText('codeNodeEditor.completer.$jmespath'),
		$json: this.baseText('codeNodeEditor.completer.json'),
		$itemIndex: this.baseText('codeNodeEditor.completer.$itemIndex'),
		$now: this.baseText('codeNodeEditor.completer.$now'),
		$prevNode: this.baseText('codeNodeEditor.completer.$prevNode'),
		$runIndex: this.baseText('codeNodeEditor.completer.$runIndex'),
		$today: this.baseText('codeNodeEditor.completer.$today'),
		$workflow: this.baseText('codeNodeEditor.completer.$workflow'),
	};

	proxyVars: Record<string, string | undefined> = {
		'$input.all': this.baseText('codeNodeEditor.completer.$input.all'),
		'$input.first': this.baseText('codeNodeEditor.completer.$input.first'),
		'$input.item': this.baseText('codeNodeEditor.completer.$input.item'),
		'$input.last': this.baseText('codeNodeEditor.completer.$input.last'),

		'$().all': this.baseText('codeNodeEditor.completer.selector.all'),
		'$().context': this.baseText('codeNodeEditor.completer.selector.context'),
		'$().first': this.baseText('codeNodeEditor.completer.selector.first'),
		'$().item': this.baseText('codeNodeEditor.completer.selector.item'),
		'$().itemMatching': this.baseText('codeNodeEditor.completer.selector.itemMatching'),
		'$().last': this.baseText('codeNodeEditor.completer.selector.last'),
		'$().params': this.baseText('codeNodeEditor.completer.selector.params'),

		'$prevNode.name': this.baseText('codeNodeEditor.completer.$prevNode.name'),
		'$prevNode.outputIndex': this.baseText('codeNodeEditor.completer.$prevNode.outputIndex'),
		'$prevNode.runIndex': this.baseText('codeNodeEditor.completer.$prevNode.runIndex'),

		'$execution.id': this.baseText('codeNodeEditor.completer.$workflow.id'),
		'$execution.mode': this.baseText('codeNodeEditor.completer.$execution.mode'),
		'$execution.resumeUrl': this.baseText('codeNodeEditor.completer.$execution.resumeUrl'),

		'$workflow.active': this.baseText('codeNodeEditor.completer.$workflow.active'),
		'$workflow.id': this.baseText('codeNodeEditor.completer.$workflow.id'),
		'$workflow.name': this.baseText('codeNodeEditor.completer.$workflow.name'),
	};

	luxonInstance: Record<string, string | undefined> = {
		// getters
		isValid: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.isValid'),
		invalidReason: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.invalidReason'),
		invalidExplanation: this.baseText(
			'codeNodeEditor.completer.luxon.instanceMethods.invalidExplanation',
		),
		locale: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.locale'),
		numberingSystem: this.baseText(
			'codeNodeEditor.completer.luxon.instanceMethods.numberingSystem',
		),
		outputCalendar: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.outputCalendar'),
		zone: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.zone'),
		zoneName: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.zoneName'),
		year: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.year'),
		quarter: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.quarter'),
		month: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.month'),
		day: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.day'),
		hour: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.hour'),
		minute: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.minute'),
		second: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.second'),
		millisecond: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.millisecond'),
		weekYear: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.weekYear'),
		weekNumber: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.weekNumber'),
		weekday: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.weekday'),
		ordinal: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.ordinal'),
		monthShort: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.monthShort'),
		monthLong: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.monthLong'),
		weekdayShort: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.weekdayShort'),
		weekdayLong: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.weekdayLong'),
		offset: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.offset'),
		offsetNumber: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.offsetNumber'),
		offsetNameShort: this.baseText(
			'codeNodeEditor.completer.luxon.instanceMethods.offsetNameShort',
		),
		offsetNameLong: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.offsetNameLong'),
		isOffsetFixed: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.isOffsetFixed'),
		isInDST: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.isInDST'),
		isInLeapYear: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.isInLeapYear'),
		daysInMonth: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.daysInMonth'),
		daysInYear: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.daysInYear'),
		weeksInWeekYear: this.baseText(
			'codeNodeEditor.completer.luxon.instanceMethods.weeksInWeekYear',
		),

		// methods
		toUTC: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toUTC'),
		toLocal: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toLocal'),
		setZone: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.setZone'),
		setLocale: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.setLocale'),
		set: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.set'),
		plus: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.plus'),
		minus: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.minus'),
		startOf: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.startOf'),
		endOf: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.endOf'),
		toFormat: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toFormat'),
		toLocaleString: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toLocaleString'),
		toLocaleParts: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toLocaleParts'),
		toISO: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toISO'),
		toISODate: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toISODate'),
		toISOWeekDate: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toISOWeekDate'),
		toISOTime: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toISOTime'),
		toRFC2822: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toRFC2822'),
		toHTTP: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toHTTP'),
		toSQLDate: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toSQLDate'),
		toSQLTime: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toSQLTime'),
		toSQL: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toSQL'),
		toString: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toString'),
		valueOf: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.valueOf'),
		toMillis: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toMillis'),
		toSeconds: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toSeconds'),
		toUnixInteger: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toUnixInteger'),
		toJSON: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toJSON'),
		toBSON: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toBSON'),
		toObject: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toObject'),
		toJsDate: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toJsDate'),
		diff: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.diff'),
		diffNow: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.diffNow'),
		until: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.until'),
		hasSame: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.hasSame'),
		equals: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.equals'),
		toRelative: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toRelative'),
		toRelativeCalendar: this.baseText(
			'codeNodeEditor.completer.luxon.instanceMethods.toRelativeCalendar',
		),
		min: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.min'),
		max: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.max'),
	};

	luxonStatic: Record<string, string | undefined> = {
		now: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.now'),
		local: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.local'),
		utc: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.utc'),
		fromJSDate: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromJSDate'),
		fromMillis: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromMillis'),
		fromSeconds: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromSeconds'),
		fromObject: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromObject'),
		fromISO: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromISO'),
		fromRFC2822: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromRFC2822'),
		fromHTTP: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromHTTP'),
		fromFormat: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromFormat'),
		fromSQL: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromSQL'),
		invalid: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.invalid'),
		isDateTime: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.isDateTime'),
	};
}

export const i18nInstance = new VueI18n({
	locale: 'en',
	fallbackLocale: 'en',
	messages: { en: englishBaseText },
	silentTranslationWarn: true,
});

locale.i18n((key: string, options?: { interpolate: object }) =>
	i18nInstance.t(key, options && options.interpolate),
);

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
		'n8n-nodes-base': Object.assign(oldNodesBase, { nodes: updatedNodes }),
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
		'n8n-nodes-base': Object.assign(oldNodesBase, { credentials: updatedCredentials }),
	};

	i18nInstance.setLocaleMessage(
		language,
		Object.assign(i18nInstance.messages[language], newNodesBase),
	);
}

/**
 * Add a node's header strings to the i18n instance's `messages` object.
 */
export function addHeaders(headers: INodeTranslationHeaders, language: string) {
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

type GetBaseTextKey<T> = T extends `_${string}` ? never : T;

export type BaseTextKey = GetBaseTextKey<keyof typeof englishBaseText>;

type GetCategoryName<T> = T extends `nodeCreator.categoryNames.${infer C}` ? C : never;

export type CategoryName = GetCategoryName<keyof typeof englishBaseText>;
