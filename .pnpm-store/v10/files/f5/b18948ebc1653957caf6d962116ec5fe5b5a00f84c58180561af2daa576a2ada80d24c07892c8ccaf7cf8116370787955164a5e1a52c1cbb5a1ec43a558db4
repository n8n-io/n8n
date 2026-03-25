const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));
const zod_v4 = require_rolldown_runtime.__toESM(require("zod/v4"));

//#region src/tools/shell.ts
const ShellActionSchema = zod_v4.z.object({
	commands: zod_v4.z.array(zod_v4.z.string()).describe("Array of shell commands to execute"),
	timeout_ms: zod_v4.z.number().optional().describe("Optional timeout in milliseconds for the commands"),
	max_output_length: zod_v4.z.number().optional().describe("Optional maximum number of characters to return from each command")
});
const TOOL_NAME = "shell";
/**
* Creates a Shell tool that allows models to run shell commands through your integration.
*
* The shell tool allows the model to interact with your local computer through a controlled
* command-line interface. The model proposes shell commands; your integration executes them
* and returns the outputs. This creates a simple plan-execute loop that lets models inspect
* the system, run utilities, and gather data until they can finish the task.
*
* **Important**: The shell tool is available through the Responses API for use with `GPT-5.1`.
* It is not available on other models, or via the Chat Completions API.
*
* **When to use**:
* - **Automating filesystem or process diagnostics** – For example, "find the largest PDF
*   under ~/Documents" or "show running gunicorn processes."
* - **Extending the model's capabilities** – Using built-in UNIX utilities, python runtime
*   and other CLIs in your environment.
* - **Running multi-step build and test flows** – Chaining commands like `pip install` and `pytest`.
* - **Complex agentic coding workflows** – Using other tools like `apply_patch` to complete
*   workflows that involve complex file operations.
*
* **How it works**:
* The tool operates in a continuous loop:
* 1. Model sends shell commands (`shell_call` with `commands` array)
* 2. Your code executes the commands (can be concurrent)
* 3. You return stdout, stderr, and outcome for each command
* 4. Repeat until the task is complete
*
* **Security Warning**: Running arbitrary shell commands can be dangerous.
* Always sandbox execution or add strict allow/deny-lists before forwarding
* a command to the system shell.
*
* @see {@link https://platform.openai.com/docs/guides/tools-shell | OpenAI Shell Documentation}
* @see {@link https://github.com/openai/codex | Codex CLI} for reference implementation.
*
* @param options - Configuration for the Shell tool
* @returns A Shell tool that can be passed to `bindTools`
*
* @example
* ```typescript
* import { ChatOpenAI, tools } from "@langchain/openai";
* import { exec } from "child_process/promises";
*
* const model = new ChatOpenAI({ model: "gpt-5.1" });
*
* // With execute callback for automatic command handling
* const shellTool = tools.shell({
*   execute: async (action) => {
*     const outputs = await Promise.all(
*       action.commands.map(async (cmd) => {
*         try {
*           const { stdout, stderr } = await exec(cmd, {
*             timeout: action.timeout_ms ?? undefined,
*           });
*           return {
*             stdout,
*             stderr,
*             outcome: { type: "exit" as const, exit_code: 0 },
*           };
*         } catch (error) {
*           const timedOut = error.killed && error.signal === "SIGTERM";
*           return {
*             stdout: error.stdout ?? "",
*             stderr: error.stderr ?? String(error),
*             outcome: timedOut
*               ? { type: "timeout" as const }
*               : { type: "exit" as const, exit_code: error.code ?? 1 },
*           };
*         }
*       })
*     );
*     return {
*       output: outputs,
*       maxOutputLength: action.max_output_length,
*     };
*   },
* });
*
* const llmWithShell = model.bindTools([shellTool]);
* const response = await llmWithShell.invoke(
*   "Find the largest PDF file in ~/Documents"
* );
* ```
*
* @example
* ```typescript
* // Full shell loop example
* async function shellLoop(model, task) {
*   let response = await model.invoke(task, {
*     tools: [tools.shell({ execute: myExecutor })],
*   });
*
*   while (true) {
*     const shellCall = response.additional_kwargs.tool_outputs?.find(
*       (output) => output.type === "shell_call"
*     );
*
*     if (!shellCall) break;
*
*     // Execute commands (with proper sandboxing!)
*     const result = await executeCommands(shellCall.action);
*
*     // Send output back to model
*     response = await model.invoke([
*       response,
*       {
*         type: "shell_call_output",
*         call_id: shellCall.call_id,
*         output: result.output,
*         max_output_length: result.maxOutputLength,
*       },
*     ], {
*       tools: [tools.shell({ execute: myExecutor })],
*     });
*   }
*
*   return response;
* }
* ```
*
* @remarks
* - Only available through the Responses API (not Chat Completions)
* - Designed for use with `gpt-5.1` model
* - Commands are provided as an array of strings that can be executed concurrently
* - Action includes: `commands`, `timeout_ms`, `max_output_length`
* - Always sandbox or validate commands before execution
* - The `timeout_ms` from the model is only a hint—enforce your own limits
* - If `max_output_length` exists in the action, always pass it back in the output
* - Many CLI tools return non-zero exit codes for warnings; still capture stdout/stderr
*/
function shell(options) {
	const executeWrapper = async (action) => {
		const result = await options.execute(action);
		return JSON.stringify({
			output: result.output,
			max_output_length: result.maxOutputLength
		});
	};
	const shellTool = (0, __langchain_core_tools.tool)(executeWrapper, {
		name: TOOL_NAME,
		description: "Execute shell commands in a managed environment. Commands can be run concurrently.",
		schema: ShellActionSchema
	});
	shellTool.extras = {
		...shellTool.extras ?? {},
		providerToolDefinition: { type: "shell" }
	};
	return shellTool;
}

//#endregion
exports.shell = shell;
//# sourceMappingURL=shell.cjs.map