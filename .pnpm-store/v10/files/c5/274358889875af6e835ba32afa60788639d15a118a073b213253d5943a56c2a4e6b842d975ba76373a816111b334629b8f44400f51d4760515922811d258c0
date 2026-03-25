import platform from './platform.js';
import { rimrafPosix, rimrafPosixSync } from './rimraf-posix.js';
import { rimrafWindows, rimrafWindowsSync } from './rimraf-windows.js';
export const rimrafManual = platform === 'win32' ? rimrafWindows : rimrafPosix;
export const rimrafManualSync = platform === 'win32' ? rimrafWindowsSync : rimrafPosixSync;
//# sourceMappingURL=rimraf-manual.js.map