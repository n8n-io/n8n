"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeLocale = exports.sanitizePath = void 0;
exports.getPlatformSpawnArgs = getPlatformSpawnArgs;
/**
 * Sanitizes the input path by removing invalid characters.
 */
const sanitizePath = (input) => {
    return input.replace(/[^a-zA-Z0-9 ._\-:\\/@]/g, '');
};
exports.sanitizePath = sanitizePath;
/**
 * Sanitizes the input locale (ex. en-US) by removing invalid characters.
 */
const sanitizeLocale = (input) => {
    return input.replace(/[^a-zA-Z0-9@._-]/g, '');
};
exports.sanitizeLocale = sanitizeLocale;
/**
 * Retrieves platform-specific arguments and utilities.
 */
function getPlatformSpawnArgs() {
    const isWindowsPlatform = process.platform === 'win32';
    const npxExecutableName = isWindowsPlatform ? 'npx.cmd' : 'npx';
    const sanitizeIfWindows = (input, sanitizer) => {
        if (isWindowsPlatform && input) {
            return sanitizer(input);
        }
        else {
            return input || '';
        }
    };
    return { npxExecutableName, sanitize: sanitizeIfWindows, shell: isWindowsPlatform };
}
