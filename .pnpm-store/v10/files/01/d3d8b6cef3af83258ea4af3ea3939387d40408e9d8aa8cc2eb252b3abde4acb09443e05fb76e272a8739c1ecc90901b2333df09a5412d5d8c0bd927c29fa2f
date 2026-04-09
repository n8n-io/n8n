export let auto = false;
export let kind = undefined;
export let fetch = undefined;
export let Request = undefined;
export let Response = undefined;
export let Headers = undefined;
export let FormData = undefined;
export let Blob = undefined;
export let File = undefined;
export let ReadableStream = undefined;
export let getMultipartRequestOptions = undefined;
export let getDefaultAgent = undefined;
export let fileFromPath = undefined;
export let isFsReadStream = undefined;
export function setShims(shims, options = { auto: false }) {
    if (auto) {
        throw new Error(`you must \`import 'openai/shims/${shims.kind}'\` before importing anything else from openai`);
    }
    if (kind) {
        throw new Error(`can't \`import 'openai/shims/${shims.kind}'\` after \`import 'openai/shims/${kind}'\``);
    }
    auto = options.auto;
    kind = shims.kind;
    fetch = shims.fetch;
    Request = shims.Request;
    Response = shims.Response;
    Headers = shims.Headers;
    FormData = shims.FormData;
    Blob = shims.Blob;
    File = shims.File;
    ReadableStream = shims.ReadableStream;
    getMultipartRequestOptions = shims.getMultipartRequestOptions;
    getDefaultAgent = shims.getDefaultAgent;
    fileFromPath = shims.fileFromPath;
    isFsReadStream = shims.isFsReadStream;
}
//# sourceMappingURL=registry.mjs.map