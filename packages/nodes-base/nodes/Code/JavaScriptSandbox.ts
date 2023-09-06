import { NodeVM, makeResolverFromLegacyOptions } from '@n8n/vm2';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { ValidationError } from './ValidationError';
import { ExecutionError } from './ExecutionError';
import type { SandboxContext } from './Sandbox';
import { Sandbox } from './Sandbox';

const { NODE_FUNCTION_ALLOW_BUILTIN: builtIn, NODE_FUNCTION_ALLOW_EXTERNAL: external } =
	process.env;

export const vmResolver = makeResolverFromLegacyOptions({
	external: external
		? {
				modules: external.split(','),
				transitive: false,
		  }
		: false,
	builtin: builtIn?.split(',') ?? [],
});

export class JavaScriptSandbox extends Sandbox {
	private readonly vm: NodeVM;

	constructor(
		context: SandboxContext,
		private jsCode: string,
		itemIndex: number | undefined,
		helpers: IExecuteFunctions['helpers'],
	) {
		super(
			{
				object: {
					singular: 'object',
					plural: 'objects',
				},
			},
			itemIndex,
			helpers,
		);
		this.vm = new NodeVM({
			console: 'redirect',
			sandbox: context,
			require: vmResolver,
			wasm: false,
		});

		this.vm.on('console.log', (...args: unknown[]) => this.emit('output', ...args));
	}

	async runCodeAllItems(): Promise<INodeExecutionData[]> {
		const script = `module.exports = async function() {${this.jsCode}\n}()`;

		let executionResult: INodeExecutionData | INodeExecutionData[];

		try {
			executionResult = await this.vm.run(script, __dirname);
		} catch (error) {
			// anticipate user expecting `items` to pre-exist as in Function Item node
			if (error.message === 'items is not defined' && !/(let|const|var) items =/.test(script)) {
				const quoted = error.message.replace('items', '`items`');
				error.message = (quoted as string) + '. Did you mean `$input.all()`?';
			}

			throw new ExecutionError(error);
		}

		if (executionResult === null) return [];

		return this.validateRunCodeAllItems(executionResult);
	}

	async runCodeEachItem(): Promise<INodeExecutionData | undefined> {
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
			executionResult = await this.vm.run(script, __dirname);
		} catch (error) {
			// anticipate user expecting `item` to pre-exist as in Function Item node
			if (error.message === 'item is not defined' && !/(let|const|var) item =/.test(script)) {
				const quoted = error.message.replace('item', '`item`');
				error.message = (quoted as string) + '. Did you mean `$input.item.json`?';
			}

			throw new ExecutionError(error, this.itemIndex);
		}

		if (executionResult === null) return;

		return this.validateRunCodeEachItem(executionResult);
	}
}
