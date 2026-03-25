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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  NODE_APP_ID_CONFIG_OPTIONS: () => NODE_APP_ID_CONFIG_OPTIONS,
  UA_APP_ID_ENV_NAME: () => UA_APP_ID_ENV_NAME,
  UA_APP_ID_INI_NAME: () => UA_APP_ID_INI_NAME,
  createDefaultUserAgentProvider: () => createDefaultUserAgentProvider,
  crtAvailability: () => crtAvailability,
  defaultUserAgent: () => defaultUserAgent
});
module.exports = __toCommonJS(index_exports);

// src/defaultUserAgent.ts
var import_os = require("os");
var import_process = require("process");

// src/crt-availability.ts
var crtAvailability = {
  isCrtAvailable: false
};

// src/is-crt-available.ts
var isCrtAvailable = /* @__PURE__ */ __name(() => {
  if (crtAvailability.isCrtAvailable) {
    return ["md/crt-avail"];
  }
  return null;
}, "isCrtAvailable");

// src/defaultUserAgent.ts
var createDefaultUserAgentProvider = /* @__PURE__ */ __name(({ serviceId, clientVersion }) => {
  return async (config) => {
    const sections = [
      // sdk-metadata
      ["aws-sdk-js", clientVersion],
      // ua-metadata
      ["ua", "2.1"],
      // os-metadata
      [`os/${(0, import_os.platform)()}`, (0, import_os.release)()],
      // language-metadata
      // ECMAScript edition doesn't matter in JS, so no version needed.
      ["lang/js"],
      ["md/nodejs", `${import_process.versions.node}`]
    ];
    const crtAvailable = isCrtAvailable();
    if (crtAvailable) {
      sections.push(crtAvailable);
    }
    if (serviceId) {
      sections.push([`api/${serviceId}`, clientVersion]);
    }
    if (import_process.env.AWS_EXECUTION_ENV) {
      sections.push([`exec-env/${import_process.env.AWS_EXECUTION_ENV}`]);
    }
    const appId = await config?.userAgentAppId?.();
    const resolvedUserAgent = appId ? [...sections, [`app/${appId}`]] : [...sections];
    return resolvedUserAgent;
  };
}, "createDefaultUserAgentProvider");
var defaultUserAgent = createDefaultUserAgentProvider;

// src/nodeAppIdConfigOptions.ts
var import_middleware_user_agent = require("@aws-sdk/middleware-user-agent");
var UA_APP_ID_ENV_NAME = "AWS_SDK_UA_APP_ID";
var UA_APP_ID_INI_NAME = "sdk_ua_app_id";
var UA_APP_ID_INI_NAME_DEPRECATED = "sdk-ua-app-id";
var NODE_APP_ID_CONFIG_OPTIONS = {
  environmentVariableSelector: /* @__PURE__ */ __name((env2) => env2[UA_APP_ID_ENV_NAME], "environmentVariableSelector"),
  configFileSelector: /* @__PURE__ */ __name((profile) => profile[UA_APP_ID_INI_NAME] ?? profile[UA_APP_ID_INI_NAME_DEPRECATED], "configFileSelector"),
  default: import_middleware_user_agent.DEFAULT_UA_APP_ID
};
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  crtAvailability,
  createDefaultUserAgentProvider,
  defaultUserAgent,
  UA_APP_ID_ENV_NAME,
  UA_APP_ID_INI_NAME,
  NODE_APP_ID_CONFIG_OPTIONS
});

