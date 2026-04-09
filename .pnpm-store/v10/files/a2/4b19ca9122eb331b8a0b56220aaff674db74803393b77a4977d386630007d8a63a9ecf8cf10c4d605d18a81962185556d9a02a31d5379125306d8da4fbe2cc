import type {Simplify} from '../simplify';
import type {UnknownArray} from '../unknown-array';
import type {IsEqual} from '../is-equal';
import type {KeysOfUnion} from '../keys-of-union';
import type {RequiredKeysOf} from '../required-keys-of';
import type {Merge} from '../merge';
import type {IfAny} from '../if-any';
import type {IfNever} from '../if-never';
import type {OptionalKeysOf} from '../optional-keys-of';
import type {FilterDefinedKeys, FilterOptionalKeys} from './keys';
import type {NonRecursiveType} from './type';
import type {ToString} from './string';

/**
Create an object type with the given key `<Key>` and value `<Value>`.

It will copy the prefix and optional status of the same key from the given object `CopiedFrom` into the result.

@example
```
type A = BuildObject<'a', string>;
//=> {a: string}

// Copy `readonly` and `?` from the key `a` of `{readonly a?: any}`
type B = BuildObject<'a', string, {readonly a?: any}>;
//=> {readonly a?: string}
```
*/
export type BuildObject<Key extends PropertyKey, Value, CopiedFrom extends object = {}> =
	Key extends keyof CopiedFrom
		? Pick<{[_ in keyof CopiedFrom]: Value}, Key>
		: Key extends `${infer NumberKey extends number}`
			? NumberKey extends keyof CopiedFrom
				? Pick<{[_ in keyof CopiedFrom]: Value}, NumberKey>
				: {[_ in Key]: Value}
			: {[_ in Key]: Value};

/**
Returns a boolean for whether the given type is a plain key-value object.
*/
export type IsPlainObject<T> =
	T extends NonRecursiveType | UnknownArray | ReadonlyMap<unknown, unknown> | ReadonlySet<unknown>
		? false
		: T extends object
			? true
			: false;

/**
Extract the object field type if T is an object and K is a key of T, return `never` otherwise.

It creates a type-safe way to access the member type of `unknown` type.
*/
export type ObjectValue<T, K> =
	K extends keyof T
		? T[K]
		: ToString<K> extends keyof T
			? T[ToString<K>]
			: K extends `${infer NumberK extends number}`
				? NumberK extends keyof T
					? T[NumberK]
					: never
				: never;

/**
For an object T, if it has any properties that are a union with `undefined`, make those into optional properties instead.

@example
```
type User = {
	firstName: string;
	lastName: string | undefined;
};

type OptionalizedUser = UndefinedToOptional<User>;
//=> {
// 	firstName: string;
// 	lastName?: string;
// }
```
*/
export type UndefinedToOptional<T extends object> = Simplify<
{
	// Property is not a union with `undefined`, keep it as-is.
	[Key in keyof Pick<T, FilterDefinedKeys<T>>]: T[Key];
} & {
	// Property _is_ a union with defined value. Set as optional (via `?`) and remove `undefined` from the union.
	[Key in keyof Pick<T, FilterOptionalKeys<T>>]?: Exclude<T[Key], undefined>;
}
>;

/**
Works similar to the built-in `Pick` utility type, except for the following differences:
- Distributes over union types and allows picking keys from any member of the union type.
- Primitives types are returned as-is.
- Picks all keys if `Keys` is `any`.
- Doesn't pick `number` from a `string` index signature.

@example
```
type ImageUpload = {
	url: string;
	size: number;
	thumbnailUrl: string;
};

type VideoUpload = {
	url: string;
	duration: number;
	encodingFormat: string;
};

// Distributes over union types and allows picking keys from any member of the union type
type MediaDisplay = HomomorphicPick<ImageUpload | VideoUpload, "url" | "size" | "duration">;
//=> {url: string; size: number} | {url: string; duration: number}

// Primitive types are returned as-is
type Primitive = HomomorphicPick<string | number, 'toUpperCase' | 'toString'>;
//=> string | number

// Picks all keys if `Keys` is `any`
type Any = HomomorphicPick<{a: 1; b: 2} | {c: 3}, any>;
//=> {a: 1; b: 2} | {c: 3}

// Doesn't pick `number` from a `string` index signature
type IndexSignature = HomomorphicPick<{[k: string]: unknown}, number>;
//=> {}
*/
export type HomomorphicPick<T, Keys extends KeysOfUnion<T>> = {
	[P in keyof T as Extract<P, Keys>]: T[P]
};

/**
Extract all possible values for a given key from a union of object types.

@example
```
type Statuses = ValueOfUnion<{ id: 1, status: "open" } | { id: 2, status: "closed" }, "status">;
//=> "open" | "closed"
```
*/
export type ValueOfUnion<Union, Key extends KeysOfUnion<Union>> =
	Union extends unknown ? Key extends keyof Union ? Union[Key] : never : never;

/**
Extract all readonly keys from a union of object types.

@example
```
type User = {
		readonly id: string;
		name: string;
};

type Post = {
		readonly id: string;
		readonly author: string;
		body: string;
};

type ReadonlyKeys = ReadonlyKeysOfUnion<User | Post>;
//=> "id" | "author"
```
*/
export type ReadonlyKeysOfUnion<Union> = Union extends unknown ? keyof {
	[Key in keyof Union as IsEqual<{[K in Key]: Union[Key]}, {readonly [K in Key]: Union[Key]}> extends true ? Key : never]: never
} : never;

/**
Merges user specified options with default options.

@example
```
type PathsOptions = {maxRecursionDepth?: number; leavesOnly?: boolean};
type DefaultPathsOptions = {maxRecursionDepth: 10; leavesOnly: false};
type SpecifiedOptions = {leavesOnly: true};

type Result = ApplyDefaultOptions<PathsOptions, DefaultPathsOptions, SpecifiedOptions>;
//=> {maxRecursionDepth: 10; leavesOnly: true}
```

@example
```
// Complains if default values are not provided for optional options

type PathsOptions = {maxRecursionDepth?: number; leavesOnly?: boolean};
type DefaultPathsOptions = {maxRecursionDepth: 10};
type SpecifiedOptions = {};

type Result = ApplyDefaultOptions<PathsOptions, DefaultPathsOptions, SpecifiedOptions>;
//                                              ~~~~~~~~~~~~~~~~~~~
// Property 'leavesOnly' is missing in type 'DefaultPathsOptions' but required in type '{ maxRecursionDepth: number; leavesOnly: boolean; }'.
```

@example
```
// Complains if an option's default type does not conform to the expected type

type PathsOptions = {maxRecursionDepth?: number; leavesOnly?: boolean};
type DefaultPathsOptions = {maxRecursionDepth: 10; leavesOnly: 'no'};
type SpecifiedOptions = {};

type Result = ApplyDefaultOptions<PathsOptions, DefaultPathsOptions, SpecifiedOptions>;
//                                              ~~~~~~~~~~~~~~~~~~~
// Types of property 'leavesOnly' are incompatible. Type 'string' is not assignable to type 'boolean'.
```

@example
```
// Complains if an option's specified type does not conform to the expected type

type PathsOptions = {maxRecursionDepth?: number; leavesOnly?: boolean};
type DefaultPathsOptions = {maxRecursionDepth: 10; leavesOnly: false};
type SpecifiedOptions = {leavesOnly: 'yes'};

type Result = ApplyDefaultOptions<PathsOptions, DefaultPathsOptions, SpecifiedOptions>;
//                                                                   ~~~~~~~~~~~~~~~~
// Types of property 'leavesOnly' are incompatible. Type 'string' is not assignable to type 'boolean'.
```
*/
export type ApplyDefaultOptions<
	Options extends object,
	Defaults extends Simplify<Omit<Required<Options>, RequiredKeysOf<Options>> & Partial<Record<RequiredKeysOf<Options>, never>>>,
	SpecifiedOptions extends Options,
> =
	IfAny<SpecifiedOptions, Defaults,
	IfNever<SpecifiedOptions, Defaults,
	Simplify<Merge<Defaults, {
		[Key in keyof SpecifiedOptions
		as Key extends OptionalKeysOf<Options>
			? Extract<SpecifiedOptions[Key], undefined> extends never
				? Key
				: never
			: Key
		]: SpecifiedOptions[Key]
	}> & Required<Options>> // `& Required<Options>` ensures that `ApplyDefaultOptions<SomeOption, ...>` is always assignable to `Required<SomeOption>`
	>>;
