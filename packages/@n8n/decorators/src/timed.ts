export interface TimedOptions {
	/** Duration (in ms) above which to log a warning. Defaults to `100`. */
	threshold?: number;
	/** Whether to include method parameters in the log. Defaults to `false`. */
	logArgs?: boolean;
}

interface Logger {
	warn(message: string, meta?: object): void;
}

/**
 * Factory to create decorators to warn when method calls exceed a duration threshold.
 */
export const Timed =
	(logger: Logger, msg = 'Slow method call') =>
	(options: TimedOptions = {}): MethodDecorator =>
	(_target, propertyKey, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
		const thresholdMs = options.threshold ?? 100;
		const logArgs = options.logArgs ?? false;

		descriptor.value = async function (...args: unknown[]) {
			const methodName = `${this.constructor.name}.${String(propertyKey)}`;
			const start = performance.now();
			const result = await originalMethod.apply(this, args);
			const durationMs = performance.now() - start;

			if (durationMs > thresholdMs) {
				logger.warn(msg, {
					method: methodName,
					durationMs: Math.round(durationMs),
					thresholdMs,
					params: logArgs ? args : '[hidden]',
				});
			}

			return result;
		};

		return descriptor;
	};
