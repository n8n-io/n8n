function defaultStringify(value) {
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
            if (value === null)
                return 'null';
            if (ArrayBuffer.isView(value)) {
                const length = 'length' in value
                    ? value.length
                    : value.byteLength / value.constructor.BYTES_PER_ELEMENT;
                return `${value.constructor.name.replaceAll('Array', '').toLowerCase()}[${length}]`;
            }
            if (Array.isArray(value))
                return `unknown[${value.length}]`;
            try {
                const json = JSON.stringify(value);
                return json.length < 100 ? json : value.toString();
            }
            catch {
                return value.toString();
            }
    }
}
/**
 * Create a function that can be used to decorate classes and non-field members.
 */
export function createLogDecorator(options) {
    const { output = console.log, separator = '#', returnValue = false, stringify = defaultStringify, className = true, } = options;
    return function log(value, context) {
        if (context.kind == 'class') {
            return function (...args) {
                output(`new ${value.name} (${args.map(stringify).join(', ')})`);
                return Reflect.construct(value, args);
            };
        }
        return function (...args) {
            const prefix = (className ? this.constructor.name + separator : '') + context.name.toString();
            output(`${prefix}(${args.map(stringify).join(', ')})`);
            const result = value.call(this, ...args);
            if (returnValue)
                output(' => ' + stringify(result));
            return result;
        };
    };
}
/**
 * @internal @hidden
 */
export let U_DEBUG = 'process' in globalThis && 'env' in globalThis.process && globalThis.process.env.U_DEBUG == 'true';
/**
 * @internal @hidden
 */
export function _setDebug(value) {
    U_DEBUG = value;
}
/**
 * @internal @hidden
 */
export function _debugLog(...text) {
    if (U_DEBUG)
        console.debug('[U]', ...text);
}
