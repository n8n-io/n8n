import type { ApiItem } from '../items/ApiItem';
/**
 * Generic result object for finding API items used by different kinds of find operations.
 * @public
 */
export interface IFindApiItemsResult {
    /**
     * The API items that were found. Not guaranteed to be complete, see `maybeIncompleteResult`.
     */
    items: ApiItem[];
    /**
     * Diagnostic messages regarding the find operation.
     */
    messages: IFindApiItemsMessage[];
    /**
     * Indicates whether the result is potentially incomplete due to errors during the find operation.
     * If true, the `messages` explain the errors in more detail.
     */
    maybeIncompleteResult: boolean;
}
/**
 * This object is used for messages returned as part of `IFindApiItemsResult`.
 * @public
 */
export interface IFindApiItemsMessage {
    /**
     * Unique identifier for the message.
     * @beta
     */
    messageId: FindApiItemsMessageId;
    /**
     * Text description of the message.
     */
    text: string;
}
/**
 * Unique identifiers for messages returned as part of `IFindApiItemsResult`.
 * @public
 */
export declare enum FindApiItemsMessageId {
    /**
     * "Unable to resolve declaration reference within API item ___: ___"
     */
    DeclarationResolutionFailed = "declaration-resolution-failed",
    /**
     * "Unable to analyze extends clause ___ of API item ___ because no canonical reference was found."
     */
    ExtendsClauseMissingReference = "extends-clause-missing-reference",
    /**
     * "Unable to analyze references of API item ___ because it is not associated with an ApiModel"
     */
    NoAssociatedApiModel = "no-associated-api-model",
    /**
     * "Unable to analyze references of API item ___ because it is of unsupported kind ___"
     */
    UnsupportedKind = "unsupported-kind"
}
//# sourceMappingURL=IFindApiItemsResult.d.ts.map