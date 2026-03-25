import { DocNodeKind, DocNode, type IDocNodeParameters } from './DocNode';
import type { DocParamBlock } from './DocParamBlock';
/**
 * Constructor parameters for {@link DocParamCollection}.
 */
export interface IDocParamCollectionParameters extends IDocNodeParameters {
}
/**
 * Represents a collection of DocParamBlock objects and provides efficient operations for looking up the
 * documentation for a specified parameter name.
 */
export declare class DocParamCollection extends DocNode {
    private readonly _blocks;
    private _blocksByName;
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters: IDocParamCollectionParameters);
    /** @override */
    get kind(): DocNodeKind | string;
    /**
     * Provide an iterator for callers that support it.
     */
    [Symbol.iterator](): IterableIterator<DocParamBlock>;
    /**
     * Returns the blocks in this collection.
     */
    get blocks(): ReadonlyArray<DocParamBlock>;
    /**
     * Returns the number of blocks in this collection.
     */
    get count(): number;
    /**
     * Adds a new block to the collection.
     */
    add(docParamBlock: DocParamBlock): void;
    /**
     * Removes all blocks from the collection
     */
    clear(): void;
    /**
     * Returns the first block whose `parameterName` matches the specified string.
     *
     * @remarks
     * If the collection was parsed from an input containing errors, there could potentially be more than
     * one DocParamBlock with the same name.  In this situation, tryGetBlockByName() will return the first match
     * that it finds.
     *
     * This lookup is optimized using a dictionary.
     */
    tryGetBlockByName(parameterName: string): DocParamBlock | undefined;
    /** @override */
    protected onGetChildNodes(): ReadonlyArray<DocNode | undefined>;
}
//# sourceMappingURL=DocParamCollection.d.ts.map