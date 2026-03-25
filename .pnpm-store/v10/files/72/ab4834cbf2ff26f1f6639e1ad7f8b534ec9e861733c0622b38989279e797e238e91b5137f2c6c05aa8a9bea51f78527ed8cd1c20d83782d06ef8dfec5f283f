"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TSError = exports.INSPECT_CUSTOM = void 0;
var util_1 = require("util");
var make_error_1 = require("make-error");
var logger_1 = require("./logger");
var messages_1 = require("./messages");
var logger = logger_1.rootLogger.child({ namespace: 'TSError' });
/**
 * @internal
 */
exports.INSPECT_CUSTOM = util_1.inspect.custom || 'inspect';
/**
 * TypeScript diagnostics error.
 *
 * @internal
 */
var TSError = /** @class */ (function (_super) {
    __extends(TSError, _super);
    function TSError(diagnosticText, diagnosticCodes) {
        var _this = _super.call(this, (0, messages_1.interpolate)("{{diagnostics}}" /* Errors.UnableToCompileTypeScript */, {
            diagnostics: diagnosticText.trim(),
        })) || this;
        _this.diagnosticText = diagnosticText;
        _this.diagnosticCodes = diagnosticCodes;
        _this.name = 'TSError';
        logger.debug({ diagnosticCodes: diagnosticCodes, diagnosticText: diagnosticText }, 'created new TSError');
        // ensure we blacklist any of our code
        Object.defineProperty(_this, 'stack', { value: '' });
        return _this;
    }
    /* istanbul ignore next */
    TSError.prototype[exports.INSPECT_CUSTOM] = function () {
        return this.diagnosticText;
    };
    return TSError;
}(make_error_1.BaseError));
exports.TSError = TSError;
