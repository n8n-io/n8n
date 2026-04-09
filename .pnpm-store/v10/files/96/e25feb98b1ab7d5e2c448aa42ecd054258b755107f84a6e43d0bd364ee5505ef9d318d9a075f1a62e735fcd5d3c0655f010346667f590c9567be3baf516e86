"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapExports = exports.wrapAsyncExport = exports.wrapAsyncImport = void 0;
const util_1 = require("./wasi/util");
const webassembly_1 = require("./webassembly");
function checkWebAssemblyFunction() {
    const WebAssemblyFunction = webassembly_1._WebAssembly.Function;
    if (typeof WebAssemblyFunction !== 'function') {
        throw new Error('WebAssembly.Function is not supported in this environment.' +
            ' If you are using V8 based browser like Chrome, try to specify' +
            ' --js-flags="--wasm-staging --experimental-wasm-stack-switching"');
    }
    return WebAssemblyFunction;
}
/** @public */
function wrapAsyncImport(f, parameterType, returnType) {
    const WebAssemblyFunction = checkWebAssemblyFunction();
    if (typeof f !== 'function') {
        throw new TypeError('Function required');
    }
    const parameters = parameterType.slice(0);
    parameters.unshift('externref');
    return new WebAssemblyFunction({ parameters, results: returnType }, f, { suspending: 'first' });
}
exports.wrapAsyncImport = wrapAsyncImport;
/** @public */
function wrapAsyncExport(f) {
    const WebAssemblyFunction = checkWebAssemblyFunction();
    if (typeof f !== 'function') {
        throw new TypeError('Function required');
    }
    return new WebAssemblyFunction({ parameters: [...WebAssemblyFunction.type(f).parameters.slice(1)], results: ['externref'] }, f, { promising: 'first' });
}
exports.wrapAsyncExport = wrapAsyncExport;
/** @public */
function wrapExports(exports, needWrap) {
    return (0, util_1.wrapInstanceExports)(exports, (exportValue, name) => {
        let ignore = typeof exportValue !== 'function';
        if (Array.isArray(needWrap)) {
            ignore = ignore || (needWrap.indexOf(name) === -1);
        }
        return ignore ? exportValue : wrapAsyncExport(exportValue);
    });
}
exports.wrapExports = wrapExports;
//# sourceMappingURL=jspi.js.map