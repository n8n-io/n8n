import { OpenAI as OpenAI$1 } from "openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod/v4";

//#region src/tools/shell.d.ts

/**
 * Re-export action type from OpenAI SDK for convenience.
 * The action contains command details like commands array, timeout, and max output length.
 */
type ShellAction = OpenAI$1.Responses.ResponseFunctionShellToolCall.Action;
/**
 * Result of a single shell command execution.
 * Contains stdout, stderr, and the outcome (exit code or timeout).
 */
type ShellCommandOutput = OpenAI$1.Responses.ResponseFunctionShellCallOutputContent;
/**
 * Outcome type for shell command execution - either exit with code or timeout.
 */
type ShellCallOutcome = ShellCommandOutput["outcome"];
/**
 * Result of executing shell commands.
 * Contains an array of outputs (one per command) and the max_output_length parameter.
 */
interface ShellResult {
  /**
   * Array of command outputs. Each entry corresponds to a command from the action.
   * The order should match the order of commands in the action.
   */
  output: ShellCommandOutput[];
  /**
   * The max_output_length from the action, which must be passed back to the API.
   * If not provided in the action, can be omitted.
   */
  maxOutputLength?: number | null;
}
/**
 * Options for the Shell tool.
 */
interface ShellOptions {
  /**
   * Execute function that handles shell command execution.
   * This function receives the action input containing the commands and limits,
   * and should return a ShellResult with stdout, stderr, and outcome for each command.
   *
   * @example
   * ```typescript
   * execute: async (action) => {
   *   const outputs = await Promise.all(
   *     action.commands.map(async (cmd) => {
   *       try {
   *         const { stdout, stderr } = await exec(cmd, {
   *           timeout: action.timeout_ms ?? undefined,
   *         });
   *         return {
   *           stdout,
   *           stderr,
   *           outcome: { type: "exit" as const, exit_code: 0 },
   *         };
   *       } catch (error) {
   *         const timedOut = error.killed && error.signal === "SIGTERM";
   *         return {
   *           stdout: error.stdout ?? "",
   *           stderr: error.stderr ?? String(error),
   *           outcome: timedOut
   *             ? { type: "timeout" as const }
   *             : { type: "exit" as const, exit_code: error.code ?? 1 },
   *         };
   *       }
   *     })
   *   );
   *   return {
   *     output: outputs,
   *     maxOutputLength: action.max_output_length,
   *   };
   * }
   * ```
   */
  execute: (action: ShellAction) => ShellResult | Promise<ShellResult>;
}
/**
 * OpenAI Shell tool type for the Responses API.
 */
type ShellTool = OpenAI$1.Responses.FunctionShellTool;
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
declare function shell(options: ShellOptions): DynamicStructuredTool<z.ZodObject<{
  commands: z.ZodArray<z.ZodString>;
  timeout_ms: z.ZodOptional<z.ZodNumber>;
  max_output_length: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, OpenAI$1.Responses.ResponseFunctionShellToolCall.Action, unknown, string, string>;
//#endregion
export { ShellAction, ShellCallOutcome, ShellCommandOutput, ShellOptions, ShellResult, ShellTool, shell };
//# sourceMappingURL=shell.d.ts.map