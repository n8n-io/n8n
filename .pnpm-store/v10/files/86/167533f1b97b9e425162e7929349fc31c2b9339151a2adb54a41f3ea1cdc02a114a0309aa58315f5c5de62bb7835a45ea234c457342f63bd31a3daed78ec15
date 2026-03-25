import type CJSImportProcessor from "../CJSImportProcessor";
import type NameManager from "../NameManager";
import type TokenProcessor from "../TokenProcessor";
import type RootTransformer from "./RootTransformer";
import Transformer from "./Transformer";
/**
 * Implementation of babel-plugin-jest-hoist, which hoists up some jest method
 * calls above the imports to allow them to override other imports.
 *
 * To preserve line numbers, rather than directly moving the jest.mock code, we
 * wrap each invocation in a function statement and then call the function from
 * the top of the file.
 */
export default class JestHoistTransformer extends Transformer {
    readonly rootTransformer: RootTransformer;
    readonly tokens: TokenProcessor;
    readonly nameManager: NameManager;
    readonly importProcessor: CJSImportProcessor | null;
    private readonly hoistedFunctionNames;
    constructor(rootTransformer: RootTransformer, tokens: TokenProcessor, nameManager: NameManager, importProcessor: CJSImportProcessor | null);
    process(): boolean;
    getHoistedCode(): string;
    /**
     * Extracts any methods calls on the jest-object that should be hoisted.
     *
     * According to the jest docs, https://jestjs.io/docs/en/jest-object#jestmockmodulename-factory-options,
     * mock, unmock, enableAutomock, disableAutomock, are the methods that should be hoisted.
     *
     * We do not apply the same checks of the arguments as babel-plugin-jest-hoist does.
     */
    private extractHoistedCalls;
}
