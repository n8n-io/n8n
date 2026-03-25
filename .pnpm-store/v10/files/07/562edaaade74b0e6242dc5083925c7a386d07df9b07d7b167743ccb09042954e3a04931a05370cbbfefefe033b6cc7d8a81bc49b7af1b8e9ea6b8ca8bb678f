"use strict";

let mappingsWasm = null;

module.exports = function readWasm() {
  if (typeof mappingsWasm === "string") {
    return fetch(mappingsWasm).then(response => response.arrayBuffer());
  }
  if (mappingsWasm instanceof ArrayBuffer) {
    return Promise.resolve(mappingsWasm);
  }

  throw new Error(
    "You must provide the string URL or ArrayBuffer contents " +
      "of lib/mappings.wasm by calling " +
      "SourceMapConsumer.initialize({ 'lib/mappings.wasm': ... }) " +
      "before using SourceMapConsumer"
  );
};

module.exports.initialize = input => {
  mappingsWasm = input;
};
