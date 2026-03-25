import * as ts from 'typescript';
import type { AstSymbol } from './AstSymbol';
import type { AstEntity } from './AstEntity';
/**
 * Constructor options for AstDeclaration
 */
export interface IAstDeclarationOptions {
    readonly declaration: ts.Declaration;
    readonly astSymbol: AstSymbol;
    readonly parent: AstDeclaration | undefined;
}
/**
 * The AstDeclaration and AstSymbol classes are API Extractor's equivalent of the compiler's
 * ts.Declaration and ts.Symbol objects.  They are created by the `AstSymbolTable` class.
 *
 * @remarks
 * The AstDeclaration represents one or more syntax components of a symbol.  Usually there is
 * only one AstDeclaration per AstSymbol, but certain TypeScript constructs can have multiple
 * declarations (e.g. overloaded functions, merged declarations, etc.).
 *
 * Because of this, the `AstDeclaration` manages the parent/child nesting hierarchy (e.g. with
 * declaration merging, each declaration has its own children) and becomes the main focus
 * of analyzing AEDoc and emitting *.d.ts files.
 *
 * The AstDeclarations correspond to items from the compiler's ts.Node hierarchy, but
 * omitting/skipping any nodes that don't match the AstDeclaration.isSupportedSyntaxKind()
 * criteria.  This simplification makes the other API Extractor stages easier to implement.
 */
export declare class AstDeclaration {
    readonly declaration: ts.Declaration;
    readonly astSymbol: AstSymbol;
    /**
     * The parent, if this object is nested inside another AstDeclaration.
     */
    readonly parent: AstDeclaration | undefined;
    /**
     * A bit set of TypeScript modifiers such as "private", "protected", etc.
     */
    readonly modifierFlags: ts.ModifierFlags;
    /**
     * Additional information that is calculated later by the `Collector`.  The actual type is `DeclarationMetadata`,
     * but we declare it as `unknown` because consumers must obtain this object by calling
     * `Collector.fetchDeclarationMetadata()`.
     */
    declarationMetadata: unknown;
    /**
     * Additional information that is calculated later by the `Collector`.  The actual type is `ApiItemMetadata`,
     * but we declare it as `unknown` because consumers must obtain this object by calling
     * `Collector.fetchApiItemMetadata()`.
     */
    apiItemMetadata: unknown;
    private readonly _analyzedChildren;
    private readonly _analyzedReferencedAstEntitiesSet;
    private _childrenByName;
    constructor(options: IAstDeclarationOptions);
    /**
     * Returns the children for this AstDeclaration.
     * @remarks
     * The collection will be empty until AstSymbol.analyzed is true.
     */
    get children(): ReadonlyArray<AstDeclaration>;
    /**
     * Returns the AstEntity objects referenced by this node.
     * @remarks
     * NOTE: The collection will be empty until AstSymbol.analyzed is true.
     *
     * Since we assume references are always collected by a traversal starting at the
     * root of the nesting declarations, this array omits the following items because they
     * would be redundant:
     * - symbols corresponding to parents of this declaration (e.g. a method that returns its own class)
     * - symbols already listed in the referencedAstSymbols property for parents of this declaration
     *   (e.g. a method that returns its own class's base class)
     * - symbols that are referenced only by nested children of this declaration
     *   (e.g. if a method returns an enum, this doesn't imply that the method's class references that enum)
     */
    get referencedAstEntities(): ReadonlyArray<AstEntity>;
    /**
     * This is an internal callback used when the AstSymbolTable attaches a new
     * child AstDeclaration to this object.
     * @internal
     */
    _notifyChildAttach(child: AstDeclaration): void;
    /**
     * Returns a diagnostic dump of the tree, which reports the hierarchy of
     * AstDefinition objects.
     */
    getDump(indent?: string): string;
    /**
     * Returns a diagnostic dump using Span.getDump(), which reports the detailed
     * compiler structure.
     */
    getSpanDump(indent?: string): string;
    /**
     * This is an internal callback used when AstSymbolTable.analyze() discovers a new
     * type reference associated with this declaration.
     * @internal
     */
    _notifyReferencedAstEntity(referencedAstEntity: AstEntity): void;
    /**
     * Visits all the current declaration and all children recursively in a depth-first traversal,
     * and performs the specified action for each one.
     */
    forEachDeclarationRecursive(action: (astDeclaration: AstDeclaration) => void): void;
    /**
     * Returns the list of child declarations whose `AstSymbol.localName` matches the provided `name`.
     *
     * @remarks
     * This is an efficient O(1) lookup.
     */
    findChildrenWithName(name: string): ReadonlyArray<AstDeclaration>;
    /**
     * This function determines which ts.Node kinds will generate an AstDeclaration.
     * These correspond to the definitions that we can add AEDoc to.
     */
    static isSupportedSyntaxKind(kind: ts.SyntaxKind): boolean;
}
//# sourceMappingURL=AstDeclaration.d.ts.map