// src/index.ts
import path from "path";
import fs from "fs";
import { createRequire } from "module";

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
var req = true ? createRequire(import.meta.url) : __require;
var findUp = (name, startDir, stopDir = path.parse(startDir).root) => {
  let dir = startDir;
  while (dir !== stopDir) {
    const file = path.join(dir, name);
    if (fs.existsSync(file))
      return file;
    if (!file.endsWith(".json")) {
      const fileWithExt = file + ".json";
      if (fs.existsSync(fileWithExt))
        return fileWithExt;
    }
    dir = path.dirname(dir);
  }
  return null;
};
var resolveTsConfigFromFile = (cwd, filename) => {
  if (path.isAbsolute(filename))
    return fs.existsSync(filename) ? filename : null;
  return findUp(filename, cwd);
};
var resolveTsConfigFromExtends = (cwd, name) => {
  if (path.isAbsolute(name))
    return fs.existsSync(name) ? name : null;
  if (name.startsWith("."))
    return findUp(name, cwd);
  const id = req.resolve(name, { paths: [cwd] });
  return id;
};
var loadTsConfigInternal = (dir = process.cwd(), name = "tsconfig.json", isExtends = false) => {
  var _a, _b;
  dir = path.resolve(dir);
  const id = isExtends ? resolveTsConfigFromExtends(dir, name) : resolveTsConfigFromFile(dir, name);
  if (!id)
    return null;
  const data = jsoncParse(fs.readFileSync(id, "utf-8"));
  const configDir = path.dirname(id);
  if ((_a = data.compilerOptions) == null ? void 0 : _a.baseUrl) {
    data.compilerOptions.baseUrl = path.join(
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
export {
  loadTsConfig
};
