import type {IsUnknown} from './is-unknown';
import type {StaticPartOfArray, VariablePartOfArray} from './internal';
import type {UnknownArray} from './unknown-array';

/**
Create an array that replaces the given `TArray`'s elements with the given `TObject`'s values at the given indices.

`TArray` and `TObject` supports tailing spread array like `[string, ...boolean[]]`, but does not support `[string, ...boolean[], number]`.

@example:
```ts
// object
type A = MergeObjectToArray<[string, number], {0: boolean}>;
//=> [boolean, number]

// array
type B = MergeObjectToArray<[string, number], [boolean]>;
//=> [boolean, number]

// tailing spread array
type C = MergeObjectToArray<[string, ...boolean[]], {1: number}>;
//=> [string, ...number[]]

type D = MergeObjectToArray<[string, ...boolean[]], [number, ...string[]]>;
//=> [number, ...string[]]
```
*/
type MergeObjectToArray<TArray extends UnknownArray, TObject, TArrayCopy extends UnknownArray = TArray> =
	// If `TObject` is an array like `[0, 1, 2]`
	TObject extends UnknownArray
		// If `TObject` is a variable length array, we should use `TObject`'s type as the result type.
		? number extends TObject['length']
			? TObject
			: {
				[K in keyof TArray]:
				number extends K
					? VariablePartOfArray<TArray>[number]
					: K extends keyof TObject ? TObject[K] : TArray[K]
			}
		: TObject extends object
			// If `TObject` is a object witch key is number like `{0: string, 1: number}`
			? {
				[K in keyof TArray]:
				K extends `${infer NumberK extends number}`
					? NumberK extends keyof TObject ? TObject[NumberK] : TArray[K]
					: number extends K
					// If array key `K` is `number`, means it's a rest parameter, we should set the rest parameter type to corresponding type in `TObject`.
					// example: `MergeObjectToParamterArray<[string, ...boolean[]], {1: number}>` => `[string, ...number[]]`
						? StaticPartOfArray<TArrayCopy>['length'] extends keyof TObject
							? TObject[StaticPartOfArray<TArrayCopy>['length']]
							: TArray[K]
						: never
			} : never;

/**
Create a function that replaces some parameters with the given parameters.

The parameters that are not specified will be kept as-is.

Note:
- This type will ignore the given function's generic type.
- If you change the parameter type that return type depends on, the return type will not change:
	```
	const fn = (a: number) => a;
	//=> fn: (a: number) => number;

 	// We change type of `a` to `string`, but return type is still `number`.
	type Fn = SetParameterType<typeof fn, {0: string}>;
 	//=> (a: string) => number;
	```

Use-case:
- Define a wrapped function that receives something different while returning the same type.
- Mocking and testing.
- Overload function type. (See example)

@example
```
import type {SetParameterType} from 'type-fest';

type HandleMessage = (data: Data, message: string, ...arguments: any[]) => void;

type HandleOk = SetParameterType<HandleMessage, {0: SuccessData, 1: 'ok'}>;
//=> type HandleOk = (data: SuccessData, message: 'ok') => void;

// Another way to define the parameters to replace.
type HandleError = SetParameterType<HandleMessage, [data: ErrorData, message: 'error']>;
//=> type HandleError = (data: ErrorData, message: 'error') => void;

// Change single parameter type.
type HandleWarn = SetParameterType<HandleMessage, {1: 'warn'}>;
//=> type HandleWarn = (data: Data, message: 'warn') => void;

// Change rest parameter type.

// Way 1: Input full parameter type.
type HandleLog = SetParameterType<HandleMessage, [data: Data, message: 'log', ...arguments: string[]]>;
//=> type HandleLog = (data: Data, message: 'log', ...arguments: string[]) => void;

// Way 2: Input rest parameter type by Object index.
type HandleLog2 = SetParameterType<HandleMessage, {2: string}>;
//=> type HandleLog2 = (data: Data, message: string, ...arguments: string[]) => void;
```

@category Function
*/
export type SetParameterType<Function_ extends (...arguments_: any[]) => unknown, P extends Record<number, unknown>> =
	// Just using `Parameters<Fn>` isn't ideal because it doesn't handle the `this` fake parameter.
	Function_ extends (this: infer ThisArgument, ...arguments_: infer Arguments) => unknown
		? (
			// If a function did not specify the `this` fake parameter, it will be inferred to `unknown`.
			// We want to detect this situation just to display a friendlier type upon hovering on an IntelliSense-powered IDE.
			IsUnknown<ThisArgument> extends true
				? (...arguments_: MergeObjectToArray<Arguments, P>) => ReturnType<Function_>
				: (this: ThisArgument, ...arguments_: MergeObjectToArray<Arguments, P>) => ReturnType<Function_>
		)
		: Function_;	// This part should be unreachable
