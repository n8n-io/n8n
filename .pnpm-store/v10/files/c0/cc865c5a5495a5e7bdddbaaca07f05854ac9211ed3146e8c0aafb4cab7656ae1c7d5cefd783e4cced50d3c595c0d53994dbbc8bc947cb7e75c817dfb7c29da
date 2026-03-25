import type TokenProcessor from "../TokenProcessor";
import type RootTransformer from "./RootTransformer";
import Transformer from "./Transformer";
export default class FlowTransformer extends Transformer {
    readonly rootTransformer: RootTransformer;
    readonly tokens: TokenProcessor;
    readonly isImportsTransformEnabled: boolean;
    constructor(rootTransformer: RootTransformer, tokens: TokenProcessor, isImportsTransformEnabled: boolean);
    process(): boolean;
    /**
     * Handle a declaration like:
     * export enum E ...
     *
     * With this imports transform, this becomes:
     * const E = [[enum]]; exports.E = E;
     *
     * otherwise, it becomes:
     * export const E = [[enum]];
     */
    processNamedExportEnum(): void;
    /**
     * Handle a declaration like:
     * export default enum E
     *
     * With the imports transform, this becomes:
     * const E = [[enum]]; exports.default = E;
     *
     * otherwise, it becomes:
     * const E = [[enum]]; export default E;
     */
    processDefaultExportEnum(): void;
    /**
     * Transpile flow enums to invoke the "flow-enums-runtime" library.
     *
     * Currently, the transpiled code always uses `require("flow-enums-runtime")`,
     * but if future flexibility is needed, we could expose a config option for
     * this string (similar to configurable JSX). Even when targeting ESM, the
     * default behavior of babel-plugin-transform-flow-enums is to use require
     * rather than injecting an import.
     *
     * Flow enums are quite a bit simpler than TS enums and have some convenient
     * constraints:
     * - Element initializers must be either always present or always absent. That
     *   means that we can use fixed lookahead on the first element (if any) and
     *   assume that all elements are like that.
     * - The right-hand side of an element initializer must be a literal value,
     *   not a complex expression and not referencing other elements. That means
     *   we can simply copy a single token.
     *
     * Enums can be broken up into three basic cases:
     *
     * Mirrored enums:
     * enum E {A, B}
     *   ->
     * const E = require("flow-enums-runtime").Mirrored(["A", "B"]);
     *
     * Initializer enums:
     * enum E {A = 1, B = 2}
     *   ->
     * const E = require("flow-enums-runtime")({A: 1, B: 2});
     *
     * Symbol enums:
     * enum E of symbol {A, B}
     *   ->
     * const E = require("flow-enums-runtime")({A: Symbol("A"), B: Symbol("B")});
     *
     * We can statically detect which of the three cases this is by looking at the
     * "of" declaration (if any) and seeing if the first element has an initializer.
     * Since the other transform details are so similar between the three cases, we
     * use a single implementation and vary the transform within processEnumElement
     * based on case.
     */
    processEnum(): void;
    /**
     * Process an individual enum element, producing either an array element or an
     * object element based on what type of enum this is.
     */
    processEnumElement(isSymbolEnum: boolean, hasInitializers: boolean): void;
}
