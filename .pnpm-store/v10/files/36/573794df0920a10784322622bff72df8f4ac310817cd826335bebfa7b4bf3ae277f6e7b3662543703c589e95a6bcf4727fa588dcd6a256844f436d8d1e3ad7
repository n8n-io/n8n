import { OpenAI as OpenAI$1 } from "openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod/v4";

//#region src/tools/localShell.d.ts

/**
 * Re-export action type from OpenAI SDK for convenience.
 * The action contains command details like argv tokens, environment variables,
 * working directory, timeout, and user.
 */
type LocalShellAction = OpenAI$1.Responses.ResponseOutputItem.LocalShellCall.Action;
/**
 * Options for the Local Shell tool.
 */
interface LocalShellOptions {
  /**
   * Optional execute function that handles shell command execution.
   * This function receives the action input and should return the command output
   * (stdout + stderr combined).
   *
   * If not provided, you'll need to handle action execution manually by
   * checking `local_shell_call` outputs in the response.
   *
   * @example
   * ```typescript
   * execute: async (action) => {
   *   const result = await exec(action.command.join(' '), {
   *     cwd: action.working_directory,
   *     env: { ...process.env, ...action.env },
   *     timeout: action.timeout_ms,
   *   });
   *   return result.stdout + result.stderr;
   * }
   * ```
   */
  execute: (action: LocalShellAction) => string | Promise<string>;
}
/**
 * OpenAI Local Shell tool type for the Responses API.
 */
type LocalShellTool = OpenAI$1.Responses.Tool.LocalShell;
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
declare function localShell(options: LocalShellOptions): DynamicStructuredTool<z.ZodUnion<readonly [z.ZodObject<{
  type: z.ZodLiteral<"exec">;
  command: z.ZodArray<z.ZodString>;
  env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
  working_directory: z.ZodOptional<z.ZodString>;
  timeout_ms: z.ZodOptional<z.ZodNumber>;
  user: z.ZodOptional<z.ZodString>;
}, z.core.$strip>]>, OpenAI$1.Responses.ResponseOutputItem.LocalShellCall.Action, unknown, string, string>;
//#endregion
export { LocalShellAction, LocalShellOptions, LocalShellTool, localShell };
//# sourceMappingURL=localShell.d.cts.map