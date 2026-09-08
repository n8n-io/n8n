import { NodeVM, makeResolverFromLegacyOptions } from 'vm2';
import { ExecutionError } from './ExecutionError';
import { mapItemNotDefinedErrorIfNeededForRunForEach, mapItemsNotDefinedErrorIfNeededForRunForAll, validateNoDisallowedMethodsInRunForEach, } from './JsCodeValidator';
import { Sandbox } from './Sandbox';
import { ValidationError } from './ValidationError';
const { NODE_FUNCTION_ALLOW_BUILTIN: builtIn, NODE_FUNCTION_ALLOW_EXTERNAL: external } = process.env;
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
    jsCode;
    vm;
    constructor(context, jsCode, helpers, options) {
        super({
            object: {
                singular: 'object',
                plural: 'objects',
            },
        }, helpers);
        this.jsCode = jsCode;
        this.vm = new NodeVM({
            console: 'redirect',
            sandbox: context,
            require: options?.resolver ?? vmResolver,
            wasm: false,
        });
        this.vm.on('console.log', (...args) => this.emit('output', ...args));
    }
    async runCode() {
        const script = `module.exports = async function() {${this.jsCode}\n}()`;
        try {
            const executionResult = (await this.vm.run(script, __dirname));
            return executionResult;
        }
        catch (error) {
            throw new ExecutionError(error);
        }
    }
    async runCodeAllItems(options) {
        const script = `module.exports = async function() {${this.jsCode}\n}()`;
        let executionResult;
        try {
            executionResult = await this.vm.run(script, __dirname);
        }
        catch (error) {
            // anticipate user expecting `items` to pre-exist as in Function Item node
            mapItemsNotDefinedErrorIfNeededForRunForAll(this.jsCode, error);
            throw new ExecutionError(error);
        }
        if (executionResult === null)
            return [];
        if (options?.multiOutput === true) {
            // Check if executionResult is an array of arrays
            if (!Array.isArray(executionResult) || executionResult.some((item) => !Array.isArray(item))) {
                throw new ValidationError({
                    message: "The code doesn't return an array of arrays",
                    description: 'Please return an array of arrays. One array for the different outputs and one for the different items that get returned.',
                });
            }
            return executionResult.map((data) => {
                return this.validateRunCodeAllItems(data);
            });
        }
        return this.validateRunCodeAllItems(executionResult);
    }
    async runCodeEachItem(itemIndex) {
        const script = `module.exports = async function() {${this.jsCode}\n}()`;
        validateNoDisallowedMethodsInRunForEach(this.jsCode, itemIndex);
        let executionResult;
        try {
            executionResult = await this.vm.run(script, __dirname);
        }
        catch (error) {
            // anticipate user expecting `item` to pre-exist as in Function Item node
            mapItemNotDefinedErrorIfNeededForRunForEach(this.jsCode, error);
            throw new ExecutionError(error, itemIndex);
        }
        if (executionResult === null)
            return undefined;
        return this.validateRunCodeEachItem(executionResult, itemIndex);
    }
}
//# sourceMappingURL=JavaScriptSandbox.js.map