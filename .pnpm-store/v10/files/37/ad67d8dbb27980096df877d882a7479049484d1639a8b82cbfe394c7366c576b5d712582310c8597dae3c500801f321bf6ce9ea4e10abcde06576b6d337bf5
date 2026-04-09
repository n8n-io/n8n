import { _WebAssembly } from "./webassembly.mjs";
import { isPromiseLike, wrapInstanceExports } from "./wasi/util.mjs";
const ignoreNames = [
    'asyncify_get_state',
    'asyncify_start_rewind',
    'asyncify_start_unwind',
    'asyncify_stop_rewind',
    'asyncify_stop_unwind'
];
// const wrappedExports = new WeakMap<WebAssembly.Exports, WebAssembly.Exports>()
var AsyncifyState;
(function (AsyncifyState) {
    AsyncifyState[AsyncifyState["NONE"] = 0] = "NONE";
    AsyncifyState[AsyncifyState["UNWINDING"] = 1] = "UNWINDING";
    AsyncifyState[AsyncifyState["REWINDING"] = 2] = "REWINDING";
})(AsyncifyState || (AsyncifyState = {}));
function tryAllocate(instance, wasm64, size, mallocName) {
    if (typeof instance.exports[mallocName] !== 'function' || size <= 0) {
        return {
            wasm64,
            dataPtr: 16,
            start: wasm64 ? 32 : 24,
            end: 1024
        };
    }
    const malloc = instance.exports[mallocName];
    const dataPtr = wasm64 ? Number(malloc(BigInt(16) + BigInt(size))) : malloc(8 + size);
    if (dataPtr === 0) {
        throw new Error('Allocate asyncify data failed');
    }
    return wasm64
        ? { wasm64, dataPtr, start: dataPtr + 16, end: dataPtr + 16 + size }
        : { wasm64, dataPtr, start: dataPtr + 8, end: dataPtr + 8 + size };
}
/** @public */
export class Asyncify {
    constructor() {
        this.value = undefined;
        this.exports = undefined;
        this.dataPtr = 0;
    }
    init(memory, instance, options) {
        var _a, _b;
        if (this.exports) {
            throw new Error('Asyncify has been initialized');
        }
        if (!(memory instanceof _WebAssembly.Memory)) {
            throw new TypeError('Require WebAssembly.Memory object');
        }
        const exports = instance.exports;
        for (let i = 0; i < ignoreNames.length; ++i) {
            if (typeof exports[ignoreNames[i]] !== 'function') {
                throw new TypeError('Invalid asyncify wasm');
            }
        }
        let address;
        const wasm64 = Boolean(options.wasm64);
        if (!options.tryAllocate) {
            address = {
                wasm64,
                dataPtr: 16,
                start: wasm64 ? 32 : 24,
                end: 1024
            };
        }
        else {
            if (options.tryAllocate === true) {
                address = tryAllocate(instance, wasm64, 4096, 'malloc');
            }
            else {
                address = tryAllocate(instance, wasm64, (_a = options.tryAllocate.size) !== null && _a !== void 0 ? _a : 4096, (_b = options.tryAllocate.name) !== null && _b !== void 0 ? _b : 'malloc');
            }
        }
        this.dataPtr = address.dataPtr;
        if (wasm64) {
            new BigInt64Array(memory.buffer, this.dataPtr).set([BigInt(address.start), BigInt(address.end)]);
        }
        else {
            new Int32Array(memory.buffer, this.dataPtr).set([address.start, address.end]);
        }
        this.exports = this.wrapExports(exports, options.wrapExports);
        const asyncifiedInstance = Object.create(_WebAssembly.Instance.prototype);
        Object.defineProperty(asyncifiedInstance, 'exports', { value: this.exports });
        // Object.setPrototypeOf(instance, Instance.prototype)
        return asyncifiedInstance;
    }
    assertState() {
        if (this.exports.asyncify_get_state() !== AsyncifyState.NONE) {
            throw new Error('Asyncify state error');
        }
    }
    wrapImportFunction(f) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;
        return (function () {
            // eslint-disable-next-line no-unreachable-loop
            while (_this.exports.asyncify_get_state() === AsyncifyState.REWINDING) {
                _this.exports.asyncify_stop_rewind();
                return _this.value;
            }
            _this.assertState();
            const v = f.apply(this, arguments);
            if (!isPromiseLike(v))
                return v;
            _this.exports.asyncify_start_unwind(_this.dataPtr);
            _this.value = v;
        });
    }
    wrapImports(imports) {
        const importObject = {};
        Object.keys(imports).forEach(k => {
            const mod = imports[k];
            const newModule = {};
            Object.keys(mod).forEach(name => {
                const importValue = mod[name];
                if (typeof importValue === 'function') {
                    newModule[name] = this.wrapImportFunction(importValue);
                }
                else {
                    newModule[name] = importValue;
                }
            });
            importObject[k] = newModule;
        });
        return importObject;
    }
    wrapExportFunction(f) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;
        return (async function () {
            _this.assertState();
            let ret = f.apply(this, arguments);
            while (_this.exports.asyncify_get_state() === AsyncifyState.UNWINDING) {
                _this.exports.asyncify_stop_unwind();
                _this.value = await _this.value;
                _this.assertState();
                _this.exports.asyncify_start_rewind(_this.dataPtr);
                ret = f.call(this);
            }
            _this.assertState();
            return ret;
        });
    }
    wrapExports(exports, needWrap) {
        return wrapInstanceExports(exports, (exportValue, name) => {
            let ignore = ignoreNames.indexOf(name) !== -1 || typeof exportValue !== 'function';
            if (Array.isArray(needWrap)) {
                ignore = ignore || (needWrap.indexOf(name) === -1);
            }
            return ignore ? exportValue : this.wrapExportFunction(exportValue);
        });
    }
}
