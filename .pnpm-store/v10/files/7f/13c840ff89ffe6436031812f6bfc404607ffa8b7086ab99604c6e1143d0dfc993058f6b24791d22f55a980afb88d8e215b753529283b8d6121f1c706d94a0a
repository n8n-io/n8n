"use strict";
// Forked from https://github.com/eslint/eslint/blob/ad9dd6a933fd098a0d99c6a9aa059850535c23ee/lib/shared/deprecation-warnings.js
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitDeprecationWarning = emitDeprecationWarning;
const node_path_1 = __importDefault(require("node:path"));
// Definitions for deprecation warnings.
const deprecationWarningMessages = {
    ESLINT_LEGACY_ECMAFEATURES: "The 'ecmaFeatures' config file property is deprecated and has no effect.",
};
const sourceFileErrorCache = new Set();
/**
 * Emits a deprecation warning containing a given filepath. A new deprecation warning is emitted
 * for each unique file path, but repeated invocations with the same file path have no effect.
 * No warnings are emitted if the `--no-deprecation` or `--no-warnings` Node runtime flags are active.
 * @param source The name of the configuration source to report the warning for.
 * @param errorCode The warning message to show.
 */
function emitDeprecationWarning(source, errorCode) {
    const cacheKey = JSON.stringify({ errorCode, source });
    if (sourceFileErrorCache.has(cacheKey)) {
        return;
    }
    sourceFileErrorCache.add(cacheKey);
    const rel = node_path_1.default.relative(process.cwd(), source);
    const message = deprecationWarningMessages[errorCode];
    process.emitWarning(`${message} (found in "${rel}")`, 'DeprecationWarning', errorCode);
}
