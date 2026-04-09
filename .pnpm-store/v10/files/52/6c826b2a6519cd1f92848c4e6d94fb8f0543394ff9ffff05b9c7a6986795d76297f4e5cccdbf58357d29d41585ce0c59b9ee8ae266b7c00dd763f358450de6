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
var restError_exports = {};
__export(restError_exports, {
  RestError: () => RestError,
  isRestError: () => isRestError
});
module.exports = __toCommonJS(restError_exports);
var import_error = require("./util/error.js");
var import_inspect = require("./util/inspect.js");
var import_sanitizer = require("./util/sanitizer.js");
const errorSanitizer = new import_sanitizer.Sanitizer();
class RestError extends Error {
  /**
   * Something went wrong when making the request.
   * This means the actual request failed for some reason,
   * such as a DNS issue or the connection being lost.
   */
  static REQUEST_SEND_ERROR = "REQUEST_SEND_ERROR";
  /**
   * This means that parsing the response from the server failed.
   * It may have been malformed.
   */
  static PARSE_ERROR = "PARSE_ERROR";
  /**
   * The code of the error itself (use statics on RestError if possible.)
   */
  code;
  /**
   * The HTTP status code of the request (if applicable.)
   */
  statusCode;
  /**
   * The request that was made.
   * This property is non-enumerable.
   */
  request;
  /**
   * The response received (if any.)
   * This property is non-enumerable.
   */
  response;
  /**
   * Bonus property set by the throw site.
   */
  details;
  constructor(message, options = {}) {
    super(message);
    this.name = "RestError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    Object.defineProperty(this, "request", { value: options.request, enumerable: false });
    Object.defineProperty(this, "response", { value: options.response, enumerable: false });
    const agent = this.request?.agent ? {
      maxFreeSockets: this.request.agent.maxFreeSockets,
      maxSockets: this.request.agent.maxSockets
    } : void 0;
    Object.defineProperty(this, import_inspect.custom, {
      value: () => {
        return `RestError: ${this.message} 
 ${errorSanitizer.sanitize({
          ...this,
          request: { ...this.request, agent },
          response: this.response
        })}`;
      },
      enumerable: false
    });
    Object.setPrototypeOf(this, RestError.prototype);
  }
}
function isRestError(e) {
  if (e instanceof RestError) {
    return true;
  }
  return (0, import_error.isError)(e) && e.name === "RestError";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RestError,
  isRestError
});
