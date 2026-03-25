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
var utils_exports = {};
__export(utils_exports, {
  getContentFromKVAsset: () => getContentFromKVAsset
});
module.exports = __toCommonJS(utils_exports);
const getContentFromKVAsset = async (path, options) => {
  let ASSET_MANIFEST;
  if (options && options.manifest) {
    if (typeof options.manifest === "string") {
      ASSET_MANIFEST = JSON.parse(options.manifest);
    } else {
      ASSET_MANIFEST = options.manifest;
    }
  } else {
    if (typeof __STATIC_CONTENT_MANIFEST === "string") {
      ASSET_MANIFEST = JSON.parse(__STATIC_CONTENT_MANIFEST);
    } else {
      ASSET_MANIFEST = __STATIC_CONTENT_MANIFEST;
    }
  }
  let ASSET_NAMESPACE;
  if (options && options.namespace) {
    ASSET_NAMESPACE = options.namespace;
  } else {
    ASSET_NAMESPACE = __STATIC_CONTENT;
  }
  const key = ASSET_MANIFEST[path];
  if (!key) {
    return null;
  }
  const content = await ASSET_NAMESPACE.get(key, { type: "stream" });
  if (!content) {
    return null;
  }
  return content;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getContentFromKVAsset
});
