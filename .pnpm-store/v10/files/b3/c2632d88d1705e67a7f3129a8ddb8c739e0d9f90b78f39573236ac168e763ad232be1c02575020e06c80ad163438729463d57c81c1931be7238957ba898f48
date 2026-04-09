import type {CamelCase, CamelCaseOptions, DefaultCamelCaseOptions} from './camel-case';
import type {ApplyDefaultOptions, NonRecursiveType} from './internal';
import type {UnknownArray} from './unknown-array';

/**
Convert object properties to camel case recursively.

This can be useful when, for example, converting some API types from a different style.

@see CamelCasedProperties
@see CamelCase

@example
```
import type {CamelCasedPropertiesDeep} from 'type-fest';

interface User {
	UserId: number;
	UserName: string;
}

interface UserWithFriends {
	UserInfo: User;
	UserFriends: User[];
}

const result: CamelCasedPropertiesDeep<UserWithFriends> = {
	userInfo: {
		userId: 1,
		userName: 'Tom',
	},
	userFriends: [
		{
			userId: 2,
			userName: 'Jerry',
		},
		{
			userId: 3,
			userName: 'Spike',
		},
	],
};

const preserveConsecutiveUppercase: CamelCasedPropertiesDeep<{fooBAR: { fooBARBiz: [{ fooBARBaz: string }] }}, {preserveConsecutiveUppercase: false}> = {
	fooBar: {
		fooBarBiz: [{
			fooBarBaz: 'string',
		}],
	},
};
```

@category Change case
@category Template literal
@category Object
*/
export type CamelCasedPropertiesDeep<
	Value,
	Options extends CamelCaseOptions = {},
> = _CamelCasedPropertiesDeep<Value, ApplyDefaultOptions<CamelCaseOptions, DefaultCamelCaseOptions, Options>>;

type _CamelCasedPropertiesDeep<
	Value,
	Options extends Required<CamelCaseOptions>,
> = Value extends NonRecursiveType
	? Value
	: Value extends UnknownArray
		? CamelCasedPropertiesArrayDeep<Value, Options>
		: Value extends Set<infer U>
			? Set<_CamelCasedPropertiesDeep<U, Options>>
			: Value extends object
				? {
					[K in keyof Value as CamelCase<K, Options>]: _CamelCasedPropertiesDeep<Value[K], Options>;
				}
				: Value;

// This is a copy of DelimiterCasedPropertiesArrayDeep (see: delimiter-cased-properties-deep.d.ts).
// These types should be kept in sync.
type CamelCasedPropertiesArrayDeep<
	Value extends UnknownArray,
	Options extends Required<CamelCaseOptions>,
> = Value extends []
	? []
	// Trailing spread array
	: Value extends [infer U, ...infer V]
		? [_CamelCasedPropertiesDeep<U, Options>, ..._CamelCasedPropertiesDeep<V, Options>]
		: Value extends readonly [infer U, ...infer V]
			? readonly [_CamelCasedPropertiesDeep<U, Options>, ..._CamelCasedPropertiesDeep<V, Options>]
			: // Leading spread array
			Value extends readonly [...infer U, infer V]
				? [..._CamelCasedPropertiesDeep<U, Options>, _CamelCasedPropertiesDeep<V, Options>]
				: // Array
				Value extends Array<infer U>
					? Array<_CamelCasedPropertiesDeep<U, Options>>
					: Value extends ReadonlyArray<infer U>
						? ReadonlyArray<_CamelCasedPropertiesDeep<U, Options>>
						: never;
