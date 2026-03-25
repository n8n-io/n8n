import { OpenAI as OpenAI$1 } from "openai";
import { ServerTool } from "@langchain/core/tools";

//#region src/tools/codeInterpreter.d.ts

/**
 * Memory limit options for the Code Interpreter container.
 * Higher tiers offer more RAM and are billed at different rates.
 */
type CodeInterpreterMemoryLimit = "1g" | "4g" | "16g" | "64g";
/**
 * Auto container configuration for Code Interpreter.
 * Creates a new container automatically or reuses an active one.
 */
interface CodeInterpreterAutoContainer {
  /**
   * Memory limit for the container.
   * - `"1g"` (default): 1 GB RAM
   * - `"4g"`: 4 GB RAM
   * - `"16g"`: 16 GB RAM
   * - `"64g"`: 64 GB RAM
   */
  memoryLimit?: CodeInterpreterMemoryLimit;
  /**
   * Optional list of uploaded file IDs to make available to the code.
   * Files in the model input are automatically uploaded, so this is only
   * needed for additional files.
   */
  fileIds?: string[];
}
/**
 * Options for the Code Interpreter tool.
 */
interface CodeInterpreterOptions {
  /**
   * The container configuration for the Code Interpreter.
   *
   * Can be either:
   * - A string container ID for explicit mode (created via `/v1/containers` endpoint)
   * - An auto configuration object that creates/reuses containers automatically
   *
   * If not provided, defaults to auto mode with default settings.
   */
  container?: string | CodeInterpreterAutoContainer;
}
/**
 * OpenAI Code Interpreter tool type for the Responses API.
 */
type CodeInterpreterTool = OpenAI$1.Responses.Tool.CodeInterpreter;
/**
 * Creates a Code Interpreter tool that allows models to write and run Python code
 * in a sandboxed environment to solve complex problems.
 *
 * Use Code Interpreter for:
 * - **Data analysis**: Processing files with diverse data and formatting
 * - **File generation**: Creating files with data and images of graphs
 * - **Iterative coding**: Writing and running code iteratively to solve problems
 * - **Visual intelligence**: Cropping, zooming, rotating, and transforming images
 *
 * The tool runs in a container, which is a fully sandboxed virtual machine.
 * Containers can be created automatically (auto mode) or explicitly via the
 * `/v1/containers` endpoint.
 *
 * @see {@link https://platform.openai.com/docs/guides/tools-code-interpreter | OpenAI Code Interpreter Documentation}
 *
 * @param options - Configuration options for the Code Interpreter tool
 * @returns A Code Interpreter tool definition to be passed to the OpenAI Responses API
 *
 * @example
 * ```typescript
 * import { ChatOpenAI, tools } from "@langchain/openai";
 *
 * const model = new ChatOpenAI({ model: "gpt-4.1" });
 *
 * // Basic usage with auto container (default 1GB memory)
 * const response = await model.invoke(
 *   "Solve the equation 3x + 11 = 14",
 *   { tools: [tools.codeInterpreter()] }
 * );
 *
 * // With increased memory limit for larger computations
 * const response = await model.invoke(
 *   "Analyze this large dataset and create visualizations",
 *   {
 *     tools: [tools.codeInterpreter({
 *       container: { memoryLimit: "4g" }
 *     })]
 *   }
 * );
 *
 * // With specific files available to the code
 * const response = await model.invoke(
 *   "Process the uploaded CSV file",
 *   {
 *     tools: [tools.codeInterpreter({
 *       container: {
 *         memoryLimit: "4g",
 *         fileIds: ["file-abc123", "file-def456"]
 *       }
 *     })]
 *   }
 * );
 *
 * // Using an explicit container ID (created via /v1/containers)
 * const response = await model.invoke(
 *   "Continue working with the data",
 *   {
 *     tools: [tools.codeInterpreter({
 *       container: "cntr_abc123"
 *     })]
 *   }
 * );
 * ```
 *
 * @remarks
 * - Containers expire after 20 minutes of inactivity
 * - While called "Code Interpreter", the model knows it as the "python tool"
 * - For explicit prompting, ask for "the python tool" in your prompts
 * - Files in model input are automatically uploaded to the container
 * - Generated files are returned as `container_file_citation` annotations
 */
declare function codeInterpreter(options?: CodeInterpreterOptions): ServerTool;
//#endregion
export { CodeInterpreterAutoContainer, CodeInterpreterMemoryLimit, CodeInterpreterOptions, CodeInterpreterTool, codeInterpreter };
//# sourceMappingURL=codeInterpreter.d.ts.map