const require_tools_index = require("../../tools/index.cjs");
//#region src/utils/testing/tools.ts
var FakeTool = class extends require_tools_index.StructuredTool {
	name;
	description;
	schema;
	constructor(fields) {
		super(fields);
		this.name = fields.name;
		this.description = fields.description;
		this.schema = fields.schema;
	}
	async _call(arg, _runManager) {
		return JSON.stringify(arg);
	}
};
//#endregion
exports.FakeTool = FakeTool;

//# sourceMappingURL=tools.cjs.map