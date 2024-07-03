import { EventEmitter } from 'events';
import type { IExecuteFunctions, INodeExecutionData, IWorkflowDataProxyData } from 'n8n-workflow';
import { ValidationError } from './ValidationError';
import { isObject } from './utils';

interface SandboxTextKeys {
	object: {
		singular: string;
		plural: string;
	};
}

export interface SandboxContext extends IWorkflowDataProxyData {
	$getNodeParameter: IExecuteFunctions['getNodeParameter'];
	$getWorkflowStaticData: IExecuteFunctions['getWorkflowStaticData'];
	helpers: IExecuteFunctions['helpers'];
}

export const REQUIRED_N8N_ITEM_KEYS = new Set(['json', 'binary', 'pairedItem', 'error']);

export function getSandboxContext(this: IExecuteFunctions, index: number): SandboxContext {
	const helpers = {
		...this.helpers,
		httpRequestWithAuthentication: this.helpers.httpRequestWithAuthentication.bind(this),
		requestWithAuthenticationPaginated: this.helpers.requestWithAuthenticationPaginated.bind(this),
	};
	return {
		// from NodeExecuteFunctions
		$getNodeParameter: this.getNodeParameter,
		$getWorkflowStaticData: this.getWorkflowStaticData,
		helpers,

		// to bring in all $-prefixed vars and methods from WorkflowDataProxy
		// $node, $items(), $parameter, $json, $env, etc.
		...this.getWorkflowDataProxy(index),
	};
}

export abstract class Sandbox extends EventEmitter {
	constructor(
		private textKeys: SandboxTextKeys,
		protected itemIndex: number | undefined,
		protected helpers: IExecuteFunctions['helpers'],
	) {
		super();
	}

	abstract runCode(): Promise<unknown>;

	abstract runCodeAllItems(): Promise<INodeExecutionData[] | INodeExecutionData[][]>;

	abstract runCodeEachItem(): Promise<INodeExecutionData | undefined>;

	validateRunCodeEachItem(executionResult: INodeExecutionData | undefined): INodeExecutionData {
		if (typeof executionResult !== 'object') {
			throw new ValidationError({
				message: `Code doesn't return ${this.getTextKey('object', { includeArticle: true })}`,
				description: `Please return ${this.getTextKey('object', {
					includeArticle: true,
				})} representing the output item. ('${executionResult}' was returned instead.)`,
				itemIndex: this.itemIndex,
			});
		}

		if (Array.isArray(executionResult)) {
			const firstSentence =
				executionResult.length > 0
					? `An array of ${typeof executionResult[0]}s was returned.`
					: 'An empty array was returned.';
			throw new ValidationError({
				message: `Code doesn't return a single ${this.getTextKey('object')}`,
				description: `${firstSentence} If you need to output multiple items, please use the 'Run Once for All Items' mode instead.`,
				itemIndex: this.itemIndex,
			});
		}

		const [returnData] = this.helpers.normalizeItems([executionResult]);

		this.validateItem(returnData);

		// If at least one top-level key is a supported item key (`json`, `binary`, etc.),
		// and another top-level key is unrecognized, then the user mis-added a property
		// directly on the item, when they intended to add it on the `json` property
		this.validateTopLevelKeys(returnData);

		return returnData;
	}

	validateRunCodeAllItems(
		executionResult: INodeExecutionData | INodeExecutionData[] | undefined,
		itemIndex?: number,
	): INodeExecutionData[] {
		if (typeof executionResult !== 'object') {
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
			const mustHaveTopLevelN8nKey = executionResult.some((item) =>
				Object.keys(item).find((key) => REQUIRED_N8N_ITEM_KEYS.has(key)),
			);

			if (mustHaveTopLevelN8nKey) {
				for (const item of executionResult) {
					this.validateTopLevelKeys(item);
				}
			}
		}

		const returnData = this.helpers.normalizeItems(executionResult);
		returnData.forEach((item) => this.validateItem(item));
		return returnData;
	}

	private getTextKey(
		key: keyof SandboxTextKeys,
		options?: { includeArticle?: boolean; plural?: boolean },
	) {
		const response = this.textKeys[key][options?.plural ? 'plural' : 'singular'];
		if (!options?.includeArticle) {
			return response;
		}
		if (['a', 'e', 'i', 'o', 'u'].some((value) => response.startsWith(value))) {
			return `an ${response}`;
		}
		return `a ${response}`;
	}

	private validateItem({ json, binary }: INodeExecutionData) {
		if (json === undefined || !isObject(json)) {
			throw new ValidationError({
				message: `A 'json' property isn't ${this.getTextKey('object', { includeArticle: true })}`,
				description: `In the returned data, every key named 'json' must point to ${this.getTextKey(
					'object',
					{ includeArticle: true },
				)}.`,
				itemIndex: this.itemIndex,
			});
		}

		if (binary !== undefined && !isObject(binary)) {
			throw new ValidationError({
				message: `A 'binary' property isn't ${this.getTextKey('object', { includeArticle: true })}`,
				description: `In the returned data, every key named 'binary’ must point to ${this.getTextKey(
					'object',
					{ includeArticle: true },
				)}.`,
				itemIndex: this.itemIndex,
			});
		}
	}

	private validateTopLevelKeys(item: INodeExecutionData) {
		Object.keys(item).forEach((key) => {
			if (REQUIRED_N8N_ITEM_KEYS.has(key)) return;
			throw new ValidationError({
				message: `Unknown top-level item key: ${key}`,
				description: 'Access the properties of an item under `.json`, e.g. `item.json`',
				itemIndex: this.itemIndex,
			});
		});
	}
}
