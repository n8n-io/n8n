"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.formDataPolicyName = void 0;
exports.formDataPolicy = formDataPolicy;
const bytesEncoding_js_1 = require("../util/bytesEncoding.js");
const checkEnvironment_js_1 = require("../util/checkEnvironment.js");
const httpHeaders_js_1 = require("../httpHeaders.js");
/**
 * The programmatic identifier of the formDataPolicy.
 */
exports.formDataPolicyName = "formDataPolicy";
function formDataToFormDataMap(formData) {
    var _a;
    const formDataMap = {};
    for (const [key, value] of formData.entries()) {
        (_a = formDataMap[key]) !== null && _a !== void 0 ? _a : (formDataMap[key] = []);
        formDataMap[key].push(value);
    }
    return formDataMap;
}
/**
 * A policy that encodes FormData on the request into the body.
 */
function formDataPolicy() {
    return {
        name: exports.formDataPolicyName,
        async sendRequest(request, next) {
            if (checkEnvironment_js_1.isNodeLike && typeof FormData !== "undefined" && request.body instanceof FormData) {
                request.formData = formDataToFormDataMap(request.body);
                request.body = undefined;
            }
            if (request.formData) {
                const contentType = request.headers.get("Content-Type");
                if (contentType && contentType.indexOf("application/x-www-form-urlencoded") !== -1) {
                    request.body = wwwFormUrlEncode(request.formData);
                }
                else {
                    await prepareFormData(request.formData, request);
                }
                request.formData = undefined;
            }
            return next(request);
        },
    };
}
function wwwFormUrlEncode(formData) {
    const urlSearchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(formData)) {
        if (Array.isArray(value)) {
            for (const subValue of value) {
                urlSearchParams.append(key, subValue.toString());
            }
        }
        else {
            urlSearchParams.append(key, value.toString());
        }
    }
    return urlSearchParams.toString();
}
async function prepareFormData(formData, request) {
    // validate content type (multipart/form-data)
    const contentType = request.headers.get("Content-Type");
    if (contentType && !contentType.startsWith("multipart/form-data")) {
        // content type is specified and is not multipart/form-data. Exit.
        return;
    }
    request.headers.set("Content-Type", contentType !== null && contentType !== void 0 ? contentType : "multipart/form-data");
    // set body to MultipartRequestBody using content from FormDataMap
    const parts = [];
    for (const [fieldName, values] of Object.entries(formData)) {
        for (const value of Array.isArray(values) ? values : [values]) {
            if (typeof value === "string") {
                parts.push({
                    headers: (0, httpHeaders_js_1.createHttpHeaders)({
                        "Content-Disposition": `form-data; name="${fieldName}"`,
                    }),
                    body: (0, bytesEncoding_js_1.stringToUint8Array)(value, "utf-8"),
                });
            }
            else if (value === undefined || value === null || typeof value !== "object") {
                throw new Error(`Unexpected value for key ${fieldName}: ${value}. Value should be serialized to string first.`);
            }
            else {
                // using || instead of ?? here since if value.name is empty we should create a file name
                const fileName = value.name || "blob";
                const headers = (0, httpHeaders_js_1.createHttpHeaders)();
                headers.set("Content-Disposition", `form-data; name="${fieldName}"; filename="${fileName}"`);
                // again, || is used since an empty value.type means the content type is unset
                headers.set("Content-Type", value.type || "application/octet-stream");
                parts.push({
                    headers,
                    body: value,
                });
            }
        }
    }
    request.multipartBody = { parts };
}
//# sourceMappingURL=formDataPolicy.js.map