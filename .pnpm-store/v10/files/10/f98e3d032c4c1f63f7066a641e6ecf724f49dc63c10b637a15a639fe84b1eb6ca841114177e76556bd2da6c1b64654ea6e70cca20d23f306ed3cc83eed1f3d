"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncifyLoadSync = exports.loadSync = exports.asyncifyLoad = exports.load = void 0;
const webassembly_1 = require("./webassembly");
const asyncify_1 = require("./asyncify");
function validateImports(imports) {
    if (imports && typeof imports !== 'object') {
        throw new TypeError('imports must be an object or undefined');
    }
}
function fetchWasm(urlOrBuffer, imports) {
    if (typeof wx !== 'undefined' && typeof __wxConfig !== 'undefined') {
        return webassembly_1._WebAssembly.instantiate(urlOrBuffer, imports);
    }
    return fetch(urlOrBuffer)
        .then(response => response.arrayBuffer())
        .then(buffer => webassembly_1._WebAssembly.instantiate(buffer, imports));
}
/** @public */
function load(wasmInput, imports) {
    validateImports(imports);
    imports = imports !== null && imports !== void 0 ? imports : {};
    let source;
    if (wasmInput instanceof ArrayBuffer || ArrayBuffer.isView(wasmInput)) {
        return webassembly_1._WebAssembly.instantiate(wasmInput, imports);
    }
    if (wasmInput instanceof webassembly_1._WebAssembly.Module) {
        return webassembly_1._WebAssembly.instantiate(wasmInput, imports).then((instance) => {
            return { instance, module: wasmInput };
        });
    }
    if (typeof wasmInput !== 'string' && !(wasmInput instanceof URL)) {
        throw new TypeError('Invalid source');
    }
    if (typeof webassembly_1._WebAssembly.instantiateStreaming === 'function') {
        let responsePromise;
        try {
            responsePromise = fetch(wasmInput);
            source = webassembly_1._WebAssembly.instantiateStreaming(responsePromise, imports).catch(() => {
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
exports.load = load;
/** @public */
function asyncifyLoad(asyncify, urlOrBuffer, imports) {
    validateImports(imports);
    imports = imports !== null && imports !== void 0 ? imports : {};
    const asyncifyHelper = new asyncify_1.Asyncify();
    imports = asyncifyHelper.wrapImports(imports);
    return load(urlOrBuffer, imports).then(source => {
        var _a;
        const memory = source.instance.exports.memory || ((_a = imports.env) === null || _a === void 0 ? void 0 : _a.memory);
        return { module: source.module, instance: asyncifyHelper.init(memory, source.instance, asyncify) };
    });
}
exports.asyncifyLoad = asyncifyLoad;
/** @public */
function loadSync(wasmInput, imports) {
    validateImports(imports);
    imports = imports !== null && imports !== void 0 ? imports : {};
    let module;
    if ((wasmInput instanceof ArrayBuffer) || ArrayBuffer.isView(wasmInput)) {
        module = new webassembly_1._WebAssembly.Module(wasmInput);
    }
    else if (wasmInput instanceof WebAssembly.Module) {
        module = wasmInput;
    }
    else {
        throw new TypeError('Invalid source');
    }
    const instance = new webassembly_1._WebAssembly.Instance(module, imports);
    const source = { instance, module };
    return source;
}
exports.loadSync = loadSync;
/** @public */
function asyncifyLoadSync(asyncify, buffer, imports) {
    var _a;
    validateImports(imports);
    imports = imports !== null && imports !== void 0 ? imports : {};
    const asyncifyHelper = new asyncify_1.Asyncify();
    imports = asyncifyHelper.wrapImports(imports);
    const source = loadSync(buffer, imports);
    const memory = source.instance.exports.memory || ((_a = imports.env) === null || _a === void 0 ? void 0 : _a.memory);
    return { module: source.module, instance: asyncifyHelper.init(memory, source.instance, asyncify) };
}
exports.asyncifyLoadSync = asyncifyLoadSync;
//# sourceMappingURL=load.js.map