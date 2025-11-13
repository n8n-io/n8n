import { ref } from 'vue';
import _debounce from 'lodash/debounce';

export interface DebounceOptions {
	debounceTime: number;
	trailing?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any) => any;
type DebouncedFunc<T extends AnyFunction> = ReturnType<typeof _debounce<T>>;

export function useDebounce() {
	// Create a ref for the WeakMap to store debounced functions.
	const debounceCache = ref(new WeakMap<AnyFunction, DebouncedFunc<AnyFunction>>());

	const debounce = <T extends AnyFunction>(fn: T, options: DebounceOptions): DebouncedFunc<T> => {
		const { trailing, debounceTime } = options;

		// Check if a debounced version of the function is already stored in the WeakMap.
		let debouncedFn = debounceCache.value.get(fn);

		// If a debounced version is not found, create one and store it in the WeakMap.
		if (debouncedFn === undefined) {
			debouncedFn = _debounce(
				async (...args: Parameters<T>) => {
					return fn(...args);
				},
				debounceTime,
				trailing ? { trailing } : { leading: true },
			);

			debounceCache.value.set(fn, debouncedFn);
		}

		return debouncedFn;
	};

	const callDebounced = <T extends AnyFunction>(
		fn: T,
		options: DebounceOptions,
		...inputParameters: Parameters<T>
	): ReturnType<T> | undefined => {
		const debouncedFn = debounce(fn, options);

		return debouncedFn(...inputParameters);
	};

	return {
		debounce,
		callDebounced,
	};
}
