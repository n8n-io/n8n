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
var fetch_result_please_exports = {};
__export(fetch_result_please_exports, {
  DetailedError: () => DetailedError,
  fetchRP: () => fetchRP
});
module.exports = __toCommonJS(fetch_result_please_exports);
const nullBodyResponses = /* @__PURE__ */ new Set([101, 204, 205, 304]);
async function fetchRP(fetchRes) {
  const _fetchRes = await fetchRes;
  const hasBody = (_fetchRes.body || _fetchRes._bodyInit) && !nullBodyResponses.has(_fetchRes.status);
  if (hasBody) {
    const responseType = detectResponseType(_fetchRes);
    _fetchRes._data = await _fetchRes[responseType]();
  }
  if (!_fetchRes.ok) {
    throw new DetailedError(`${_fetchRes.status} ${_fetchRes.statusText}`, {
      statusCode: _fetchRes?.status,
      detail: {
        data: _fetchRes?._data,
        statusText: _fetchRes?.statusText
      }
    });
  }
  return _fetchRes._data;
}
class DetailedError extends Error {
  /**
   * Additional `message` that will be logged AND returned to client
   */
  detail;
  /**
   * Additional `code` that will be logged AND returned to client
   */
  code;
  /**
   * Additional value that will be logged AND NOT returned to client
   */
  log;
  /**
   * Optionally set the status code to return, in a web server context
   */
  statusCode;
  constructor(message, options = {}) {
    super(message);
    this.name = "DetailedError";
    this.log = options.log;
    this.detail = options.detail;
    this.code = options.code;
    this.statusCode = options.statusCode;
  }
}
const jsonRegex = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(?:;.+)?$/i;
function detectResponseType(response) {
  const _contentType = response.headers.get("content-type");
  if (!_contentType) {
    return "text";
  }
  const contentType = _contentType.split(";").shift();
  if (jsonRegex.test(contentType)) {
    return "json";
  }
  return "text";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DetailedError,
  fetchRP
});
