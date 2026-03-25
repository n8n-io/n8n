"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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

// src/submodules/protocols/index.ts
var index_exports = {};
__export(index_exports, {
  _toBool: () => _toBool,
  _toNum: () => _toNum,
  _toStr: () => _toStr,
  awsExpectUnion: () => awsExpectUnion,
  loadRestJsonErrorCode: () => loadRestJsonErrorCode,
  loadRestXmlErrorCode: () => loadRestXmlErrorCode,
  parseJsonBody: () => parseJsonBody,
  parseJsonErrorBody: () => parseJsonErrorBody,
  parseXmlBody: () => parseXmlBody,
  parseXmlErrorBody: () => parseXmlErrorBody
});
module.exports = __toCommonJS(index_exports);

// src/submodules/protocols/coercing-serializers.ts
var _toStr = /* @__PURE__ */ __name((val) => {
  if (val == null) {
    return val;
  }
  if (typeof val === "number" || typeof val === "bigint") {
    const warning = new Error(`Received number ${val} where a string was expected.`);
    warning.name = "Warning";
    console.warn(warning);
    return String(val);
  }
  if (typeof val === "boolean") {
    const warning = new Error(`Received boolean ${val} where a string was expected.`);
    warning.name = "Warning";
    console.warn(warning);
    return String(val);
  }
  return val;
}, "_toStr");
var _toBool = /* @__PURE__ */ __name((val) => {
  if (val == null) {
    return val;
  }
  if (typeof val === "number") {
  }
  if (typeof val === "string") {
    const lowercase = val.toLowerCase();
    if (val !== "" && lowercase !== "false" && lowercase !== "true") {
      const warning = new Error(`Received string "${val}" where a boolean was expected.`);
      warning.name = "Warning";
      console.warn(warning);
    }
    return val !== "" && lowercase !== "false";
  }
  return val;
}, "_toBool");
var _toNum = /* @__PURE__ */ __name((val) => {
  if (val == null) {
    return val;
  }
  if (typeof val === "boolean") {
  }
  if (typeof val === "string") {
    const num = Number(val);
    if (num.toString() !== val) {
      const warning = new Error(`Received string "${val}" where a number was expected.`);
      warning.name = "Warning";
      console.warn(warning);
      return val;
    }
    return num;
  }
  return val;
}, "_toNum");

// src/submodules/protocols/json/awsExpectUnion.ts
var import_smithy_client = require("@smithy/smithy-client");
var awsExpectUnion = /* @__PURE__ */ __name((value) => {
  if (value == null) {
    return void 0;
  }
  if (typeof value === "object" && "__type" in value) {
    delete value.__type;
  }
  return (0, import_smithy_client.expectUnion)(value);
}, "awsExpectUnion");

// src/submodules/protocols/common.ts
var import_smithy_client2 = require("@smithy/smithy-client");
var collectBodyString = /* @__PURE__ */ __name((streamBody, context) => (0, import_smithy_client2.collectBody)(streamBody, context).then((body) => context.utf8Encoder(body)), "collectBodyString");

// src/submodules/protocols/json/parseJsonBody.ts
var parseJsonBody = /* @__PURE__ */ __name((streamBody, context) => collectBodyString(streamBody, context).then((encoded) => {
  if (encoded.length) {
    try {
      return JSON.parse(encoded);
    } catch (e) {
      if (e?.name === "SyntaxError") {
        Object.defineProperty(e, "$responseBodyText", {
          value: encoded
        });
      }
      throw e;
    }
  }
  return {};
}), "parseJsonBody");
var parseJsonErrorBody = /* @__PURE__ */ __name(async (errorBody, context) => {
  const value = await parseJsonBody(errorBody, context);
  value.message = value.message ?? value.Message;
  return value;
}, "parseJsonErrorBody");
var loadRestJsonErrorCode = /* @__PURE__ */ __name((output, data) => {
  const findKey = /* @__PURE__ */ __name((object, key) => Object.keys(object).find((k) => k.toLowerCase() === key.toLowerCase()), "findKey");
  const sanitizeErrorCode = /* @__PURE__ */ __name((rawValue) => {
    let cleanValue = rawValue;
    if (typeof cleanValue === "number") {
      cleanValue = cleanValue.toString();
    }
    if (cleanValue.indexOf(",") >= 0) {
      cleanValue = cleanValue.split(",")[0];
    }
    if (cleanValue.indexOf(":") >= 0) {
      cleanValue = cleanValue.split(":")[0];
    }
    if (cleanValue.indexOf("#") >= 0) {
      cleanValue = cleanValue.split("#")[1];
    }
    return cleanValue;
  }, "sanitizeErrorCode");
  const headerKey = findKey(output.headers, "x-amzn-errortype");
  if (headerKey !== void 0) {
    return sanitizeErrorCode(output.headers[headerKey]);
  }
  if (data.code !== void 0) {
    return sanitizeErrorCode(data.code);
  }
  if (data["__type"] !== void 0) {
    return sanitizeErrorCode(data["__type"]);
  }
}, "loadRestJsonErrorCode");

// src/submodules/protocols/xml/parseXmlBody.ts
var import_smithy_client3 = require("@smithy/smithy-client");
var import_fast_xml_parser = require("fast-xml-parser");
var parseXmlBody = /* @__PURE__ */ __name((streamBody, context) => collectBodyString(streamBody, context).then((encoded) => {
  if (encoded.length) {
    const parser = new import_fast_xml_parser.XMLParser({
      attributeNamePrefix: "",
      htmlEntities: true,
      ignoreAttributes: false,
      ignoreDeclaration: true,
      parseTagValue: false,
      trimValues: false,
      tagValueProcessor: /* @__PURE__ */ __name((_, val) => val.trim() === "" && val.includes("\n") ? "" : void 0, "tagValueProcessor")
    });
    parser.addEntity("#xD", "\r");
    parser.addEntity("#10", "\n");
    let parsedObj;
    try {
      parsedObj = parser.parse(encoded, true);
    } catch (e) {
      if (e && typeof e === "object") {
        Object.defineProperty(e, "$responseBodyText", {
          value: encoded
        });
      }
      throw e;
    }
    const textNodeName = "#text";
    const key = Object.keys(parsedObj)[0];
    const parsedObjToReturn = parsedObj[key];
    if (parsedObjToReturn[textNodeName]) {
      parsedObjToReturn[key] = parsedObjToReturn[textNodeName];
      delete parsedObjToReturn[textNodeName];
    }
    return (0, import_smithy_client3.getValueFromTextNode)(parsedObjToReturn);
  }
  return {};
}), "parseXmlBody");
var parseXmlErrorBody = /* @__PURE__ */ __name(async (errorBody, context) => {
  const value = await parseXmlBody(errorBody, context);
  if (value.Error) {
    value.Error.message = value.Error.message ?? value.Error.Message;
  }
  return value;
}, "parseXmlErrorBody");
var loadRestXmlErrorCode = /* @__PURE__ */ __name((output, data) => {
  if (data?.Error?.Code !== void 0) {
    return data.Error.Code;
  }
  if (data?.Code !== void 0) {
    return data.Code;
  }
  if (output.statusCode == 404) {
    return "NotFound";
  }
}, "loadRestXmlErrorCode");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  _toBool,
  _toNum,
  _toStr,
  awsExpectUnion,
  loadRestJsonErrorCode,
  loadRestXmlErrorCode,
  parseJsonBody,
  parseJsonErrorBody,
  parseXmlBody,
  parseXmlErrorBody
});
