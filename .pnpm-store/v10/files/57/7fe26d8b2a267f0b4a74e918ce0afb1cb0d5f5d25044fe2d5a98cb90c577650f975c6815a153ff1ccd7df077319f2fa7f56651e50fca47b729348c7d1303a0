import type {CamelCase, CamelCaseOptions} from './camel-case';
import type {NonRecursiveType} from './internal';
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
```

@category Change case
@category Template literal
@category Object
*/
export type CamelCasedPropertiesDeep<
	Value,
	Options extends CamelCaseOptions = {preserveConsecutiveUppercase: true},
> = Value extends NonRecursiveType
	? Value
	: Value extends UnknownArray
		? CamelCasedPropertiesArrayDeep<Value>
		: Value extends Set<infer U>
			? Set<CamelCasedPropertiesDeep<U, Options>>
			: {
				[K in keyof Value as CamelCase<K, Options>]: CamelCasedPropertiesDeep<
				Value[K],
				Options
				>;
			};

// This is a copy of DelimiterCasedPropertiesArrayDeep (see: delimiter-cased-properties-deep.d.ts).
// These types should be kept in sync.
type CamelCasedPropertiesArrayDeep<Value extends UnknownArray> =
	Value extends []
		? []
		: // Tailing spread array
		Value extends [infer U, ...infer V]
			? [CamelCasedPropertiesDeep<U>, ...CamelCasedPropertiesDeep<V>]
			: Value extends readonly [infer U, ...infer V]
				? readonly [CamelCasedPropertiesDeep<U>, ...CamelCasedPropertiesDeep<V>]
				: // Leading spread array
				Value extends readonly [...infer U, infer V]
					? [...CamelCasedPropertiesDeep<U>, CamelCasedPropertiesDeep<V>]
					: Value extends readonly [...infer U, infer V]
						? readonly [
							...CamelCasedPropertiesDeep<U>,
							CamelCasedPropertiesDeep<V>,
						]
						: // Array
						Value extends Array<infer U>
							? Array<CamelCasedPropertiesDeep<U>>
							: Value extends ReadonlyArray<infer U>
								? ReadonlyArray<CamelCasedPropertiesDeep<U>>
								: never;
