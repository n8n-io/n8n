/// <reference types="node" />
import { Duplex, DuplexOptions, Readable, Transform, Writable } from "stream";
import {
    final as finalType,
    getFinalValue as getFinalValueType,
    getManyValues as getManyValuesType,
    isFinal as isFinalType,
    isMany as isManyType,
    many as manyType,
    none as noneType,
} from "./defs";

export = Chain;

type TransformFunction = (chunk: any, encoding?: string) => any;

type Stream = Readable | Writable | Duplex | Transform;
type StreamItem = Stream | TransformFunction | null;

declare class Chain extends Duplex {
    constructor(fns: StreamItem[], options?: Chain.ChainOptions);

    input: Stream;
    output: Stream;
    streams: Stream[];

    /**
     * final() is a helper factory function, which can be used by chained
     * functions to return a special value which terminates the chain and uses
     * the passed value as the result of the chain.
     */
    final: typeof finalType;

    /**
     * isFinal() is a companion to final(). It checks if a value was marked as
     * final returning a standard truthy/falsy result.
     */
    isFinal: typeof isFinalType;

    /**
     * getFinalValue() is a companion to final() and isFinal(). Its argument
     * should be a wrapped final value. Its return is an unwrapped value.
     */
    getFinalValue: typeof getFinalValueType;

    /**
     * many() is a helper factory function, which is used to wrap arrays to be
     * interpreted as multiple values returned from a function.
     *
     * At the moment it is redundant: you can use a simple array to indicate that,
     * but a naked array is being deprecated and in future versions, it will be
     * passed as-is.
     *
     * The thinking is that using many() indicates the intention better.
     */
    many: typeof manyType;

    /**
     * isMany() is a companion to many(). It checks if a value was marked as
     * multiple values returning a standard truthy/falsy result.
     */
    isMany: typeof isManyType;

    /**
     * getManyValues() is a companion to many() and isMany(). Its argument should
     * be a wrapped multiple value. Its return is an unwrapped value (an array of
     * values).
     */
    getManyValues: typeof getManyValuesType;

    static sanitize(result: any, stream: Stream): void;

    static convertToTransform(fn: any): Transform | null;
}

declare namespace Chain {
    interface ChainOptions extends DuplexOptions {
        skipEvents?: boolean | undefined;
    }

    function make(fns: StreamItem[], options?: ChainOptions): Chain;

    namespace make {
        const Constructor: typeof Chain;
    }

    function chain(fns: StreamItem[], options?: ChainOptions): Chain;

    namespace chain {
        const Constructor: typeof Chain;
    }

    /** `none` is a special value, which terminates the chain and returns no value. */
    const none: typeof noneType;
}
