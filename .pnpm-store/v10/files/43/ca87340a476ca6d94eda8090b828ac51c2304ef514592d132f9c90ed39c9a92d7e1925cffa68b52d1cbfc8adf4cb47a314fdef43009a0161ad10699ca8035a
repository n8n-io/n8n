/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-base-to-string */
export interface CreateLoggerOptions {
	/**
	 * The function used to output
	 * @default console.log
	 */
	output?: (...args: any[]) => void;
	stringify?: (value: unknown) => string;
	/**
	 * Whether to output the class name when logging methods
	 * @default true
	 */
	className?: boolean;
	/**
	 * The separator used to separate the class name and method.
	 * Ignored if `className` is `false`
	 * @default '#'
	 */
	separator?: string;
	/**
	 * Whether to log the return value
	 * @default false
	 */
	returnValue?: boolean;
}

function defaultStringify(value: unknown): string {
	switch (typeof value) {
		case 'undefined':
			return 'undefined';
		case 'string':
		case 'number':
		case 'boolean':
			return JSON.stringify(value);
		case 'bigint':
		case 'symbol':
			return value.toString();
		case 'function':
			return value.name + '()';
		case 'object':
			if (value === null) return 'null';
			if (ArrayBuffer.isView(value)) {
				const length =
					'length' in value
						? (value.length as number)
						: value.byteLength / (value.constructor as any).BYTES_PER_ELEMENT;
				return `${value.constructor.name.replaceAll('Array', '').toLowerCase()}[${length}]`;
			}
			if (Array.isArray(value)) return `unknown[${value.length}]`;
			try {
				const json = JSON.stringify(value);

				return json.length < 100 ? json : value.toString();
			} catch {
				return value.toString();
			}
	}
}

type LoggableDecoratorContext = Exclude<DecoratorContext, ClassFieldDecoratorContext>;

/**
 * Create a function that can be used to decorate classes and non-field members.
 */
export function createLogDecorator(options: CreateLoggerOptions) {
	const {
		output = console.log,
		separator = '#',
		returnValue = false,
		stringify = defaultStringify,
		className = true,
	} = options;

	return function log<T extends (...args: any[]) => any>(value: T, context: LoggableDecoratorContext): T {
		if (context.kind == 'class') {
			return function (...args: any[]) {
				output(`new ${value.name} (${args.map(stringify).join(', ')})`);
				return Reflect.construct(value, args);
			} as T;
		}

		return function (this: any, ...args: any[]) {
			const prefix = (className ? this.constructor.name + separator : '') + context.name.toString();

			output(`${prefix}(${args.map(stringify).join(', ')})`);

			const result = value.call(this, ...args);

			if (returnValue) output(' => ' + stringify(result));

			return result;
		} as T;
	};
}

/**
 * @internal @hidden
 */
export let U_DEBUG = 'process' in globalThis && 'env' in globalThis.process && globalThis.process.env.U_DEBUG == 'true';

/**
 * @internal @hidden
 */
export function _setDebug(value: boolean) {
	U_DEBUG = value;
}

/**
 * @internal @hidden
 */
export function _debugLog(...text: any[]) {
	if (U_DEBUG) console.debug('[U]', ...text);
}
