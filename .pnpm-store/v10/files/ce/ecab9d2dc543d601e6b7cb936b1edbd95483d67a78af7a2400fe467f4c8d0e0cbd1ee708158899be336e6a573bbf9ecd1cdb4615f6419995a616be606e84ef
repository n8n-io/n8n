import { Pair } from '../../nodes/Pair.js';
import { Scalar } from '../../nodes/Scalar.js';
import { ToJSContext } from '../../nodes/toJS.js';
import { YAMLMap } from '../../nodes/YAMLMap.js';
import type { Schema } from '../../schema/Schema.js';
import type { StringifyContext } from '../../stringify/stringify.js';
import { CreateNodeContext } from '../../util.js';
import type { CollectionTag } from '../types.js';
export declare class YAMLSet<T = unknown> extends YAMLMap<T, Scalar<null> | null> {
    static tag: string;
    constructor(schema?: Schema);
    add(key: T | Pair<T, Scalar<null> | null> | {
        key: T;
        value: Scalar<null> | null;
    }): void;
    /**
     * If `keepPair` is `true`, returns the Pair matching `key`.
     * Otherwise, returns the value of that Pair's key.
     */
    get(key: unknown, keepPair?: boolean): any;
    set(key: T, value: boolean): void;
    /** @deprecated Will throw; `value` must be boolean */
    set(key: T, value: null): void;
    toJSON(_?: unknown, ctx?: ToJSContext): any;
    toString(ctx?: StringifyContext, onComment?: () => void, onChompKeep?: () => void): string;
    static from(schema: Schema, iterable: unknown, ctx: CreateNodeContext): YAMLSet<unknown>;
}
export declare const set: CollectionTag;
