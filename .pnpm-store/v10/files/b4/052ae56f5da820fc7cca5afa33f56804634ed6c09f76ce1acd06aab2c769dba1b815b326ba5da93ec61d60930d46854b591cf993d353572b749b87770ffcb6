import type {DefaultDelimiterCaseOptions, DelimiterCase} from './delimiter-case';
import type {ApplyDefaultOptions} from './internal';
import type {WordsOptions} from './words';

/**
Convert object properties to delimiter case but not recursively.

This can be useful when, for example, converting some API types from a different style.

@see DelimiterCase
@see DelimiterCasedPropertiesDeep

@example
```
import type {DelimiterCasedProperties} from 'type-fest';

interface User {
	userId: number;
	userName: string;
}

const result: DelimiterCasedProperties<User, '-'> = {
	'user-id': 1,
	'user-name': 'Tom',
};

const splitOnNumbers: DelimiterCasedProperties<{line1: string}, '-', {splitOnNumbers: true}> = {
	'line-1': 'string',
};
```

@category Change case
@category Template literal
@category Object
*/
export type DelimiterCasedProperties<
	Value,
	Delimiter extends string,
	Options extends WordsOptions = {},
> = Value extends Function
	? Value
	: Value extends Array<infer U>
		? Value
		: {[K in keyof Value as
			DelimiterCase<K, Delimiter, ApplyDefaultOptions<WordsOptions, DefaultDelimiterCaseOptions, Options>>
			]: Value[K]};
