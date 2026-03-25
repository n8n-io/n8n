/**
 * A relative position is based on the Yjs model and is not affected by document changes.
 * E.g. If you place a relative position before a certain character, it will always point to this character.
 * If you place a relative position at the end of a type, it will always point to the end of the type.
 *
 * A numeric position is often unsuited for user selections, because it does not change when content is inserted
 * before or after.
 *
 * ```Insert(0, 'x')('a|bc') = 'xa|bc'``` Where | is the relative position.
 *
 * One of the properties must be defined.
 *
 * @example
 *   // Current cursor position is at position 10
 *   const relativePosition = createRelativePositionFromIndex(yText, 10)
 *   // modify yText
 *   yText.insert(0, 'abc')
 *   yText.delete(3, 10)
 *   // Compute the cursor position
 *   const absolutePosition = createAbsolutePositionFromRelativePosition(y, relativePosition)
 *   absolutePosition.type === yText // => true
 *   console.log('cursor location is ' + absolutePosition.index) // => cursor location is 3
 *
 */
export class RelativePosition {
    /**
     * @param {ID|null} type
     * @param {string|null} tname
     * @param {ID|null} item
     * @param {number} assoc
     */
    constructor(type: ID | null, tname: string | null, item: ID | null, assoc?: number);
    /**
     * @type {ID|null}
     */
    type: ID | null;
    /**
     * @type {string|null}
     */
    tname: string | null;
    /**
     * @type {ID | null}
     */
    item: ID | null;
    /**
     * A relative position is associated to a specific character. By default
     * assoc >= 0, the relative position is associated to the character
     * after the meant position.
     * I.e. position 1 in 'ab' is associated to character 'b'.
     *
     * If assoc < 0, then the relative position is associated to the character
     * before the meant position.
     *
     * @type {number}
     */
    assoc: number;
}
export function relativePositionToJSON(rpos: RelativePosition): any;
export function createRelativePositionFromJSON(json: any): RelativePosition;
export class AbsolutePosition {
    /**
     * @param {AbstractType<any>} type
     * @param {number} index
     * @param {number} [assoc]
     */
    constructor(type: AbstractType<any>, index: number, assoc?: number | undefined);
    /**
     * @type {AbstractType<any>}
     */
    type: AbstractType<any>;
    /**
     * @type {number}
     */
    index: number;
    assoc: number;
}
export function createAbsolutePosition(type: AbstractType<any>, index: number, assoc?: number | undefined): AbsolutePosition;
export function createRelativePosition(type: AbstractType<any>, item: ID | null, assoc?: number | undefined): RelativePosition;
export function createRelativePositionFromTypeIndex(type: AbstractType<any>, index: number, assoc?: number | undefined): RelativePosition;
export function writeRelativePosition(encoder: encoding.Encoder, rpos: RelativePosition): encoding.Encoder;
export function encodeRelativePosition(rpos: RelativePosition): Uint8Array;
export function readRelativePosition(decoder: decoding.Decoder): RelativePosition;
export function decodeRelativePosition(uint8Array: Uint8Array): RelativePosition;
export function createAbsolutePositionFromRelativePosition(rpos: RelativePosition, doc: Doc, followUndoneDeletions?: boolean): AbsolutePosition | null;
export function compareRelativePositions(a: RelativePosition | null, b: RelativePosition | null): boolean;
import { ID } from "./ID.js";
import { AbstractType } from "../types/AbstractType.js";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { Doc } from "./Doc.js";
//# sourceMappingURL=RelativePosition.d.ts.map