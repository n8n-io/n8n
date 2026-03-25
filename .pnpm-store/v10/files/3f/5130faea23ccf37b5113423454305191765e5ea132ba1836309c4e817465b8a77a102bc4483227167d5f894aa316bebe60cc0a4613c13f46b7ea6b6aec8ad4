/**
Pick only index signatures from the given object type, leaving out all explicitly defined properties.

This is the counterpart of `OmitIndexSignature`.

When you use a type that will iterate through an object that has indexed keys and explicitly defined keys you end up with a type where only the indexed keys are kept. This is because `keyof` of an indexed type always returns `string | number | symbol`, because every key is possible in that object. With this type, you can save the indexed keys and reinject them later, like in the second example below.

@example
```
import type {PickIndexSignature} from 'type-fest';

declare const symbolKey: unique symbol;

type Example = {
	// These index signatures will remain.
	[x: string]: unknown;
	[x: number]: unknown;
	[x: symbol]: unknown;
	[x: `head-${string}`]: string;
	[x: `${string}-tail`]: string;
	[x: `head-${string}-tail`]: string;
	[x: `${bigint}`]: string;
	[x: `embedded-${number}`]: string;

	// These explicitly defined keys will be removed.
	['snake-case-key']: string;
	[symbolKey]: string;
	foo: 'bar';
	qux?: 'baz';
};

type ExampleIndexSignature = PickIndexSignature<Example>;
// {
// 	[x: string]: unknown;
// 	[x: number]: unknown;
// 	[x: symbol]: unknown;
// 	[x: `head-${string}`]: string;
// 	[x: `${string}-tail`]: string;
// 	[x: `head-${string}-tail`]: string;
// 	[x: `${bigint}`]: string;
// 	[x: `embedded-${number}`]: string;
// }
```

@example
```
import type {OmitIndexSignature, PickIndexSignature, Simplify} from 'type-fest';

type Foo = {
	[x: string]: string;
	foo: string;
	bar: number;
};

// Imagine that you want a new type `Bar` that comes from `Foo`.
// => {
// 	[x: string]: string;
// 	bar: number;
// };

type Bar = Omit<Foo, 'foo'>;
// This is not working because `Omit` returns only indexed keys.
// => {
// 	[x: string]: string;
// 	[x: number]: string;
// }

// One solution is to save the indexed signatures to new type.
type FooIndexSignature = PickIndexSignature<Foo>;
// => {
// 	[x: string]: string;
// }

// Get a new type without index signatures.
type FooWithoutIndexSignature = OmitIndexSignature<Foo>;
// => {
// 	foo: string;
// 	bar: number;
// }

// At this point we can use Omit to get our new type.
type BarWithoutIndexSignature = Omit<FooWithoutIndexSignature, 'foo'>;
// => {
// 	bar: number;
// }

// And finally we can merge back the indexed signatures.
type BarWithIndexSignature = Simplify<BarWithoutIndexSignature & FooIndexSignature>;
// => {
// 	[x: string]: string;
// 	bar: number;
// }
```

@see OmitIndexSignature
@category Object
*/
export type PickIndexSignature<ObjectType> = {
	[KeyType in keyof ObjectType as {} extends Record<KeyType, unknown>
		? KeyType
		: never]: ObjectType[KeyType];
};
