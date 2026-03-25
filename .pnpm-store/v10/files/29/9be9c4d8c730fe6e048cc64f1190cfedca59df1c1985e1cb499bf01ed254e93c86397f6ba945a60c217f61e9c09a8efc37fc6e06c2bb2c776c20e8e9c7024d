const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));
const zod_v3 = require_rolldown_runtime.__toESM(require("zod/v3"));

//#region src/tools/fs.ts
const readSchema = zod_v3.z.object({ file_path: zod_v3.z.string().describe("name of file") });
/**
* Class for reading files from the disk. Extends the StructuredTool
* class.
*/
var ReadFileTool = class extends __langchain_core_tools.StructuredTool {
	static lc_name() {
		return "ReadFileTool";
	}
	schema = readSchema;
	name = "read_file";
	description = "Read file from disk";
	store;
	constructor({ store }) {
		super(...arguments);
		this.store = store;
	}
	async _call({ file_path }) {
		return await this.store.readFile(file_path);
	}
};
const writeSchema = zod_v3.z.object({
	file_path: zod_v3.z.string().describe("name of file"),
	text: zod_v3.z.string().describe("text to write to file")
});
/**
* Class for writing data to files on the disk. Extends the StructuredTool
* class.
*/
var WriteFileTool = class extends __langchain_core_tools.StructuredTool {
	static lc_name() {
		return "WriteFileTool";
	}
	schema = writeSchema;
	name = "write_file";
	description = "Write file from disk";
	store;
	constructor({ store,...rest }) {
		super(rest);
		this.store = store;
	}
	async _call({ file_path, text }) {
		await this.store.writeFile(file_path, text);
		return "File written to successfully.";
	}
};

//#endregion
exports.ReadFileTool = ReadFileTool;
exports.WriteFileTool = WriteFileTool;
//# sourceMappingURL=fs.cjs.map