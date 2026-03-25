"use strict";

// Note: This file is replaced with "read-wasm-browser.js" when this module is
// bundled with a packager that takes package.json#browser fields into account.

const fs = require("fs");
const path = require("path");

module.exports = function readWasm() {
  return new Promise((resolve, reject) => {
    const wasmPath = path.join(__dirname, "mappings.wasm");
    fs.readFile(wasmPath, null, (error, data) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(data.buffer);
    });
  });
};

module.exports.initialize = _ => {
  console.debug(
    "SourceMapConsumer.initialize is a no-op when running in node.js"
  );
};
