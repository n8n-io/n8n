import { normalizeItems } from 'n8n-core';
import type { INodeExecutionData } from 'n8n-workflow';

import { ReservedKeyFoundError } from './errors/reserved-key-not-found.error';
import { ValidationError } from './errors/validation-error';
import { isObject } from './obj-utils';

export const REQUIRED_N8N_ITEM_KEYS = new Set([
	'json',
	'binary',
	'pairedItem',
	'error',

	/**
	 * The `index` key was added accidentally to Function, FunctionItem, Gong,
	 * Execute Workflow, and ToolWorkflowV2, so we need to allow it temporarily.
	 * Once we stop using it in all nodes, we can stop allowing the `index` key.
	 */
	'index',
]);

function validateTopLevelKeys(item: INodeExecutionData, itemIndex: number) {
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

function validateItem({ json, binary }: INodeExecutionData, itemIndex: number) {
	if (json === undefined || !isObject(json)) {
		throw new ValidationError({
			message: "A 'json' property isn't an object",
			description: "In the returned data, every key named 'json' must point to an object.",
			itemIndex,
		});
	}

	if (binary !== undefined && !isObject(binary)) {
		throw new ValidationError({
			message: "A 'binary' property isn't an object",
			description: "In the returned data, every key named 'binary' must point to an object.",
			itemIndex,
		});
	}
}

export class NonArrayOfObjectsError extends ValidationError {
	constructor() {
		super({
			message: "Code doesn't return items properly",
			description: 'Please return an array of objects, one for each item you would like to output.',
		});
	}
}

/**
 * Validates the output of a code node in 'Run for All Items' mode.
 */
export function validateRunForAllItemsOutput(
	executionResult: INodeExecutionData | INodeExecutionData[] | undefined,
) {
	if (Array.isArray(executionResult)) {
		for (const item of executionResult) {
			if (!isObject(item)) throw new NonArrayOfObjectsError();
		}

		/**
		 * If at least one top-level key is an n8n item key (`json`, `binary`, etc.),
		 * then require all item keys to be an n8n item key.
		 *
		 * If no top-level key is an n8n key, then skip this check, allowing non-n8n
		 * item keys to be wrapped in `json` when normalizing items below.
		 */
		const mustHaveTopLevelN8nKey = executionResult.some((item) =>
			Object.keys(item).find((key) => REQUIRED_N8N_ITEM_KEYS.has(key)),
		);

		if (mustHaveTopLevelN8nKey) {
			for (let index = 0; index < executionResult.length; index++) {
				const item = executionResult[index];
				validateTopLevelKeys(item, index);
			}
		}
	} else if (!isObject(executionResult)) {
		throw new NonArrayOfObjectsError();
	}

	const returnData = normalizeItems(executionResult);
	returnData.forEach(validateItem);
	return returnData;
}

/**
 * Validates the output of a code node in 'Run for Each Item' mode for single item
 */
export function validateRunForEachItemOutput(
	executionResult: INodeExecutionData | undefined,
	itemIndex: number,
) {
	if (typeof executionResult !== 'object') {
		throw new ValidationError({
			message: "Code doesn't return an object",
			description: `Please return an object representing the output item. ('${executionResult}' was returned instead.)`,
			itemIndex,
		});
	}

	if (Array.isArray(executionResult)) {
		const firstSentence =
			executionResult.length > 0
				? `An array of ${typeof executionResult[0]}s was returned.`
				: 'An empty array was returned.';
		throw new ValidationError({
			message: "Code doesn't return a single object",
			description: `${firstSentence} If you need to output multiple items, please use the 'Run Once for All Items' mode instead.`,
			itemIndex,
		});
	}

	const [returnData] = normalizeItems([executionResult]);

	validateItem(returnData, itemIndex);

	// If at least one top-level key is a supported item key (`json`, `binary`, etc.),
	// and another top-level key is unrecognized, then the user mis-added a property
	// directly on the item, when they intended to add it on the `json` property
	validateTopLevelKeys(returnData, itemIndex);

	return returnData;
}
