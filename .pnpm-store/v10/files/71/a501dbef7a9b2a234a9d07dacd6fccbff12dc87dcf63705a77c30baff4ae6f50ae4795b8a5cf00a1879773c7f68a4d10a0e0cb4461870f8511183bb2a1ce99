/**
 * @private
 */
export class ContentDoc {
    /**
     * @param {Doc} doc
     */
    constructor(doc: Doc);
    /**
     * @type {Doc}
     */
    doc: Doc;
    opts: any;
    /**
     * @return {number}
     */
    getLength(): number;
    /**
     * @return {Array<any>}
     */
    getContent(): Array<any>;
    /**
     * @return {boolean}
     */
    isCountable(): boolean;
    /**
     * @return {ContentDoc}
     */
    copy(): ContentDoc;
    /**
     * @param {number} offset
     * @return {ContentDoc}
     */
    splice(offset: number): ContentDoc;
    /**
     * @param {ContentDoc} right
     * @return {boolean}
     */
    mergeWith(right: ContentDoc): boolean;
    /**
     * @param {Transaction} transaction
     * @param {Item} item
     */
    integrate(transaction: Transaction, item: Item): void;
    /**
     * @param {Transaction} transaction
     */
    delete(transaction: Transaction): void;
    /**
     * @param {StructStore} store
     */
    gc(store: StructStore): void;
    /**
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
     * @param {number} offset
     */
    write(encoder: UpdateEncoderV1 | UpdateEncoderV2, offset: number): void;
    /**
     * @return {number}
     */
    getRef(): number;
}
export function readContentDoc(decoder: UpdateDecoderV1 | UpdateDecoderV2): ContentDoc;
import { Doc } from "../utils/Doc.js";
import { Transaction } from "../utils/Transaction.js";
import { Item } from "./Item.js";
import { StructStore } from "../utils/StructStore.js";
import { UpdateEncoderV1 } from "../utils/UpdateEncoder.js";
import { UpdateEncoderV2 } from "../utils/UpdateEncoder.js";
import { UpdateDecoderV1 } from "../utils/UpdateDecoder.js";
import { UpdateDecoderV2 } from "../utils/UpdateDecoder.js";
//# sourceMappingURL=ContentDoc.d.ts.map