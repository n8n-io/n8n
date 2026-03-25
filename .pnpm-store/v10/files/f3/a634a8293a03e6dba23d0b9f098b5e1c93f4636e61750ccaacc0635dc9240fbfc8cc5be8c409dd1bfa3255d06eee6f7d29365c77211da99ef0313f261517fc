/**
 * @type {Array<function(UpdateDecoderV1 | UpdateDecoderV2):AbstractType<any>>}
 * @private
 */
export const typeRefs: Array<(arg0: UpdateDecoderV1 | UpdateDecoderV2) => AbstractType<any>>;
export const YArrayRefID: 0;
export const YMapRefID: 1;
export const YTextRefID: 2;
export const YXmlElementRefID: 3;
export const YXmlFragmentRefID: 4;
export const YXmlHookRefID: 5;
export const YXmlTextRefID: 6;
/**
 * @private
 */
export class ContentType {
    /**
     * @param {AbstractType<any>} type
     */
    constructor(type: AbstractType<any>);
    /**
     * @type {AbstractType<any>}
     */
    type: AbstractType<any>;
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
     * @return {ContentType}
     */
    copy(): ContentType;
    /**
     * @param {number} offset
     * @return {ContentType}
     */
    splice(offset: number): ContentType;
    /**
     * @param {ContentType} right
     * @return {boolean}
     */
    mergeWith(right: ContentType): boolean;
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
export function readContentType(decoder: UpdateDecoderV1 | UpdateDecoderV2): ContentType;
import { UpdateDecoderV1 } from "../utils/UpdateDecoder.js";
import { UpdateDecoderV2 } from "../utils/UpdateDecoder.js";
import { AbstractType } from "../types/AbstractType.js";
import { Transaction } from "../utils/Transaction.js";
import { Item } from "./Item.js";
import { StructStore } from "../utils/StructStore.js";
import { UpdateEncoderV1 } from "../utils/UpdateEncoder.js";
import { UpdateEncoderV2 } from "../utils/UpdateEncoder.js";
//# sourceMappingURL=ContentType.d.ts.map