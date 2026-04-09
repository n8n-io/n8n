"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertLegacyHeaders = void 0;
const shared_configuration_1 = require("./shared-configuration");
function convertLegacyHeaders(config) {
    if (typeof config.headers === 'function') {
        return config.headers;
    }
    return (0, shared_configuration_1.wrapStaticHeadersInFunction)(config.headers);
}
exports.convertLegacyHeaders = convertLegacyHeaders;
//# sourceMappingURL=convert-legacy-http-options.js.map