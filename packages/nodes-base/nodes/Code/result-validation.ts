import type { INodeExecutionData } from 'n8n-workflow';

import { ReservedKeyFoundError } from './reserved-key-found-error';
import { isObject } from './utils';
import { ValidationError } from './ValidationError';

export interface TextKeys {
	object: {
		singular: string;
		plural: string;
	};
}

export const REQUIRED_N8N_ITEM_KEYS = new Set(['json', 'binary', 'pairedItem', 'error', 'index']);

export function getTextKey(
	textKeys: TextKeys,
	key: keyof TextKeys,
	options?: { includeArticle?: boolean; plural?: boolean },
) {
	const response = textKeys[key][options?.plural ? 'plural' : 'singular'];
	if (!options?.includeArticle) {
		return response;
	}
	if (['a', 'e', 'i', 'o', 'u'].some((value) => response.startsWith(value))) {
		return `an ${response}`;
	}
	return `a ${response}`;
}

export function validateItem(
	{ json, binary }: INodeExecutionData,
	itemIndex: number,
	textKeys: TextKeys,
) {
	if (json === undefined || !isObject(json)) {
		throw new ValidationError({
			message: `A 'json' property isn't ${getTextKey(textKeys, 'object', { includeArticle: true })}`,
			description: `In the returned data, every key named 'json' must point to ${getTextKey(
				textKeys,
				'object',
				{ includeArticle: true },
			)}.`,
			itemIndex,
		});
	}

	if (binary !== undefined && !isObject(binary)) {
		throw new ValidationError({
			message: `A 'binary' property isn't ${getTextKey(textKeys, 'object', { includeArticle: true })}`,
			description: `In the returned data, every key named 'binary' must point to ${getTextKey(
				textKeys,
				'object',
				{ includeArticle: true },
			)}.`,
			itemIndex,
		});
	}
}

export function validateTopLevelKeys(item: INodeExecutionData, itemIndex: number) {
	let foundReservedKey: string | null = null;
	const unknownKeys: string[] = [];

	for (const key in item) {
		if (!Object.prototype.hasOwnProperty.call(item, key)) continue;

		if (REQUIRED_N8N_ITEM_KEYS.has(key)) {
			foundReservedKey ??= key;
		} else {
			unknownKeys.push(key);
		}
	}

	if (unknownKeys.length > 0) {
		if (foundReservedKey) throw new ReservedKeyFoundError(foundReservedKey, itemIndex);

		throw new ValidationError({
			message: `Unknown top-level item key: ${unknownKeys[0]}`,
			description: 'Access the properties of an item under `.json`, e.g. `item.json`',
			itemIndex,
		});
	}
}

export function validateRunCodeEachItem(
	executionResult: INodeExecutionData | undefined,
	itemIndex: number,
	textKeys: TextKeys,
	normalizeItems: (items: INodeExecutionData[]) => INodeExecutionData[],
): INodeExecutionData {
	if (typeof executionResult !== 'object') {
		throw new ValidationError({
			message: `Code doesn't return ${getTextKey(textKeys, 'object', { includeArticle: true })}`,
			description: `Please return ${getTextKey(textKeys, 'object', {
				includeArticle: true,
			})} representing the output item. ('${executionResult}' was returned instead.)`,
			itemIndex,
		});
	}

	if (Array.isArray(executionResult)) {
		const firstSentence =
			executionResult.length > 0
				? `An array of ${typeof executionResult[0]}s was returned.`
				: 'An empty array was returned.';
		throw new ValidationError({
			message: `Code doesn't return a single ${getTextKey(textKeys, 'object')}`,
			description: `${firstSentence} If you need to output multiple items, please use the 'Run Once for All Items' mode instead.`,
			itemIndex,
		});
	}

	const [returnData] = normalizeItems([executionResult]);

	validateItem(returnData, itemIndex, textKeys);

	// If at least one top-level key is a supported item key (`json`, `binary`, etc.),
	// and another top-level key is unrecognized, then the user mis-added a property
	// directly on the item, when they intended to add it on the `json` property
	validateTopLevelKeys(returnData, itemIndex);

	return returnData;
}

export function validateRunCodeAllItems(
	executionResult: INodeExecutionData | INodeExecutionData[] | undefined,
	textKeys: TextKeys,
	normalizeItems: (items: INodeExecutionData | INodeExecutionData[]) => INodeExecutionData[],
): INodeExecutionData[] {
	if (typeof executionResult !== 'object') {
		throw new ValidationError({
			message: "Code doesn't return items properly",
			description: `Please return an array of ${getTextKey(textKeys, 'object', {
				plural: true,
			})}, one for each item you would like to output.`,
		});
	}

	if (Array.isArray(executionResult)) {
		/**
		 * If at least one top-level key is an n8n item key (`json`, `binary`, etc.),
		 * then require all item keys to be an n8n item key.
		 *
		 * If no top-level key is an n8n key, then skip this check, allowing non-n8n
		 * item keys to be wrapped in `json` when normalizing items below.
		 */
		for (const item of executionResult) {
			if (!isObject(item)) {
				throw new ValidationError({
					message: "Code doesn't return items properly",
					description: `Please return an array of ${getTextKey(textKeys, 'object', {
						plural: true,
					})}, one for each item you would like to output.`,
				});
			}
		}

		const mustHaveTopLevelN8nKey = executionResult.some((item) =>
			Object.keys(item).find((key) => REQUIRED_N8N_ITEM_KEYS.has(key)),
		);

		if (mustHaveTopLevelN8nKey) {
			for (let index = 0; index < executionResult.length; index++) {
				const item = executionResult[index];
				validateTopLevelKeys(item, index);
			}
		}
	}

	const returnData = normalizeItems(executionResult);
	returnData.forEach((item, index) => validateItem(item, index, textKeys));
	return returnData;
}
