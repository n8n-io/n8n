<<<<<<< HEAD
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { ValidationError } from './ValidationError';
import type { SandboxTextKeys } from './utils';
=======
import { NodeVM } from 'vm2';
import { ValidationError } from './ValidationError';
import { ExecutionError } from './ExecutionError';
>>>>>>> origin/master
import { isObject, REQUIRED_N8N_ITEM_KEYS } from './utils';

export abstract class Sandbox {
	private textKeys: SandboxTextKeys;

<<<<<<< HEAD
	constructor(textKeys: SandboxTextKeys) {
		this.textKeys = textKeys;
	}

	getTextKey(key: keyof SandboxTextKeys, options?: { includeArticle?: boolean; plural?: boolean }) {
		const response = this.textKeys[key][options?.plural ? 'plural' : 'singular'];
		if (!options?.includeArticle) {
			return response;
=======
interface SandboxContext extends IWorkflowDataProxyData {
	$getNodeParameter: IExecuteFunctions['getNodeParameter'];
	$getWorkflowStaticData: IExecuteFunctions['getWorkflowStaticData'];
	helpers: IExecuteFunctions['helpers'];
}

const { NODE_FUNCTION_ALLOW_BUILTIN: builtIn, NODE_FUNCTION_ALLOW_EXTERNAL: external } =
	process.env;

export class Sandbox extends NodeVM {
	private itemIndex: number | undefined = undefined;

	constructor(
		context: SandboxContext,
		private jsCode: string,
		workflowMode: WorkflowExecuteMode,
		private helpers: IExecuteFunctions['helpers'],
	) {
		super({
			console: workflowMode === 'manual' ? 'redirect' : 'inherit',
			sandbox: context,
			require: {
				builtin: builtIn ? builtIn.split(',') : [],
				external: external ? { modules: external.split(','), transitive: false } : false,
			},
		});
	}

	async runCodeAllItems(): Promise<INodeExecutionData[]> {
		const script = `module.exports = async function() {${this.jsCode}\n}()`;

		let executionResult: INodeExecutionData | INodeExecutionData[];

		try {
			executionResult = await this.run(script, __dirname);
		} catch (error) {
			// anticipate user expecting `items` to pre-exist as in Function Item node
			if (error.message === 'items is not defined' && !/(let|const|var) items =/.test(script)) {
				const quoted = error.message.replace('items', '`items`');
				error.message = (quoted as string) + '. Did you mean `$input.all()`?';
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			throw new ExecutionError(error);
>>>>>>> origin/master
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
<<<<<<< HEAD
				this.validateItem(item, mustHaveTopLevelN8nKey, itemIndex);
			}
		} else {
			this.validateItem(executionResult, false, itemIndex);
		}
	}
}
=======
				if (mustHaveTopLevelN8nKey) {
					this.validateTopLevelKeys(item);
				}
			}
		}

		const returnData = this.helpers.normalizeItems(executionResult);
		returnData.forEach((item) => this.validateResult(item));
		return returnData;
	}

	async runCodeEachItem(itemIndex: number): Promise<INodeExecutionData | undefined> {
		this.itemIndex = itemIndex;
		const script = `module.exports = async function() {${this.jsCode}\n}()`;

		const match = this.jsCode.match(/\$input\.(?<disallowedMethod>first|last|all|itemMatching)/);

		if (match?.groups?.disallowedMethod) {
			const { disallowedMethod } = match.groups;

			const lineNumber =
				this.jsCode.split('\n').findIndex((line) => {
					return line.includes(disallowedMethod) && !line.startsWith('//') && !line.startsWith('*');
				}) + 1;

			const disallowedMethodFound = lineNumber !== 0;

			if (disallowedMethodFound) {
				throw new ValidationError({
					message: `Can't use .${disallowedMethod}() here`,
					description: "This is only available in 'Run Once for All Items' mode",
					itemIndex: this.itemIndex,
					lineNumber,
				});
			}
		}

		let executionResult: INodeExecutionData;

		try {
			executionResult = await this.run(script, __dirname);
		} catch (error) {
			// anticipate user expecting `item` to pre-exist as in Function Item node
			if (error.message === 'item is not defined' && !/(let|const|var) item =/.test(script)) {
				const quoted = error.message.replace('item', '`item`');
				error.message = (quoted as string) + '. Did you mean `$input.item.json`?';
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			throw new ExecutionError(error, this.itemIndex);
		}

		if (executionResult === null) return;

		if (executionResult === undefined || typeof executionResult !== 'object') {
			throw new ValidationError({
				message: "Code doesn't return an object",
				description: `Please return an object representing the output item. ('${executionResult}' was returned instead.)`,
				itemIndex: this.itemIndex,
			});
		}

		if (Array.isArray(executionResult)) {
			const firstSentence =
				executionResult.length > 0
					? `An array of ${typeof executionResult[0]}s was returned.`
					: 'An empty array was returned.';

			throw new ValidationError({
				message: "Code doesn't return a single object",
				description: `${firstSentence} If you need to output multiple items, please use the 'Run Once for All Items' mode instead`,
				itemIndex: this.itemIndex,
			});
		}

		const [returnData] = this.helpers.normalizeItems([executionResult]);
		this.validateResult(returnData);

		// If at least one top-level key is a supported item key (`json`, `binary`, etc.),
		// and another top-level key is unrecognized, then the user mis-added a property
		// directly on the item, when they intended to add it on the `json` property
		this.validateTopLevelKeys(returnData);

		return returnData;
	}

	private validateResult({ json, binary }: INodeExecutionData) {
		if (json === undefined || !isObject(json)) {
			throw new ValidationError({
				message: "A 'json' property isn't an object",
				description: "In the returned data, every key named 'json' must point to an object",
				itemIndex: this.itemIndex,
			});
		}

		if (binary !== undefined && !isObject(binary)) {
			throw new ValidationError({
				message: "A 'binary' property isn't an object",
				description: "In the returned data, every key named 'binary’ must point to an object.",
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

export function getSandboxContext(this: IExecuteFunctions, index?: number): SandboxContext {
	return {
		// from NodeExecuteFunctions
		$getNodeParameter: this.getNodeParameter,
		$getWorkflowStaticData: this.getWorkflowStaticData,
		helpers: this.helpers,

		// to bring in all $-prefixed vars and methods from WorkflowDataProxy
		...this.getWorkflowDataProxy(index ?? 0),
	};
}
>>>>>>> origin/master
