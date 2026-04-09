"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TSError = exports.INSPECT_CUSTOM = void 0;
const util_1 = require("util");
const make_error_1 = require("make-error");
const logger_1 = require("./logger");
const messages_1 = require("./messages");
const logger = logger_1.rootLogger.child({ namespace: 'TSError' });
/**
 * @internal
 */
exports.INSPECT_CUSTOM = util_1.inspect.custom || 'inspect';
/**
 * TypeScript diagnostics error.
 *
 * @internal
 */
class TSError extends make_error_1.BaseError {
    diagnosticText;
    diagnosticCodes;
    name = 'TSError';
    constructor(diagnosticText, diagnosticCodes) {
        super((0, messages_1.interpolate)("{{diagnostics}}" /* Errors.UnableToCompileTypeScript */, {
            diagnostics: diagnosticText.trim(),
        }));
        this.diagnosticText = diagnosticText;
        this.diagnosticCodes = diagnosticCodes;
        logger.debug({ diagnosticCodes, diagnosticText }, 'created new TSError');
        // ensure we blacklist any of our code
        Object.defineProperty(this, 'stack', { value: '' });
    }
    /* istanbul ignore next */
    [exports.INSPECT_CUSTOM]() {
        return this.diagnosticText;
    }
}
exports.TSError = TSError;
