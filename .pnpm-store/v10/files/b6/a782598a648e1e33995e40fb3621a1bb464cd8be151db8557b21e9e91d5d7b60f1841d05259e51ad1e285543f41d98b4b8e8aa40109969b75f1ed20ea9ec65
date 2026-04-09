var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var file_exports = {};
__export(file_exports, {
  createFile: () => createFile,
  createFileFromStream: () => createFileFromStream,
  getRawContent: () => getRawContent,
  hasRawContent: () => hasRawContent
});
module.exports = __toCommonJS(file_exports);
var import_core_util = require("@azure/core-util");
function isNodeReadableStream(x) {
  return Boolean(x && typeof x["pipe"] === "function");
}
const unimplementedMethods = {
  arrayBuffer: () => {
    throw new Error("Not implemented");
  },
  bytes: () => {
    throw new Error("Not implemented");
  },
  slice: () => {
    throw new Error("Not implemented");
  },
  text: () => {
    throw new Error("Not implemented");
  }
};
const rawContent = /* @__PURE__ */ Symbol("rawContent");
function hasRawContent(x) {
  return typeof x[rawContent] === "function";
}
function getRawContent(blob) {
  if (hasRawContent(blob)) {
    return blob[rawContent]();
  } else {
    return blob;
  }
}
function createFileFromStream(stream, name, options = {}) {
  return {
    ...unimplementedMethods,
    type: options.type ?? "",
    lastModified: options.lastModified ?? (/* @__PURE__ */ new Date()).getTime(),
    webkitRelativePath: options.webkitRelativePath ?? "",
    size: options.size ?? -1,
    name,
    stream: () => {
      const s = stream();
      if (isNodeReadableStream(s)) {
        throw new Error(
          "Not supported: a Node stream was provided as input to createFileFromStream."
        );
      }
      return s;
    },
    [rawContent]: stream
  };
}
function createFile(content, name, options = {}) {
  if (import_core_util.isNodeLike) {
    return {
      ...unimplementedMethods,
      type: options.type ?? "",
      lastModified: options.lastModified ?? (/* @__PURE__ */ new Date()).getTime(),
      webkitRelativePath: options.webkitRelativePath ?? "",
      size: content.byteLength,
      name,
      arrayBuffer: async () => content.buffer,
      stream: () => new Blob([toArrayBuffer(content)]).stream(),
      [rawContent]: () => content
    };
  } else {
    return new File([toArrayBuffer(content)], name, options);
  }
}
function toArrayBuffer(source) {
  if ("resize" in source.buffer) {
    return source;
  }
  return source.map((x) => x);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createFile,
  createFileFromStream,
  getRawContent,
  hasRawContent
});
