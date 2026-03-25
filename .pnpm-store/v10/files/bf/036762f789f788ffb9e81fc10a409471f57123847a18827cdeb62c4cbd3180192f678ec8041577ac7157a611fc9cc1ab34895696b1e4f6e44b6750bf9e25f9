export class Snapshot {
    /**
     * @param {DeleteSet} ds
     * @param {Map<number,number>} sv state map
     */
    constructor(ds: DeleteSet, sv: Map<number, number>);
    /**
     * @type {DeleteSet}
     */
    ds: DeleteSet;
    /**
     * State Map
     * @type {Map<number,number>}
     */
    sv: Map<number, number>;
}
export function equalSnapshots(snap1: Snapshot, snap2: Snapshot): boolean;
export function encodeSnapshotV2(snapshot: Snapshot, encoder?: DSEncoderV1 | DSEncoderV2 | undefined): Uint8Array;
export function encodeSnapshot(snapshot: Snapshot): Uint8Array;
export function decodeSnapshotV2(buf: Uint8Array, decoder?: DSDecoderV1 | DSDecoderV2 | undefined): Snapshot;
export function decodeSnapshot(buf: Uint8Array): Snapshot;
export function createSnapshot(ds: DeleteSet, sm: Map<number, number>): Snapshot;
export const emptySnapshot: Snapshot;
export function snapshot(doc: Doc): Snapshot;
export function isVisible(item: Item, snapshot: Snapshot | undefined): boolean;
export function splitSnapshotAffectedStructs(transaction: Transaction, snapshot: Snapshot): void;
export function createDocFromSnapshot(originDoc: Doc, snapshot: Snapshot, newDoc?: Doc | undefined): Doc;
export function snapshotContainsUpdateV2(snapshot: Snapshot, update: Uint8Array, YDecoder?: typeof UpdateDecoderV1 | typeof UpdateDecoderV2 | undefined): boolean;
export function snapshotContainsUpdate(snapshot: Snapshot, update: Uint8Array): boolean;
import { DeleteSet } from "./DeleteSet.js";
import { DSEncoderV1 } from "./UpdateEncoder.js";
import { DSEncoderV2 } from "./UpdateEncoder.js";
import { DSDecoderV1 } from "./UpdateDecoder.js";
import { DSDecoderV2 } from "./UpdateDecoder.js";
import { Doc } from "./Doc.js";
import { Item } from "../structs/Item.js";
import { Transaction } from "./Transaction.js";
import { UpdateDecoderV1 } from "./UpdateDecoder.js";
import { UpdateDecoderV2 } from "./UpdateDecoder.js";
//# sourceMappingURL=Snapshot.d.ts.map