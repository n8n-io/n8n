import { OpenAI as OpenAI$1 } from "openai";
import { ToolMessage } from "@langchain/core/messages";
import { DynamicStructuredTool, ToolRuntime } from "@langchain/core/tools";
import { z } from "zod/v4";

//#region src/tools/computerUse.d.ts

/**
 * The type of computer environment to control.
 */
type ComputerUseEnvironment = "browser" | "mac" | "windows" | "linux" | "ubuntu";
/**
 * Re-export action types from OpenAI SDK for convenience.
 */
type ComputerUseClickAction = OpenAI$1.Responses.ResponseComputerToolCall.Click;
type ComputerUseDoubleClickAction = OpenAI$1.Responses.ResponseComputerToolCall.DoubleClick;
type ComputerUseDragAction = OpenAI$1.Responses.ResponseComputerToolCall.Drag;
type ComputerUseKeypressAction = OpenAI$1.Responses.ResponseComputerToolCall.Keypress;
type ComputerUseMoveAction = OpenAI$1.Responses.ResponseComputerToolCall.Move;
type ComputerUseScreenshotAction = OpenAI$1.Responses.ResponseComputerToolCall.Screenshot;
type ComputerUseScrollAction = OpenAI$1.Responses.ResponseComputerToolCall.Scroll;
type ComputerUseTypeAction = OpenAI$1.Responses.ResponseComputerToolCall.Type;
type ComputerUseWaitAction = OpenAI$1.Responses.ResponseComputerToolCall.Wait;
/**
 * Union type of all computer use actions from OpenAI SDK.
 */
type ComputerUseAction = OpenAI$1.Responses.ResponseComputerToolCall["action"];
/**
 * Input structure for the Computer Use tool.
 * The action is wrapped in an `action` property.
 */
interface ComputerUseInput {
  action: ComputerUseAction;
}
type ComputerUseReturnType = string | Promise<string> | ToolMessage<any> | Promise<ToolMessage<any>>;
/**
 * Options for the Computer Use tool.
 */
interface ComputerUseOptions {
  /**
   * The width of the computer display in pixels.
   */
  displayWidth: number;
  /**
   * The height of the computer display in pixels.
   */
  displayHeight: number;
  /**
   * The type of computer environment to control.
   * - `browser`: Browser automation (recommended for most use cases)
   * - `mac`: macOS environment
   * - `windows`: Windows environment
   * - `linux`: Linux environment
   * - `ubuntu`: Ubuntu environment
   */
  environment: ComputerUseEnvironment;
  /**
   * Execute function that handles computer action execution.
   * This function receives the action input and should return a base64-encoded
   * screenshot of the result.
   */
  execute: (action: ComputerUseAction, runtime: ToolRuntime<any, any>) => ComputerUseReturnType;
}
/**
 * OpenAI Computer Use tool type for the Responses API.
 */
type ComputerUseTool = OpenAI$1.Responses.ComputerTool;
/**
 * Creates a Computer Use tool that allows models to control computer interfaces
 * and perform tasks by simulating mouse clicks, keyboard input, scrolling, and more.
 *
 * **Computer Use** is a practical application of OpenAI's Computer-Using Agent (CUA)
 * model (`computer-use-preview`), which combines vision capabilities with advanced
 * reasoning to simulate controlling computer interfaces.
 *
 * **How it works**:
 * The tool operates in a continuous loop:
 * 1. Model sends computer actions (click, type, scroll, etc.)
 * 2. Your code executes these actions in a controlled environment
 * 3. You capture a screenshot of the result
 * 4. Send the screenshot back to the model
 * 5. Repeat until the task is complete
 *
 * **Important**: Computer use is in beta and requires careful consideration:
 * - Use in sandboxed environments only
 * - Do not use for high-stakes or authenticated tasks
 * - Always implement human-in-the-loop for important decisions
 * - Handle safety checks appropriately
 *
 * @see {@link https://platform.openai.com/docs/guides/tools-computer-use | OpenAI Computer Use Documentation}
 *
 * @param options - Configuration options for the Computer Use tool
 * @returns A Computer Use tool that can be passed to `bindTools`
 *
 * @example
 * ```typescript
 * import { ChatOpenAI, tools } from "@langchain/openai";
 *
 * const model = new ChatOpenAI({ model: "computer-use-preview" });
 *
 * // With execute callback for automatic action handling
 * const computer = tools.computerUse({
 *   displayWidth: 1024,
 *   displayHeight: 768,
 *   environment: "browser",
 *   execute: async (action) => {
 *     if (action.type === "screenshot") {
 *       return captureScreenshot();
 *     }
 *     if (action.type === "click") {
 *       await page.mouse.click(action.x, action.y, { button: action.button });
 *       return captureScreenshot();
 *     }
 *     if (action.type === "type") {
 *       await page.keyboard.type(action.text);
 *       return captureScreenshot();
 *     }
 *     // Handle other actions...
 *     return captureScreenshot();
 *   },
 * });
 *
 * const llmWithComputer = model.bindTools([computer]);
 * const response = await llmWithComputer.invoke(
 *   "Check the latest news on bing.com"
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Without execute callback (manual action handling)
 * const computer = tools.computerUse({
 *   displayWidth: 1024,
 *   displayHeight: 768,
 *   environment: "browser",
 * });
 *
 * const response = await model.invoke("Check the news", {
 *   tools: [computer],
 * });
 *
 * // Access the computer call from the response
 * const computerCall = response.additional_kwargs.tool_outputs?.find(
 *   (output) => output.type === "computer_call"
 * );
 * if (computerCall) {
 *   console.log("Action to execute:", computerCall.action);
 *   // Execute the action manually, then send back a screenshot
 * }
 * ```
 *
 * @example
 * ```typescript
 * // For macOS desktop automation with Docker
 * const computer = tools.computerUse({
 *   displayWidth: 1920,
 *   displayHeight: 1080,
 *   environment: "mac",
 *   execute: async (action) => {
 *     if (action.type === "click") {
 *       await dockerExec(
 *         `DISPLAY=:99 xdotool mousemove ${action.x} ${action.y} click 1`,
 *         containerName
 *       );
 *     }
 *     // Capture screenshot from container
 *     return await getDockerScreenshot(containerName);
 *   },
 * });
 * ```
 *
 * @remarks
 * - Only available through the Responses API (not Chat Completions)
 * - Requires `computer-use-preview` model
 * - Actions include: click, double_click, drag, keypress, move, screenshot, scroll, type, wait
 * - Safety checks may be returned that require acknowledgment before proceeding
 * - Use `truncation: "auto"` parameter when making requests
 * - Recommended to use with `reasoning.summary` for debugging
 */
declare function computerUse(options: ComputerUseOptions): DynamicStructuredTool<z.ZodObject<{
  action: z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodLiteral<"screenshot">;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"click">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    button: z.ZodDefault<z.ZodEnum<{
      back: "back";
      forward: "forward";
      left: "left";
      right: "right";
      wheel: "wheel";
    }>>;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"double_click">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    button: z.ZodDefault<z.ZodEnum<{
      back: "back";
      forward: "forward";
      left: "left";
      right: "right";
      wheel: "wheel";
    }>>;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"drag">;
    path: z.ZodArray<z.ZodObject<{
      x: z.ZodNumber;
      y: z.ZodNumber;
    }, z.core.$strip>>;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"keypress">;
    keys: z.ZodArray<z.ZodString>;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"move">;
    x: z.ZodNumber;
    y: z.ZodNumber;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"scroll">;
    x: z.ZodNumber;
    y: z.ZodNumber;
    scroll_x: z.ZodNumber;
    scroll_y: z.ZodNumber;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"type">;
    text: z.ZodString;
  }, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"wait">;
    duration: z.ZodOptional<z.ZodNumber>;
  }, z.core.$strip>]>;
}, z.core.$strip>, ComputerUseInput, unknown, ComputerUseReturnType, string>;
//#endregion
export { ComputerUseAction, ComputerUseClickAction, ComputerUseDoubleClickAction, ComputerUseDragAction, ComputerUseEnvironment, ComputerUseInput, ComputerUseKeypressAction, ComputerUseMoveAction, ComputerUseOptions, ComputerUseScreenshotAction, ComputerUseScrollAction, ComputerUseTool, ComputerUseTypeAction, ComputerUseWaitAction, computerUse };
//# sourceMappingURL=computerUse.d.ts.map