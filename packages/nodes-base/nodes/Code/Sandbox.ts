import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { ValidationError } from './ValidationError';
import type { SandboxTextKeys } from './utils';
import { isObject, REQUIRED_N8N_ITEM_KEYS } from './utils';

export abstract class Sandbox {
	private textKeys: SandboxTextKeys;

	constructor(textKeys: SandboxTextKeys) {
		this.textKeys = textKeys;
	}

	getTextKey(key: keyof SandboxTextKeys, options?: { includeArticle?: boolean; plural?: boolean }) {
		const response = this.textKeys[key][options?.plural ? 'plural' : 'singular'];
		if (!options?.includeArticle) {
			return response;
		}

		if (['a', 'e', 'i', 'o', 'u'].some((value) => response.startsWith(value))) {
			return `an ${response}`;
		}
		return `a ${response}`;
	}

	mustHaveTopLevelN8nKey(items: INodeExecutionData[]): boolean {
		return !!items.some((item) => Object.keys(item).find((key) => REQUIRED_N8N_ITEM_KEYS.has(key)));
	}

	validateItem(item: INodeExecutionData, mustHaveTopLevelN8nKey: boolean, itemIndex?: number) {
		if (item.json !== undefined && !isObject(item.json)) {
			throw new ValidationError({
				message: `A 'json' property isn't ${this.getTextKey('object', { includeArticle: true })}`,
				description: `In the returned data, every key named 'json' must point to ${this.getTextKey(
					'object',
					{ includeArticle: true },
				)}.`,
				itemIndex,
			});
		}

		if (mustHaveTopLevelN8nKey) {
			Object.keys(item as IDataObject).forEach((key) => {
				if (REQUIRED_N8N_ITEM_KEYS.has(key)) return;
				throw new ValidationError({
					message: `Unknown top-level item key: ${key}`,
					description: 'Access the properties of an item under `.json`, e.g. `item.json`.',
					itemIndex,
				});
			});
		}

		if (item.binary !== undefined && !isObject(item.binary)) {
			throw new ValidationError({
				// message: "A 'binary' property isn't an object",
				message: `A 'binary' property isn't ${this.getTextKey('object', { includeArticle: true })}`,
				description: `In the returned data, every key named 'binary’ must point to ${this.getTextKey(
					'object',
					{ includeArticle: true },
				)}.`,
				itemIndex,
			});
		}
	}

	validateRunCodeEachItem(
		executionResult: null | undefined | INodeExecutionData,
		mustHaveTopLevelN8nKey: boolean,
		itemIndex?: number,
	) {
		if (
			executionResult === undefined ||
			executionResult === null ||
			typeof executionResult !== 'object'
		) {
			throw new ValidationError({
				message: `Code doesn't return ${this.getTextKey('object', { includeArticle: true })}`,
				description: `Please return ${this.getTextKey('object', {
					includeArticle: true,
				})} representing the output item. ('${executionResult}' was returned instead.)`,
				itemIndex,
			});
		}

		this.validateItem(executionResult, mustHaveTopLevelN8nKey, itemIndex);

		// If at least one top-level key is a supported item key (`json`, `binary`, etc.),
		// and another top-level key is unrecognized, then the user mis-added a property
		// directly on the item, when they intended to add it on the `json` property

		Object.keys(executionResult as IDataObject).forEach((key) => {
			if (REQUIRED_N8N_ITEM_KEYS.has(key)) return;

			throw new ValidationError({
				message: `Unknown top-level item key: ${key}`,
				description: 'Access the properties of an item under `.json`, e.g. `item.json`.',
				itemIndex,
			});
		});
		if (Array.isArray(executionResult)) {
			const firstSentence =
				executionResult.length > 0
					? `An array of ${typeof executionResult[0]}s was returned.`
					: 'An empty array was returned.';
			throw new ValidationError({
				message: `Code doesn't return a single ${this.getTextKey('object')}`,
				description: `${firstSentence} If you need to output multiple items, please use the 'Run Once for All Items' mode instead.`,
				itemIndex,
			});
		}
	}

	validateRunCodeAllItems(
		executionResult: null | undefined | INodeExecutionData | INodeExecutionData[],
		itemIndex?: number,
	): void {
		if (
			executionResult === undefined ||
			executionResult === null ||
			typeof executionResult !== 'object'
		) {
			throw new ValidationError({
				message: "Code doesn't return items properly",
				description: `Please return an array of ${this.getTextKey('object', {
					plural: true,
				})}, one for each item you would like to output.`,
				itemIndex,
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
			const mustHaveTopLevelN8nKey = this.mustHaveTopLevelN8nKey(executionResult);

			for (const item of executionResult) {
				this.validateItem(item, mustHaveTopLevelN8nKey, itemIndex);
			}
		} else {
			this.validateItem(executionResult, false, itemIndex);
		}
	}
}
