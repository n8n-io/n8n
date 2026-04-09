import { createCredentials, credentials as defaultCredentials } from './internal/credentials.js';
import * as fs from './vfs/index.js';
/**
 * Binds a this value for all of the functions in an object (not recursive)
 * @internal
 */
function _bindFunctions(fns, thisValue) {
    return Object.fromEntries(Object.entries(fns).map(([k, v]) => [k, typeof v == 'function' ? v.bind(thisValue) : v]));
}
/**
 * Allows you to restrict operations to a specific root path and set of credentials.
 * Note that the default credentials of a bound context are copied from the global credentials.
 * @category Backends and Configuration
 */
export function bindContext(root, credentials = structuredClone(defaultCredentials)) {
    const ctx = {
        root,
        credentials: createCredentials(credentials),
    };
    const fn_fs = _bindFunctions(fs, ctx);
    const fn_promises = _bindFunctions(fs.promises, ctx);
    return { ...ctx, fs: { ...fs, ...fn_fs, promises: { ...fs.promises, ...fn_promises } } };
}
