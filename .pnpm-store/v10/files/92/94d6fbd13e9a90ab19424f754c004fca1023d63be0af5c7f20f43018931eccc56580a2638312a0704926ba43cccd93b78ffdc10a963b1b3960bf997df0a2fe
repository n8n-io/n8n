import { CreateNodeContext } from '../doc/createNode.js';
import type { CollectionItem } from '../parse/cst.js';
import type { Schema } from '../schema/Schema.js';
import type { StringifyContext } from '../stringify/stringify.js';
import { addPairToJSMap } from './addPairToJSMap.js';
import { NODE_TYPE } from './identity.js';
import type { ToJSContext } from './toJS.js';
export declare function createPair(key: unknown, value: unknown, ctx: CreateNodeContext): Pair<import("./Node.js").Node, import("./YAMLMap.js").YAMLMap<unknown, unknown> | import("./Scalar.js").Scalar<unknown> | import("./Alias.js").Alias | import("./YAMLSeq.js").YAMLSeq<unknown>>;
export declare class Pair<K = unknown, V = unknown> {
    readonly [NODE_TYPE]: symbol;
    /** Always Node or null when parsed, but can be set to anything. */
    key: K;
    /** Always Node or null when parsed, but can be set to anything. */
    value: V | null;
    /** The CST token that was composed into this pair.  */
    srcToken?: CollectionItem;
    constructor(key: K, value?: V | null);
    clone(schema?: Schema): Pair<K, V>;
    toJSON(_?: unknown, ctx?: ToJSContext): ReturnType<typeof addPairToJSMap>;
    toString(ctx?: StringifyContext, onComment?: () => void, onChompKeep?: () => void): string;
}
