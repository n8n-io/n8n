import assert from 'node:assert';

/**
 * A decorator that implements memoization for class property getters.
 *
 * The decorated getter will only be executed once and its value cached for subsequent access
 *
 * @example
 * class Example {
 *   @Memoized
 *   get computedValue() {
 *     // This will only run once and the result will be cached
 *     return heavyComputation();
 *   }
 * }
 *
 * @throws If decorator is used on something other than a getter
 */
export function Memoized<T = unknown>(
	target: object,
	propertyKey: string | symbol,
	descriptor?: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T> {
	const originalGetter = descriptor?.get;
	assert(originalGetter, '@Memoized can only be used on getters');

	// Replace the original getter for the first call
	descriptor.get = function (this: typeof target.constructor): T {
		const value = originalGetter.call(this);
		// Add a property on the class instance to stop reading from the getter on class prototype
		Object.defineProperty(this, propertyKey, {
			value,
			configurable: false,
			enumerable: false,
			writable: false,
		});
		return value;
	};

	return descriptor;
}
