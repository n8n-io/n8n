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
  dirname: () => dirname,
  filterStaticGenerateRoutes: () => filterStaticGenerateRoutes,
  isDynamicRoute: () => isDynamicRoute,
  joinPaths: () => joinPaths
});
module.exports = __toCommonJS(utils_exports);
var import_router = require("../../router");
var import_handler = require("../../utils/handler");
const dirname = (path) => {
  const separatedPath = path.split(/[\/\\]/);
  return separatedPath.slice(0, -1).join("/");
};
const normalizePath = (path) => {
  return path.replace(/(\\)/g, "/").replace(/\/$/g, "");
};
const handleParent = (resultPaths, beforeParentFlag) => {
  if (resultPaths.length === 0 || beforeParentFlag) {
    resultPaths.push("..");
  } else {
    resultPaths.pop();
  }
};
const handleNonDot = (path, resultPaths) => {
  path = path.replace(/^\.(?!.)/, "");
  if (path !== "") {
    resultPaths.push(path);
  }
};
const handleSegments = (paths, resultPaths) => {
  let beforeParentFlag = false;
  for (const path of paths) {
    if (path === "..") {
      handleParent(resultPaths, beforeParentFlag);
      beforeParentFlag = true;
    } else {
      handleNonDot(path, resultPaths);
      beforeParentFlag = false;
    }
  }
};
const joinPaths = (...paths) => {
  paths = paths.map(normalizePath);
  const resultPaths = [];
  handleSegments(paths.join("/").split("/"), resultPaths);
  return (paths[0][0] === "/" ? "/" : "") + resultPaths.join("/");
};
const filterStaticGenerateRoutes = (hono) => {
  return hono.routes.reduce((acc, { method, handler, path }) => {
    const targetHandler = (0, import_handler.findTargetHandler)(handler);
    if (["GET", import_router.METHOD_NAME_ALL].includes(method) && !(0, import_handler.isMiddleware)(targetHandler)) {
      acc.push({ path });
    }
    return acc;
  }, []);
};
const isDynamicRoute = (path) => {
  return path.split("/").some((segment) => segment.startsWith(":") || segment.includes("*"));
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  dirname,
  filterStaticGenerateRoutes,
  isDynamicRoute,
  joinPaths
});
