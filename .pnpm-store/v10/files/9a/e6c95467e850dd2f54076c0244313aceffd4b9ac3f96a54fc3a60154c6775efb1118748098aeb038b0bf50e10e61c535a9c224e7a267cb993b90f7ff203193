// src/index.ts
import { configs } from "./mappersmith.mjs";
import { XHR } from "./gateway/xhr.mjs";
import { HTTP } from "./gateway/http.mjs";
import { Fetch } from "./gateway/fetch.mjs";
import { Response } from "./response.mjs";
import { forge, forge as forge2, version, setContext } from "./mappersmith.mjs";
var _process = null;
var defaultGateway = null;
try {
  _process = eval(
    'typeof __TEST_SERVICE_WORKER__ === "undefined" && typeof process === "object" ? process : undefined'
  );
} catch (_e) {
}
if (typeof XMLHttpRequest !== "undefined") {
  defaultGateway = XHR;
} else if (typeof _process !== "undefined") {
  defaultGateway = HTTP;
} else if (typeof self !== "undefined") {
  defaultGateway = Fetch;
}
configs.gateway = defaultGateway;
export {
  Response,
  configs,
  forge as default,
  forge2 as forge,
  setContext,
  version
};
//# sourceMappingURL=index.mjs.map