import { ResourceAttributes } from './types';
import { IResource } from './IResource';
/**
 * A Resource describes the entity for which a signals (metrics or trace) are
 * collected.
 */
export declare class Resource implements IResource {
    static readonly EMPTY: Resource;
    private _syncAttributes?;
    private _asyncAttributesPromise?;
    private _attributes?;
    /**
     * Check if async attributes have resolved. This is useful to avoid awaiting
     * waitForAsyncAttributes (which will introduce asynchronous behavior) when not necessary.
     *
     * @returns true if the resource "attributes" property is not yet settled to its final value
     */
    asyncAttributesPending?: boolean;
    /**
     * Returns an empty Resource
     */
    static empty(): IResource;
    /**
     * Returns a Resource that identifies the SDK in use.
     */
    static default(): IResource;
    constructor(
    /**
     * A dictionary of attributes with string keys and values that provide
     * information about the entity as numbers, strings or booleans
     * TODO: Consider to add check/validation on attributes.
     */
    attributes: ResourceAttributes, asyncAttributesPromise?: Promise<ResourceAttributes>);
    get attributes(): ResourceAttributes;
    /**
     * Returns a promise that will never be rejected. Resolves when all async attributes have finished being added to
     * this Resource's attributes. This is useful in exporters to block until resource detection
     * has finished.
     */
    waitForAsyncAttributes?(): Promise<void>;
    /**
     * Returns a new, merged {@link Resource} by merging the current Resource
     * with the other Resource. In case of a collision, other Resource takes
     * precedence.
     *
     * @param other the Resource that will be merged with this.
     * @returns the newly merged Resource.
     */
    merge(other: IResource | null): IResource;
}
//# sourceMappingURL=Resource.d.ts.map