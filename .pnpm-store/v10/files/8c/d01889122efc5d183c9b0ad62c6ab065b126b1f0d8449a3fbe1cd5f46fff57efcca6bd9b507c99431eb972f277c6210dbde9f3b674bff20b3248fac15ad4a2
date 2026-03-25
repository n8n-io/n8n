"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionStringParser = void 0;
const tslib_1 = require("tslib");
const api_1 = require("@opentelemetry/api");
const Constants = tslib_1.__importStar(require("../Declarations/Constants.js"));
/**
 * ConnectionString parser.
 * @internal
 */
class ConnectionStringParser {
    static parse(connectionString) {
        if (!connectionString) {
            return {};
        }
        const kvPairs = connectionString.split(ConnectionStringParser.FIELDS_SEPARATOR);
        let isValid = true;
        const result = kvPairs.reduce((fields, kv) => {
            const kvParts = kv.split(ConnectionStringParser.FIELD_KEY_VALUE_SEPARATOR);
            if (kvParts.length === 2) {
                // only save fields with valid formats
                const key = kvParts[0].toLowerCase();
                const value = kvParts[1];
                return Object.assign(Object.assign({}, fields), { [key]: value });
            }
            api_1.diag.error("Connection string key-value pair is invalid: Entire connection string will be discarded");
            isValid = false;
            return fields;
        }, {});
        if (isValid && Object.keys(result).length > 0) {
            // this is a valid connection string, so parse the results
            if (result.endpointsuffix) {
                // use endpoint suffix where overrides are not provided
                const locationPrefix = result.location ? `${result.location}.` : "";
                result.ingestionendpoint =
                    result.ingestionendpoint || `https://${locationPrefix}dc.${result.endpointsuffix}`;
                result.liveendpoint =
                    result.liveendpoint || `https://${locationPrefix}live.${result.endpointsuffix}`;
            }
            result.ingestionendpoint = result.ingestionendpoint
                ? ConnectionStringParser.sanitizeUrl(result.ingestionendpoint)
                : Constants.DEFAULT_BREEZE_ENDPOINT;
            result.liveendpoint = result.liveendpoint
                ? ConnectionStringParser.sanitizeUrl(result.liveendpoint)
                : Constants.DEFAULT_LIVEMETRICS_ENDPOINT;
            if (result.authorization && result.authorization.toLowerCase() !== "ikey") {
                api_1.diag.warn(`Connection String contains an unsupported 'Authorization' value. Defaulting to 'Authorization=ikey'`);
            }
        }
        else {
            api_1.diag.error("An invalid connection string was passed in. There may be telemetry loss");
        }
        return result;
    }
    static sanitizeUrl(url) {
        let newUrl = url.trim();
        if (newUrl.indexOf("https://") < 0) {
            // Try to update http to https
            newUrl = newUrl.replace("http://", "https://");
        }
        // Remove final slash if present
        if (newUrl[newUrl.length - 1] === "/") {
            newUrl = newUrl.slice(0, -1);
        }
        return newUrl;
    }
    static validateInstrumentationKey(iKey) {
        if (iKey.startsWith("InstrumentationKey=")) {
            const startIndex = iKey.indexOf("InstrumentationKey=") + "InstrumentationKey=".length;
            const endIndex = iKey.indexOf(";", startIndex);
            iKey = iKey.substring(startIndex, endIndex);
        }
        const UUID_Regex = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";
        const regexp = new RegExp(UUID_Regex);
        return regexp.test(iKey);
    }
}
exports.ConnectionStringParser = ConnectionStringParser;
ConnectionStringParser.FIELDS_SEPARATOR = ";";
ConnectionStringParser.FIELD_KEY_VALUE_SEPARATOR = "=";
//# sourceMappingURL=connectionStringParser.js.map