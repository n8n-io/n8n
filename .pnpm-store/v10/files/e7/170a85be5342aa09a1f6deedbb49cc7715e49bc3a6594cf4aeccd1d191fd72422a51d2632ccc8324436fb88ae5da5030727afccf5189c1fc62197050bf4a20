import { Errno, ErrnoError } from '../internal/error.js';
import { debug, err } from '../internal/log.js';
/**
 * @category Backends and Configuration
 * @internal
 */
export function isBackend(arg) {
    return arg != null && typeof arg == 'object' && 'create' in arg && typeof arg.create == 'function';
}
/**
 * Checks that `options` object is valid for the file system options.
 * @category Backends and Configuration
 * @internal
 */
export async function checkOptions(backend, options) {
    if (typeof options != 'object' || options === null) {
        throw err(new ErrnoError(Errno.EINVAL, 'Invalid options'));
    }
    // Check for required options.
    for (const [optName, opt] of Object.entries(backend.options)) {
        const value = options === null || options === void 0 ? void 0 : options[optName];
        if (value === undefined || value === null) {
            if (!opt.required) {
                debug('Missing non-required option: ' + optName);
                continue;
            }
            throw err(new ErrnoError(Errno.EINVAL, 'Missing required option: ' + optName));
        }
        const isType = (type, _ = value) => (typeof type == 'function' ? value instanceof type : typeof value === type);
        if (Array.isArray(opt.type) ? !opt.type.some(v => isType(v)) : !isType(opt.type)) {
            // The type of the value as a string
            const type = typeof value == 'object' && 'constructor' in value ? value.constructor.name : typeof value;
            // The expected type (as a string)
            const name = (type) => (typeof type == 'function' ? type.name : type);
            const expected = Array.isArray(opt.type) ? `one of ${opt.type.map(name).join(', ')}` : name(opt.type);
            throw err(new ErrnoError(Errno.EINVAL, `Incorrect type for "${optName}": ${type} (expected ${expected})`));
        }
        debug('Using custom validator for option: ' + optName);
        if (opt.validator)
            await opt.validator(value);
        // Otherwise: All good!
    }
}
/**
 * @internal
 * @category Backends and Configuration
 */
export function isBackendConfig(arg) {
    return arg != null && typeof arg == 'object' && 'backend' in arg && isBackend(arg.backend);
}
