import type { ClassLike } from '../types.js';
import type * as primitive from './primitives.js';
declare global {
    interface SymbolConstructor {
        readonly size: unique symbol;
        readonly serialize: unique symbol;
        readonly deserialize: unique symbol;
    }
}
export type TypeLike = Custom | Like | primitive.Valid | undefined | null;
export type Type = Custom | Static | primitive.Typename;
/**
 * Member initialization data
 * This is needed since class decorators are called *after* member decorators
 */
export interface MemberInit {
    name: string;
    type: string | ClassLike;
    length?: number | string;
}
/**
 * Options for struct initialization
 */
export interface Options {
    align: number;
    bigEndian: boolean;
    isUnion: boolean;
}
export interface Member {
    name: string;
    type: Type;
    staticOffset: number;
    length?: number | string;
    /** A C-style type/name declaration string, used for diagnostics */
    decl: string;
}
export interface Metadata {
    options: Partial<Options>;
    members: Map<string, Member>;
    staticSize: number;
    /** Whether the struct is dynamically sized */
    isDynamic: boolean;
    /** Whether the struct is a union */
    isUnion: boolean;
}
type _DecoratorMetadata<T extends Metadata = Metadata> = DecoratorMetadata & {
    struct?: T;
    structInit?: MemberInit[];
};
export interface DecoratorContext<T extends Metadata = Metadata> {
    metadata: _DecoratorMetadata<T>;
}
/**
 * Initializes the struct metadata for a class
 * This also handles copying metadata from parent classes
 */
export declare function initMetadata(context: DecoratorContext): MemberInit[];
export type MemberContext = ClassMemberDecoratorContext & DecoratorContext;
export interface Static<T extends Metadata = Metadata> {
    [Symbol.metadata]: {
        struct: T;
    };
    new (): Instance<T>;
    prototype: Instance<T>;
}
export interface StaticLike<T extends Metadata = Metadata> extends ClassLike {
    [Symbol.metadata]?: _DecoratorMetadata<T> | null;
    new (): unknown;
}
export declare function isValidMetadata<T extends Metadata = Metadata>(arg: unknown): arg is DecoratorMetadata & {
    struct: T;
};
/**
 * Polyfill context.metadata
 * @see https://github.com/microsoft/TypeScript/issues/53461
 * @internal @hidden
 */
export declare function _polyfill_metadata(target: object): void;
export declare function isStatic<T extends Metadata = Metadata>(arg: unknown): arg is Static<T>;
export interface Instance<T extends Metadata = Metadata> {
    constructor: Static<T>;
}
export interface InstanceLike<T extends Metadata = Metadata> {
    constructor: StaticLike<T>;
}
export declare function isInstance<T extends Metadata = Metadata>(arg: unknown): arg is Instance<T>;
export declare function checkInstance<T extends Metadata = Metadata>(arg: unknown): asserts arg is Instance<T> & Record<keyof any, any>;
export declare function isStruct<T extends Metadata = Metadata>(arg: unknown): arg is Instance<T> | Static<T>;
export declare function checkStruct<T extends Metadata = Metadata>(arg: unknown): asserts arg is Instance<T> | Static<T>;
/**
 * A "custom" type, which can be used to implement non-builtin size, serialization, and deserialization
 */
export interface Custom {
    readonly [Symbol.size]: number;
    [Symbol.serialize]?(): Uint8Array;
    [Symbol.deserialize]?(value: Uint8Array): void;
}
export declare function isCustom(arg: unknown): arg is Custom;
export type Like<T extends Metadata = Metadata> = InstanceLike<T> | StaticLike<T>;
export type Size<T extends TypeLike> = T extends undefined | null ? 0 : T extends {
    readonly [Symbol.size]: infer S extends number;
} ? S : T extends primitive.Valid ? primitive.Size<T> : number;
export {};
