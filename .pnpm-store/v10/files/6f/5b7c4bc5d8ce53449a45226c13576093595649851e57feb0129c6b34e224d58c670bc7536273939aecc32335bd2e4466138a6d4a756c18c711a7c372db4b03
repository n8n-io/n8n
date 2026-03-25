import * as tsdoc from '@microsoft/tsdoc';
import { ApiItem, type IApiItemOptions, type IApiItemJson } from './ApiItem';
import type { DeserializerContext } from '../model/DeserializerContext';
/**
 * Constructor options for {@link ApiDocumentedItem}.
 * @public
 */
export interface IApiDocumentedItemOptions extends IApiItemOptions {
    docComment: tsdoc.DocComment | undefined;
}
export interface IApiDocumentedItemJson extends IApiItemJson {
    docComment: string;
}
/**
 * An abstract base class for API declarations that can have an associated TSDoc comment.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * @public
 */
export declare class ApiDocumentedItem extends ApiItem {
    private _tsdocComment;
    constructor(options: IApiDocumentedItemOptions);
    /** @override */
    static onDeserializeInto(options: Partial<IApiDocumentedItemOptions>, context: DeserializerContext, jsonObject: IApiItemJson): void;
    get tsdocComment(): tsdoc.DocComment | undefined;
    /** @override */
    serializeInto(jsonObject: Partial<IApiDocumentedItemJson>): void;
}
//# sourceMappingURL=ApiDocumentedItem.d.ts.map