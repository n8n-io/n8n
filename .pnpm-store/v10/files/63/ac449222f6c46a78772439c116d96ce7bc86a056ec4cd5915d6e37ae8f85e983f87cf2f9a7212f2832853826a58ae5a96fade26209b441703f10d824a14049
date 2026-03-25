import * as posix from './posix.js';
import * as win32 from './win32.js';
export * from './options.js';
export { win32, posix };
const platform = process.env._ISEXE_TEST_PLATFORM_ || process.platform;
const impl = platform === 'win32' ? win32 : posix;
/**
 * Determine whether a path is executable on the current platform.
 */
export const isexe = impl.isexe;
/**
 * Synchronously determine whether a path is executable on the
 * current platform.
 */
export const sync = impl.sync;
//# sourceMappingURL=index.js.map