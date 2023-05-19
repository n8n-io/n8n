import { ref } from 'vue';
import { debounce } from 'lodash-es';

type DebouncedFunction = (...args: unknown[]) => Promise<void> | void;

export function useDebounceHelper() {
	// Create a ref for the WeakMap to store debounced functions.
	const debouncedFunctions = ref(new WeakMap<DebouncedFunction, DebouncedFunction>());

	const callDebounced = async (
		func: DebouncedFunction,
		options: { debounceTime: number; trailing?: boolean },
		...inputParameters: unknown[]
	): Promise<void> => {
		const { trailing, debounceTime } = options;

		// Check if a debounced version of the function is already stored in the WeakMap.
		let debouncedFunc = debouncedFunctions.value.get(func);

		// If a debounced version is not found, create one and store it in the WeakMap.
		if (debouncedFunc === undefined) {
			debouncedFunc = debounce(
				async (...args: unknown[]) => {
					await func(...args);
				},
				debounceTime,
				trailing ? { trailing } : { leading: true },
			);
			debouncedFunctions.value.set(func, debouncedFunc);
		}

		await debouncedFunc(...inputParameters);
	};

	return {
		callDebounced,
	};
}
