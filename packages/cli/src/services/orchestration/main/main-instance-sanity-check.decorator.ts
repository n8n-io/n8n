/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

export function SanityCheck(): MethodDecorator {
	return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;

		descriptor.value = function (...args: unknown[]) {
			if (!this.sanityCheck()) return;

			return originalMethod.apply(this, args);
		};

		return descriptor;
	};
}
