import type {IsAny} from '../is-any';
import type {IsNever} from '../is-never';
import type {Primitive} from '../primitive';

/**
Matches any primitive, `void`, `Date`, or `RegExp` value.
*/
export type BuiltIns = Primitive | void | Date | RegExp;

/**
Matches non-recursive types.
*/
export type NonRecursiveType = BuiltIns | Function | (new (...arguments_: any[]) => unknown);

/**
Returns a boolean for whether the two given types extends the base type.
*/
export type IsBothExtends<BaseType, FirstType, SecondType> = FirstType extends BaseType
	? SecondType extends BaseType
		? true
		: false
	: false;

/**
Test if the given function has multiple call signatures.

Needed to handle the case of a single call signature with properties.

Multiple call signatures cannot currently be supported due to a TypeScript limitation.
@see https://github.com/microsoft/TypeScript/issues/29732
*/
export type HasMultipleCallSignatures<T extends (...arguments_: any[]) => unknown> =
	T extends {(...arguments_: infer A): unknown; (...arguments_: infer B): unknown}
		? B extends A
			? A extends B
				? false
				: true
			: true
		: false;

/**
Returns a boolean for whether the given `boolean` is not `false`.
*/
export type IsNotFalse<T extends boolean> = [T] extends [false] ? false : true;

/**
Returns a boolean for whether the given type is primitive value or primitive type.

@example
```
IsPrimitive<'string'>
//=> true

IsPrimitive<string>
//=> true

IsPrimitive<Object>
//=> false
```
*/
export type IsPrimitive<T> = [T] extends [Primitive] ? true : false;

/**
Returns a boolean for whether A is false.

@example
```
Not<true>;
//=> false

Not<false>;
//=> true
```
*/
export type Not<A extends boolean> = A extends true
	? false
	: A extends false
		? true
		: never;

/**
Returns a boolean for whether the given type is a union type.

@example
```
type A = IsUnion<string | number>;
//=> true

type B = IsUnion<string>;
//=> false
```
*/
export type IsUnion<T> = InternalIsUnion<T>;

/**
The actual implementation of `IsUnion`.
*/
type InternalIsUnion<T, U = T> =
(
	// @link https://ghaiklor.github.io/type-challenges-solutions/en/medium-isunion.html
	IsNever<T> extends true
		? false
		: T extends any
			? [U] extends [T]
				? false
				: true
			: never
) extends infer Result
	// In some cases `Result` will return `false | true` which is `boolean`,
	// that means `T` has at least two types and it's a union type,
	// so we will return `true` instead of `boolean`.
	? boolean extends Result ? true
		: Result
	: never; // Should never happen

/**
An if-else-like type that resolves depending on whether the given type is `any` or `never`.

@example
```
// When `T` is a NOT `any` or `never` (like `string`) => Returns `IfNotAnyOrNever` branch
type A = IfNotAnyOrNever<string, 'VALID', 'IS_ANY', 'IS_NEVER'>;
//=> 'VALID'

// When `T` is `any` => Returns `IfAny` branch
type B = IfNotAnyOrNever<any, 'VALID', 'IS_ANY', 'IS_NEVER'>;
//=> 'IS_ANY'

// When `T` is `never` => Returns `IfNever` branch
type C = IfNotAnyOrNever<never, 'VALID', 'IS_ANY', 'IS_NEVER'>;
//=> 'IS_NEVER'
```
*/
export type IfNotAnyOrNever<T, IfNotAnyOrNever, IfAny = any, IfNever = never> =
	IsAny<T> extends true
		? IfAny
		: IsNever<T> extends true
			? IfNever
			: IfNotAnyOrNever;
