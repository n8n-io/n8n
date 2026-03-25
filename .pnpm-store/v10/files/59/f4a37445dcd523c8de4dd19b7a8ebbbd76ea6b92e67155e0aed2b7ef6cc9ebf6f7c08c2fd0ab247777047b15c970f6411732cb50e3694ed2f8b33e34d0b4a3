export class ID {
    /**
     * @param {number} client client id
     * @param {number} clock unique per client id, continuous number
     */
    constructor(client: number, clock: number);
    /**
     * Client id
     * @type {number}
     */
    client: number;
    /**
     * unique per client id, continuous number
     * @type {number}
     */
    clock: number;
}
export function compareIDs(a: ID | null, b: ID | null): boolean;
export function createID(client: number, clock: number): ID;
export function writeID(encoder: encoding.Encoder, id: ID): void;
export function readID(decoder: decoding.Decoder): ID;
export function findRootTypeKey(type: AbstractType<any>): string;
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { AbstractType } from "../types/AbstractType.js";
//# sourceMappingURL=ID.d.ts.map