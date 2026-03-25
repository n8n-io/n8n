import { StructuredTool } from "../../tools/index.js";
//#region src/utils/testing/tools.ts
var FakeTool = class extends StructuredTool {
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
export { FakeTool };

//# sourceMappingURL=tools.js.map