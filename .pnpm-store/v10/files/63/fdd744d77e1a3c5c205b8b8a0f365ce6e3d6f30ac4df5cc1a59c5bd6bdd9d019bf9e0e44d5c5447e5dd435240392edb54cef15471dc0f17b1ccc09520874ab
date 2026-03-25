// src/client/utils.ts
import { fetchRP, DetailedError } from "./fetch-result-please.js";
var mergePath = (base, path) => {
  base = base.replace(/\/+$/, "");
  base = base + "/";
  path = path.replace(/^\/+/, "");
  return base + path;
};
var replaceUrlParam = (urlString, params) => {
  for (const [k, v] of Object.entries(params)) {
    const reg = new RegExp("/:" + k + "(?:{[^/]+})?\\??");
    urlString = urlString.replace(reg, v ? `/${v}` : "");
  }
  return urlString;
};
var buildSearchParams = (query) => {
  const searchParams = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === void 0) {
      continue;
    }
    if (Array.isArray(v)) {
      for (const v2 of v) {
        searchParams.append(k, v2);
      }
    } else {
      searchParams.set(k, v);
    }
  }
  return searchParams;
};
var replaceUrlProtocol = (urlString, protocol) => {
  switch (protocol) {
    case "ws":
      return urlString.replace(/^http/, "ws");
    case "http":
      return urlString.replace(/^ws/, "http");
  }
};
var removeIndexString = (urlString) => {
  if (/^https?:\/\/[^\/]+?\/index(?=\?|$)/.test(urlString)) {
    return urlString.replace(/\/index(?=\?|$)/, "/");
  }
  return urlString.replace(/\/index(?=\?|$)/, "");
};
function isObject(item) {
  return typeof item === "object" && item !== null && !Array.isArray(item);
}
function deepMerge(target, source) {
  if (!isObject(target) && !isObject(source)) {
    return source;
  }
  const merged = { ...target };
  for (const key in source) {
    const value = source[key];
    if (isObject(merged[key]) && isObject(value)) {
      merged[key] = deepMerge(merged[key], value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}
async function parseResponse(fetchRes) {
  return fetchRP(fetchRes);
}
export {
  DetailedError,
  buildSearchParams,
  deepMerge,
  mergePath,
  parseResponse,
  removeIndexString,
  replaceUrlParam,
  replaceUrlProtocol
};
