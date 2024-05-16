import type { Plugin } from 'vue';
import axios from 'axios';
import { createI18n } from 'vue-i18n';
import { locale } from 'n8n-design-system';
import type { INodeProperties, INodePropertyCollection, INodePropertyOptions } from 'n8n-workflow';

import type { INodeTranslationHeaders } from '@/Interface';
import { useUIStore } from '@/stores/ui.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import englishBaseText from './locales/en.json';
import {
	deriveMiddleKey,
	isNestedInCollectionLike,
	normalize,
	insertOptionsAndValues,
} from './utils';

export const i18nInstance = createI18n({
	locale: 'en',
	fallbackLocale: 'en',
	messages: { en: englishBaseText },
});

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
		// Create a unique cache key
		const cacheKey = `${key}-${JSON.stringify(options)}`;

		// Check if the result is already cached
		if (this.baseTextCache.has(cacheKey)) {
			return this.baseTextCache.get(cacheKey) ?? key;
		}

		let result: string;
		if (options?.adjustToNumber !== undefined) {
			result = this.i18n.tc(key, options.adjustToNumber, options?.interpolate ?? {}).toString();
		} else {
			result = this.i18n.t(key, options?.interpolate ?? {}).toString();
		}

		// Store the result in the cache
		this.baseTextCache.set(cacheKey, result);

		return result;
	}

	/**
	 * Render a string of dynamic text, i.e. a string with a constructed path to the localized value.
	 */
	private dynamicRender({ key, fallback }: { key: string; fallback?: string }) {
		return this.i18n.te(key) ? this.i18n.t(key).toString() : fallback ?? '';
	}

	displayTimer(msPassed: number, showMs = false): string {
		if (msPassed < 60000) {
			if (!showMs) {
				return `${Math.floor(msPassed / 1000)}${this.baseText('genericHelpers.secShort')}`;
			}

			return `${msPassed / 1000}${this.baseText('genericHelpers.secShort')}`;
		}

		const secondsPassed = Math.floor(msPassed / 1000);
		const minutesPassed = Math.floor(secondsPassed / 60);
		const secondsLeft = (secondsPassed - minutesPassed * 60).toString().padStart(2, '0');

		return `${minutesPassed}:${secondsLeft}${this.baseText('genericHelpers.minShort')}`;
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
		const nodeType = activeNode ? this.shortNodeType(activeNode.type) : ''; // unused in eventTriggerDescription
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

	localizeNodeName(nodeName: string, type: string) {
		const isEnglishLocale = useRootStore().defaultLocale === 'en';

		if (isEnglishLocale) return nodeName;

		const nodeTypeName = this.shortNodeType(type);

		return this.headerText({
			key: `headers.${nodeTypeName}.displayName`,
			fallback: nodeName,
		});
	}

	rootVars = {
		$binary: this.baseText('codeNodeEditor.completer.binary'),
		$execution: this.baseText('codeNodeEditor.completer.$execution'),
		$ifEmpty: this.baseText('codeNodeEditor.completer.$ifEmpty'),
		$input: this.baseText('codeNodeEditor.completer.$input'),
		$jmespath: this.baseText('codeNodeEditor.completer.$jmespath'),
		$json: this.baseText('codeNodeEditor.completer.json'),
		$itemIndex: this.baseText('codeNodeEditor.completer.$itemIndex'),
		$now: this.baseText('codeNodeEditor.completer.$now'),
		$parameter: this.baseText('codeNodeEditor.completer.$parameter'),
		$prevNode: this.baseText('codeNodeEditor.completer.$prevNode'),
		$if: this.baseText('codeNodeEditor.completer.$if'),
		$max: this.baseText('codeNodeEditor.completer.$max'),
		$min: this.baseText('codeNodeEditor.completer.$min'),
		$runIndex: this.baseText('codeNodeEditor.completer.$runIndex'),
		$today: this.baseText('codeNodeEditor.completer.$today'),
		$vars: this.baseText('codeNodeEditor.completer.$vars'),
		$workflow: this.baseText('codeNodeEditor.completer.$workflow'),
		DateTime: this.baseText('codeNodeEditor.completer.dateTime'),
		$request: this.baseText('codeNodeEditor.completer.$request'),
		$response: this.baseText('codeNodeEditor.completer.$response'),
		$pageCount: this.baseText('codeNodeEditor.completer.$pageCount'),
		$nodeVersion: this.baseText('codeNodeEditor.completer.$nodeVersion'),
	} as const satisfies Record<string, string | undefined>;

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
		'$().isExecuted': this.baseText('codeNodeEditor.completer.selector.isExecuted'),

		'$prevNode.name': this.baseText('codeNodeEditor.completer.$prevNode.name'),
		'$prevNode.outputIndex': this.baseText('codeNodeEditor.completer.$prevNode.outputIndex'),
		'$prevNode.runIndex': this.baseText('codeNodeEditor.completer.$prevNode.runIndex'),

		'$execution.id': this.baseText('codeNodeEditor.completer.$workflow.id'),
		'$execution.mode': this.baseText('codeNodeEditor.completer.$execution.mode'),
		'$execution.resumeUrl': this.baseText('codeNodeEditor.completer.$execution.resumeUrl'),
		'$execution.resumeFormUrl': this.baseText('codeNodeEditor.completer.$execution.resumeFormUrl'),

		'$workflow.active': this.baseText('codeNodeEditor.completer.$workflow.active'),
		'$workflow.id': this.baseText('codeNodeEditor.completer.$workflow.id'),
		'$workflow.name': this.baseText('codeNodeEditor.completer.$workflow.name'),
	};

	globalObject: Record<string, string | undefined> = {
		assign: this.baseText('codeNodeEditor.completer.globalObject.assign'),
		entries: this.baseText('codeNodeEditor.completer.globalObject.entries'),
		keys: this.baseText('codeNodeEditor.completer.globalObject.keys'),
		values: this.baseText('codeNodeEditor.completer.globalObject.values'),
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
		toJSDate: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.toJsDate'),
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
		reconfigure: this.baseText('codeNodeEditor.completer.luxon.instanceMethods.reconfigure'),
		resolvedLocaleOptions: this.baseText(
			'codeNodeEditor.completer.luxon.instanceMethods.resolvedLocaleOptions',
		),
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
		expandFormat: this.baseText(
			'codeNodeEditor.completer.luxon.dateTimeStaticMethods.expandFormat',
		),
		fromFormatExplain: this.baseText(
			'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromFormatExplain',
		),
		fromString: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromString'),
		fromStringExplain: this.baseText(
			'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromStringExplain',
		),
		max: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.max'),
		min: this.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.min'),
		parseFormatForOpts: this.baseText(
			'codeNodeEditor.completer.luxon.dateTimeStaticMethods.parseFormatForOpts',
		),
	};

	autocompleteUIValues: Record<string, string | undefined> = {
		docLinkLabel: this.baseText('expressionEdit.learnMore'),
	};
}

const loadedLanguages = ['en'];

async function setLanguage(language: string) {
	i18nInstance.global.locale = language as 'en';
	axios.defaults.headers.common['Accept-Language'] = language;
	document!.querySelector('html')!.setAttribute('lang', language);

	// update n8n design system and element ui
	await locale.use(language);

	return language;
}

export async function loadLanguage(language?: string) {
	if (!language) return;

	if (i18nInstance.global.locale === language) {
		return await setLanguage(language);
	}

	if (loadedLanguages.includes(language)) {
		return await setLanguage(language);
	}

	const { numberFormats, ...rest } = (await import(`./locales/${language}.json`)).default;

	i18nInstance.global.setLocaleMessage(language, rest);

	if (numberFormats) {
		i18nInstance.global.setNumberFormat(language, numberFormats);
	}

	loadedLanguages.push(language);

	return await setLanguage(language);
}

/**
 * Add a node translation to the i18n instance's `messages` object.
 */
export function addNodeTranslation(
	nodeTranslation: { [nodeType: string]: object },
	language: string,
) {
	const oldNodesBase = i18nInstance.global.messages[language]['n8n-nodes-base'] || {};

	const updatedNodes = {
		// @ts-ignore
		...oldNodesBase.nodes,
		...nodeTranslation,
	};

	const newNodesBase = {
		'n8n-nodes-base': Object.assign(oldNodesBase, { nodes: updatedNodes }),
	};

	i18nInstance.global.setLocaleMessage(
		language,
		Object.assign(i18nInstance.global.messages[language], newNodesBase),
	);
}

/**
 * Add a credential translation to the i18n instance's `messages` object.
 */
export function addCredentialTranslation(
	nodeCredentialTranslation: { [credentialType: string]: object },
	language: string,
) {
	const oldNodesBase = i18nInstance.global.messages[language]['n8n-nodes-base'] || {};

	const updatedCredentials = {
		// @ts-ignore
		...oldNodesBase.credentials,
		...nodeCredentialTranslation,
	};

	const newNodesBase = {
		'n8n-nodes-base': Object.assign(oldNodesBase, { credentials: updatedCredentials }),
	};

	i18nInstance.global.setLocaleMessage(
		language,
		Object.assign(i18nInstance.global.messages[language], newNodesBase),
	);
}

/**
 * Add a node's header strings to the i18n instance's `messages` object.
 */
export function addHeaders(headers: INodeTranslationHeaders, language: string) {
	i18nInstance.global.setLocaleMessage(
		language,
		Object.assign(i18nInstance.global.messages[language], { headers }),
	);
}

export const i18n: I18nClass = new I18nClass();

export const I18nPlugin: Plugin<{}> = {
	async install(app) {
		locale.i18n((key: string, options?: { interpolate: Record<string, unknown> }) =>
			i18nInstance.global.t(key, options?.interpolate || {}),
		);

		app.config.globalProperties.$locale = i18n;

		await locale.use('en');
	},
};

// ----------------------------------
//             typings
// ----------------------------------

type GetBaseTextKey<T> = T extends `_${string}` ? never : T;

export type BaseTextKey = GetBaseTextKey<keyof typeof englishBaseText>;

type GetCategoryName<T> = T extends `nodeCreator.categoryNames.${infer C}` ? C : never;

export type CategoryName = GetCategoryName<keyof typeof englishBaseText>;
