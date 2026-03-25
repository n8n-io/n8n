import type * as ts from 'typescript';
import type { AstDeclaration } from './AstDeclaration';
import { AstEntity } from './AstEntity';
/**
 * Constructor options for AstSymbol
 */
export interface IAstSymbolOptions {
    readonly followedSymbol: ts.Symbol;
    readonly localName: string;
    readonly isExternal: boolean;
    readonly nominalAnalysis: boolean;
    readonly parentAstSymbol: AstSymbol | undefined;
    readonly rootAstSymbol: AstSymbol | undefined;
}
/**
 * The AstDeclaration and AstSymbol classes are API Extractor's equivalent of the compiler's
 * ts.Declaration and ts.Symbol objects.  They are created by the `AstSymbolTable` class.
 *
 * @remarks
 * The AstSymbol represents the ts.Symbol information for an AstDeclaration.  For example,
 * if a method has 3 overloads, each overloaded signature will have its own AstDeclaration,
 * but they will all share a common AstSymbol.
 *
 * For nested definitions, the AstSymbol has a unique parent (i.e. AstSymbol.rootAstSymbol),
 * but the parent/children for each AstDeclaration may be different.  Consider this example:
 *
 * ```ts
 * export namespace N {
 *   export function f(): void { }
 * }
 *
 * export interface N {
 *   g(): void;
 * }
 * ```
 *
 * Note how the parent/child relationships are different for the symbol tree versus
 * the declaration tree, and the declaration tree has two roots:
 *
 * ```
 * AstSymbol tree:            AstDeclaration tree:
 * - N                        - N (namespace)
 *   - f                        - f
 *   - g                      - N (interface)
 *                              - g
 * ```
 */
export declare class AstSymbol extends AstEntity {
    /** {@inheritdoc} */
    readonly localName: string;
    /**
     * If true, then the `followedSymbol` (i.e. original declaration) of this symbol
     * is not part of the working package.  The working package may still export this symbol,
     * but if so it should be emitted as an alias such as `export { X } from "package1";`.
     */
    readonly isExternal: boolean;
    /**
     * The compiler symbol where this type was defined, after following any aliases.
     *
     * @remarks
     * This is a normal form that can be reached from any symbol alias by calling
     * `TypeScriptHelpers.followAliases()`.  It can be compared to determine whether two
     * symbols refer to the same underlying type.
     */
    readonly followedSymbol: ts.Symbol;
    /**
     * If true, then this AstSymbol represents a foreign object whose structure will be
     * ignored.  The AstDeclaration objects will not have any parent or children, and its references
     * will not be analyzed.
     *
     * Nominal symbols are tracked e.g. when they are reexported by the working package.
     */
    readonly nominalAnalysis: boolean;
    /**
     * Returns the symbol of the parent of this AstSymbol, or undefined if there is no parent.
     * @remarks
     * If a symbol has multiple declarations, we assume (as an axiom) that their parent
     * declarations will belong to the same symbol.  This means that the "parent" of a
     * symbol is a well-defined concept.  However, the "children" of a symbol are not very
     * meaningful, because different declarations may have different nested members,
     * so we usually need to traverse declarations to find children.
     */
    readonly parentAstSymbol: AstSymbol | undefined;
    /**
     * Returns the symbol of the root of the AstDeclaration hierarchy.
     * @remarks
     * NOTE: If this AstSymbol is the root, then rootAstSymbol will point to itself.
     */
    readonly rootAstSymbol: AstSymbol;
    /**
     * Additional information that is calculated later by the `Collector`.  The actual type is `SymbolMetadata`,
     * but we declare it as `unknown` because consumers must obtain this object by calling
     * `Collector.fetchSymbolMetadata()`.
     */
    symbolMetadata: unknown;
    private readonly _astDeclarations;
    private _analyzed;
    constructor(options: IAstSymbolOptions);
    /**
     * The one or more declarations for this symbol.
     * @remarks
     * For example, if this symbol is a method, then the declarations might be
     * various method overloads.  If this symbol is a namespace, then the declarations
     * might be separate namespace blocks with the same name that get combined via
     * declaration merging.
     */
    get astDeclarations(): ReadonlyArray<AstDeclaration>;
    /**
     * Returns true if the AstSymbolTable.analyze() was called for this object.
     * See that function for details.
     * @remarks
     * AstSymbolTable.analyze() is always performed on the root AstSymbol.  This function
     * returns true if-and-only-if the root symbol was analyzed.
     */
    get analyzed(): boolean;
    /**
     * This is an internal callback used when the AstSymbolTable attaches a new
     * AstDeclaration to this object.
     * @internal
     */
    _notifyDeclarationAttach(astDeclaration: AstDeclaration): void;
    /**
     * This is an internal callback used when the AstSymbolTable.analyze()
     * has processed this object.
     * @internal
     */
    _notifyAnalyzed(): void;
    /**
     * Helper that calls AstDeclaration.forEachDeclarationRecursive() for each AstDeclaration.
     */
    forEachDeclarationRecursive(action: (astDeclaration: AstDeclaration) => void): void;
}
//# sourceMappingURL=AstSymbol.d.ts.map