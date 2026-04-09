// In pure ESM web bundles, you must call init() and wait for the promised result before you can
// call any module methods. To make that as easy as possible, this module directly exposes the
// init() promise result, and returns the methods at the end of the promise.
// https://github.com/WICG/import-maps?tab=readme-ov-file#extension-less-imports
// For usage with an importmap, it's convenient to add the ".js" extension here, because browsers
// don't try to guess the file extension.
import init, * as brotliWasm from "./pkg.web/brotli_wasm.js";
export default init().then(() => brotliWasm);