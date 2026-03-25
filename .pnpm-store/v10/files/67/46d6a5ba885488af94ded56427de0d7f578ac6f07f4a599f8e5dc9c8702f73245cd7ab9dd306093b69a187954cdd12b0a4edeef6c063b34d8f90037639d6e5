import { tool } from "@langchain/core/tools";
import { z } from "zod/v4";

//#region src/tools/localShell.ts
const LocalShellExecActionSchema = z.object({
	type: z.literal("exec"),
	command: z.array(z.string()),
	env: z.record(z.string(), z.string()).optional(),
	working_directory: z.string().optional(),
	timeout_ms: z.number().optional(),
	user: z.string().optional()
});
const LocalShellActionSchema = z.union([LocalShellExecActionSchema]);
const TOOL_NAME = "local_shell";
/**
* Creates a Local Shell tool that allows models to run shell commands locally
* on a machine you provide. Commands are executed inside your own runtime—
* the API only returns the instructions, but does not execute them on OpenAI infrastructure.
*
* **Important**: The local shell tool is designed to work with
* [Codex CLI](https://github.com/openai/codex) and the `codex-mini-latest` model.
*
* **How it works**:
* The tool operates in a continuous loop:
* 1. Model sends shell commands (`local_shell_call` with `exec` action)
* 2. Your code executes the command locally
* 3. You return the output back to the model
* 4. Repeat until the task is complete
*
* **Security Warning**: Running arbitrary shell commands can be dangerous.
* Always sandbox execution or add strict allow/deny-lists before forwarding
* a command to the system shell.
*
* @see {@link https://platform.openai.com/docs/guides/tools-local-shell | OpenAI Local Shell Documentation}
*
* @param options - Optional configuration for the Local Shell tool
* @returns A Local Shell tool that can be passed to `bindTools`
*
* @example
* ```typescript
* import { ChatOpenAI, tools } from "@langchain/openai";
* import { exec } from "child_process";
* import { promisify } from "util";
*
* const execAsync = promisify(exec);
* const model = new ChatOpenAI({ model: "codex-mini-latest" });
*
* // With execute callback for automatic command handling
* const shell = tools.localShell({
*   execute: async (action) => {
*     const { command, env, working_directory, timeout_ms } = action;
*     const result = await execAsync(command.join(' '), {
*       cwd: working_directory ?? process.cwd(),
*       env: { ...process.env, ...env },
*       timeout: timeout_ms ?? undefined,
*     });
*     return result.stdout + result.stderr;
*   },
* });
*
* const llmWithShell = model.bindTools([shell]);
* const response = await llmWithShell.invoke(
*   "List files in the current directory"
* );
* ```
*
* @example
* ```typescript
* // Without execute callback (manual handling)
* const shell = tools.localShell();
*
* const response = await model.invoke("List files", {
*   tools: [shell],
* });
*
* // Access the shell call from the response
* const shellCall = response.additional_kwargs.tool_outputs?.find(
*   (output) => output.type === "local_shell_call"
* );
* if (shellCall) {
*   console.log("Command to execute:", shellCall.action.command);
*   // Execute the command manually, then send back the output
* }
* ```
*
* @example
* ```typescript
* // Full shell loop example
* async function shellLoop(model, task) {
*   let response = await model.invoke(task, {
*     tools: [tools.localShell()],
*   });
*
*   while (true) {
*     const shellCall = response.additional_kwargs.tool_outputs?.find(
*       (output) => output.type === "local_shell_call"
*     );
*
*     if (!shellCall) break;
*
*     // Execute command (with proper sandboxing!)
*     const output = await executeCommand(shellCall.action);
*
*     // Send output back to model
*     response = await model.invoke([
*       response,
*       {
*         type: "local_shell_call_output",
*         id: shellCall.call_id,
*         output: output,
*       },
*     ], {
*       tools: [tools.localShell()],
*     });
*   }
*
*   return response;
* }
* ```
*
* @remarks
* - Only available through the Responses API (not Chat Completions)
* - Designed for use with `codex-mini-latest` model
* - Commands are provided as argv tokens in `action.command`
* - Action includes: `command`, `env`, `working_directory`, `timeout_ms`, `user`
* - Always sandbox or validate commands before execution
* - The `timeout_ms` from the model is only a hint—enforce your own limits
*/
function localShell(options) {
	const shellTool = tool(options.execute, {
		name: TOOL_NAME,
		description: "Execute shell commands locally on the machine. Commands are provided as argv tokens.",
		schema: LocalShellActionSchema
	});
	shellTool.extras = {
		...shellTool.extras ?? {},
		providerToolDefinition: { type: "local_shell" }
	};
	return shellTool;
}

//#endregion
export { localShell };
//# sourceMappingURL=localShell.js.map