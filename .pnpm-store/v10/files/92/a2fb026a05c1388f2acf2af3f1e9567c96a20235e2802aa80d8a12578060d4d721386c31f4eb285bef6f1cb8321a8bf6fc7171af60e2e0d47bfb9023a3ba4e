/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { wrapStaticHeadersInFunction } from './shared-configuration';
export function convertLegacyHeaders(config) {
    if (typeof config.headers === 'function') {
        return config.headers;
    }
    return wrapStaticHeadersInFunction(config.headers);
}
//# sourceMappingURL=convert-legacy-http-options.js.map