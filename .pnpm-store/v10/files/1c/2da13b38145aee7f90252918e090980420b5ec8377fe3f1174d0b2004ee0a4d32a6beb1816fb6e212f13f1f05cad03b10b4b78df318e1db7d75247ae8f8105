import type {IsAny} from './is-any';
import type {NonRecursiveType, StringToNumber} from './internal';
import type {Paths} from './paths';
import type {SetRequired} from './set-required';
import type {SimplifyDeep} from './simplify-deep';
import type {UnionToTuple} from './union-to-tuple';
import type {RequiredDeep} from './required-deep';
import type {UnknownArray} from './unknown-array';

/**
Create a type that makes the given keys required. You can specify deeply nested key paths. The remaining keys are kept as is.

Use-case: Selectively make nested properties required in complex types like models.

@example
```
import type {SetRequiredDeep} from 'type-fest';

type Foo = {
	a?: number;
	b?: string;
	c?: {
		d?: number
	}[]
}

type SomeRequiredDeep = SetRequiredDeep<Foo, 'a' | `c.${number}.d`>;
// type SomeRequiredDeep = {
// 	a: number; // Is now required
// 	b?: string;
// 	c: {
// 		d: number // Is now required
// 	}[]
// }

// Set specific indices in an array to be required.
type ArrayExample = SetRequiredDeep<{a: [number?, number?, number?]}, 'a.0' | 'a.1'>;
//=> {a: [number, number, number?]}
```

@category Object
*/
export type SetRequiredDeep<BaseType, KeyPaths extends Paths<BaseType>> = IsAny<KeyPaths> extends true
	? SimplifyDeep<RequiredDeep<BaseType>>
	: SetRequiredDeepHelper<BaseType, UnionToTuple<KeyPaths>>;

/**
Internal helper for {@link SetRequiredDeep}.

Recursively transforms the `BaseType` by applying {@link SetRequiredDeepSinglePath} for each path in `KeyPathsTuple`.
*/
type SetRequiredDeepHelper<BaseType, KeyPathsTuple extends UnknownArray> =
	KeyPathsTuple extends [infer KeyPath, ...infer RestPaths]
		? SetRequiredDeepHelper<SetRequiredDeepSinglePath<BaseType, KeyPath>, RestPaths>
		: BaseType;

/**
Makes a single path required in `BaseType`.
*/
type SetRequiredDeepSinglePath<BaseType, KeyPath> = BaseType extends NonRecursiveType
	? BaseType
	: KeyPath extends `${infer Property}.${infer RestPath}`
		? {
			[Key in keyof BaseType]: Property extends `${Key & (string | number)}`
				? SetRequiredDeepSinglePath<BaseType[Key], RestPath>
				: BaseType[Key];
		}
		: SetRequired<BaseType, (KeyPath | StringToNumber<KeyPath & string>) & keyof BaseType>;
