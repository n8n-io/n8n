import * as ts from 'typescript';
export declare class TypeScriptHelpers {
    private static readonly _wellKnownSymbolNameRegExp;
    private static readonly _uniqueSymbolNameRegExp;
    /**
     * This traverses any symbol aliases to find the original place where an item was defined.
     * For example, suppose a class is defined as "export default class MyClass { }"
     * but exported from the package's index.ts like this:
     *
     *    export { default as _MyClass } from './MyClass';
     *
     * In this example, calling followAliases() on the _MyClass symbol will return the
     * original definition of MyClass, traversing any intermediary places where the
     * symbol was imported and re-exported.
     */
    static followAliases(symbol: ts.Symbol, typeChecker: ts.TypeChecker): ts.Symbol;
    /**
     * Returns true if TypeScriptHelpers.followAliases() would return something different
     * from the input `symbol`.
     */
    static isFollowableAlias(symbol: ts.Symbol, typeChecker: ts.TypeChecker): boolean;
    /**
     * Certain virtual symbols do not have any declarations.  For example, `ts.TypeChecker.getExportsOfModule()` can
     * sometimes return a "prototype" symbol for an object, even though there is no corresponding declaration in the
     * source code.  API Extractor generally ignores such symbols.
     */
    static tryGetADeclaration(symbol: ts.Symbol): ts.Declaration | undefined;
    /**
     * Returns true if the specified symbol is an ambient declaration.
     */
    static isAmbient(symbol: ts.Symbol, typeChecker: ts.TypeChecker): boolean;
    /**
     * Same semantics as tryGetSymbolForDeclaration(), but throws an exception if the symbol
     * cannot be found.
     */
    static getSymbolForDeclaration(declaration: ts.Declaration, checker: ts.TypeChecker): ts.Symbol;
    static getModuleSpecifier(nodeWithModuleSpecifier: ts.ImportDeclaration | ts.ExportDeclaration | ts.ImportTypeNode): string | undefined;
    /**
     * Returns an ancestor of "node", such that the ancestor, any intermediary nodes,
     * and the starting node match a list of expected kinds.  Undefined is returned
     * if there aren't enough ancestors, or if the kinds are incorrect.
     *
     * For example, suppose child "C" has parents A --> B --> C.
     *
     * Calling _matchAncestor(C, [ExportSpecifier, NamedExports, ExportDeclaration])
     * would return A only if A is of kind ExportSpecifier, B is of kind NamedExports,
     * and C is of kind ExportDeclaration.
     *
     * Calling _matchAncestor(C, [ExportDeclaration]) would return C.
     */
    static matchAncestor<T extends ts.Node>(node: ts.Node, kindsToMatch: ts.SyntaxKind[]): T | undefined;
    /**
     * Does a depth-first search of the children of the specified node.  Returns the first child
     * with the specified kind, or undefined if there is no match.
     */
    static findFirstChildNode<T extends ts.Node>(node: ts.Node, kindToMatch: ts.SyntaxKind): T | undefined;
    /**
     * Returns the first parent node with the specified  SyntaxKind, or undefined if there is no match.
     */
    static findFirstParent<T extends ts.Node>(node: ts.Node, kindToMatch: ts.SyntaxKind): T | undefined;
    /**
     * Returns the highest parent node with the specified SyntaxKind, or undefined if there is no match.
     * @remarks
     * Whereas findFirstParent() returns the first match, findHighestParent() returns the last match.
     */
    static findHighestParent<T extends ts.Node>(node: ts.Node, kindToMatch: ts.SyntaxKind): T | undefined;
    /**
     * Decodes the names that the compiler generates for a built-in ECMAScript symbol.
     *
     * @remarks
     * TypeScript binds well-known ECMAScript symbols like `[Symbol.iterator]` as `__@iterator`.
     * If `name` is of this form, then `tryGetWellKnownSymbolName()` converts it back into e.g. `[Symbol.iterator]`.
     * If the string does not start with `__@` then `undefined` is returned.
     */
    static tryDecodeWellKnownSymbolName(name: ts.__String): string | undefined;
    /**
     * Returns whether the provided name was generated for a TypeScript `unique symbol`.
     */
    static isUniqueSymbolName(name: ts.__String): boolean;
    /**
     * Derives the string representation of a TypeScript late-bound symbol.
     */
    static tryGetLateBoundName(declarationName: ts.ComputedPropertyName): string | undefined;
}
//# sourceMappingURL=TypeScriptHelpers.d.ts.map