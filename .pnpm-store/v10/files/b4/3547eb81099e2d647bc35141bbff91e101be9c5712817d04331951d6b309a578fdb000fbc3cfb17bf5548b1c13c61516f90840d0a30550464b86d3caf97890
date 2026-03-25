"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBodyPart = buildBodyPart;
exports.buildMultipartBody = buildMultipartBody;
const restError_js_1 = require("../restError.js");
const httpHeaders_js_1 = require("../httpHeaders.js");
const bytesEncoding_js_1 = require("../util/bytesEncoding.js");
const typeGuards_js_1 = require("../util/typeGuards.js");
/**
 * Get value of a header in the part descriptor ignoring case
 */
function getHeaderValue(descriptor, headerName) {
    if (descriptor.headers) {
        const actualHeaderName = Object.keys(descriptor.headers).find((x) => x.toLowerCase() === headerName.toLowerCase());
        if (actualHeaderName) {
            return descriptor.headers[actualHeaderName];
        }
    }
    return undefined;
}
function getPartContentType(descriptor) {
    const contentTypeHeader = getHeaderValue(descriptor, "content-type");
    if (contentTypeHeader) {
        return contentTypeHeader;
    }
    // Special value of null means content type is to be omitted
    if (descriptor.contentType === null) {
        return undefined;
    }
    if (descriptor.contentType) {
        return descriptor.contentType;
    }
    const { body } = descriptor;
    if (body === null || body === undefined) {
        return undefined;
    }
    if (typeof body === "string" || typeof body === "number" || typeof body === "boolean") {
        return "text/plain; charset=UTF-8";
    }
    if (body instanceof Blob) {
        return body.type || "application/octet-stream";
    }
    if ((0, typeGuards_js_1.isBinaryBody)(body)) {
        return "application/octet-stream";
    }
    // arbitrary non-text object -> generic JSON content type by default. We will try to JSON.stringify the body.
    return "application/json";
}
/**
 * Enclose value in quotes and escape special characters, for use in the Content-Disposition header
 */
function escapeDispositionField(value) {
    return JSON.stringify(value);
}
function getContentDisposition(descriptor) {
    var _a;
    const contentDispositionHeader = getHeaderValue(descriptor, "content-disposition");
    if (contentDispositionHeader) {
        return contentDispositionHeader;
    }
    if (descriptor.dispositionType === undefined &&
        descriptor.name === undefined &&
        descriptor.filename === undefined) {
        return undefined;
    }
    const dispositionType = (_a = descriptor.dispositionType) !== null && _a !== void 0 ? _a : "form-data";
    let disposition = dispositionType;
    if (descriptor.name) {
        disposition += `; name=${escapeDispositionField(descriptor.name)}`;
    }
    let filename = undefined;
    if (descriptor.filename) {
        filename = descriptor.filename;
    }
    else if (typeof File !== "undefined" && descriptor.body instanceof File) {
        const filenameFromFile = descriptor.body.name;
        if (filenameFromFile !== "") {
            filename = filenameFromFile;
        }
    }
    if (filename) {
        disposition += `; filename=${escapeDispositionField(filename)}`;
    }
    return disposition;
}
function normalizeBody(body, contentType) {
    if (body === undefined) {
        // zero-length body
        return new Uint8Array([]);
    }
    // binary and primitives should go straight on the wire regardless of content type
    if ((0, typeGuards_js_1.isBinaryBody)(body)) {
        return body;
    }
    if (typeof body === "string" || typeof body === "number" || typeof body === "boolean") {
        return (0, bytesEncoding_js_1.stringToUint8Array)(String(body), "utf-8");
    }
    // stringify objects for JSON-ish content types e.g. application/json, application/merge-patch+json, application/vnd.oci.manifest.v1+json, application.json; charset=UTF-8
    if (contentType && /application\/(.+\+)?json(;.+)?/i.test(String(contentType))) {
        return (0, bytesEncoding_js_1.stringToUint8Array)(JSON.stringify(body), "utf-8");
    }
    throw new restError_js_1.RestError(`Unsupported body/content-type combination: ${body}, ${contentType}`);
}
function buildBodyPart(descriptor) {
    var _a;
    const contentType = getPartContentType(descriptor);
    const contentDisposition = getContentDisposition(descriptor);
    const headers = (0, httpHeaders_js_1.createHttpHeaders)((_a = descriptor.headers) !== null && _a !== void 0 ? _a : {});
    if (contentType) {
        headers.set("content-type", contentType);
    }
    if (contentDisposition) {
        headers.set("content-disposition", contentDisposition);
    }
    const body = normalizeBody(descriptor.body, contentType);
    return {
        headers,
        body,
    };
}
function buildMultipartBody(parts) {
    return { parts: parts.map(buildBodyPart) };
}
//# sourceMappingURL=multipart.js.map