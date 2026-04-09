import { _WebAssembly } from "./webassembly.mjs";
/** @public */
export const WebAssemblyMemory = /*#__PURE__*/ (function () { return _WebAssembly.Memory; })();
/** @public */
export class Memory extends WebAssemblyMemory {
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
/** @public */
export function extendMemory(memory) {
    if (Object.getPrototypeOf(memory) === _WebAssembly.Memory.prototype) {
        Object.setPrototypeOf(memory, Memory.prototype);
    }
    return memory;
}
