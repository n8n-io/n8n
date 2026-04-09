import type {IsTuple} from './is-tuple';
import type {UnknownArray} from './unknown-array';
import type {IfAny} from './if-any';

/**
Transforms a tuple into an object, mapping each tuple index to its corresponding type as a key-value pair.

Note: Tuple labels are [lost in the transformation process](https://stackoverflow.com/a/70398429/11719314). For example, `TupleToObject<[x: number, y: number]>` produces `{0: number; 1: number}`, and not `{x: number; y: number}`.

@example
```
type Example1 = TupleToObject<[number, string, boolean]>;
//=> { 0: number; 1: string; 2: boolean }

// Tuples with optional indices
type Example2 = TupleToObject<[number, string?, boolean?]>;
//=> { 0: number; 1?: string; 2?: boolean }

// Readonly tuples
type Example3 = TupleToObject<readonly [number, string?]>;
//=> { readonly 0: number; readonly 1?: string }

// Non-tuple arrays get transformed into index signatures
type Example4 = TupleToObject<string[]>;
//=> { [x: number]: string }

// Tuples with rest elements
type Example5 = TupleToObject<[number, string, ...boolean[]]>;
//=> { [x: number]: number | string | boolean; 0: number; 1: string }

// Tuple labels are not preserved
type Example6 = TupleToObject<[x: number, y: number]>;
//=> { 0: number; 1: number }
```

@category Array
*/
export type TupleToObject<TArray extends UnknownArray> = IfAny<TArray, any, {
	[
	Key in keyof TArray as Key & (`${number}` | (IsTuple<TArray> extends true ? never : number))
	]: TArray[Key];
}>;
