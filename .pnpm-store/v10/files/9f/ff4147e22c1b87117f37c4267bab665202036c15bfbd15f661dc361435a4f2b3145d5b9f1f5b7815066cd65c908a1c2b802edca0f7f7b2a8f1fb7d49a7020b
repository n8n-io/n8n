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
var formDataPolicy_exports = {};
__export(formDataPolicy_exports, {
  formDataPolicy: () => formDataPolicy,
  formDataPolicyName: () => formDataPolicyName
});
module.exports = __toCommonJS(formDataPolicy_exports);
var import_bytesEncoding = require("../util/bytesEncoding.js");
var import_checkEnvironment = require("../util/checkEnvironment.js");
var import_httpHeaders = require("../httpHeaders.js");
const formDataPolicyName = "formDataPolicy";
function formDataToFormDataMap(formData) {
  const formDataMap = {};
  for (const [key, value] of formData.entries()) {
    formDataMap[key] ??= [];
    formDataMap[key].push(value);
  }
  return formDataMap;
}
function formDataPolicy() {
  return {
    name: formDataPolicyName,
    async sendRequest(request, next) {
      if (import_checkEnvironment.isNodeLike && typeof FormData !== "undefined" && request.body instanceof FormData) {
        request.formData = formDataToFormDataMap(request.body);
        request.body = void 0;
      }
      if (request.formData) {
        const contentType = request.headers.get("Content-Type");
        if (contentType && contentType.indexOf("application/x-www-form-urlencoded") !== -1) {
          request.body = wwwFormUrlEncode(request.formData);
        } else {
          await prepareFormData(request.formData, request);
        }
        request.formData = void 0;
      }
      return next(request);
    }
  };
}
function wwwFormUrlEncode(formData) {
  const urlSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(formData)) {
    if (Array.isArray(value)) {
      for (const subValue of value) {
        urlSearchParams.append(key, subValue.toString());
      }
    } else {
      urlSearchParams.append(key, value.toString());
    }
  }
  return urlSearchParams.toString();
}
async function prepareFormData(formData, request) {
  const contentType = request.headers.get("Content-Type");
  if (contentType && !contentType.startsWith("multipart/form-data")) {
    return;
  }
  request.headers.set("Content-Type", contentType ?? "multipart/form-data");
  const parts = [];
  for (const [fieldName, values] of Object.entries(formData)) {
    for (const value of Array.isArray(values) ? values : [values]) {
      if (typeof value === "string") {
        parts.push({
          headers: (0, import_httpHeaders.createHttpHeaders)({
            "Content-Disposition": `form-data; name="${fieldName}"`
          }),
          body: (0, import_bytesEncoding.stringToUint8Array)(value, "utf-8")
        });
      } else if (value === void 0 || value === null || typeof value !== "object") {
        throw new Error(
          `Unexpected value for key ${fieldName}: ${value}. Value should be serialized to string first.`
        );
      } else {
        const fileName = value.name || "blob";
        const headers = (0, import_httpHeaders.createHttpHeaders)();
        headers.set(
          "Content-Disposition",
          `form-data; name="${fieldName}"; filename="${fileName}"`
        );
        headers.set("Content-Type", value.type || "application/octet-stream");
        parts.push({
          headers,
          body: value
        });
      }
    }
  }
  request.multipartBody = { parts };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  formDataPolicy,
  formDataPolicyName
});
