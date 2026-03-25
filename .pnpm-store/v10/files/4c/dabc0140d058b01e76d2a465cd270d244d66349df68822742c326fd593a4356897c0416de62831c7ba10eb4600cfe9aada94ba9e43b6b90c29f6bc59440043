"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  loadTsConfig: () => loadTsConfig
});
module.exports = __toCommonJS(src_exports);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);

// node_modules/.pnpm/strip-json-comments@5.0.0/node_modules/strip-json-comments/index.js
var singleComment = Symbol("singleComment");
var multiComment = Symbol("multiComment");
var stripWithoutWhitespace = () => "";
var stripWithWhitespace = (string, start, end) => string.slice(start, end).replace(/\S/g, " ");
var isEscaped = (jsonString, quotePosition) => {
  let index = quotePosition - 1;
  let backslashCount = 0;
  while (jsonString[index] === "\\") {
    index -= 1;
    backslashCount += 1;
  }
  return Boolean(backslashCount % 2);
};
function stripJsonComments(jsonString, { whitespace = true, trailingCommas = false } = {}) {
  if (typeof jsonString !== "string") {
    throw new TypeError(`Expected argument \`jsonString\` to be a \`string\`, got \`${typeof jsonString}\``);
  }
  const strip = whitespace ? stripWithWhitespace : stripWithoutWhitespace;
  let isInsideString = false;
  let isInsideComment = false;
  let offset = 0;
  let buffer = "";
  let result = "";
  let commaIndex = -1;
  for (let index = 0; index < jsonString.length; index++) {
    const currentCharacter = jsonString[index];
    const nextCharacter = jsonString[index + 1];
    if (!isInsideComment && currentCharacter === '"') {
      const escaped = isEscaped(jsonString, index);
      if (!escaped) {
        isInsideString = !isInsideString;
      }
    }
    if (isInsideString) {
      continue;
    }
    if (!isInsideComment && currentCharacter + nextCharacter === "//") {
      buffer += jsonString.slice(offset, index);
      offset = index;
      isInsideComment = singleComment;
      index++;
    } else if (isInsideComment === singleComment && currentCharacter + nextCharacter === "\r\n") {
      index++;
      isInsideComment = false;
      buffer += strip(jsonString, offset, index);
      offset = index;
      continue;
    } else if (isInsideComment === singleComment && currentCharacter === "\n") {
      isInsideComment = false;
      buffer += strip(jsonString, offset, index);
      offset = index;
    } else if (!isInsideComment && currentCharacter + nextCharacter === "/*") {
      buffer += jsonString.slice(offset, index);
      offset = index;
      isInsideComment = multiComment;
      index++;
      continue;
    } else if (isInsideComment === multiComment && currentCharacter + nextCharacter === "*/") {
      index++;
      isInsideComment = false;
      buffer += strip(jsonString, offset, index + 1);
      offset = index + 1;
      continue;
    } else if (trailingCommas && !isInsideComment) {
      if (commaIndex !== -1) {
        if (currentCharacter === "}" || currentCharacter === "]") {
          buffer += jsonString.slice(offset, index);
          result += strip(buffer, 0, 1) + buffer.slice(1);
          buffer = "";
          offset = index;
          commaIndex = -1;
        } else if (currentCharacter !== " " && currentCharacter !== "	" && currentCharacter !== "\r" && currentCharacter !== "\n") {
          buffer += jsonString.slice(offset, index);
          offset = index;
          commaIndex = -1;
        }
      } else if (currentCharacter === ",") {
        result += buffer + jsonString.slice(offset, index);
        buffer = "";
        offset = index;
        commaIndex = index;
      }
    }
  }
  return result + buffer + (isInsideComment ? strip(jsonString.slice(offset)) : jsonString.slice(offset));
}

// src/utils.ts
function jsoncParse(data) {
  try {
    return new Function("return " + stripJsonComments(data).trim())();
  } catch (_) {
    return {};
  }
}

// src/index.ts
var req = false ? createRequire(import_meta.url) : require;
var findUp = (name, startDir, stopDir = import_path.default.parse(startDir).root) => {
  let dir = startDir;
  while (dir !== stopDir) {
    const file = import_path.default.join(dir, name);
    if (import_fs.default.existsSync(file))
      return file;
    if (!file.endsWith(".json")) {
      const fileWithExt = file + ".json";
      if (import_fs.default.existsSync(fileWithExt))
        return fileWithExt;
    }
    dir = import_path.default.dirname(dir);
  }
  return null;
};
var resolveTsConfigFromFile = (cwd, filename) => {
  if (import_path.default.isAbsolute(filename))
    return import_fs.default.existsSync(filename) ? filename : null;
  return findUp(filename, cwd);
};
var resolveTsConfigFromExtends = (cwd, name) => {
  if (import_path.default.isAbsolute(name))
    return import_fs.default.existsSync(name) ? name : null;
  if (name.startsWith("."))
    return findUp(name, cwd);
  const id = req.resolve(name, { paths: [cwd] });
  return id;
};
var loadTsConfigInternal = (dir = process.cwd(), name = "tsconfig.json", isExtends = false) => {
  var _a, _b;
  dir = import_path.default.resolve(dir);
  const id = isExtends ? resolveTsConfigFromExtends(dir, name) : resolveTsConfigFromFile(dir, name);
  if (!id)
    return null;
  const data = jsoncParse(import_fs.default.readFileSync(id, "utf-8"));
  const configDir = import_path.default.dirname(id);
  if ((_a = data.compilerOptions) == null ? void 0 : _a.baseUrl) {
    data.compilerOptions.baseUrl = import_path.default.join(
      configDir,
      data.compilerOptions.baseUrl
    );
  }
  let extendsFiles = [];
  if (data.extends) {
    const extendsList = Array.isArray(data.extends) ? data.extends : [data.extends];
    const extendsData = {};
    for (const name2 of extendsList) {
      const parentConfig = loadTsConfigInternal(configDir, name2, true);
      if (parentConfig) {
        Object.assign(extendsData, {
          ...parentConfig == null ? void 0 : parentConfig.data,
          compilerOptions: {
            ...extendsData.compilerOptions,
            ...(_b = parentConfig == null ? void 0 : parentConfig.data) == null ? void 0 : _b.compilerOptions
          }
        });
        extendsFiles.push(...parentConfig.files);
      }
    }
    Object.assign(data, {
      ...extendsData,
      ...data,
      compilerOptions: {
        ...extendsData.compilerOptions,
        ...data.compilerOptions
      }
    });
  }
  delete data.extends;
  return { path: id, data, files: [...extendsFiles, id] };
};
var loadTsConfig = (dir, name) => loadTsConfigInternal(dir, name);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  loadTsConfig
});
