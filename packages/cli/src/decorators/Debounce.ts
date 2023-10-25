import type { DebounceSettings } from 'lodash';
import _debounce from 'lodash/debounce';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Debounce =
	(wait: number, options: DebounceSettings = {}): MethodDecorator =>
	(target, name, descriptor: PropertyDescriptor) => ({
		configurable: true,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		get(): any {
			const debouncedFn = _debounce(descriptor.value, wait, options);
			Object.defineProperty(this, name, {
				configurable: false,
				value: debouncedFn,
			});
			return debouncedFn;
		},
	});
