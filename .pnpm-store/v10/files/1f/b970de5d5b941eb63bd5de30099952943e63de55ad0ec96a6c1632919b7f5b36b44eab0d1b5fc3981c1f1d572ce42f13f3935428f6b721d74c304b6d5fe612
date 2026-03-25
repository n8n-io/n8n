// src/client/fetch-result-please.ts
var nullBodyResponses = /* @__PURE__ */ new Set([101, 204, 205, 304]);
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
var DetailedError = class extends Error {
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
};
var jsonRegex = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(?:;.+)?$/i;
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
export {
  DetailedError,
  fetchRP
};
