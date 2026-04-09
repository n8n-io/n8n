import type { ClassLike } from '../types.js';
import type * as primitive from './primitives.js';

declare global {
	interface SymbolConstructor {
		readonly size: unique symbol;
		readonly serialize: unique symbol;
		readonly deserialize: unique symbol;
	}
}

/**
 * Polyfill Symbol.metadata
 * @see https://github.com/microsoft/TypeScript/issues/53461
 */
(Symbol as { metadata: symbol }).metadata ??= Symbol.for('Symbol.metadata');

Object.assign(Symbol, {
	size: Symbol('uSize'),
	serialize: Symbol('uSerialize'),
	deserialize: Symbol('uDeserialize'),
});

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
export function initMetadata(context: DecoratorContext): MemberInit[] {
	context.metadata ??= {};

	context.metadata.structInit = [...(context.metadata.structInit ?? [])];

	return context.metadata.structInit;
}

export type MemberContext = ClassMemberDecoratorContext & DecoratorContext;

export interface Static<T extends Metadata = Metadata> {
	[Symbol.metadata]: { struct: T };
	new (): Instance<T>;
	prototype: Instance<T>;
}

export interface StaticLike<T extends Metadata = Metadata> extends ClassLike {
	[Symbol.metadata]?: _DecoratorMetadata<T> | null;
	new (): unknown;
}

export function isValidMetadata<T extends Metadata = Metadata>(
	arg: unknown
): arg is DecoratorMetadata & {
	struct: T;
} {
	return arg != null && typeof arg == 'object' && 'struct' in arg;
}

/**
 * Polyfill context.metadata
 * @see https://github.com/microsoft/TypeScript/issues/53461
 * @internal @hidden
 */
export function _polyfill_metadata(target: object): void {
	if (Symbol.metadata in target) return;

	Object.defineProperty(target, Symbol.metadata, {
		enumerable: true,
		configurable: true,
		writable: true,
		value: Object.create(null),
	});
}

export function isStatic<T extends Metadata = Metadata>(arg: unknown): arg is Static<T> {
	return typeof arg == 'function' && Symbol.metadata in arg && isValidMetadata(arg[Symbol.metadata]);
}

export interface Instance<T extends Metadata = Metadata> {
	constructor: Static<T>;
}

export interface InstanceLike<T extends Metadata = Metadata> {
	constructor: StaticLike<T>;
}

export function isInstance<T extends Metadata = Metadata>(arg: unknown): arg is Instance<T> {
	return arg != null && typeof arg == 'object' && isStatic(arg.constructor);
}

export function checkInstance<T extends Metadata = Metadata>(
	arg: unknown
): asserts arg is Instance<T> & Record<keyof any, any> {
	if (isInstance(arg)) return;
	throw new TypeError(
		(typeof arg == 'function' ? arg.name : typeof arg == 'object' && arg ? arg.constructor.name : arg)
			+ ' is not a struct instance'
	);
}

export function isStruct<T extends Metadata = Metadata>(arg: unknown): arg is Instance<T> | Static<T> {
	return isInstance(arg) || isStatic(arg);
}

export function checkStruct<T extends Metadata = Metadata>(arg: unknown): asserts arg is Instance<T> | Static<T> {
	if (isStruct(arg)) return;
	throw new TypeError(
		(typeof arg == 'function' ? arg.name : typeof arg == 'object' && arg ? arg.constructor.name : arg)
			+ ' is not a struct'
	);
}

/**
 * A "custom" type, which can be used to implement non-builtin size, serialization, and deserialization
 */
export interface Custom {
	readonly [Symbol.size]: number;
	[Symbol.serialize]?(): Uint8Array;
	[Symbol.deserialize]?(value: Uint8Array): void;
}

export function isCustom(arg: unknown): arg is Custom {
	return typeof arg == 'object' && arg != null && Symbol.size in arg;
}

export type Like<T extends Metadata = Metadata> = InstanceLike<T> | StaticLike<T>;

export type Size<T extends TypeLike> = T extends undefined | null
	? 0
	: T extends { readonly [Symbol.size]: infer S extends number }
		? S
		: T extends primitive.Valid
			? primitive.Size<T>
			: number;
