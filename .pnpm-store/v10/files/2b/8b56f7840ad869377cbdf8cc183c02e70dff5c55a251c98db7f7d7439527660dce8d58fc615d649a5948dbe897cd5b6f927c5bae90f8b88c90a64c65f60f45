// src/helper/ssg/utils.ts
import { METHOD_NAME_ALL } from "../../router.js";
import { findTargetHandler, isMiddleware } from "../../utils/handler.js";
var dirname = (path) => {
  const separatedPath = path.split(/[\/\\]/);
  return separatedPath.slice(0, -1).join("/");
};
var normalizePath = (path) => {
  return path.replace(/(\\)/g, "/").replace(/\/$/g, "");
};
var handleParent = (resultPaths, beforeParentFlag) => {
  if (resultPaths.length === 0 || beforeParentFlag) {
    resultPaths.push("..");
  } else {
    resultPaths.pop();
  }
};
var handleNonDot = (path, resultPaths) => {
  path = path.replace(/^\.(?!.)/, "");
  if (path !== "") {
    resultPaths.push(path);
  }
};
var handleSegments = (paths, resultPaths) => {
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
var joinPaths = (...paths) => {
  paths = paths.map(normalizePath);
  const resultPaths = [];
  handleSegments(paths.join("/").split("/"), resultPaths);
  return (paths[0][0] === "/" ? "/" : "") + resultPaths.join("/");
};
var filterStaticGenerateRoutes = (hono) => {
  return hono.routes.reduce((acc, { method, handler, path }) => {
    const targetHandler = findTargetHandler(handler);
    if (["GET", METHOD_NAME_ALL].includes(method) && !isMiddleware(targetHandler)) {
      acc.push({ path });
    }
    return acc;
  }, []);
};
var isDynamicRoute = (path) => {
  return path.split("/").some((segment) => segment.startsWith(":") || segment.includes("*"));
};
export {
  dirname,
  filterStaticGenerateRoutes,
  isDynamicRoute,
  joinPaths
};
