/**
Simplifies a type while including and/or excluding certain types from being simplified. Useful to improve type hints shown in editors. And also to transform an interface into a type to aide with assignability.

This type is **experimental** and was introduced as a result of this {@link https://github.com/sindresorhus/type-fest/issues/436 issue}. It should be used with caution.

@internal
@experimental
@see Simplify
@category Object
*/
export type ConditionalSimplify<Type, ExcludeType = never, IncludeType = unknown> = Type extends ExcludeType
	? Type
	: Type extends IncludeType
		? {[TypeKey in keyof Type]: Type[TypeKey]}
		: Type;

/**
Recursively simplifies a type while including and/or excluding certain types from being simplified.

This type is **experimental** and was introduced as a result of this {@link https://github.com/sindresorhus/type-fest/issues/436 issue}. It should be used with caution.

See {@link ConditionalSimplify} for usages and examples.

@internal
@experimental
@category Object
*/
export type ConditionalSimplifyDeep<Type, ExcludeType = never, IncludeType = unknown> = Type extends ExcludeType
	? Type
	: Type extends IncludeType
		? {[TypeKey in keyof Type]: ConditionalSimplifyDeep<Type[TypeKey], ExcludeType, IncludeType>}
		: Type;
