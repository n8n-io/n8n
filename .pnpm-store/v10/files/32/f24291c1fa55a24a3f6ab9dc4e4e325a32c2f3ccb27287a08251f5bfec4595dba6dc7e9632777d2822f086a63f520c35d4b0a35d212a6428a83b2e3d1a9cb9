import type {ApplyDefaultOptions} from './internal';
import type {Words} from './words';

/**
CamelCase options.

@see {@link CamelCase}
*/
export type CamelCaseOptions = {
	/**
	Whether to preserved consecutive uppercase letter.

	@default true
	*/
	preserveConsecutiveUppercase?: boolean;
};

export type DefaultCamelCaseOptions = {
	preserveConsecutiveUppercase: true;
};

/**
Convert an array of words to camel-case.
*/
type CamelCaseFromArray<
	Words extends string[],
	Options extends Required<CamelCaseOptions>,
	OutputString extends string = '',
> = Words extends [
	infer FirstWord extends string,
	...infer RemainingWords extends string[],
]
	? Options['preserveConsecutiveUppercase'] extends true
		? `${Capitalize<FirstWord>}${CamelCaseFromArray<RemainingWords, Options>}`
		: `${Capitalize<Lowercase<FirstWord>>}${CamelCaseFromArray<RemainingWords, Options>}`
	: OutputString;

/**
Convert a string literal to camel-case.

This can be useful when, for example, converting some kebab-cased command-line flags or a snake-cased database result.

By default, consecutive uppercase letter are preserved. See {@link CamelCaseOptions.preserveConsecutiveUppercase preserveConsecutiveUppercase} option to change this behaviour.

@example
```
import type {CamelCase} from 'type-fest';

// Simple

const someVariable: CamelCase<'foo-bar'> = 'fooBar';
const preserveConsecutiveUppercase: CamelCase<'foo-BAR-baz', {preserveConsecutiveUppercase: true}> = 'fooBARBaz';

// Advanced

type CamelCasedProperties<T> = {
	[K in keyof T as CamelCase<K>]: T[K]
};

interface RawOptions {
	'dry-run': boolean;
	'full_family_name': string;
	foo: number;
	BAR: string;
	QUZ_QUX: number;
	'OTHER-FIELD': boolean;
}

const dbResult: CamelCasedProperties<RawOptions> = {
	dryRun: true,
	fullFamilyName: 'bar.js',
	foo: 123,
	bar: 'foo',
	quzQux: 6,
	otherField: false
};
```

@category Change case
@category Template literal
*/
export type CamelCase<Type, Options extends CamelCaseOptions = {}> = Type extends string
	? string extends Type
		? Type
		: Uncapitalize<CamelCaseFromArray<
		Words<Type extends Uppercase<Type> ? Lowercase<Type> : Type>,
		ApplyDefaultOptions<CamelCaseOptions, DefaultCamelCaseOptions, Options>
		>>
	: Type;
