import { ref } from 'vue';
import { debounce as _debounce } from 'lodash-es';

export interface DebounceOptions {
	debounceTime: number;
	trailing?: boolean;
}

export type DebouncedFunction<Args extends unknown[] = unknown[], R = void> = (...args: Args) => R;

export function useDebounce() {
	// Create a ref for the WeakMap to store debounced functions.
	const debounceCache = ref(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		new WeakMap<DebouncedFunction<any, any>, DebouncedFunction<any, any>>(),
	);

	const debounce = <T extends DebouncedFunction<Parameters<T>, ReturnType<T>>>(
		fn: T,
		options: DebounceOptions,
	): T => {
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

		return debouncedFn as T;
	};

	const callDebounced = <T extends DebouncedFunction<Parameters<T>, ReturnType<T>>>(
		fn: T,
		options: DebounceOptions,
		...inputParameters: Parameters<T>
	): ReturnType<T> => {
		const debouncedFn = debounce(fn, options);

		return debouncedFn(...inputParameters);
	};

	return {
		debounce,
		callDebounced,
	};
}
