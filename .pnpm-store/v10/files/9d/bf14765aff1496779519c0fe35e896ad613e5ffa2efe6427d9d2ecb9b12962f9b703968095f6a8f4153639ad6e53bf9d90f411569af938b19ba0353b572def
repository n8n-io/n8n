import type CJSImportProcessor from "../CJSImportProcessor";
import type { HelperManager } from "../HelperManager";
import type NameManager from "../NameManager";
import type TokenProcessor from "../TokenProcessor";
import type ReactHotLoaderTransformer from "./ReactHotLoaderTransformer";
import type RootTransformer from "./RootTransformer";
import Transformer from "./Transformer";
/**
 * Class for editing import statements when we are transforming to commonjs.
 */
export default class CJSImportTransformer extends Transformer {
    readonly rootTransformer: RootTransformer;
    readonly tokens: TokenProcessor;
    readonly importProcessor: CJSImportProcessor;
    readonly nameManager: NameManager;
    readonly helperManager: HelperManager;
    readonly reactHotLoaderTransformer: ReactHotLoaderTransformer | null;
    readonly enableLegacyBabel5ModuleInterop: boolean;
    readonly enableLegacyTypeScriptModuleInterop: boolean;
    readonly isTypeScriptTransformEnabled: boolean;
    readonly isFlowTransformEnabled: boolean;
    readonly preserveDynamicImport: boolean;
    readonly keepUnusedImports: boolean;
    private hadExport;
    private hadNamedExport;
    private hadDefaultExport;
    private declarationInfo;
    constructor(rootTransformer: RootTransformer, tokens: TokenProcessor, importProcessor: CJSImportProcessor, nameManager: NameManager, helperManager: HelperManager, reactHotLoaderTransformer: ReactHotLoaderTransformer | null, enableLegacyBabel5ModuleInterop: boolean, enableLegacyTypeScriptModuleInterop: boolean, isTypeScriptTransformEnabled: boolean, isFlowTransformEnabled: boolean, preserveDynamicImport: boolean, keepUnusedImports: boolean);
    getPrefixCode(): string;
    getSuffixCode(): string;
    process(): boolean;
    private processImportEquals;
    /**
     * Transform this:
     * import foo, {bar} from 'baz';
     * into
     * var _baz = require('baz'); var _baz2 = _interopRequireDefault(_baz);
     *
     * The import code was already generated in the import preprocessing step, so
     * we just need to look it up.
     */
    private processImport;
    /**
     * Erase this import (since any CJS output would be completely different), and
     * return true if this import is should be elided due to being a type-only
     * import. Such imports will not be emitted at all to avoid side effects.
     *
     * Import elision only happens with the TypeScript or Flow transforms enabled.
     *
     * TODO: This function has some awkward overlap with
     *  CJSImportProcessor.pruneTypeOnlyImports , and the two should be unified.
     *  That function handles TypeScript implicit import name elision, and removes
     *  an import if all typical imported names (without `type`) are removed due
     *  to being type-only imports. This function handles Flow import removal and
     *  properly distinguishes `import 'foo'` from `import {} from 'foo'` for TS
     *  purposes.
     *
     * The position should end at the import string.
     */
    private removeImportAndDetectIfShouldElide;
    private removeRemainingImport;
    private processIdentifier;
    processObjectShorthand(): boolean;
    processExport(): boolean;
    private processAssignment;
    /**
     * Process something like `a += 3`, where `a` might be an exported value.
     */
    private processComplexAssignment;
    /**
     * Process something like `++a`, where `a` might be an exported value.
     */
    private processPreIncDec;
    /**
     * Process something like `a++`, where `a` might be an exported value.
     * This starts at the `a`, not at the `++`.
     */
    private processPostIncDec;
    private processExportDefault;
    private copyDecorators;
    /**
     * Transform a declaration like `export var`, `export let`, or `export const`.
     */
    private processExportVar;
    /**
     * Determine if the export is of the form:
     * export var/let/const [varName] = [expr];
     * In other words, determine if function name inference might apply.
     */
    private isSimpleExportVar;
    /**
     * Transform an `export var` declaration initializing a single variable.
     *
     * For example, this:
     * export const f = () => {};
     * becomes this:
     * const f = () => {}; exports.f = f;
     *
     * The variable is unused (e.g. exports.f has the true value of the export).
     * We need to produce an assignment of this form so that the function will
     * have an inferred name of "f", which wouldn't happen in the more general
     * case below.
     */
    private processSimpleExportVar;
    /**
     * Transform normal declaration exports, including handling destructuring.
     * For example, this:
     * export const {x: [a = 2, b], c} = d;
     * becomes this:
     * ({x: [exports.a = 2, exports.b], c: exports.c} = d;)
     */
    private processComplexExportVar;
    /**
     * Transform this:
     * export function foo() {}
     * into this:
     * function foo() {} exports.foo = foo;
     */
    private processExportFunction;
    /**
     * Skip past a function with a name and return that name.
     */
    private processNamedFunction;
    /**
     * Transform this:
     * export class A {}
     * into this:
     * class A {} exports.A = A;
     */
    private processExportClass;
    /**
     * Transform this:
     * export {a, b as c};
     * into this:
     * exports.a = a; exports.c = b;
     *
     * OR
     *
     * Transform this:
     * export {a, b as c} from './foo';
     * into the pre-generated Object.defineProperty code from the ImportProcessor.
     *
     * For the first case, if the TypeScript transform is enabled, we need to skip
     * exports that are only defined as types.
     */
    private processExportBindings;
    private processExportStar;
    private shouldElideExportedIdentifier;
}
