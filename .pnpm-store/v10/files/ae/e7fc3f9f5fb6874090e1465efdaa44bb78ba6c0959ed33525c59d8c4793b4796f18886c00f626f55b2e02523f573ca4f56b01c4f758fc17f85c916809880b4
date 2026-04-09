import type {CamelCase, CamelCaseOptions, DefaultCamelCaseOptions} from './camel-case';
import type {ApplyDefaultOptions} from './internal';

/**
Converts a string literal to pascal-case.

@example
```
import type {PascalCase} from 'type-fest';

// Simple

const someVariable: PascalCase<'foo-bar'> = 'FooBar';

// Advanced

type PascalCaseProps<T> = {
	[K in keyof T as PascalCase<K>]: T[K]
};

interface RawOptions {
	'dry-run': boolean;
	'full_family_name': string;
	foo: number;
}

const dbResult: CamelCasedProperties<ModelProps> = {
	DryRun: true,
	FullFamilyName: 'bar.js',
	Foo: 123
};
```

@category Change case
@category Template literal
*/
export type PascalCase<Value, Options extends CamelCaseOptions = {}> =
	_PascalCase<Value, ApplyDefaultOptions<CamelCaseOptions, DefaultCamelCaseOptions, Options>>;

type _PascalCase<Value, Options extends Required<CamelCaseOptions>> = CamelCase<Value, Options> extends string
	? Capitalize<CamelCase<Value, Options>>
	: CamelCase<Value, Options>;
