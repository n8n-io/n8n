// src/gateway/mock.ts
import { Gateway } from "./gateway.mjs";
import { lookupResponseAsync } from "../test/index.mjs";
var Mock = class extends Gateway {
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
    return lookupResponseAsync(this.request).then((response) => this.dispatchResponse(response)).catch((e) => this.dispatchClientError(e.message, e));
  }
};
var mock_default = Mock;
export {
  Mock,
  mock_default as default
};
//# sourceMappingURL=mock.mjs.map