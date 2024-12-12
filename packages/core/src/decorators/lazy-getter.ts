/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ApplicationError } from 'n8n-workflow';

export function Lazy(
	target: object,
	propertyKey: string,
	descriptor?: PropertyDescriptor,
): PropertyDescriptor {
	const ConfigClass = target.constructor;
	// eslint-disable-next-line @typescript-eslint/unbound-method
	const originalGetter = descriptor?.get;
	if (!originalGetter) {
		throw new ApplicationError('@Lazy can only be used on getters');
	}

	// Create a unique symbol for this property
	const cacheKey = Symbol(`__lazy_${propertyKey}`);

	// Replace the original getter
	descriptor.get = function (this: typeof ConfigClass) {
		if (this.hasOwnProperty(cacheKey)) {
			// @ts-expect-error ????
			return this[cacheKey];
		}

		const value = originalGetter.call(this);
		Object.defineProperty(this, cacheKey, {
			value,
			configurable: false,
			enumerable: false,
			writable: false,
		});

		return value;
	};

	return descriptor;
}
