import * as ts from 'typescript';
/**
 * Exposes the TypeScript compiler internals for detecting global variable names.
 */
export interface IGlobalVariableAnalyzer {
    hasGlobalName(name: string): boolean;
}
export declare class TypeScriptInternals {
    static getImmediateAliasedSymbol(symbol: ts.Symbol, typeChecker: ts.TypeChecker): ts.Symbol;
    /**
     * Returns the Symbol for the provided Declaration.  This is a workaround for a missing
     * feature of the TypeScript Compiler API.   It is the only apparent way to reach
     * certain data structures, and seems to always work, but is not officially documented.
     *
     * @returns The associated Symbol.  If there is no semantic information (e.g. if the
     * declaration is an extra semicolon somewhere), then "undefined" is returned.
     */
    static tryGetSymbolForDeclaration(declaration: ts.Declaration, checker: ts.TypeChecker): ts.Symbol | undefined;
    /**
     * Returns whether the provided Symbol is a TypeScript "late-bound" Symbol (i.e. was created by the Checker
     * for a computed property based on its type, rather than by the Binder).
     */
    static isLateBoundSymbol(symbol: ts.Symbol): boolean;
    /**
     * Retrieves the comment ranges associated with the specified node.
     */
    static getJSDocCommentRanges(node: ts.Node, text: string): ts.CommentRange[] | undefined;
    /**
     * Retrieves the (unescaped) value of an string literal, numeric literal, or identifier.
     */
    static getTextOfIdentifierOrLiteral(node: ts.Identifier | ts.StringLiteralLike | ts.NumericLiteral): string;
    /**
     * Retrieves the (cached) module resolution information for a module name that was exported from a SourceFile.
     * The compiler populates this cache as part of analyzing the source file.
     */
    static getResolvedModule(program: ts.Program, sourceFile: ts.SourceFile, moduleNameText: string, mode: ts.ModuleKind.CommonJS | ts.ModuleKind.ESNext | undefined): ts.ResolvedModuleFull | undefined;
    /**
     * Gets the mode required for module resolution required with the addition of Node16/nodenext
     */
    static getModeForUsageLocation(file: ts.SourceFile, usage: ts.StringLiteralLike, compilerOptions: ts.CompilerOptions): ts.ModuleKind.CommonJS | ts.ModuleKind.ESNext | undefined;
    /**
     * Returns ts.Symbol.parent if it exists.
     */
    static getSymbolParent(symbol: ts.Symbol): ts.Symbol | undefined;
    /**
     * In an statement like `export default class X { }`, the `Symbol.name` will be `default`
     * whereas the `localSymbol` is `X`.
     */
    static tryGetLocalSymbol(declaration: ts.Declaration): ts.Symbol | undefined;
    static getGlobalVariableAnalyzer(program: ts.Program): IGlobalVariableAnalyzer;
    /**
     * Returns whether a variable is declared with the const keyword
     */
    static isVarConst(node: ts.VariableDeclaration | ts.VariableDeclarationList): boolean;
}
//# sourceMappingURL=TypeScriptInternals.d.ts.map