// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { RestError } from "../restError.js";
import { createHttpHeaders } from "../httpHeaders.js";
import { stringToUint8Array } from "../util/bytesEncoding.js";
import { isBinaryBody } from "../util/typeGuards.js";
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
    if (isBinaryBody(body)) {
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
    if (isBinaryBody(body)) {
        return body;
    }
    if (typeof body === "string" || typeof body === "number" || typeof body === "boolean") {
        return stringToUint8Array(String(body), "utf-8");
    }
    // stringify objects for JSON-ish content types e.g. application/json, application/merge-patch+json, application/vnd.oci.manifest.v1+json, application.json; charset=UTF-8
    if (contentType && /application\/(.+\+)?json(;.+)?/i.test(String(contentType))) {
        return stringToUint8Array(JSON.stringify(body), "utf-8");
    }
    throw new RestError(`Unsupported body/content-type combination: ${body}, ${contentType}`);
}
export function buildBodyPart(descriptor) {
    var _a;
    const contentType = getPartContentType(descriptor);
    const contentDisposition = getContentDisposition(descriptor);
    const headers = createHttpHeaders((_a = descriptor.headers) !== null && _a !== void 0 ? _a : {});
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
export function buildMultipartBody(parts) {
    return { parts: parts.map(buildBodyPart) };
}
//# sourceMappingURL=multipart.js.map