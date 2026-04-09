import { wrapInstanceExports } from "./wasi/util.mjs";
import { _WebAssembly } from "./webassembly.mjs";
function checkWebAssemblyFunction() {
    const WebAssemblyFunction = _WebAssembly.Function;
    if (typeof WebAssemblyFunction !== 'function') {
        throw new Error('WebAssembly.Function is not supported in this environment.' +
            ' If you are using V8 based browser like Chrome, try to specify' +
            ' --js-flags="--wasm-staging --experimental-wasm-stack-switching"');
    }
    return WebAssemblyFunction;
}
/** @public */
export function wrapAsyncImport(f, parameterType, returnType) {
    const WebAssemblyFunction = checkWebAssemblyFunction();
    if (typeof f !== 'function') {
        throw new TypeError('Function required');
    }
    const parameters = parameterType.slice(0);
    parameters.unshift('externref');
    return new WebAssemblyFunction({ parameters, results: returnType }, f, { suspending: 'first' });
}
/** @public */
export function wrapAsyncExport(f) {
    const WebAssemblyFunction = checkWebAssemblyFunction();
    if (typeof f !== 'function') {
        throw new TypeError('Function required');
    }
    return new WebAssemblyFunction({ parameters: [...WebAssemblyFunction.type(f).parameters.slice(1)], results: ['externref'] }, f, { promising: 'first' });
}
/** @public */
export function wrapExports(exports, needWrap) {
    return wrapInstanceExports(exports, (exportValue, name) => {
        let ignore = typeof exportValue !== 'function';
        if (Array.isArray(needWrap)) {
            ignore = ignore || (needWrap.indexOf(name) === -1);
        }
        return ignore ? exportValue : wrapAsyncExport(exportValue);
    });
}
