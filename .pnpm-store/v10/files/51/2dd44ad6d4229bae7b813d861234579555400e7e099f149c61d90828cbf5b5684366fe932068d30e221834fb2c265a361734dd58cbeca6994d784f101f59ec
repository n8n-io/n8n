import type {Primitive} from './primitive';
import type {Numeric} from './numeric';
import type {IsNotFalse, IsPrimitive} from './internal';
import type {IsNever} from './is-never';

/**
Returns a boolean for whether the given type `T` is the specified `LiteralType`.

@link https://stackoverflow.com/a/52806744/10292952

@example
```
LiteralCheck<1, number>
//=> true

LiteralCheck<number, number>
//=> false

LiteralCheck<1, string>
//=> false
```
*/
type LiteralCheck<T, LiteralType extends Primitive> = (
	IsNever<T> extends false // Must be wider than `never`
		? [T] extends [LiteralType & infer U] // Remove any branding
			? [U] extends [LiteralType] // Must be narrower than `LiteralType`
				? [LiteralType] extends [U] // Cannot be wider than `LiteralType`
					? false
					: true
				: false
			: false
		: false
);

/**
Returns a boolean for whether the given type `T` is one of the specified literal types in `LiteralUnionType`.

@example
```
LiteralChecks<1, Numeric>
//=> true

LiteralChecks<1n, Numeric>
//=> true

LiteralChecks<bigint, Numeric>
//=> false
```
*/
type LiteralChecks<T, LiteralUnionType> = (
	// Conditional type to force union distribution.
	// If `T` is none of the literal types in the union `LiteralUnionType`, then `LiteralCheck<T, LiteralType>` will evaluate to `false` for the whole union.
	// If `T` is one of the literal types in the union, it will evaluate to `boolean` (i.e. `true | false`)
	IsNotFalse<LiteralUnionType extends Primitive
		? LiteralCheck<T, LiteralUnionType>
		: never
	>
);

/**
Returns a boolean for whether the given type is a `string` [literal type](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types).

Useful for:
	- providing strongly-typed string manipulation functions
	- constraining strings to be a string literal
	- type utilities, such as when constructing parsers and ASTs

@example
```
import type {IsStringLiteral} from 'type-fest';

type CapitalizedString<T extends string> = IsStringLiteral<T> extends true ? Capitalize<T> : string;

// https://github.com/yankeeinlondon/native-dash/blob/master/src/capitalize.ts
function capitalize<T extends Readonly<string>>(input: T): CapitalizedString<T> {
	return (input.slice(0, 1).toUpperCase() + input.slice(1)) as CapitalizedString<T>;
}

const output = capitalize('hello, world!');
//=> 'Hello, world!'
```

@category Type Guard
@category Utilities
*/
export type IsStringLiteral<T> = LiteralCheck<T, string>;

/**
Returns a boolean for whether the given type is a `number` or `bigint` [literal type](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types).

Useful for:
	- providing strongly-typed functions when given literal arguments
	- type utilities, such as when constructing parsers and ASTs

@example
```
import type {IsNumericLiteral} from 'type-fest';

// https://github.com/inocan-group/inferred-types/blob/master/src/types/boolean-logic/EndsWith.ts
type EndsWith<TValue, TEndsWith extends string> =
	TValue extends string
		? IsStringLiteral<TEndsWith> extends true
			? IsStringLiteral<TValue> extends true
				? TValue extends `${string}${TEndsWith}`
					? true
					: false
				: boolean
			: boolean
		: TValue extends number
			? IsNumericLiteral<TValue> extends true
				? EndsWith<`${TValue}`, TEndsWith>
				: false
			: false;

function endsWith<Input extends string | number, End extends string>(input: Input, end: End) {
	return `${input}`.endsWith(end) as EndsWith<Input, End>;
}

endsWith('abc', 'c');
//=> true

endsWith(123456, '456');
//=> true

const end = '123' as string;

endsWith('abc123', end);
//=> boolean
```

@category Type Guard
@category Utilities
*/
export type IsNumericLiteral<T> = LiteralChecks<T, Numeric>;

/**
Returns a boolean for whether the given type is a `true` or `false` [literal type](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types).

Useful for:
	- providing strongly-typed functions when given literal arguments
	- type utilities, such as when constructing parsers and ASTs

@example
```
import type {IsBooleanLiteral} from 'type-fest';

const id = 123;

type GetId<AsString extends boolean> =
	IsBooleanLiteral<AsString> extends true
		? AsString extends true
			? `${typeof id}`
			: typeof id
		: number | string;

function getId<AsString extends boolean = false>(options?: {asString: AsString}) {
	return (options?.asString ? `${id}` : id) as GetId<AsString>;
}

const numberId = getId();
//=> 123

const stringId = getId({asString: true});
//=> '123'

declare const runtimeBoolean: boolean;
const eitherId = getId({asString: runtimeBoolean});
//=> number | string
```

@category Type Guard
@category Utilities
*/
export type IsBooleanLiteral<T> = LiteralCheck<T, boolean>;

/**
Returns a boolean for whether the given type is a `symbol` [literal type](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types).

Useful for:
	- providing strongly-typed functions when given literal arguments
	- type utilities, such as when constructing parsers and ASTs

@example
```
import type {IsSymbolLiteral} from 'type-fest';

type Get<Obj extends Record<symbol, number>, Key extends keyof Obj> =
	IsSymbolLiteral<Key> extends true
		? Obj[Key]
		: number;

function get<Obj extends Record<symbol, number>, Key extends keyof Obj>(o: Obj, key: Key) {
	return o[key] as Get<Obj, Key>;
}

const symbolLiteral = Symbol('literal');
const symbolValue: symbol = Symbol('value');

get({[symbolLiteral]: 1} as const, symbolLiteral);
//=> 1

get({[symbolValue]: 1} as const, symbolValue);
//=> number
```

@category Type Guard
@category Utilities
*/
export type IsSymbolLiteral<T> = LiteralCheck<T, symbol>;

/** Helper type for `IsLiteral`. */
type IsLiteralUnion<T> =
	| IsStringLiteral<T>
	| IsNumericLiteral<T>
	| IsBooleanLiteral<T>
	| IsSymbolLiteral<T>;

/**
Returns a boolean for whether the given type is a [literal type](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types).

Useful for:
	- providing strongly-typed functions when given literal arguments
	- type utilities, such as when constructing parsers and ASTs

@example
```
import type {IsLiteral} from 'type-fest';

// https://github.com/inocan-group/inferred-types/blob/master/src/types/string-literals/StripLeading.ts
export type StripLeading<A, B> =
	A extends string
		? B extends string
			? IsLiteral<A> extends true
				? string extends B ? never : A extends `${B & string}${infer After}` ? After : A
				: string
			: A
		: A;

function stripLeading<Input extends string, Strip extends string>(input: Input, strip: Strip) {
	return input.replace(`^${strip}`, '') as StripLeading<Input, Strip>;
}

stripLeading('abc123', 'abc');
//=> '123'

const str = 'abc123' as string;

stripLeading(str, 'abc');
//=> string
```

@category Type Guard
@category Utilities
*/
export type IsLiteral<T> =
	IsPrimitive<T> extends true
		? IsNotFalse<IsLiteralUnion<T>>
		: false;
