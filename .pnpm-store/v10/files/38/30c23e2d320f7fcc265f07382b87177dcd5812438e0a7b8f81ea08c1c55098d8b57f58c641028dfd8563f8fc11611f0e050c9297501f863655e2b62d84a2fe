import type {DefaultDelimiterCaseOptions} from './delimiter-case';
import type {DelimiterCasedProperties} from './delimiter-cased-properties';
import type {ApplyDefaultOptions} from './internal';
import type {WordsOptions} from './words';

/**
Convert object properties to kebab case but not recursively.

This can be useful when, for example, converting some API types from a different style.

@see KebabCase
@see KebabCasedPropertiesDeep

@example
```
import type {KebabCasedProperties} from 'type-fest';

interface User {
	userId: number;
	userName: string;
}

const result: KebabCasedProperties<User> = {
	'user-id': 1,
	'user-name': 'Tom',
};

const splitOnNumbers: KebabCasedProperties<{line1: string}, {splitOnNumbers: true}> = {
	'line-1': 'string',
};
```

@category Change case
@category Template literal
@category Object
*/
export type KebabCasedProperties<
	Value,
	Options extends WordsOptions = {},
> = DelimiterCasedProperties<Value, '-', ApplyDefaultOptions<WordsOptions, DefaultDelimiterCaseOptions, Options>>;
