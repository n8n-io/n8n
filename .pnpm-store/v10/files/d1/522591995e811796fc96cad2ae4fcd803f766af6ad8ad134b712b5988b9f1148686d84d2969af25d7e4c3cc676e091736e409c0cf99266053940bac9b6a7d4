"use strict";Object.defineProperty(exports, "__esModule", {value: true});// src/loader.ts
var extensionsRegex = /\.(ts|tsx|mts|cts)$/;
async function load(url, context, defaultLoad) {
  if (extensionsRegex.test(url)) {
    const {source} = await defaultLoad(url, {format: "module"});
    return {
      format: "commonjs",
      source
    };
  }
  return defaultLoad(url, context, defaultLoad);
}


exports.load = load;
