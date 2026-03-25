import type {DelimiterCase} from './delimiter-case';
import type {NonRecursiveType} from './internal';
import type {UnknownArray} from './unknown-array';

/**
Convert object properties to delimiter case recursively.

This can be useful when, for example, converting some API types from a different style.

@see DelimiterCase
@see DelimiterCasedProperties

@example
```
import type {DelimiterCasedPropertiesDeep} from 'type-fest';

interface User {
	userId: number;
	userName: string;
}

interface UserWithFriends {
	userInfo: User;
	userFriends: User[];
}

const result: DelimiterCasedPropertiesDeep<UserWithFriends, '-'> = {
	'user-info': {
	'user-id': 1,
		'user-name': 'Tom',
	},
	'user-friends': [
		{
			'user-id': 2,
			'user-name': 'Jerry',
		},
		{
			'user-id': 3,
			'user-name': 'Spike',
		},
	],
};
```

@category Change case
@category Template literal
@category Object
*/
export type DelimiterCasedPropertiesDeep<
	Value,
	Delimiter extends string,
> = Value extends NonRecursiveType
	? Value
	: Value extends UnknownArray
		? DelimiterCasedPropertiesArrayDeep<Value, Delimiter>
		: Value extends Set<infer U>
			? Set<DelimiterCasedPropertiesDeep<U, Delimiter>> : {
				[K in keyof Value as DelimiterCase<
				K,
				Delimiter
				>]: DelimiterCasedPropertiesDeep<Value[K], Delimiter>;
			};

// This is a copy of CamelCasedPropertiesArrayDeep (see: camel-cased-properties-deep.d.ts).
// These types should be kept in sync.
type DelimiterCasedPropertiesArrayDeep<Value extends UnknownArray, Delimiter extends string> =
	Value extends []
		? []
		// Tailing spread array
		:	Value extends [infer U, ...infer V]
			? [DelimiterCasedPropertiesDeep<U, Delimiter>, ...DelimiterCasedPropertiesDeep<V, Delimiter>]
			: Value extends readonly [infer U, ...infer V]
				? readonly [DelimiterCasedPropertiesDeep<U, Delimiter>, ...DelimiterCasedPropertiesDeep<V, Delimiter>]
				// Leading spread array
				: Value extends readonly [...infer U, infer V]
					? [...DelimiterCasedPropertiesDeep<U, Delimiter>, DelimiterCasedPropertiesDeep<V, Delimiter>]
					: Value extends readonly [...infer U, infer V]
						? readonly [...DelimiterCasedPropertiesDeep<U, Delimiter>, DelimiterCasedPropertiesDeep<V, Delimiter>]
						// Array
						: Value extends Array<infer U>
							? Array<DelimiterCasedPropertiesDeep<U, Delimiter>>
							: Value extends ReadonlyArray<infer U>
								? ReadonlyArray<DelimiterCasedPropertiesDeep<U, Delimiter>>
								: never;
