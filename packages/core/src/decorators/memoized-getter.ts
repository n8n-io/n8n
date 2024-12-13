import { ApplicationError } from 'n8n-workflow';

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
 * @throws {ApplicationError} If decorator is used on something other than a getter
 */
export function Memoized(
	target: object,
	propertyKey: string,
	descriptor?: PropertyDescriptor,
): PropertyDescriptor {
	// eslint-disable-next-line @typescript-eslint/unbound-method
	const originalGetter = descriptor?.get;
	if (!originalGetter) {
		throw new ApplicationError('@Memoized can only be used on getters');
	}

	// Replace the original getter for the first call
	descriptor.get = function <T>(this: typeof target.constructor): T {
		const value = originalGetter.call(this) as T;
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
