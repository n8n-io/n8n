export class LazyStructReader {
    /**
     * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
     * @param {boolean} filterSkips
     */
    constructor(decoder: UpdateDecoderV1 | UpdateDecoderV2, filterSkips: boolean);
    gen: Generator<GC | Item | Skip, void, unknown>;
    /**
     * @type {null | Item | Skip | GC}
     */
    curr: null | Item | Skip | GC;
    done: boolean;
    filterSkips: boolean;
    /**
     * @return {Item | GC | Skip |null}
     */
    next(): Item | GC | Skip | null;
}
export function logUpdate(update: Uint8Array): void;
export function logUpdateV2(update: Uint8Array, YDecoder?: typeof UpdateDecoderV1 | typeof UpdateDecoderV2 | undefined): void;
export function decodeUpdate(update: Uint8Array): {
    structs: (GC | Item | Skip)[];
    ds: import("./DeleteSet.js").DeleteSet;
};
export function decodeUpdateV2(update: Uint8Array, YDecoder?: typeof UpdateDecoderV1 | typeof UpdateDecoderV2 | undefined): {
    structs: (GC | Item | Skip)[];
    ds: import("./DeleteSet.js").DeleteSet;
};
export class LazyStructWriter {
    /**
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
     */
    constructor(encoder: UpdateEncoderV1 | UpdateEncoderV2);
    currClient: number;
    startClock: number;
    written: number;
    encoder: UpdateEncoderV2 | UpdateEncoderV1;
    /**
     * We want to write operations lazily, but also we need to know beforehand how many operations we want to write for each client.
     *
     * This kind of meta-information (#clients, #structs-per-client-written) is written to the restEncoder.
     *
     * We fragment the restEncoder and store a slice of it per-client until we know how many clients there are.
     * When we flush (toUint8Array) we write the restEncoder using the fragments and the meta-information.
     *
     * @type {Array<{ written: number, restEncoder: Uint8Array }>}
     */
    clientStructs: {
        written: number;
        restEncoder: Uint8Array;
    }[];
}
export function mergeUpdates(updates: Array<Uint8Array>): Uint8Array;
export function encodeStateVectorFromUpdateV2(update: Uint8Array, YEncoder?: typeof DSEncoderV1 | typeof DSEncoderV2, YDecoder?: typeof UpdateDecoderV1 | typeof UpdateDecoderV2): Uint8Array;
export function encodeStateVectorFromUpdate(update: Uint8Array): Uint8Array;
export function parseUpdateMetaV2(update: Uint8Array, YDecoder?: typeof UpdateDecoderV1 | typeof UpdateDecoderV2): {
    from: Map<number, number>;
    to: Map<number, number>;
};
export function parseUpdateMeta(update: Uint8Array): {
    from: Map<number, number>;
    to: Map<number, number>;
};
export function mergeUpdatesV2(updates: Array<Uint8Array>, YDecoder?: typeof UpdateDecoderV1 | typeof UpdateDecoderV2 | undefined, YEncoder?: typeof UpdateEncoderV2 | typeof UpdateEncoderV1 | undefined): Uint8Array;
export function diffUpdateV2(update: Uint8Array, sv: Uint8Array, YDecoder?: typeof UpdateDecoderV1 | typeof UpdateDecoderV2 | undefined, YEncoder?: typeof UpdateEncoderV2 | typeof UpdateEncoderV1 | undefined): Uint8Array;
export function diffUpdate(update: Uint8Array, sv: Uint8Array): Uint8Array;
export function convertUpdateFormat(update: Uint8Array, blockTransformer: (arg0: Item | GC | Skip) => Item | GC | Skip, YDecoder: typeof UpdateDecoderV2 | typeof UpdateDecoderV1, YEncoder: typeof UpdateEncoderV2 | typeof UpdateEncoderV1): Uint8Array;
export function obfuscateUpdate(update: Uint8Array, opts?: ObfuscatorOptions | undefined): Uint8Array;
export function obfuscateUpdateV2(update: Uint8Array, opts?: ObfuscatorOptions | undefined): Uint8Array;
export function convertUpdateFormatV1ToV2(update: Uint8Array): Uint8Array;
export function convertUpdateFormatV2ToV1(update: Uint8Array): Uint8Array;
export type ObfuscatorOptions = {
    formatting?: boolean | undefined;
    subdocs?: boolean | undefined;
    /**
     * Whether to obfuscate nodeName / hookName
     */
    yxml?: boolean | undefined;
};
import { GC } from "../structs/GC.js";
import { Item } from "../structs/Item.js";
import { Skip } from "../structs/Skip.js";
import { UpdateDecoderV1 } from "./UpdateDecoder.js";
import { UpdateDecoderV2 } from "./UpdateDecoder.js";
import { UpdateEncoderV2 } from "./UpdateEncoder.js";
import { UpdateEncoderV1 } from "./UpdateEncoder.js";
import { DSEncoderV1 } from "./UpdateEncoder.js";
import { DSEncoderV2 } from "./UpdateEncoder.js";
//# sourceMappingURL=updates.d.ts.map