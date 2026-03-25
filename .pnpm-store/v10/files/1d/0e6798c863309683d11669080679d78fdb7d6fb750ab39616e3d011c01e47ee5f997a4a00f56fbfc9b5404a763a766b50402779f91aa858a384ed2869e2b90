import { DocNode, DocNodeKind, type IDocNodeParameters, type IDocNodeParsedParameters } from './DocNode';
import type { DocMemberReference } from './DocMemberReference';
import type { TokenSequence } from '../parser/TokenSequence';
/**
 * Constructor parameters for {@link DocDeclarationReference}.
 */
export interface IDocDeclarationReferenceParameters extends IDocNodeParameters {
    packageName?: string;
    importPath?: string;
    memberReferences?: DocMemberReference[];
}
/**
 * Constructor parameters for {@link DocDeclarationReference}.
 */
export interface IDocDeclarationReferenceParsedParameters extends IDocNodeParsedParameters {
    packageNameExcerpt?: TokenSequence;
    importPathExcerpt?: TokenSequence;
    importHashExcerpt?: TokenSequence;
    spacingAfterImportHashExcerpt?: TokenSequence;
    memberReferences?: DocMemberReference[];
}
/**
 * Represents a declaration reference.
 *
 * @remarks
 * Declaration references are TSDoc expressions used by tags such as `{@link}`
 * or `{@inheritDoc}` that need to refer to another declaration.
 */
export declare class DocDeclarationReference extends DocNode {
    private _packageName;
    private readonly _packageNameExcerpt;
    private _importPath;
    private readonly _importPathExcerpt;
    private readonly _importHashExcerpt;
    private readonly _spacingAfterImportHashExcerpt;
    private readonly _memberReferences;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocDeclarationReferenceParameters | IDocDeclarationReferenceParsedParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * The optional package name, which may optionally include an NPM scope.
     *
     * Example: `"@scope/my-package"`
     */
    get packageName(): string | undefined;
    /**
     * The optional import path.  If a package name is provided, then if an import path is provided,
     * the path must start with a "/" delimiter; otherwise paths are resolved relative to the source file
     * containing the reference.
     *
     * Example: `"/path1/path2"`
     * Example: `"./path1/path2"`
     * Example: `"../path2/path2"`
     */
    get importPath(): string | undefined;
    /**
     * The chain of member references that indicate the declaration being referenced.
     * If this list is empty, then either the packageName or importPath must be provided,
     * because the reference refers to a module.
     */
    get memberReferences(): ReadonlyArray<DocMemberReference>;
    /**
     * Generates the TSDoc representation of this declaration reference.
     */
    emitAsTsdoc(): string;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocDeclarationReference.d.ts.map