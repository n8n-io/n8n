export class ContentDeleted {
    /**
     * @param {number} len
     */
    constructor(len: number);
    len: number;
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
     * @return {ContentDeleted}
     */
    copy(): ContentDeleted;
    /**
     * @param {number} offset
     * @return {ContentDeleted}
     */
    splice(offset: number): ContentDeleted;
    /**
     * @param {ContentDeleted} right
     * @return {boolean}
     */
    mergeWith(right: ContentDeleted): boolean;
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
export function readContentDeleted(decoder: UpdateDecoderV1 | UpdateDecoderV2): ContentDeleted;
import { Transaction } from "../utils/Transaction.js";
import { Item } from "./Item.js";
import { StructStore } from "../utils/StructStore.js";
import { UpdateEncoderV1 } from "../utils/UpdateEncoder.js";
import { UpdateEncoderV2 } from "../utils/UpdateEncoder.js";
import { UpdateDecoderV1 } from "../utils/UpdateDecoder.js";
import { UpdateDecoderV2 } from "../utils/UpdateDecoder.js";
//# sourceMappingURL=ContentDeleted.d.ts.map