import { _WebAssembly } from "./webassembly.mjs";
import { Asyncify } from "./asyncify.mjs";
function validateImports(imports) {
    if (imports && typeof imports !== 'object') {
        throw new TypeError('imports must be an object or undefined');
    }
}
function fetchWasm(urlOrBuffer, imports) {
    if (typeof wx !== 'undefined' && typeof __wxConfig !== 'undefined') {
        return _WebAssembly.instantiate(urlOrBuffer, imports);
    }
    return fetch(urlOrBuffer)
        .then(response => response.arrayBuffer())
        .then(buffer => _WebAssembly.instantiate(buffer, imports));
}
/** @public */
export function load(wasmInput, imports) {
    validateImports(imports);
    imports = imports !== null && imports !== void 0 ? imports : {};
    let source;
    if (wasmInput instanceof ArrayBuffer || ArrayBuffer.isView(wasmInput)) {
        return _WebAssembly.instantiate(wasmInput, imports);
    }
    if (wasmInput instanceof _WebAssembly.Module) {
        return _WebAssembly.instantiate(wasmInput, imports).then((instance) => {
            return { instance, module: wasmInput };
        });
    }
    if (typeof wasmInput !== 'string' && !(wasmInput instanceof URL)) {
        throw new TypeError('Invalid source');
    }
    if (typeof _WebAssembly.instantiateStreaming === 'function') {
        let responsePromise;
        try {
            responsePromise = fetch(wasmInput);
            source = _WebAssembly.instantiateStreaming(responsePromise, imports).catch(() => {
                return fetchWasm(wasmInput, imports);
            });
        }
        catch (_) {
            source = fetchWasm(wasmInput, imports);
        }
    }
    else {
        source = fetchWasm(wasmInput, imports);
    }
    return source;
}
/** @public */
export function asyncifyLoad(asyncify, urlOrBuffer, imports) {
    validateImports(imports);
    imports = imports !== null && imports !== void 0 ? imports : {};
    const asyncifyHelper = new Asyncify();
    imports = asyncifyHelper.wrapImports(imports);
    return load(urlOrBuffer, imports).then(source => {
        var _a;
        const memory = source.instance.exports.memory || ((_a = imports.env) === null || _a === void 0 ? void 0 : _a.memory);
        return { module: source.module, instance: asyncifyHelper.init(memory, source.instance, asyncify) };
    });
}
/** @public */
export function loadSync(wasmInput, imports) {
    validateImports(imports);
    imports = imports !== null && imports !== void 0 ? imports : {};
    let module;
    if ((wasmInput instanceof ArrayBuffer) || ArrayBuffer.isView(wasmInput)) {
        module = new _WebAssembly.Module(wasmInput);
    }
    else if (wasmInput instanceof WebAssembly.Module) {
        module = wasmInput;
    }
    else {
        throw new TypeError('Invalid source');
    }
    const instance = new _WebAssembly.Instance(module, imports);
    const source = { instance, module };
    return source;
}
/** @public */
export function asyncifyLoadSync(asyncify, buffer, imports) {
    var _a;
    validateImports(imports);
    imports = imports !== null && imports !== void 0 ? imports : {};
    const asyncifyHelper = new Asyncify();
    imports = asyncifyHelper.wrapImports(imports);
    const source = loadSync(buffer, imports);
    const memory = source.instance.exports.memory || ((_a = imports.env) === null || _a === void 0 ? void 0 : _a.memory);
    return { module: source.module, instance: asyncifyHelper.init(memory, source.instance, asyncify) };
}
