import lodashDebounce from 'lodash/debounce';
import { ref } from 'vue';

/**
 * Get debounce time with optional multiplier from sessionStorage.
 * Reads 'N8N_DEBOUNCE_MULTIPLIER' - defaults to 1 if not set.
 */
export function getDebounceTime(time: number): number {
	const stored = sessionStorage.getItem('N8N_DEBOUNCE_MULTIPLIER');
	const multiplier = stored !== null ? parseFloat(stored) : 1;
	return Math.round(time * (Number.isNaN(multiplier) ? 1 : multiplier));
}

export interface DebounceOptions {
	debounceTime: number;
	trailing?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any) => any;
type DebouncedFunc<T extends AnyFunction> = ReturnType<typeof lodashDebounce<T>>;

export function useDebounce() {
	// Create a ref for the WeakMap to store debounced functions.
	const debounceCache = ref(new WeakMap<AnyFunction, DebouncedFunc<AnyFunction>>());

	const debounce = <T extends AnyFunction>(fn: T, options: DebounceOptions): DebouncedFunc<T> => {
		const { trailing, debounceTime } = options;

		const effectiveDebounceTime = getDebounceTime(debounceTime);

		// Check if a debounced version of the function is already stored in the WeakMap.
		let debouncedFn = debounceCache.value.get(fn);

		// If a debounced version is not found, create one and store it in the WeakMap.
		if (debouncedFn === undefined) {
			debouncedFn = lodashDebounce(
				// eslint-disable-next-line @typescript-eslint/require-await -- kept async so the debounced wrapper always returns a promise
				async (...args: Parameters<T>) => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- AnyFunction return is intentionally `any`
					return fn(...args);
				},
				effectiveDebounceTime,
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

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- AnyFunction return is intentionally `any`
		return debouncedFn(...inputParameters);
	};

	return {
		debounce,
		callDebounced,
	};
}
