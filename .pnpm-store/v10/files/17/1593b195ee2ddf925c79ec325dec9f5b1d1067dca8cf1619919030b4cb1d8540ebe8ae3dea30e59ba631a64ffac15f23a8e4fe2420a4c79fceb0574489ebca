"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFsReadStream = exports.fileFromPath = exports.getDefaultAgent = exports.getMultipartRequestOptions = exports.ReadableStream = exports.File = exports.Blob = exports.FormData = exports.Headers = exports.Response = exports.Request = exports.fetch = exports.kind = exports.auto = void 0;
exports.setShims = setShims;
exports.auto = false;
exports.kind = undefined;
exports.fetch = undefined;
exports.Request = undefined;
exports.Response = undefined;
exports.Headers = undefined;
exports.FormData = undefined;
exports.Blob = undefined;
exports.File = undefined;
exports.ReadableStream = undefined;
exports.getMultipartRequestOptions = undefined;
exports.getDefaultAgent = undefined;
exports.fileFromPath = undefined;
exports.isFsReadStream = undefined;
function setShims(shims, options = { auto: false }) {
    if (exports.auto) {
        throw new Error(`you must \`import '@browserbasehq/sdk/shims/${shims.kind}'\` before importing anything else from @browserbasehq/sdk`);
    }
    if (exports.kind) {
        throw new Error(`can't \`import '@browserbasehq/sdk/shims/${shims.kind}'\` after \`import '@browserbasehq/sdk/shims/${exports.kind}'\``);
    }
    exports.auto = options.auto;
    exports.kind = shims.kind;
    exports.fetch = shims.fetch;
    exports.Request = shims.Request;
    exports.Response = shims.Response;
    exports.Headers = shims.Headers;
    exports.FormData = shims.FormData;
    exports.Blob = shims.Blob;
    exports.File = shims.File;
    exports.ReadableStream = shims.ReadableStream;
    exports.getMultipartRequestOptions = shims.getMultipartRequestOptions;
    exports.getDefaultAgent = shims.getDefaultAgent;
    exports.fileFromPath = shims.fileFromPath;
    exports.isFsReadStream = shims.isFsReadStream;
}
//# sourceMappingURL=registry.js.map