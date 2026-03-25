"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractorLogLevel = void 0;
/**
 * Used with {@link IConfigMessageReportingRule.logLevel} and {@link IExtractorInvokeOptions.messageCallback}.
 *
 * @remarks
 * This is part of the {@link IConfigFile} structure.
 *
 * @public
 */
var ExtractorLogLevel;
(function (ExtractorLogLevel) {
    /**
     * The message will be displayed as an error.
     *
     * @remarks
     * Errors typically cause the build to fail and return a nonzero exit code.
     */
    ExtractorLogLevel["Error"] = "error";
    /**
     * The message will be displayed as an warning.
     *
     * @remarks
     * Warnings typically cause a production build fail and return a nonzero exit code.  For a non-production build
     * (e.g. using the `--local` option with `api-extractor run`), the warning is displayed but the build will not fail.
     */
    ExtractorLogLevel["Warning"] = "warning";
    /**
     * The message will be displayed as an informational message.
     *
     * @remarks
     * Informational messages may contain newlines to ensure nice formatting of the output,
     * however word-wrapping is the responsibility of the message handler.
     */
    ExtractorLogLevel["Info"] = "info";
    /**
     * The message will be displayed only when "verbose" output is requested, e.g. using the `--verbose`
     * command line option.
     */
    ExtractorLogLevel["Verbose"] = "verbose";
    /**
     * The message will be discarded entirely.
     */
    ExtractorLogLevel["None"] = "none";
})(ExtractorLogLevel || (exports.ExtractorLogLevel = ExtractorLogLevel = {}));
//# sourceMappingURL=ExtractorLogLevel.js.map