/**
 * @private
 */
export class ContentFormat {
    /**
     * @param {string} key
     * @param {Object} value
     */
    constructor(key: string, value: Object);
    key: string;
    value: Object;
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
     * @return {ContentFormat}
     */
    copy(): ContentFormat;
    /**
     * @param {number} _offset
     * @return {ContentFormat}
     */
    splice(_offset: number): ContentFormat;
    /**
     * @param {ContentFormat} _right
     * @return {boolean}
     */
    mergeWith(_right: ContentFormat): boolean;
    /**
     * @param {Transaction} _transaction
     * @param {Item} item
     */
    integrate(_transaction: Transaction, item: Item): void;
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
export function readContentFormat(decoder: UpdateDecoderV1 | UpdateDecoderV2): ContentFormat;
import { Transaction } from "../utils/Transaction.js";
import { Item } from "./Item.js";
import { StructStore } from "../utils/StructStore.js";
import { UpdateEncoderV1 } from "../utils/UpdateEncoder.js";
import { UpdateEncoderV2 } from "../utils/UpdateEncoder.js";
import { UpdateDecoderV1 } from "../utils/UpdateDecoder.js";
import { UpdateDecoderV2 } from "../utils/UpdateDecoder.js";
//# sourceMappingURL=ContentFormat.d.ts.map