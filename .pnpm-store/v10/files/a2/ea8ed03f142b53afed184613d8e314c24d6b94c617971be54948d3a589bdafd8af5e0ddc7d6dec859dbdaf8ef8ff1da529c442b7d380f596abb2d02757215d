import type {CamelCaseOptions, DefaultCamelCaseOptions} from './camel-case';
import type {ApplyDefaultOptions} from './internal';
import type {PascalCase} from './pascal-case';

/**
Convert object properties to pascal case recursively.

This can be useful when, for example, converting some API types from a different style.

@see PascalCase
@see PascalCasedProperties

@example
```
import type {PascalCasedPropertiesDeep} from 'type-fest';

interface User {
	userId: number;
	userName: string;
}

interface UserWithFriends {
	userInfo: User;
	userFriends: User[];
}

const result: PascalCasedPropertiesDeep<UserWithFriends> = {
	UserInfo: {
		UserId: 1,
		UserName: 'Tom',
	},
	UserFriends: [
		{
			UserId: 2,
			UserName: 'Jerry',
		},
		{
			UserId: 3,
			UserName: 'Spike',
		},
	],
};
```

@category Change case
@category Template literal
@category Object
*/
export type PascalCasedPropertiesDeep<Value, Options extends CamelCaseOptions = {}> =
	_PascalCasedPropertiesDeep<Value, ApplyDefaultOptions<CamelCaseOptions, DefaultCamelCaseOptions, Options>>;

type _PascalCasedPropertiesDeep<Value, Options extends Required<CamelCaseOptions>> = Value extends Function | Date | RegExp
	? Value
	: Value extends Array<infer U>
		? Array<_PascalCasedPropertiesDeep<U, Options>>
		: Value extends Set<infer U>
			? Set<_PascalCasedPropertiesDeep<U, Options>>
			: Value extends object
				? {
					[K in keyof Value as PascalCase<K, Options>]: _PascalCasedPropertiesDeep<Value[K], Options>;
				}
				: Value;
