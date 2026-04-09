import * as primitive from './internal/primitives.js';
import type { DecoratorContext, InstanceLike, MemberContext, Options, Size, StaticLike, TypeLike } from './internal/struct.js';
import type { ClassLike } from './types.js';
export * as Struct from './internal/struct.js';
/**
 * Gets the size in bytes of a type
 */
export declare function sizeof<T extends TypeLike>(type: T | T[]): Size<T>;
/**
 * Returns the offset (in bytes) of a member in a struct.
 */
export declare function offsetof(type: StaticLike | InstanceLike, memberName: string): number;
/**
 * Aligns a number
 */
export declare function align(value: number, alignment: number): number;
/**
 * Decorates a class as a struct
 */
export declare function struct(options?: Partial<Options>): <const T extends StaticLike>(target: T, context: ClassDecoratorContext & DecoratorContext) => T;
/**
 * Decorates a class member to be serialized
 */
export declare function member(type: primitive.Valid | ClassLike, length?: number | string): <V>(value: V, context: MemberContext) => V;
/**
 * Serializes a struct into a Uint8Array
 */
export declare function serialize(instance: unknown): Uint8Array;
/**
 * Deserializes a struct from a Uint8Array
 */
export declare function deserialize(instance: unknown, _buffer: ArrayBufferLike | ArrayBufferView): void;
declare function _member<T extends primitive.Valid>(type: T): {
    <const V>(length: number | string): (value: V, context: MemberContext) => V;
    <const V>(value: V, context: MemberContext): V;
};
/**
 * Shortcut types
 *
 * Instead of writing `@member(type)` you can write `@types.type`, or `@types.type(length)` for arrays
 */
export declare const types: { [K in primitive.Valid]: ReturnType<typeof _member<K>>; };
