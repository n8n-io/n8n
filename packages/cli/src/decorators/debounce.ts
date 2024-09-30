import debounce from 'lodash/debounce';

export const Debounce =
	(waitMs: number): MethodDecorator =>
	<T>(
		_: object,
		methodName: string,
		originalDescriptor: PropertyDescriptor,
	): TypedPropertyDescriptor<T> => ({
		configurable: true,

		get() {
			const debouncedFn = debounce(originalDescriptor.value, waitMs);

			Object.defineProperty(this, methodName, {
				configurable: false,
				value: debouncedFn,
			});

			return debouncedFn as T;
		},
	});
