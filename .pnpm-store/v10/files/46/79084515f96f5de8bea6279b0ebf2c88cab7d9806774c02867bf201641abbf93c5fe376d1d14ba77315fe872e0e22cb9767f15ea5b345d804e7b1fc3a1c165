import type {BuiltIns, HasMultipleCallSignatures} from './internal';

/**
Convert `object`s, `Map`s, `Set`s, and `Array`s and all of their keys/elements into immutable structures recursively.

This is useful when a deeply nested structure needs to be exposed as completely immutable, for example, an imported JSON module or when receiving an API response that is passed around.

Please upvote [this issue](https://github.com/microsoft/TypeScript/issues/13923) if you want to have this type as a built-in in TypeScript.

@example
```
// data.json
{
	"foo": ["bar"]
}

// main.ts
import type {ReadonlyDeep} from 'type-fest';
import dataJson = require('./data.json');

const data: ReadonlyDeep<typeof dataJson> = dataJson;

export default data;

// test.ts
import data from './main';

data.foo.push('bar');
//=> error TS2339: Property 'push' does not exist on type 'readonly string[]'
```

Note that types containing overloaded functions are not made deeply readonly due to a [TypeScript limitation](https://github.com/microsoft/TypeScript/issues/29732).

@category Object
@category Array
@category Set
@category Map
*/
export type ReadonlyDeep<T> = T extends BuiltIns
	? T
	: T extends new (...arguments_: any[]) => unknown
		? T // Skip class constructors
		: T extends (...arguments_: any[]) => unknown
			? {} extends ReadonlyObjectDeep<T>
				? T
				: HasMultipleCallSignatures<T> extends true
					? T
					: ((...arguments_: Parameters<T>) => ReturnType<T>) & ReadonlyObjectDeep<T>
			: T extends Readonly<ReadonlyMap<infer KeyType, infer ValueType>>
				? ReadonlyMapDeep<KeyType, ValueType>
				: T extends Readonly<ReadonlySet<infer ItemType>>
					? ReadonlySetDeep<ItemType>
					: // Identify tuples to avoid converting them to arrays inadvertently; special case `readonly [...never[]]`, as it emerges undesirably from recursive invocations of ReadonlyDeep below.
					T extends readonly [] | readonly [...never[]]
						? readonly []
						: T extends readonly [infer U, ...infer V]
							? readonly [ReadonlyDeep<U>, ...ReadonlyDeep<V>]
							: T extends readonly [...infer U, infer V]
								? readonly [...ReadonlyDeep<U>, ReadonlyDeep<V>]
								: T extends ReadonlyArray<infer ItemType>
									? ReadonlyArray<ReadonlyDeep<ItemType>>
									: T extends object
										? ReadonlyObjectDeep<T>
										: unknown;

/**
Same as `ReadonlyDeep`, but accepts only `ReadonlyMap`s as inputs. Internal helper for `ReadonlyDeep`.
*/
type ReadonlyMapDeep<KeyType, ValueType> = {} & Readonly<ReadonlyMap<ReadonlyDeep<KeyType>, ReadonlyDeep<ValueType>>>;

/**
Same as `ReadonlyDeep`, but accepts only `ReadonlySet`s as inputs. Internal helper for `ReadonlyDeep`.
*/
type ReadonlySetDeep<ItemType> = {} & Readonly<ReadonlySet<ReadonlyDeep<ItemType>>>;

/**
Same as `ReadonlyDeep`, but accepts only `object`s as inputs. Internal helper for `ReadonlyDeep`.
*/
type ReadonlyObjectDeep<ObjectType extends object> = {
	readonly [KeyType in keyof ObjectType]: ReadonlyDeep<ObjectType[KeyType]>
};
