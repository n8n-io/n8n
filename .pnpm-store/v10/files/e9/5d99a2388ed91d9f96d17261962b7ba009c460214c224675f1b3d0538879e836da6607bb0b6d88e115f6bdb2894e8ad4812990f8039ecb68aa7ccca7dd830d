import type {Except} from './except';
import type {HomomorphicPick} from './internal';
import type {Simplify} from './simplify';

/**
Create a type that makes the given keys readonly. The remaining keys are kept as is.

Use-case: You want to define a single model where the only thing that changes is whether or not some of the keys are readonly.

@example
```
import type {SetReadonly} from 'type-fest';

type Foo = {
	a: number;
	readonly b: string;
	c: boolean;
}

type SomeReadonly = SetReadonly<Foo, 'b' | 'c'>;
// type SomeReadonly = {
// 	a: number;
// 	readonly b: string; // Was already readonly and still is.
// 	readonly c: boolean; // Is now readonly.
// }
```

@category Object
*/
export type SetReadonly<BaseType, Keys extends keyof BaseType> =
	// `extends unknown` is always going to be the case and is used to convert any
	// union into a [distributive conditional
	// type](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#distributive-conditional-types).
	BaseType extends unknown
		? Simplify<
		Except<BaseType, Keys> &
		Readonly<HomomorphicPick<BaseType, Keys>>
		>
		: never;
