import type { Token } from "../parser/tokenizer";
import type TokenProcessor from "../TokenProcessor";
import type RootTransformer from "./RootTransformer";
import Transformer from "./Transformer";
export default class TypeScriptTransformer extends Transformer {
    readonly rootTransformer: RootTransformer;
    readonly tokens: TokenProcessor;
    readonly isImportsTransformEnabled: boolean;
    constructor(rootTransformer: RootTransformer, tokens: TokenProcessor, isImportsTransformEnabled: boolean);
    process(): boolean;
    processEnum(isExport?: boolean): void;
    /**
     * Transform an enum into equivalent JS. This has complexity in a few places:
     * - TS allows string enums, numeric enums, and a mix of the two styles within an enum.
     * - Enum keys are allowed to be referenced in later enum values.
     * - Enum keys are allowed to be strings.
     * - When enum values are omitted, they should follow an auto-increment behavior.
     */
    processEnumBody(enumName: string): void;
    /**
     * Detect name information about this enum key, which will be used to determine which code to emit
     * and whether we should declare a variable as part of this declaration.
     *
     * Some cases to keep in mind:
     * - Enum keys can be implicitly referenced later, e.g. `X = 1, Y = X`. In Sucrase, we implement
     *   this by declaring a variable `X` so that later expressions can use it.
     * - In addition to the usual identifier key syntax, enum keys are allowed to be string literals,
     *   e.g. `"hello world" = 3,`. Template literal syntax is NOT allowed.
     * - Even if the enum key is defined as a string literal, it may still be referenced by identifier
     *   later, e.g. `"X" = 1, Y = X`. That means that we need to detect whether or not a string
     *   literal is identifier-like and emit a variable if so, even if the declaration did not use an
     *   identifier.
     * - Reserved keywords like `break` are valid enum keys, but are not valid to be referenced later
     *   and would be a syntax error if we emitted a variable, so we need to skip the variable
     *   declaration in those cases.
     *
     * The variableName return value captures these nuances: if non-null, we can and must emit a
     * variable declaration, and if null, we can't and shouldn't.
     */
    extractEnumKeyInfo(nameToken: Token): {
        nameStringCode: string;
        variableName: string | null;
    };
    /**
     * Handle an enum member where the RHS is just a string literal (not omitted, not a number, and
     * not a complex expression). This is the typical form for TS string enums, and in this case, we
     * do *not* create a reverse mapping.
     *
     * This is called after deleting the key token, when the token processor is at the equals sign.
     *
     * Example 1:
     * someKey = "some value"
     * ->
     * const someKey = "some value"; MyEnum["someKey"] = someKey;
     *
     * Example 2:
     * "some key" = "some value"
     * ->
     * MyEnum["some key"] = "some value";
     */
    processStringLiteralEnumMember(enumName: string, nameStringCode: string, variableName: string | null): void;
    /**
     * Handle an enum member initialized with an expression on the right-hand side (other than a
     * string literal). In these cases, we should transform the expression and emit code that sets up
     * a reverse mapping.
     *
     * The TypeScript implementation of this operation distinguishes between expressions that can be
     * "constant folded" at compile time (i.e. consist of number literals and simple math operations
     * on those numbers) and ones that are dynamic. For constant expressions, it emits the resolved
     * numeric value, and auto-incrementing is only allowed in that case. Evaluating expressions at
     * compile time would add significant complexity to Sucrase, so Sucrase instead leaves the
     * expression as-is, and will later emit something like `MyEnum["previousKey"] + 1` to implement
     * auto-incrementing.
     *
     * This is called after deleting the key token, when the token processor is at the equals sign.
     *
     * Example 1:
     * someKey = 1 + 1
     * ->
     * const someKey = 1 + 1; MyEnum[MyEnum["someKey"] = someKey] = "someKey";
     *
     * Example 2:
     * "some key" = 1 + 1
     * ->
     * MyEnum[MyEnum["some key"] = 1 + 1] = "some key";
     */
    processExplicitValueEnumMember(enumName: string, nameStringCode: string, variableName: string | null): void;
    /**
     * Handle an enum member with no right-hand side expression. In this case, the value is the
     * previous value plus 1, or 0 if there was no previous value. We should also always emit a
     * reverse mapping.
     *
     * Example 1:
     * someKey2
     * ->
     * const someKey2 = someKey1 + 1; MyEnum[MyEnum["someKey2"] = someKey2] = "someKey2";
     *
     * Example 2:
     * "some key 2"
     * ->
     * MyEnum[MyEnum["some key 2"] = someKey1 + 1] = "some key 2";
     */
    processImplicitValueEnumMember(enumName: string, nameStringCode: string, variableName: string | null, previousValueCode: string | null): void;
}
