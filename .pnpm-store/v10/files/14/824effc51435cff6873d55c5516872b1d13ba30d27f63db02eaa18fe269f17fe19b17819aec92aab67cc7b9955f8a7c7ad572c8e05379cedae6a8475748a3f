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

// src/submodules/account-id-endpoint/index.ts
var index_exports = {};
__export(index_exports, {
  ACCOUNT_ID_ENDPOINT_MODE_VALUES: () => ACCOUNT_ID_ENDPOINT_MODE_VALUES,
  CONFIG_ACCOUNT_ID_ENDPOINT_MODE: () => CONFIG_ACCOUNT_ID_ENDPOINT_MODE,
  DEFAULT_ACCOUNT_ID_ENDPOINT_MODE: () => DEFAULT_ACCOUNT_ID_ENDPOINT_MODE,
  ENV_ACCOUNT_ID_ENDPOINT_MODE: () => ENV_ACCOUNT_ID_ENDPOINT_MODE,
  NODE_ACCOUNT_ID_ENDPOINT_MODE_CONFIG_OPTIONS: () => NODE_ACCOUNT_ID_ENDPOINT_MODE_CONFIG_OPTIONS,
  resolveAccountIdEndpointModeConfig: () => resolveAccountIdEndpointModeConfig,
  validateAccountIdEndpointMode: () => validateAccountIdEndpointMode
});
module.exports = __toCommonJS(index_exports);

// src/submodules/account-id-endpoint/AccountIdEndpointModeConfigResolver.ts
var import_util_middleware = require("@smithy/util-middleware");

// src/submodules/account-id-endpoint/AccountIdEndpointModeConstants.ts
var DEFAULT_ACCOUNT_ID_ENDPOINT_MODE = "preferred";
var ACCOUNT_ID_ENDPOINT_MODE_VALUES = ["disabled", "preferred", "required"];
function validateAccountIdEndpointMode(value) {
  return ACCOUNT_ID_ENDPOINT_MODE_VALUES.includes(value);
}
__name(validateAccountIdEndpointMode, "validateAccountIdEndpointMode");

// src/submodules/account-id-endpoint/AccountIdEndpointModeConfigResolver.ts
var resolveAccountIdEndpointModeConfig = /* @__PURE__ */ __name((input) => {
  const { accountIdEndpointMode } = input;
  const accountIdEndpointModeProvider = (0, import_util_middleware.normalizeProvider)(accountIdEndpointMode ?? DEFAULT_ACCOUNT_ID_ENDPOINT_MODE);
  return Object.assign(input, {
    accountIdEndpointMode: /* @__PURE__ */ __name(async () => {
      const accIdMode = await accountIdEndpointModeProvider();
      if (!validateAccountIdEndpointMode(accIdMode)) {
        throw new Error(
          `Invalid value for accountIdEndpointMode: ${accIdMode}. Valid values are: "required", "preferred", "disabled".`
        );
      }
      return accIdMode;
    }, "accountIdEndpointMode")
  });
}, "resolveAccountIdEndpointModeConfig");

// src/submodules/account-id-endpoint/NodeAccountIdEndpointModeConfigOptions.ts
var err = "Invalid AccountIdEndpointMode value";
var _throw = /* @__PURE__ */ __name((message) => {
  throw new Error(message);
}, "_throw");
var ENV_ACCOUNT_ID_ENDPOINT_MODE = "AWS_ACCOUNT_ID_ENDPOINT_MODE";
var CONFIG_ACCOUNT_ID_ENDPOINT_MODE = "account_id_endpoint_mode";
var NODE_ACCOUNT_ID_ENDPOINT_MODE_CONFIG_OPTIONS = {
  environmentVariableSelector: /* @__PURE__ */ __name((env) => {
    const value = env[ENV_ACCOUNT_ID_ENDPOINT_MODE];
    if (value && !validateAccountIdEndpointMode(value)) {
      _throw(err);
    }
    return value;
  }, "environmentVariableSelector"),
  configFileSelector: /* @__PURE__ */ __name((profile) => {
    const value = profile[CONFIG_ACCOUNT_ID_ENDPOINT_MODE];
    if (value && !validateAccountIdEndpointMode(value)) {
      _throw(err);
    }
    return value;
  }, "configFileSelector"),
  default: DEFAULT_ACCOUNT_ID_ENDPOINT_MODE
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ACCOUNT_ID_ENDPOINT_MODE_VALUES,
  CONFIG_ACCOUNT_ID_ENDPOINT_MODE,
  DEFAULT_ACCOUNT_ID_ENDPOINT_MODE,
  ENV_ACCOUNT_ID_ENDPOINT_MODE,
  NODE_ACCOUNT_ID_ENDPOINT_MODE_CONFIG_OPTIONS,
  resolveAccountIdEndpointModeConfig,
  validateAccountIdEndpointMode
});
