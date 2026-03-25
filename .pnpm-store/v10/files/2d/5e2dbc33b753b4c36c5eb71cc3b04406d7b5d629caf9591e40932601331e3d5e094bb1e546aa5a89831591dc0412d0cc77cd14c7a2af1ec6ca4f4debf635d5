import * as ts from 'typescript';
import { type PackageJsonLookup } from '@rushstack/node-core-library';
import { AstDeclaration } from './AstDeclaration';
import type { AstModule, IAstModuleExportInfo } from './AstModule';
import type { AstEntity } from './AstEntity';
import type { MessageRouter } from '../collector/MessageRouter';
/**
 * Options for `AstSymbolTable._fetchAstSymbol()`
 */
export interface IFetchAstSymbolOptions {
    /**
     * The symbol after any symbol aliases have been followed using TypeScriptHelpers.followAliases()
     */
    followedSymbol: ts.Symbol;
    /**
     * True if followedSymbol is not part of the working package
     */
    isExternal: boolean;
    /**
     * If true, symbols with AstSymbol.nominalAnalysis=true will be returned.
     * Otherwise `undefined` will be returned for such symbols.
     */
    includeNominalAnalysis: boolean;
    /**
     * True while populating the `AstSymbolTable`; false if we're doing a passive lookup
     * without adding anything new to the table
     */
    addIfMissing: boolean;
    /**
     * A hint to help `_fetchAstSymbol()` determine the `AstSymbol.localName`.
     */
    localName?: string;
}
/**
 * AstSymbolTable is the workhorse that builds AstSymbol and AstDeclaration objects.
 * It maintains a cache of already constructed objects.  AstSymbolTable constructs
 * AstModule objects, but otherwise the state that it maintains is agnostic of
 * any particular entry point.  (For example, it does not track whether a given AstSymbol
 * is "exported" or not.)
 *
 * Internally, AstSymbolTable relies on ExportAnalyzer to crawl import statements and determine where symbols
 * are declared (i.e. the AstImport information needed to import them).
 */
export declare class AstSymbolTable {
    private readonly _program;
    private readonly _typeChecker;
    private readonly _messageRouter;
    private readonly _globalVariableAnalyzer;
    private readonly _packageMetadataManager;
    private readonly _exportAnalyzer;
    private readonly _alreadyWarnedGlobalNames;
    /**
     * A mapping from ts.Symbol --> AstSymbol
     * NOTE: The AstSymbol.followedSymbol will always be a lookup key, but additional keys
     * are possible.
     *
     * After following type aliases, we use this map to look up the corresponding AstSymbol.
     */
    private readonly _astSymbolsBySymbol;
    /**
     * A mapping from ts.Declaration --> AstDeclaration
     */
    private readonly _astDeclarationsByDeclaration;
    private readonly _entitiesByNode;
    constructor(program: ts.Program, typeChecker: ts.TypeChecker, packageJsonLookup: PackageJsonLookup, bundledPackageNames: ReadonlySet<string>, messageRouter: MessageRouter);
    /**
     * Used to analyze an entry point that belongs to the working package.
     */
    fetchAstModuleFromWorkingPackage(sourceFile: ts.SourceFile): AstModule;
    /**
     * This crawls the specified entry point and collects the full set of exported AstSymbols.
     */
    fetchAstModuleExportInfo(astModule: AstModule): IAstModuleExportInfo;
    /**
     * Attempts to retrieve an export by name from the specified `AstModule`.
     * Returns undefined if no match was found.
     */
    tryGetExportOfAstModule(exportName: string, astModule: AstModule): AstEntity | undefined;
    /**
     * Ensures that AstSymbol.analyzed is true for the provided symbol.  The operation
     * starts from the root symbol and then fills out all children of all declarations, and
     * also calculates AstDeclaration.referencedAstSymbols for all declarations.
     * If the symbol is not imported, any non-imported references are also analyzed.
     *
     * @remarks
     * This is an expensive operation, so we only perform it for top-level exports of an
     * the AstModule.  For example, if some code references a nested class inside
     * a namespace from another library, we do not analyze any of that class's siblings
     * or members.  (We do always construct its parents however, since AstDefinition.parent
     * is immutable, and needed e.g. to calculate release tag inheritance.)
     */
    analyze(astEntity: AstEntity): void;
    /**
     * For a given astDeclaration, this efficiently finds the child corresponding to the
     * specified ts.Node.  It is assumed that AstDeclaration.isSupportedSyntaxKind() would return true for
     * that node type, and that the node is an immediate child of the provided AstDeclaration.
     */
    getChildAstDeclarationByNode(node: ts.Node, parentAstDeclaration: AstDeclaration): AstDeclaration;
    /**
     * For a given ts.Identifier that is part of an AstSymbol that we analyzed, return the AstEntity that
     * it refers to.  Returns undefined if it doesn't refer to anything interesting.
     * @remarks
     * Throws an Error if the ts.Identifier is not part of node tree that was analyzed.
     */
    tryGetEntityForNode(identifier: ts.Identifier | ts.ImportTypeNode): AstEntity | undefined;
    /**
     * Builds an AstSymbol.localName for a given ts.Symbol.  In the current implementation, the localName is
     * a TypeScript-like expression that may be a string literal or ECMAScript symbol expression.
     *
     * ```ts
     * class X {
     *   // localName="identifier"
     *   public identifier: number = 1;
     *   // localName="\"identifier\""
     *   public "quoted string!": number = 2;
     *   // localName="[MyNamespace.MySymbol]"
     *   public [MyNamespace.MySymbol]: number = 3;
     * }
     * ```
     */
    static getLocalNameForSymbol(symbol: ts.Symbol): string;
    private _analyzeAstNamespaceImport;
    private _analyzeAstSymbol;
    /**
     * Used by analyze to recursively analyze the entire child tree.
     */
    private _analyzeChildTree;
    private _fetchEntityForNode;
    private _fetchAstDeclaration;
    private _fetchAstSymbol;
    /**
     * Returns the first parent satisfying isAstDeclaration(), or undefined if none is found.
     */
    private _tryFindFirstAstDeclarationParent;
}
//# sourceMappingURL=AstSymbolTable.d.ts.map