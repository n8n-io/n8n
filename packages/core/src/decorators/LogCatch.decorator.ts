/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

export const LogCatch = (logFn: (error: unknown) => void) => {
	return (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value;

		descriptor.value = function (...args: unknown[]) {
			try {
				const result: unknown = originalMethod.apply(this, args);

				if (result && result instanceof Promise) {
					return result.catch((error: unknown) => {
						logFn(error);
						throw error;
					});
				}

				return result;
			} catch (error) {
				logFn(error);
				throw error;
			}
		};

		return descriptor;
	};
};
