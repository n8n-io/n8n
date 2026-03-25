const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_ibm = require('../../utils/ibm.cjs');
const __langchain_core_utils_types = require_rolldown_runtime.__toESM(require("@langchain/core/utils/types"));
const __ibm_cloud_watsonx_ai = require_rolldown_runtime.__toESM(require("@ibm-cloud/watsonx-ai"));
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));

//#region src/agents/toolkits/ibm.ts
var ibm_exports = {};
require_rolldown_runtime.__export(ibm_exports, {
	WatsonxTool: () => WatsonxTool,
	WatsonxToolkit: () => WatsonxToolkit
});
var WatsonxTool = class extends __langchain_core_tools.StructuredTool {
	name;
	description;
	service;
	schema;
	configSchema;
	toolConfig;
	constructor(fields, service, configSchema) {
		super();
		this.name = fields?.name;
		this.description = fields?.description || "";
		this.schema = require_ibm.jsonSchemaToZod(fields?.parameters);
		this.configSchema = configSchema ? require_ibm.jsonSchemaToZod(configSchema) : void 0;
		this.service = service;
	}
	async _call(inputObject) {
		const { input } = inputObject;
		const response = await this.service.runUtilityAgentToolByName({
			toolId: this.name,
			wxUtilityAgentToolsRunRequest: {
				input: input ?? inputObject,
				tool_name: this.name,
				config: this.toolConfig
			}
		});
		const result = response?.result.output;
		return new Promise((resolve) => {
			resolve(result ?? "Sorry, the tool did not work as expected");
		});
	}
	set config(config) {
		if (!this.configSchema) {
			this.toolConfig = config;
			return;
		}
		const result = (0, __langchain_core_utils_types.interopSafeParse)(this.configSchema, config);
		this.toolConfig = result.data;
	}
};
var WatsonxToolkit = class WatsonxToolkit extends __langchain_core_tools.BaseToolkit {
	tools;
	service;
	constructor(fields) {
		super();
		const { watsonxAIApikey, watsonxAIAuthType, watsonxAIBearerToken, watsonxAIUsername, watsonxAIPassword, watsonxAIUrl, version, disableSSL, serviceUrl } = fields;
		const auth = require_ibm.authenticateAndSetInstance({
			watsonxAIApikey,
			watsonxAIAuthType,
			watsonxAIBearerToken,
			watsonxAIUsername,
			watsonxAIPassword,
			watsonxAIUrl,
			disableSSL,
			version,
			serviceUrl
		});
		if (auth) this.service = auth;
	}
	async loadTools() {
		const { result: tools } = await this.service.listUtilityAgentTools();
		this.tools = tools.resources.map((tool) => {
			const { function: watsonxTool } = (0, __ibm_cloud_watsonx_ai.convertUtilityToolToWatsonxTool)(tool);
			if (watsonxTool) return new WatsonxTool(watsonxTool, this.service, tool.config_schema);
			else return void 0;
		}).filter((item) => item !== void 0);
	}
	static async init(props) {
		const instance = new WatsonxToolkit({ ...props });
		await instance.loadTools();
		return instance;
	}
	getTools() {
		return this.tools;
	}
	getTool(toolName, config) {
		const selectedTool = this.tools.find((item) => item.name === toolName);
		if (!selectedTool) throw new Error("Tool with provided name does not exist");
		if (config) selectedTool.config = config;
		return selectedTool;
	}
};

//#endregion
exports.WatsonxTool = WatsonxTool;
exports.WatsonxToolkit = WatsonxToolkit;
Object.defineProperty(exports, 'ibm_exports', {
  enumerable: true,
  get: function () {
    return ibm_exports;
  }
});
//# sourceMappingURL=ibm.cjs.map