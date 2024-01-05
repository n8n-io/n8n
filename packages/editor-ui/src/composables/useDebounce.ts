import { ref } from 'vue';
import { debounce as _debounce } from 'lodash-es';

export interface DebounceOptions {
	debounceTime: number;
	trailing?: boolean;
}

export type DebouncedFunction<R = void> = (...args: unknown[]) => Promise<R> | R;

export function useDebounce() {
	// Create a ref for the WeakMap to store debounced functions.
	const debounceCache = ref(new WeakMap<DebouncedFunction, DebouncedFunction>());

	const debounce = <T extends DebouncedFunction>(fn: T, options: DebounceOptions): T => {
		const { trailing, debounceTime } = options;

		// Check if a debounced version of the function is already stored in the WeakMap.
		let debouncedFn = debounceCache.value.get(fn);

		// If a debounced version is not found, create one and store it in the WeakMap.
		if (debouncedFn === undefined) {
			debouncedFn = _debounce(
				async (...args: unknown[]) => {
					return fn(...args);
				},
				debounceTime,
				trailing ? { trailing } : { leading: true },
			);

			debounceCache.value.set(fn, debouncedFn);
		}

		return debouncedFn as T;
	};

	const callDebounced = <T extends DebouncedFunction = DebouncedFunction>(
		fn: T,
		options: DebounceOptions,
		...inputParameters: Parameters<T>
	): ReturnType<T> => {
		const debouncedFn = debounce(fn, options);

		return debouncedFn(...inputParameters) as ReturnType<T>;
	};

	return {
		debounce,
		callDebounced,
	};
}
