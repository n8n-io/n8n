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
var createPipelineFromOptions_exports = {};
__export(createPipelineFromOptions_exports, {
  createPipelineFromOptions: () => createPipelineFromOptions
});
module.exports = __toCommonJS(createPipelineFromOptions_exports);
var import_logPolicy = require("./policies/logPolicy.js");
var import_pipeline = require("./pipeline.js");
var import_redirectPolicy = require("./policies/redirectPolicy.js");
var import_userAgentPolicy = require("./policies/userAgentPolicy.js");
var import_decompressResponsePolicy = require("./policies/decompressResponsePolicy.js");
var import_defaultRetryPolicy = require("./policies/defaultRetryPolicy.js");
var import_formDataPolicy = require("./policies/formDataPolicy.js");
var import_checkEnvironment = require("./util/checkEnvironment.js");
var import_proxyPolicy = require("./policies/proxyPolicy.js");
var import_agentPolicy = require("./policies/agentPolicy.js");
var import_tlsPolicy = require("./policies/tlsPolicy.js");
var import_multipartPolicy = require("./policies/multipartPolicy.js");
function createPipelineFromOptions(options) {
  const pipeline = (0, import_pipeline.createEmptyPipeline)();
  if (import_checkEnvironment.isNodeLike) {
    if (options.agent) {
      pipeline.addPolicy((0, import_agentPolicy.agentPolicy)(options.agent));
    }
    if (options.tlsOptions) {
      pipeline.addPolicy((0, import_tlsPolicy.tlsPolicy)(options.tlsOptions));
    }
    pipeline.addPolicy((0, import_proxyPolicy.proxyPolicy)(options.proxyOptions));
    pipeline.addPolicy((0, import_decompressResponsePolicy.decompressResponsePolicy)());
  }
  pipeline.addPolicy((0, import_formDataPolicy.formDataPolicy)(), { beforePolicies: [import_multipartPolicy.multipartPolicyName] });
  pipeline.addPolicy((0, import_userAgentPolicy.userAgentPolicy)(options.userAgentOptions));
  pipeline.addPolicy((0, import_multipartPolicy.multipartPolicy)(), { afterPhase: "Deserialize" });
  pipeline.addPolicy((0, import_defaultRetryPolicy.defaultRetryPolicy)(options.retryOptions), { phase: "Retry" });
  if (import_checkEnvironment.isNodeLike) {
    pipeline.addPolicy((0, import_redirectPolicy.redirectPolicy)(options.redirectOptions), { afterPhase: "Retry" });
  }
  pipeline.addPolicy((0, import_logPolicy.logPolicy)(options.loggingOptions), { afterPhase: "Sign" });
  return pipeline;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createPipelineFromOptions
});
