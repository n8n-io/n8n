"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extendMemory = exports.Memory = exports.WebAssemblyMemory = void 0;
/* eslint-disable spaced-comment */
const webassembly_1 = require("./webassembly");
/** @public */
exports.WebAssemblyMemory = (function () { return webassembly_1._WebAssembly.Memory; })();
/** @public */
class Memory extends exports.WebAssemblyMemory {
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor(descriptor) {
        super(descriptor);
    }
    get HEAP8() { return new Int8Array(super.buffer); }
    get HEAPU8() { return new Uint8Array(super.buffer); }
    get HEAP16() { return new Int16Array(super.buffer); }
    get HEAPU16() { return new Uint16Array(super.buffer); }
    get HEAP32() { return new Int32Array(super.buffer); }
    get HEAPU32() { return new Uint32Array(super.buffer); }
    get HEAP64() { return new BigInt64Array(super.buffer); }
    get HEAPU64() { return new BigUint64Array(super.buffer); }
    get HEAPF32() { return new Float32Array(super.buffer); }
    get HEAPF64() { return new Float64Array(super.buffer); }
    get view() { return new DataView(super.buffer); }
}
exports.Memory = Memory;
/** @public */
function extendMemory(memory) {
    if (Object.getPrototypeOf(memory) === webassembly_1._WebAssembly.Memory.prototype) {
        Object.setPrototypeOf(memory, Memory.prototype);
    }
    return memory;
}
exports.extendMemory = extendMemory;
//# sourceMappingURL=memory.js.map