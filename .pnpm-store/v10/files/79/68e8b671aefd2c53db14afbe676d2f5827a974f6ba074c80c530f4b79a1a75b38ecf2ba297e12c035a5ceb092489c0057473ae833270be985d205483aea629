import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod/v3";

//#region src/tools/fs.ts
const readSchema = z.object({ file_path: z.string().describe("name of file") });
/**
* Class for reading files from the disk. Extends the StructuredTool
* class.
*/
var ReadFileTool = class extends StructuredTool {
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
const writeSchema = z.object({
	file_path: z.string().describe("name of file"),
	text: z.string().describe("text to write to file")
});
/**
* Class for writing data to files on the disk. Extends the StructuredTool
* class.
*/
var WriteFileTool = class extends StructuredTool {
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
export { ReadFileTool, WriteFileTool };
//# sourceMappingURL=fs.js.map