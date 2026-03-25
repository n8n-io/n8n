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

// src/submodules/client/index.ts
var index_exports = {};
__export(index_exports, {
  emitWarningIfUnsupportedVersion: () => emitWarningIfUnsupportedVersion,
  setCredentialFeature: () => setCredentialFeature,
  setFeature: () => setFeature,
  state: () => state
});
module.exports = __toCommonJS(index_exports);

// src/submodules/client/emitWarningIfUnsupportedVersion.ts
var state = {
  warningEmitted: false
};
var emitWarningIfUnsupportedVersion = /* @__PURE__ */ __name((version) => {
  if (version && !state.warningEmitted && parseInt(version.substring(1, version.indexOf("."))) < 18) {
    state.warningEmitted = true;
    process.emitWarning(
      `NodeDeprecationWarning: The AWS SDK for JavaScript (v3) will
no longer support Node.js 16.x on January 6, 2025.

To continue receiving updates to AWS services, bug fixes, and security
updates please upgrade to a supported Node.js LTS version.

More information can be found at: https://a.co/74kJMmI`
    );
  }
}, "emitWarningIfUnsupportedVersion");

// src/submodules/client/setCredentialFeature.ts
function setCredentialFeature(credentials, feature, value) {
  if (!credentials.$source) {
    credentials.$source = {};
  }
  credentials.$source[feature] = value;
  return credentials;
}
__name(setCredentialFeature, "setCredentialFeature");

// src/submodules/client/setFeature.ts
function setFeature(context, feature, value) {
  if (!context.__aws_sdk_context) {
    context.__aws_sdk_context = {
      features: {}
    };
  } else if (!context.__aws_sdk_context.features) {
    context.__aws_sdk_context.features = {};
  }
  context.__aws_sdk_context.features[feature] = value;
}
__name(setFeature, "setFeature");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  emitWarningIfUnsupportedVersion,
  setCredentialFeature,
  setFeature,
  state
});
