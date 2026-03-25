const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_llms_bedrock_web = require('./web.cjs');
const __aws_sdk_credential_provider_node = require_rolldown_runtime.__toESM(require("@aws-sdk/credential-provider-node"));

//#region src/llms/bedrock/index.ts
var bedrock_exports = {};
require_rolldown_runtime.__export(bedrock_exports, { Bedrock: () => Bedrock$1 });
var Bedrock$1 = class extends require_llms_bedrock_web.Bedrock {
	static lc_name() {
		return "Bedrock";
	}
	constructor(fields) {
		super({
			...fields,
			credentials: fields?.credentials ?? (0, __aws_sdk_credential_provider_node.defaultProvider)()
		});
	}
};

//#endregion
exports.Bedrock = Bedrock$1;
Object.defineProperty(exports, 'bedrock_exports', {
  enumerable: true,
  get: function () {
    return bedrock_exports;
  }
});
//# sourceMappingURL=index.cjs.map