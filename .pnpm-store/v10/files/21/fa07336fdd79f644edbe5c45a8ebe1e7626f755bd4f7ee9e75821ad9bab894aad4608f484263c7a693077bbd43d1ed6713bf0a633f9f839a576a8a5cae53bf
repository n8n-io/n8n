// In Node, everything is conveniently available synchronously.
const nodePkg = require('./pkg.node/brotli_wasm');
module.exports = nodePkg;

// In addition though, we provide a default export, to match the pure ESM web bundle:
module.exports.default = Promise.resolve(nodePkg);