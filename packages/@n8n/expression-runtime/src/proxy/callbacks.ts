import type { ValueMetadata, ProxyCallbacks, ProxyOptions } from './types';

/**
 * Creates callback functions for a given data source
 */
export function createProxyCallbacks(
	dataSource: Record<string, unknown>,
	options: ProxyOptions = {},
): ProxyCallbacks {
	const smallArrayThreshold = options.smallArrayThreshold ?? 100;

	return {
		getValueAtPath(path: string[]): ValueMetadata {
			// Navigate to value
			let value: unknown = dataSource;
			for (const key of path) {
				value = (value as Record<string, unknown>)?.[key];
				if (value === undefined || value === null) {
					return value;
				}
			}

			// Handle functions - return directly (not metadata)
			if (typeof value === 'function') {
				const fnString = value.toString();
				// Block native functions for security
				if (fnString.includes('[native code]')) {
					return undefined;
				}
				return value; // Return function directly
			}

			// Handle arrays
			if (Array.isArray(value)) {
				if (value.length <= smallArrayThreshold) {
					// Small array: return with data
					return {
						__isArray: true,
						__length: value.length,
						__data: value,
					};
				} else {
					// Large array: return metadata only
					return {
						__isArray: true,
						__length: value.length,
						__data: null,
					};
				}
			}

			// Handle objects
			if (value !== null && typeof value === 'object') {
				return {
					__isObject: true,
					__keys: Object.keys(value),
				};
			}

			// Primitive value
			return value;
		},

		getArrayElement(path: string[], index: number): unknown {
			// Navigate to array
			let arr: unknown = dataSource;
			for (const key of path) {
				arr = (arr as Record<string, unknown>)?.[key];
			}

			if (!Array.isArray(arr)) {
				return undefined;
			}

			const element = arr[index];

			// If element is object/array, return metadata
			if (element !== null && typeof element === 'object') {
				if (Array.isArray(element)) {
					return {
						__isArray: true,
						__length: element.length,
						__data: element.length <= smallArrayThreshold ? element : null,
					};
				}
				return {
					__isObject: true,
					__keys: Object.keys(element),
				};
			}

			// Primitive element
			return element;
		},
	};
}
