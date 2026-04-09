// This makes importing wasm-brotli asynchronous (because of dynamic import).
// This is needed here for Webpack v4 or v5 syncWebAssembly, which don't
// allow synchronous import of WebAssembly from an entrypoint.
module.exports = import("./pkg.bundler/brotli_wasm.js");

// In addition, we provide a default export with the same value, for compatibility
// with the pure ESM web bundle:
module.exports.default = module.exports;

// Without this, ts-loader gets annoyed by imports for the pure type. Clear ts-loader bug,
// but this is a quick & easy fix on our end:
module.exports.BrotliWasmType = undefined;