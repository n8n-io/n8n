"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHttpTlsConfig = exports.getGrpcTlsConfig = exports.envVariableSubstitution = exports.getStringListFromConfigFile = exports.getStringFromConfigFile = exports.getNumberListFromConfigFile = exports.getNumberFromConfigFile = exports.getBooleanListFromConfigFile = exports.getBooleanFromConfigFile = void 0;
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const util_1 = require("util");
/**
 * Retrieves a boolean value from a configuration file parameter.
 * - Trims leading and trailing whitespace and ignores casing.
 * - Returns `undefined` if the value is empty, unset, or contains only whitespace.
 * - Returns `undefined` and a warning for values that cannot be mapped to a boolean.
 *
 * @param {unknown} value - The value from the config file.
 * @returns {boolean} - The boolean value or `false` if the environment variable is unset empty, unset, or contains only whitespace.
 */
function getBooleanFromConfigFile(value) {
    const raw = envVariableSubstitution(value)?.trim().toLowerCase();
    if (raw === 'true') {
        return true;
    }
    else if (raw === 'false') {
        return false;
    }
    else if (raw == null || raw === '') {
        return undefined;
    }
    else {
        api_1.diag.warn(`Unknown value ${(0, util_1.inspect)(raw)}, expected 'true' or 'false'`);
        return undefined;
    }
}
exports.getBooleanFromConfigFile = getBooleanFromConfigFile;
/**
 * Retrieves a list of booleans from a configuration file parameter.
 * - Uses ',' as the delimiter.
 * - Trims leading and trailing whitespace from each entry.
 * - Excludes empty entries.
 * - Returns `undefined` if the variable is empty or contains only whitespace.
 * - Returns an empty array if all entries are empty or whitespace.
 *
 * @param {unknown} value - The value from the config file.
 * @returns {boolean[] | undefined} - The list of strings or `undefined`.
 */
function getBooleanListFromConfigFile(value) {
    const list = getStringFromConfigFile(value)?.split(',');
    if (list) {
        const filteredList = [];
        for (let i = 0; i < list.length; i++) {
            const element = getBooleanFromConfigFile(list[i]);
            if (element != null) {
                filteredList.push(element);
            }
        }
        return filteredList;
    }
    return list;
}
exports.getBooleanListFromConfigFile = getBooleanListFromConfigFile;
/**
 * Retrieves a number from a configuration file parameter.
 * - Returns `undefined` if the environment variable is empty, unset, or contains only whitespace.
 * - Returns `undefined` and a warning if is not a number.
 * - Returns a number in all other cases.
 *
 * @param {unknown} value - The value from the config file.
 * @returns {number | undefined} - The number value or `undefined`.
 */
function getNumberFromConfigFile(value) {
    const raw = envVariableSubstitution(value)?.trim();
    if (raw == null || raw.trim() === '') {
        return undefined;
    }
    const n = Number(raw);
    if (isNaN(n)) {
        api_1.diag.warn(`Unknown value ${(0, util_1.inspect)(raw)}, expected a number`);
        return undefined;
    }
    return n;
}
exports.getNumberFromConfigFile = getNumberFromConfigFile;
/**
 * Retrieves a list of numbers from a configuration file parameter.
 * - Uses ',' as the delimiter.
 * - Trims leading and trailing whitespace from each entry.
 * - Excludes empty entries.
 * - Returns `undefined` if the variable is empty or contains only whitespace.
 * - Returns an empty array if all entries are empty or whitespace.
 *
 * @param {unknown} value - The value from the config file.
 * @returns {number[] | undefined} - The list of numbers or `undefined`.
 */
function getNumberListFromConfigFile(value) {
    const list = getStringFromConfigFile(value)?.split(',');
    if (list) {
        const filteredList = [];
        for (let i = 0; i < list.length; i++) {
            const element = getNumberFromConfigFile(list[i]);
            if (element || element === 0) {
                filteredList.push(element);
            }
        }
        return filteredList;
    }
    return list;
}
exports.getNumberListFromConfigFile = getNumberListFromConfigFile;
/**
 * Retrieves a string from a configuration file parameter.
 * - Returns `undefined` if the variable is empty, unset, or contains only whitespace.
 *
 * @param {unknown} value - The value from the config file.
 * @returns {string | undefined} - The string value or `undefined`.
 */
function getStringFromConfigFile(value) {
    const raw = envVariableSubstitution(value)?.trim();
    if (value == null || raw === '') {
        return undefined;
    }
    return raw;
}
exports.getStringFromConfigFile = getStringFromConfigFile;
/**
 * Retrieves a list of strings from a configuration file parameter.
 * - Uses ',' as the delimiter.
 * - Trims leading and trailing whitespace from each entry.
 * - Excludes empty entries.
 * - Returns `undefined` if the variable is empty or contains only whitespace.
 * - Returns an empty array if all entries are empty or whitespace.
 *
 * @param {unknown} value - The value from the config file.
 * @returns {string[] | undefined} - The list of strings or `undefined`.
 */
function getStringListFromConfigFile(value) {
    value = envVariableSubstitution(value);
    return getStringFromConfigFile(value)
        ?.split(',')
        .map(v => v.trim())
        .filter(s => s !== '');
}
exports.getStringListFromConfigFile = getStringListFromConfigFile;
function envVariableSubstitution(value) {
    if (value == null) {
        return undefined;
    }
    const matches = String(value).match(/\$\{[a-zA-Z0-9,=/_:.-]*\}/g);
    if (matches) {
        let stringValue = String(value);
        for (const match of matches) {
            const v = match.substring(2, match.length - 1).split(':-');
            const defaultValue = v.length === 2 ? v[1] : '';
            const replacement = (0, core_1.getStringFromEnv)(v[0]) || defaultValue;
            stringValue = stringValue.replace(match, replacement);
        }
        return stringValue;
    }
    return String(value);
}
exports.envVariableSubstitution = envVariableSubstitution;
function getGrpcTlsConfig(certificateFile, clientKeyFile, clientCertificateFile, insecure) {
    if (certificateFile || clientKeyFile || clientCertificateFile) {
        const tls = {};
        if (certificateFile) {
            tls.ca_file = certificateFile;
        }
        if (clientKeyFile) {
            tls.key_file = clientKeyFile;
        }
        if (clientCertificateFile) {
            tls.cert_file = clientCertificateFile;
        }
        if (insecure !== undefined) {
            tls.insecure = insecure;
        }
        return tls;
    }
    return undefined;
}
exports.getGrpcTlsConfig = getGrpcTlsConfig;
function getHttpTlsConfig(certificateFile, clientKeyFile, clientCertificateFile) {
    if (certificateFile || clientKeyFile || clientCertificateFile) {
        const tls = {};
        if (certificateFile) {
            tls.ca_file = certificateFile;
        }
        if (clientKeyFile) {
            tls.key_file = clientKeyFile;
        }
        if (clientCertificateFile) {
            tls.cert_file = clientCertificateFile;
        }
        return tls;
    }
    return undefined;
}
exports.getHttpTlsConfig = getHttpTlsConfig;
//# sourceMappingURL=utils.js.map