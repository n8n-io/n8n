import { tool } from "@langchain/core/tools";
import { z } from "zod/v4";

//#region src/tools/applyPatch.ts
const ApplyPatchCreateFileOperationSchema = z.object({
	type: z.literal("create_file"),
	path: z.string(),
	diff: z.string()
});
const ApplyPatchUpdateFileOperationSchema = z.object({
	type: z.literal("update_file"),
	path: z.string(),
	diff: z.string()
});
const ApplyPatchDeleteFileOperationSchema = z.object({
	type: z.literal("delete_file"),
	path: z.string()
});
const ApplyPatchOperationSchema = z.union([
	ApplyPatchCreateFileOperationSchema,
	ApplyPatchUpdateFileOperationSchema,
	ApplyPatchDeleteFileOperationSchema
]);
const TOOL_NAME = "apply_patch";
/**
* Creates an Apply Patch tool that allows models to propose structured diffs
* that your integration applies. This enables iterative, multi-step code
* editing workflows.
*
* **Apply Patch** lets GPT-5.1 create, update, and delete files in your codebase
* using structured diffs. Instead of just suggesting edits, the model emits
* patch operations that your application applies and then reports back on.
*
* **When to use**:
* - **Multi-file refactors** – Rename symbols, extract helpers, or reorganize modules
* - **Bug fixes** – Have the model both diagnose issues and emit precise patches
* - **Tests & docs generation** – Create new test files, fixtures, and documentation
* - **Migrations & mechanical edits** – Apply repetitive, structured updates
*
* **How it works**:
* The tool operates in a continuous loop:
* 1. Model sends patch operations (`apply_patch_call` with operation type)
* 2. Your code applies the patch to your working directory or repo
* 3. You return success/failure status and optional output
* 4. Repeat until the task is complete
*
* **Security Warning**: Applying patches can modify files in your codebase.
* Always validate paths, implement backups, and consider sandboxing.
*
* @see {@link https://platform.openai.com/docs/guides/tools-apply-patch | OpenAI Apply Patch Documentation}
*
* @param options - Configuration options for the Apply Patch tool
* @returns An Apply Patch tool that can be passed to `bindTools`
*
* @example
* ```typescript
* import { ChatOpenAI, tools } from "@langchain/openai";
* import { applyDiff } from "@openai/agents";
* import * as fs from "fs/promises";
*
* const model = new ChatOpenAI({ model: "gpt-5.1" });
*
* // With execute callback for automatic patch handling
* const patchTool = tools.applyPatch({
*   execute: async (operation) => {
*     if (operation.type === "create_file") {
*       const content = applyDiff("", operation.diff, "create");
*       await fs.writeFile(operation.path, content);
*       return `Created ${operation.path}`;
*     }
*     if (operation.type === "update_file") {
*       const current = await fs.readFile(operation.path, "utf-8");
*       const newContent = applyDiff(current, operation.diff);
*       await fs.writeFile(operation.path, newContent);
*       return `Updated ${operation.path}`;
*     }
*     if (operation.type === "delete_file") {
*       await fs.unlink(operation.path);
*       return `Deleted ${operation.path}`;
*     }
*     return "Unknown operation type";
*   },
* });
*
* const llmWithPatch = model.bindTools([patchTool]);
* const response = await llmWithPatch.invoke(
*   "Rename the fib() function to fibonacci() in lib/fib.py"
* );
* ```
*
* @remarks
* - Only available through the Responses API (not Chat Completions)
* - Designed for use with `gpt-5.1` model
* - Operations include: `create_file`, `update_file`, `delete_file`
* - Patches use V4A diff format for updates
* - Always validate paths to prevent directory traversal attacks
* - Consider backing up files before applying patches
* - Implement "all-or-nothing" semantics if atomicity is required
*/
function applyPatch(options) {
	const patchTool = tool(options.execute, {
		name: TOOL_NAME,
		description: "Apply structured diffs to create, update, or delete files in the codebase.",
		schema: ApplyPatchOperationSchema
	});
	patchTool.extras = {
		...patchTool.extras ?? {},
		providerToolDefinition: { type: "apply_patch" }
	};
	return patchTool;
}

//#endregion
export { applyPatch };
//# sourceMappingURL=applyPatch.js.map