import type {BuiltIns} from './internal';

/**
@see PartialDeep
*/
export type PartialDeepOptions = {
	/**
	Whether to affect the individual elements of arrays and tuples.

	@default false
	*/
	readonly recurseIntoArrays?: boolean;
};

/**
Create a type from another type with all keys and nested keys set to optional.

Use-cases:
- Merging a default settings/config object with another object, the second object would be a deep partial of the default object.
- Mocking and testing complex entities, where populating an entire object with its keys would be redundant in terms of the mock or test.

@example
```
import type {PartialDeep} from 'type-fest';

const settings: Settings = {
	textEditor: {
		fontSize: 14;
		fontColor: '#000000';
		fontWeight: 400;
	}
	autocomplete: false;
	autosave: true;
};

const applySavedSettings = (savedSettings: PartialDeep<Settings>) => {
	return {...settings, ...savedSettings};
}

settings = applySavedSettings({textEditor: {fontWeight: 500}});
```

By default, this does not affect elements in array and tuple types. You can change this by passing `{recurseIntoArrays: true}` as the second type argument:

```
import type {PartialDeep} from 'type-fest';

interface Settings {
	languages: string[];
}

const partialSettings: PartialDeep<Settings, {recurseIntoArrays: true}> = {
	languages: [undefined]
};
```

@category Object
@category Array
@category Set
@category Map
*/
export type PartialDeep<T, Options extends PartialDeepOptions = {}> = T extends BuiltIns | (((...arguments_: any[]) => unknown)) | (new (...arguments_: any[]) => unknown)
	? T
	: T extends Map<infer KeyType, infer ValueType>
		? PartialMapDeep<KeyType, ValueType, Options>
		: T extends Set<infer ItemType>
			? PartialSetDeep<ItemType, Options>
			: T extends ReadonlyMap<infer KeyType, infer ValueType>
				? PartialReadonlyMapDeep<KeyType, ValueType, Options>
				: T extends ReadonlySet<infer ItemType>
					? PartialReadonlySetDeep<ItemType, Options>
					: T extends object
						? T extends ReadonlyArray<infer ItemType> // Test for arrays/tuples, per https://github.com/microsoft/TypeScript/issues/35156
							? Options['recurseIntoArrays'] extends true
								? ItemType[] extends T // Test for arrays (non-tuples) specifically
									? readonly ItemType[] extends T // Differentiate readonly and mutable arrays
										? ReadonlyArray<PartialDeep<ItemType | undefined, Options>>
										: Array<PartialDeep<ItemType | undefined, Options>>
									: PartialObjectDeep<T, Options> // Tuples behave properly
								: T // If they don't opt into array testing, just use the original type
							: PartialObjectDeep<T, Options>
						: unknown;

/**
Same as `PartialDeep`, but accepts only `Map`s and as inputs. Internal helper for `PartialDeep`.
*/
type PartialMapDeep<KeyType, ValueType, Options extends PartialDeepOptions> = {} & Map<PartialDeep<KeyType, Options>, PartialDeep<ValueType, Options>>;

/**
Same as `PartialDeep`, but accepts only `Set`s as inputs. Internal helper for `PartialDeep`.
*/
type PartialSetDeep<T, Options extends PartialDeepOptions> = {} & Set<PartialDeep<T, Options>>;

/**
Same as `PartialDeep`, but accepts only `ReadonlyMap`s as inputs. Internal helper for `PartialDeep`.
*/
type PartialReadonlyMapDeep<KeyType, ValueType, Options extends PartialDeepOptions> = {} & ReadonlyMap<PartialDeep<KeyType, Options>, PartialDeep<ValueType, Options>>;

/**
Same as `PartialDeep`, but accepts only `ReadonlySet`s as inputs. Internal helper for `PartialDeep`.
*/
type PartialReadonlySetDeep<T, Options extends PartialDeepOptions> = {} & ReadonlySet<PartialDeep<T, Options>>;

/**
Same as `PartialDeep`, but accepts only `object`s as inputs. Internal helper for `PartialDeep`.
*/
type PartialObjectDeep<ObjectType extends object, Options extends PartialDeepOptions> = {
	[KeyType in keyof ObjectType]?: PartialDeep<ObjectType[KeyType], Options>
};
