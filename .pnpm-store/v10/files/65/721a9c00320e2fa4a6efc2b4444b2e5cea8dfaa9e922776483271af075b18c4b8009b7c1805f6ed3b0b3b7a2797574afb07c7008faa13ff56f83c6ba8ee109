import type {ApplyDefaultOptions, IfArrayReadonly} from './internal';
import type {UnknownArray} from './unknown-array';

/**
@see {@link ArrayTail}
*/
type ArrayTailOptions = {
	/**
	Return a readonly array if the input array is readonly.

	@default false

	@example
	```
	import type {ArrayTail} from 'type-fest';

	type Example1 = ArrayTail<readonly [string, number, boolean], {preserveReadonly: true}>;
	//=> readonly [number, boolean]

	type Example2 = ArrayTail<[string, number, boolean], {preserveReadonly: true}>;
	//=> [number, boolean]

	type Example3 = ArrayTail<readonly [string, number, boolean], {preserveReadonly: false}>;
	//=> [number, boolean]

	type Example4 = ArrayTail<[string, number, boolean], {preserveReadonly: false}>;
	//=> [number, boolean]
	```
	*/
	preserveReadonly?: boolean;
};

type DefaultArrayTailOptions = {
	preserveReadonly: false;
};

/**
Extracts the type of an array or tuple minus the first element.

@example
```
import type {ArrayTail} from 'type-fest';

declare const curry: <Arguments extends unknown[], Return>(
	function_: (...arguments_: Arguments) => Return,
	...arguments_: ArrayTail<Arguments>
) => (...arguments_: ArrayTail<Arguments>) => Return;

const add = (a: number, b: number) => a + b;

const add3 = curry(add, 3);

add3(4);
//=> 7
```

@see {@link ArrayTailOptions}

@category Array
*/
export type ArrayTail<TArray extends UnknownArray, Options extends ArrayTailOptions = {}> =
	ApplyDefaultOptions<ArrayTailOptions, DefaultArrayTailOptions, Options> extends infer ResolvedOptions extends Required<ArrayTailOptions>
		? TArray extends UnknownArray // For distributing `TArray`
			? _ArrayTail<TArray> extends infer Result
				? ResolvedOptions['preserveReadonly'] extends true
					? IfArrayReadonly<TArray, Readonly<Result>, Result>
					: Result
				: never // Should never happen
			: never // Should never happen
		: never; // Should never happen

type _ArrayTail<TArray extends UnknownArray> = TArray extends readonly [unknown?, ...infer Tail]
	? keyof TArray & `${number}` extends never
		? []
		: Tail
	: [];
