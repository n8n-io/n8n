import * as nf from 'node-fetch';
import * as fd from 'formdata-node';
import KeepAliveAgent from 'agentkeepalive';
import { AbortController as AbortControllerPolyfill } from 'abort-controller';
import { ReadStream as FsReadStream } from 'node:fs';
import { FormDataEncoder } from 'form-data-encoder';
import { Readable } from 'node:stream';
import { MultipartBody } from "./MultipartBody.mjs";
import { ReadableStream } from 'node:stream/web';
let fileFromPathWarned = false;
async function fileFromPath(path, ...args) {
    // this import fails in environments that don't handle export maps correctly, like old versions of Jest
    const { fileFromPath: _fileFromPath } = await import('formdata-node/file-from-path');
    if (!fileFromPathWarned) {
        console.warn(`fileFromPath is deprecated; use fs.createReadStream(${JSON.stringify(path)}) instead`);
        fileFromPathWarned = true;
    }
    // @ts-ignore
    return await _fileFromPath(path, ...args);
}
const defaultHttpAgent = new KeepAliveAgent({ keepAlive: true, timeout: 5 * 60 * 1000 });
const defaultHttpsAgent = new KeepAliveAgent.HttpsAgent({ keepAlive: true, timeout: 5 * 60 * 1000 });
async function getMultipartRequestOptions(form, opts) {
    const encoder = new FormDataEncoder(form);
    const readable = Readable.from(encoder);
    const body = new MultipartBody(readable);
    const headers = {
        ...opts.headers,
        ...encoder.headers,
        'Content-Length': encoder.contentLength,
    };
    return { ...opts, body: body, headers };
}
export function getRuntime() {
    // Polyfill global object if needed.
    if (typeof AbortController === 'undefined') {
        // @ts-expect-error (the types are subtly different, but compatible in practice)
        globalThis.AbortController = AbortControllerPolyfill;
    }
    return {
        kind: 'node',
        fetch: nf.default,
        Request: nf.Request,
        Response: nf.Response,
        Headers: nf.Headers,
        FormData: fd.FormData,
        Blob: fd.Blob,
        File: fd.File,
        ReadableStream,
        getMultipartRequestOptions,
        getDefaultAgent: (url) => (url.startsWith('https') ? defaultHttpsAgent : defaultHttpAgent),
        fileFromPath,
        isFsReadStream: (value) => value instanceof FsReadStream,
    };
}
//# sourceMappingURL=node-runtime.mjs.map