const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const zod_v3 = require_rolldown_runtime.__toESM(require("zod/v3"));
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));
const __browserbasehq_stagehand = require_rolldown_runtime.__toESM(require("@browserbasehq/stagehand"));

//#region src/agents/toolkits/stagehand.ts
var stagehand_exports = {};
require_rolldown_runtime.__export(stagehand_exports, {
	StagehandActTool: () => StagehandActTool,
	StagehandExtractTool: () => StagehandExtractTool,
	StagehandNavigateTool: () => StagehandNavigateTool,
	StagehandObserveTool: () => StagehandObserveTool,
	StagehandToolkit: () => StagehandToolkit
});
var StagehandToolBase = class extends __langchain_core_tools.Tool {
	stagehand;
	localStagehand;
	constructor(stagehandInstance) {
		super();
		this.stagehand = stagehandInstance;
	}
	async getStagehand() {
		if (this.stagehand) return this.stagehand;
		if (!this.localStagehand) {
			this.localStagehand = new __browserbasehq_stagehand.Stagehand({
				env: "LOCAL",
				enableCaching: true
			});
			await this.localStagehand.init();
		}
		return this.localStagehand;
	}
};
function isErrorWithMessage(error) {
	return typeof error === "object" && error !== null && "message" in error && typeof error.message === "string";
}
var StagehandNavigateTool = class extends StagehandToolBase {
	name = "stagehand_navigate";
	description = "Use this tool to navigate to a specific URL using Stagehand. The input should be a valid URL as a string.";
	async _call(input) {
		const stagehand = await this.getStagehand();
		try {
			await stagehand.page.goto(input);
			return `Successfully navigated to ${input}.`;
		} catch (error) {
			const message = isErrorWithMessage(error) ? error.message : String(error);
			return `Failed to navigate: ${message}`;
		}
	}
};
var StagehandActTool = class extends StagehandToolBase {
	name = "stagehand_act";
	description = "Use this tool to perform an action on the current web page using Stagehand. The input should be a string describing the action to perform.";
	async _call(input) {
		const stagehand = await this.getStagehand();
		const result = await stagehand.act({ action: input });
		if (result.success) return `Action performed successfully: ${result.message}`;
		else return `Failed to perform action: ${result.message}`;
	}
};
var StagehandExtractTool = class extends __langchain_core_tools.StructuredTool {
	name = "stagehand_extract";
	description = "Use this tool to extract structured information from the current web page using Stagehand. The input should include an 'instruction' string and a 'schema' object representing the extraction schema in JSON Schema format.";
	schema = zod_v3.z.object({
		instruction: zod_v3.z.string().describe("Instruction on what to extract"),
		schema: zod_v3.z.record(zod_v3.z.any()).describe("Extraction schema in JSON Schema format")
	});
	stagehand;
	constructor(stagehandInstance) {
		super();
		this.stagehand = stagehandInstance;
	}
	async _call(input) {
		const stagehand = await this.getStagehand();
		const { instruction, schema } = input;
		try {
			const result = await stagehand.extract({
				instruction,
				schema
			});
			return JSON.stringify(result);
		} catch (error) {
			const message = isErrorWithMessage(error) ? error.message : String(error);
			return `Failed to extract information: ${message}`;
		}
	}
	async getStagehand() {
		if (this.stagehand) return this.stagehand;
		this.stagehand = new __browserbasehq_stagehand.Stagehand({
			env: "LOCAL",
			enableCaching: true
		});
		await this.stagehand.init();
		return this.stagehand;
	}
};
var StagehandObserveTool = class extends StagehandToolBase {
	name = "stagehand_observe";
	description = "Use this tool to observe the current web page and retrieve possible actions using Stagehand. The input can be an optional instruction string.";
	async _call(input) {
		const stagehand = await this.getStagehand();
		const instruction = input || void 0;
		try {
			const result = await stagehand.observe({ instruction });
			return JSON.stringify(result);
		} catch (error) {
			const message = isErrorWithMessage(error) ? error.message : String(error);
			return `Failed to observe: ${message}`;
		}
	}
};
var StagehandToolkit = class StagehandToolkit extends __langchain_core_tools.BaseToolkit {
	tools;
	stagehand;
	constructor(stagehand) {
		super();
		this.stagehand = stagehand;
		this.tools = this.initializeTools();
	}
	initializeTools() {
		return [
			new StagehandNavigateTool(this.stagehand),
			new StagehandActTool(this.stagehand),
			new StagehandExtractTool(this.stagehand),
			new StagehandObserveTool(this.stagehand)
		];
	}
	static async fromStagehand(stagehand) {
		return new StagehandToolkit(stagehand);
	}
};

//#endregion
exports.StagehandActTool = StagehandActTool;
exports.StagehandExtractTool = StagehandExtractTool;
exports.StagehandNavigateTool = StagehandNavigateTool;
exports.StagehandObserveTool = StagehandObserveTool;
exports.StagehandToolkit = StagehandToolkit;
Object.defineProperty(exports, 'stagehand_exports', {
  enumerable: true,
  get: function () {
    return stagehand_exports;
  }
});
//# sourceMappingURL=stagehand.cjs.map