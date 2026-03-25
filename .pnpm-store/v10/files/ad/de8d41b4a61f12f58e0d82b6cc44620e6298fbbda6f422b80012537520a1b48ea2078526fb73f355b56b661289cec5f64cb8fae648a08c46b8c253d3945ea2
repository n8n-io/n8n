import { __export } from "../../_virtual/rolldown_runtime.js";
import { Bedrock } from "./web.js";
import { defaultProvider } from "@aws-sdk/credential-provider-node";

//#region src/llms/bedrock/index.ts
var bedrock_exports = {};
__export(bedrock_exports, { Bedrock: () => Bedrock$1 });
var Bedrock$1 = class extends Bedrock {
	static lc_name() {
		return "Bedrock";
	}
	constructor(fields) {
		super({
			...fields,
			credentials: fields?.credentials ?? defaultProvider()
		});
	}
};

//#endregion
export { Bedrock$1 as Bedrock, bedrock_exports };
//# sourceMappingURL=index.js.map