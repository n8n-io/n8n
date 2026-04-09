import type {DefaultDelimiterCaseOptions} from './delimiter-case';
import type {DelimiterCasedPropertiesDeep} from './delimiter-cased-properties-deep';
import type {ApplyDefaultOptions} from './internal';
import type {WordsOptions} from './words';

/**
Convert object properties to snake case recursively.

This can be useful when, for example, converting some API types from a different style.

@see SnakeCase
@see SnakeCasedProperties

@example
```
import type {SnakeCasedPropertiesDeep} from 'type-fest';

interface User {
	userId: number;
	userName: string;
}

interface UserWithFriends {
	userInfo: User;
	userFriends: User[];
}

const result: SnakeCasedPropertiesDeep<UserWithFriends> = {
	user_info: {
		user_id: 1,
		user_name: 'Tom',
	},
	user_friends: [
		{
			user_id: 2,
			user_name: 'Jerry',
		},
		{
			user_id: 3,
			user_name: 'Spike',
		},
	],
};

const splitOnNumbers: SnakeCasedPropertiesDeep<{line1: { line2: [{ line3: string }] }}, {splitOnNumbers: true}> = {
	line_1: {
		line_2: [
			{
				line_3: 'string',
			},
		],
	},
};
```

@category Change case
@category Template literal
@category Object
*/
export type SnakeCasedPropertiesDeep<
	Value,
	Options extends WordsOptions = {},
> = DelimiterCasedPropertiesDeep<Value, '_', ApplyDefaultOptions<WordsOptions, DefaultDelimiterCaseOptions, Options>>;
