import { ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod/v4";

//#region src/tools/computerUse.ts
const ComputerUseScreenshotActionSchema = z.object({ type: z.literal("screenshot") });
const ComputerUseClickActionSchema = z.object({
	type: z.literal("click"),
	x: z.number(),
	y: z.number(),
	button: z.enum([
		"left",
		"right",
		"wheel",
		"back",
		"forward"
	]).default("left")
});
const ComputerUseDoubleClickActionSchema = z.object({
	type: z.literal("double_click"),
	x: z.number(),
	y: z.number(),
	button: z.enum([
		"left",
		"right",
		"wheel",
		"back",
		"forward"
	]).default("left")
});
const ComputerUseDragActionSchema = z.object({
	type: z.literal("drag"),
	path: z.array(z.object({
		x: z.number(),
		y: z.number()
	}))
});
const ComputerUseKeypressActionSchema = z.object({
	type: z.literal("keypress"),
	keys: z.array(z.string())
});
const ComputerUseMoveActionSchema = z.object({
	type: z.literal("move"),
	x: z.number(),
	y: z.number()
});
const ComputerUseScrollActionSchema = z.object({
	type: z.literal("scroll"),
	x: z.number(),
	y: z.number(),
	scroll_x: z.number(),
	scroll_y: z.number()
});
const ComputerUseTypeActionSchema = z.object({
	type: z.literal("type"),
	text: z.string()
});
const ComputerUseWaitActionSchema = z.object({
	type: z.literal("wait"),
	duration: z.number().optional()
});
const ComputerUseActionUnionSchema = z.union([
	ComputerUseScreenshotActionSchema,
	ComputerUseClickActionSchema,
	ComputerUseDoubleClickActionSchema,
	ComputerUseDragActionSchema,
	ComputerUseKeypressActionSchema,
	ComputerUseMoveActionSchema,
	ComputerUseScrollActionSchema,
	ComputerUseTypeActionSchema,
	ComputerUseWaitActionSchema
]);
const ComputerUseActionSchema = z.object({ action: ComputerUseActionUnionSchema });
const TOOL_NAME = "computer_use";
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
function computerUse(options) {
	const computerTool = tool(async (input, runtime) => {
		/**
		* get computer_use call id from runtime
		*/
		const aiMessage = runtime.state?.messages.at(-1);
		const computerToolCall = aiMessage?.tool_calls?.find((tc) => tc.name === "computer_use");
		const computerToolCallId = computerToolCall?.id;
		if (!computerToolCallId) throw new Error("Computer use call id not found");
		const result = await options.execute(input.action, runtime);
		/**
		* make sure {@link ToolMessage} is returned with the correct additional kwargs
		*/
		if (typeof result === "string") return new ToolMessage({
			content: result,
			tool_call_id: computerToolCallId,
			additional_kwargs: { type: "computer_call_output" }
		});
		/**
		* make sure {@link ToolMessage} is returned with the correct additional kwargs
		*/
		return new ToolMessage({
			...result,
			tool_call_id: computerToolCallId,
			additional_kwargs: {
				type: "computer_call_output",
				...result.additional_kwargs
			}
		});
	}, {
		name: TOOL_NAME,
		description: "Control a computer interface by executing mouse clicks, keyboard input, scrolling, and other actions.",
		schema: ComputerUseActionSchema
	});
	computerTool.extras = {
		...computerTool.extras ?? {},
		providerToolDefinition: {
			type: "computer_use_preview",
			display_width: options.displayWidth,
			display_height: options.displayHeight,
			environment: options.environment
		}
	};
	/**
	* return as typed {@link DynamicStructuredTool} so we don't get any type
	* errors like "can't export tool without reference"
	*/
	return computerTool;
}

//#endregion
export { computerUse };
//# sourceMappingURL=computerUse.js.map