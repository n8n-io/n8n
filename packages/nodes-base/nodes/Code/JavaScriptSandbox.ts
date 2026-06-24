/**
 * JavaScript sandbox for the Code node.
 *
 * Uses isolated-vm (true V8 isolate) instead of vm2 (deprecated, known
 * sandbox escape vulnerabilities) for secure code execution.
 */

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { ExecutionError } from './ExecutionError';
import { IvmSandbox, makeIvmResolver, type IvmResolver } from './IvmSandbox';
import {
	mapItemNotDefinedErrorIfNeededForRunForEach,
	mapItemsNotDefinedErrorIfNeededForRunForAll,
	validateNoDisallowedMethodsInRunForEach,
} from './JsCodeValidator';
import type { SandboxContext } from './Sandbox';
import { Sandbox } from './Sandbox';
import { ValidationError } from './ValidationError';

const { NODE_FUNCTION_ALLOW_BUILTIN: builtIn, NODE_FUNCTION_ALLOW_EXTERNAL: external } =
	process.env;

export const vmResolver: IvmResolver = makeIvmResolver({
	external: external
		? {
				modules: external.split(','),
				transitive: false,
			}
		: false,
	builtin: builtIn?.split(',') ?? [],
});

export class JavaScriptSandbox extends Sandbox {
	private readonly sandbox: IvmSandbox;

	constructor(
		context: SandboxContext,
		private jsCode: string,
		helpers: IExecuteFunctions['helpers'],
		options?: { resolver?: IvmResolver },
	) {
		super(
			{
				object: {
					singular: 'object',
					plural: 'objects',
				},
			},
			helpers,
		);

		this.sandbox = new IvmSandbox({
			sandbox: context,
			resolver: options?.resolver ?? vmResolver,
			console: 'redirect',
			memoryLimit: 64,
			timeout: 10_000,
		});

		this.sandbox.on('console.log', (...args: unknown[]) => this.emit('output', ...args));
	}

	async runCode<T = unknown>(): Promise<T> {
		const script = `module.exports = async function() {${this.jsCode}\n}()`;
		try {
			const executionResult = await this.sandbox.run<T>(script, __dirname);
			return executionResult;
		} catch (error) {
			throw new ExecutionError(error);
		}
	}

	async runCodeAllItems(options?: {
		multiOutput?: boolean;
	}): Promise<INodeExecutionData[] | INodeExecutionData[][]> {
		const script = `module.exports = async function() {${this.jsCode}\n}()`;

		let executionResult: INodeExecutionData | INodeExecutionData[] | INodeExecutionData[][];

		try {
			executionResult = await this.sandbox.run(script, __dirname);
		} catch (error) {
			// anticipate user expecting `items` to pre-exist as in Function Item node
			mapItemsNotDefinedErrorIfNeededForRunForAll(this.jsCode, error);

			throw new ExecutionError(error);
		}

		if (executionResult === null) return [];

		if (options?.multiOutput === true) {
			// Check if executionResult is an array of arrays
			if (!Array.isArray(executionResult) || executionResult.some((item) => !Array.isArray(item))) {
				throw new ValidationError({
					message: "The code doesn't return an array of arrays",
					description:
						'Please return an array of arrays. One array for the different outputs and one for the different items that get returned.',
				});
			}

			return executionResult.map((data) => {
				return this.validateRunCodeAllItems(data);
			});
		}

		return this.validateRunCodeAllItems(
			executionResult as INodeExecutionData | INodeExecutionData[],
		);
	}

	async runCodeEachItem(itemIndex: number): Promise<INodeExecutionData | undefined> {
		const script = `module.exports = async function() {${this.jsCode}\n}()`;

		validateNoDisallowedMethodsInRunForEach(this.jsCode, itemIndex);

		let executionResult: INodeExecutionData;

		try {
			executionResult = await this.sandbox.run(script, __dirname);
		} catch (error) {
			// anticipate user expecting `item` to pre-exist as in Function Item node
			mapItemNotDefinedErrorIfNeededForRunForEach(this.jsCode, error);

			throw new ExecutionError(error, itemIndex);
		}

		if (executionResult === null) return undefined;

		return this.validateRunCodeEachItem(executionResult, itemIndex);
	}
}
