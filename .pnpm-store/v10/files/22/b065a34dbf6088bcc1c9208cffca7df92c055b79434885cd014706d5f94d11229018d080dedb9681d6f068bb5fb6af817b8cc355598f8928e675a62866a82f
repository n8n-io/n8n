"use strict";
/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getField = getField;
exports.deepCopyWithoutMatchedFields = deepCopyWithoutMatchedFields;
exports.deleteField = deleteField;
exports.buildQueryStringComponents = buildQueryStringComponents;
exports.encodeWithSlashes = encodeWithSlashes;
exports.encodeWithoutSlashes = encodeWithoutSlashes;
exports.applyPattern = applyPattern;
exports.match = match;
exports.flattenObject = flattenObject;
exports.isProto3OptionalField = isProto3OptionalField;
exports.transcode = transcode;
exports.overrideHttpRules = overrideHttpRules;
const util_1 = require("./util");
const httpOptionName = '(google.api.http)';
const proto3OptionalName = 'proto3_optional';
// List of methods as defined in google/api/http.proto (see HttpRule)
const supportedHttpMethods = ['get', 'post', 'put', 'patch', 'delete'];
function getField(request, field, allowObjects = false // in most cases, we need leaf fields
) {
    const parts = field.split('.');
    let value = request;
    for (const part of parts) {
        if (typeof value !== 'object') {
            return undefined;
        }
        value = value[part];
    }
    if (!allowObjects &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        value !== null) {
        return undefined;
    }
    return value;
}
function deepCopyWithoutMatchedFields(request, fieldsToSkip, fullNamePrefix = '') {
    if (typeof request !== 'object' || request === null) {
        return request;
    }
    const copy = Object.assign({}, request);
    for (const key in copy) {
        if (fieldsToSkip.has(`${fullNamePrefix}${key}`)) {
            delete copy[key];
            continue;
        }
        const nextFullNamePrefix = `${fullNamePrefix}${key}.`;
        if (Array.isArray(copy[key])) {
            // a field of an array cannot be addressed as "request.field", so we omit the skipping logic for array descendants
            copy[key] = copy[key].map(value => deepCopyWithoutMatchedFields(value, new Set()));
        }
        else if (typeof copy[key] === 'object' && copy[key] !== null) {
            copy[key] = deepCopyWithoutMatchedFields(copy[key], fieldsToSkip, nextFullNamePrefix);
        }
    }
    return copy;
}
function deleteField(request, field) {
    const parts = field.split('.');
    while (parts.length > 1) {
        if (typeof request !== 'object') {
            return;
        }
        const part = parts.shift();
        request = request[part];
    }
    const part = parts.shift();
    if (typeof request !== 'object') {
        return;
    }
    delete request[part];
}
function buildQueryStringComponents(request, prefix = '') {
    const resultList = [];
    for (const key in request) {
        if (Array.isArray(request[key])) {
            for (const value of request[key]) {
                resultList.push(`${prefix}${encodeWithoutSlashes(key)}=${encodeWithoutSlashes(value.toString())}`);
            }
        }
        else if (typeof request[key] === 'object' && request[key] !== null) {
            resultList.push(...buildQueryStringComponents(request[key], `${key}.`));
        }
        else {
            resultList.push(`${prefix}${encodeWithoutSlashes(key)}=${encodeWithoutSlashes(request[key] === null ? 'null' : request[key].toString())}`);
        }
    }
    return resultList;
}
function encodeWithSlashes(str) {
    return str
        .split('')
        .map(c => (c.match(/[-_.~0-9a-zA-Z]/) ? c : encodeURIComponent(c)))
        .join('');
}
function encodeWithoutSlashes(str) {
    return str
        .split('')
        .map(c => (c.match(/[-_.~0-9a-zA-Z/]/) ? c : encodeURIComponent(c)))
        .join('');
}
function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function applyPattern(pattern, fieldValue) {
    if (!pattern || pattern === '*') {
        return encodeWithSlashes(fieldValue);
    }
    if (!pattern.includes('*') && pattern !== fieldValue) {
        return undefined;
    }
    // since we're converting the pattern to a regex, make necessary precautions:
    const regex = new RegExp('^' +
        escapeRegExp(pattern)
            .replace(/\\\*\\\*/g, '(.+)')
            .replace(/\\\*/g, '([^/]+)') +
        '$');
    if (!fieldValue.match(regex)) {
        return undefined;
    }
    return encodeWithoutSlashes(fieldValue);
}
function fieldToCamelCase(field) {
    const parts = field.split('.');
    return parts.map(part => (0, util_1.toCamelCase)(part)).join('.');
}
function match(request, pattern) {
    let url = pattern;
    const matchedFields = [];
    for (;;) {
        const match = url.match(/^(.*)\{([^}=]+)(?:=([^}]*))?\}(.*)/);
        if (!match) {
            break;
        }
        const [, before, field, pattern, after] = match;
        const camelCasedField = fieldToCamelCase(field);
        matchedFields.push(fieldToCamelCase(camelCasedField));
        const fieldValue = getField(request, camelCasedField);
        if (fieldValue === undefined) {
            return undefined;
        }
        const appliedPattern = applyPattern(pattern, fieldValue === null ? 'null' : fieldValue.toString());
        if (appliedPattern === undefined) {
            return undefined;
        }
        url = before + appliedPattern + after;
    }
    return { matchedFields, url };
}
function flattenObject(request) {
    const result = {};
    for (const key in request) {
        if (request[key] === undefined) {
            continue;
        }
        if (Array.isArray(request[key])) {
            // According to the http.proto comments, a repeated field may only
            // contain primitive types, so no extra recursion here.
            result[key] = request[key];
            continue;
        }
        if (typeof request[key] === 'object' && request[key] !== null) {
            const nested = flattenObject(request[key]);
            for (const nestedKey in nested) {
                result[`${key}.${nestedKey}`] = nested[nestedKey];
            }
            continue;
        }
        result[key] = request[key];
    }
    return result;
}
function isProto3OptionalField(field) {
    return field && field.options && field.options[proto3OptionalName];
}
function transcode(request, parsedOptions) {
    const httpRules = [];
    for (const option of parsedOptions) {
        if (!(httpOptionName in option)) {
            continue;
        }
        const httpRule = option[httpOptionName];
        httpRules.push(httpRule);
        if (httpRule === null || httpRule === void 0 ? void 0 : httpRule.additional_bindings) {
            const additionalBindings = Array.isArray(httpRule.additional_bindings)
                ? httpRule.additional_bindings
                : [httpRule.additional_bindings];
            httpRules.push(...additionalBindings);
        }
    }
    for (const httpRule of httpRules) {
        for (const httpMethod of supportedHttpMethods) {
            if (!(httpMethod in httpRule)) {
                continue;
            }
            const pathTemplate = httpRule[httpMethod];
            const matchResult = match(request, pathTemplate);
            if (matchResult === undefined) {
                continue;
            }
            const { url, matchedFields } = matchResult;
            let data = deepCopyWithoutMatchedFields(request, new Set(matchedFields));
            if (httpRule.body === '*') {
                return { httpMethod, url, queryString: '', data };
            }
            // one field possibly goes to request data, others go to query string
            const queryStringObject = data;
            if (httpRule.body) {
                data = getField(queryStringObject, fieldToCamelCase(httpRule.body), 
                /*allowObjects:*/ true);
                deleteField(queryStringObject, fieldToCamelCase(httpRule.body));
            }
            else {
                data = '';
            }
            const queryStringComponents = buildQueryStringComponents(queryStringObject);
            const queryString = queryStringComponents.join('&');
            if (!data ||
                (typeof data === 'object' && Object.keys(data).length === 0)) {
                data = '';
            }
            return { httpMethod, url, queryString, data };
        }
    }
    return undefined;
}
// Override the protobuf json's the http rules.
function overrideHttpRules(httpRules, protoJson) {
    for (const rule of httpRules) {
        if (!rule.selector) {
            continue;
        }
        const rpc = protoJson.lookup(rule.selector);
        // Not support override on non-exist RPC or a RPC without an annotation.
        // We could reconsider if we have the use case later.
        if (!rpc || !rpc.parsedOptions) {
            continue;
        }
        for (const item of rpc.parsedOptions) {
            if (!(httpOptionName in item)) {
                continue;
            }
            const httpOptions = item[httpOptionName];
            for (const httpMethod in httpOptions) {
                if (httpMethod in rule) {
                    if (httpMethod === 'additional_bindings') {
                        continue;
                    }
                    httpOptions[httpMethod] =
                        rule[httpMethod];
                }
                if (rule.additional_bindings) {
                    httpOptions['additional_bindings'] = !httpOptions['additional_bindings']
                        ? []
                        : Array.isArray(httpOptions['additional_bindings'])
                            ? httpOptions['additional_bindings']
                            : [httpOptions['additional_bindings']];
                    // Make the additional_binding to be an array if it is not.
                    httpOptions['additional_bindings'].push(...rule.additional_bindings);
                }
            }
        }
    }
}
//# sourceMappingURL=transcoding.js.map