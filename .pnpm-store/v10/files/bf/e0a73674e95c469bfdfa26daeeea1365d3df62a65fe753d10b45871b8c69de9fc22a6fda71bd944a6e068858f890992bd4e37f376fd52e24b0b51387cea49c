"use strict";
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
var mock_exports = {};
__export(mock_exports, {
  Mock: () => Mock,
  default: () => mock_default
});
module.exports = __toCommonJS(mock_exports);
var import_gateway = require("./gateway");
var import_test = require("../test/index");
class Mock extends import_gateway.Gateway {
  get() {
    this.callMock();
  }
  head() {
    this.callMock();
  }
  post() {
    this.callMock();
  }
  put() {
    this.callMock();
  }
  patch() {
    this.callMock();
  }
  delete() {
    this.callMock();
  }
  callMock() {
    return (0, import_test.lookupResponseAsync)(this.request).then((response) => this.dispatchResponse(response)).catch((e) => this.dispatchClientError(e.message, e));
  }
}
var mock_default = Mock;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Mock
});
//# sourceMappingURL=mock.js.map