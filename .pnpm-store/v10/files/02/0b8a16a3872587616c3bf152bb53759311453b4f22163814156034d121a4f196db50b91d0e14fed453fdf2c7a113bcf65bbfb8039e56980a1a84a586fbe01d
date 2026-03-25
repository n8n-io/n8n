"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var commands_exports = {};
__export(commands_exports, {
  commands: () => commands
});
module.exports = __toCommonJS(commands_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_command = require("./command");
const click = (0, import_command.declareCommand)({
  name: "click",
  description: "Perform click on a web page",
  args: import_mcpBundle.z.object({
    ref: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot")
  }),
  options: import_mcpBundle.z.object({
    button: import_mcpBundle.z.string().optional().describe("Button to click, defaults to left"),
    modifiers: import_mcpBundle.z.array(import_mcpBundle.z.string()).optional().describe("Modifier keys to press")
  }),
  toolName: "browser_click",
  toolParams: ({ ref }, { button, modifiers }) => ({ ref, button, modifiers })
});
const doubleClick = (0, import_command.declareCommand)({
  name: "dblclick",
  description: "Perform double click on a web page",
  args: import_mcpBundle.z.object({
    ref: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot")
  }),
  options: import_mcpBundle.z.object({
    button: import_mcpBundle.z.string().optional().describe("Button to click, defaults to left"),
    modifiers: import_mcpBundle.z.array(import_mcpBundle.z.string()).optional().describe("Modifier keys to press")
  }),
  toolName: "browser_click",
  toolParams: ({ ref }, { button, modifiers }) => ({ ref, button, modifiers, doubleClick: true })
});
const close = (0, import_command.declareCommand)({
  name: "close",
  description: "Close the page",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_close",
  toolParams: () => ({})
});
const consoleMessages = (0, import_command.declareCommand)({
  name: "console",
  description: "Returns all console messages",
  args: import_mcpBundle.z.object({
    level: import_mcpBundle.z.string().optional().describe('Level of the console messages to return. Each level includes the messages of more severe levels. Defaults to "info".')
  }),
  toolName: "browser_console_messages",
  toolParams: ({ level }) => ({ level })
});
const drag = (0, import_command.declareCommand)({
  name: "drag",
  description: "Perform drag and drop between two elements",
  args: import_mcpBundle.z.object({
    startRef: import_mcpBundle.z.string().describe("Exact source element reference from the page snapshot"),
    endRef: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot")
  }),
  options: import_mcpBundle.z.object({
    headed: import_mcpBundle.z.boolean().default(false).describe("Run browser in headed mode")
  }),
  toolName: "browser_drag",
  toolParams: ({ startRef, endRef }) => ({ startRef, endRef })
});
const evaluate = (0, import_command.declareCommand)({
  name: "evaluate",
  description: "Evaluate JavaScript expression on page or element",
  args: import_mcpBundle.z.object({
    function: import_mcpBundle.z.string().describe("() => { /* code */ } or (element) => { /* code */ } when element is provided"),
    ref: import_mcpBundle.z.string().optional().describe("Exact target element reference from the page snapshot")
  }),
  toolName: "browser_evaluate",
  toolParams: ({ function: fn, ref }) => ({ function: fn, ref })
});
const fileUpload = (0, import_command.declareCommand)({
  name: "upload-file",
  description: "Upload one or multiple files",
  args: import_mcpBundle.z.object({}),
  options: import_mcpBundle.z.object({
    paths: import_mcpBundle.z.array(import_mcpBundle.z.string()).optional().describe("The absolute paths to the files to upload. Can be single file or multiple files. If omitted, file chooser is cancelled.")
  }),
  toolName: "browser_file_upload",
  toolParams: (_, { paths }) => ({ paths })
});
const handleDialog = (0, import_command.declareCommand)({
  name: "handle-dialog",
  description: "Handle a dialog",
  args: import_mcpBundle.z.object({
    accept: import_mcpBundle.z.boolean().describe("Whether to accept the dialog."),
    promptText: import_mcpBundle.z.string().optional().describe("The text of the prompt in case of a prompt dialog.")
  }),
  toolName: "browser_handle_dialog",
  toolParams: ({ accept, promptText }) => ({ accept, promptText })
});
const hover = (0, import_command.declareCommand)({
  name: "hover",
  description: "Hover over element on page",
  args: import_mcpBundle.z.object({
    ref: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot")
  }),
  toolName: "browser_hover",
  toolParams: ({ ref }) => ({ ref })
});
const open = (0, import_command.declareCommand)({
  name: "open",
  description: "Open URL",
  args: import_mcpBundle.z.object({
    url: import_mcpBundle.z.string().describe("The URL to navigate to")
  }),
  options: import_mcpBundle.z.object({
    headed: import_mcpBundle.z.boolean().default(false).describe("Run browser in headed mode")
  }),
  toolName: "browser_open",
  toolParams: ({ url }, { headed }) => ({ url, headed })
});
const navigateBack = (0, import_command.declareCommand)({
  name: "go-back",
  description: "Go back to the previous page",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_navigate_back",
  toolParams: () => ({})
});
const networkRequests = (0, import_command.declareCommand)({
  name: "network-requests",
  description: "Returns all network requests since loading the page",
  args: import_mcpBundle.z.object({}),
  options: import_mcpBundle.z.object({
    includeStatic: import_mcpBundle.z.boolean().optional().describe("Whether to include successful static resources like images, fonts, scripts, etc. Defaults to false.")
  }),
  toolName: "browser_network_requests",
  toolParams: (_, { includeStatic }) => ({ includeStatic })
});
const pressKey = (0, import_command.declareCommand)({
  name: "press",
  description: "Press a key on the keyboard",
  args: import_mcpBundle.z.object({
    key: import_mcpBundle.z.string().describe("Name of the key to press or a character to generate, such as `ArrowLeft` or `a`")
  }),
  toolName: "browser_press_key",
  toolParams: ({ key }) => ({ key })
});
const resize = (0, import_command.declareCommand)({
  name: "resize",
  description: "Resize the browser window",
  args: import_mcpBundle.z.object({
    width: import_mcpBundle.z.number().describe("Width of the browser window"),
    height: import_mcpBundle.z.number().describe("Height of the browser window")
  }),
  toolName: "browser_resize",
  toolParams: ({ width, height }) => ({ width, height })
});
const runCode = (0, import_command.declareCommand)({
  name: "run-code",
  description: "Run Playwright code snippet",
  args: import_mcpBundle.z.object({
    code: import_mcpBundle.z.string().describe("A JavaScript function containing Playwright code to execute. It will be invoked with a single argument, page, which you can use for any page interaction.")
  }),
  toolName: "browser_run_code",
  toolParams: ({ code }) => ({ code })
});
const selectOption = (0, import_command.declareCommand)({
  name: "select-option",
  description: "Select an option in a dropdown",
  args: import_mcpBundle.z.object({
    ref: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot"),
    values: import_mcpBundle.z.array(import_mcpBundle.z.string()).describe("Array of values to select in the dropdown. This can be a single value or multiple values.")
  }),
  toolName: "browser_select_option",
  toolParams: ({ ref, values }) => ({ ref, values })
});
const snapshot = (0, import_command.declareCommand)({
  name: "snapshot",
  description: "Capture accessibility snapshot of the current page, this is better than screenshot",
  args: import_mcpBundle.z.object({}),
  options: import_mcpBundle.z.object({
    filename: import_mcpBundle.z.string().optional().describe("Save snapshot to markdown file instead of returning it in the response.")
  }),
  toolName: "browser_snapshot",
  toolParams: (_, { filename }) => ({ filename })
});
const screenshot = (0, import_command.declareCommand)({
  name: "screenshot",
  description: "Take a screenshot of the current page. You can't perform actions based on the screenshot, use browser_snapshot for actions.",
  args: import_mcpBundle.z.object({
    ref: import_mcpBundle.z.string().optional().describe("Exact target element reference from the page snapshot.")
  }),
  options: import_mcpBundle.z.object({
    filename: import_mcpBundle.z.string().optional().describe("File name to save the screenshot to. Defaults to `page-{timestamp}.{png|jpeg}` if not specified."),
    fullPage: import_mcpBundle.z.boolean().optional().describe("When true, takes a screenshot of the full scrollable page, instead of the currently visible viewport.")
  }),
  toolName: "browser_take_screenshot",
  toolParams: ({ ref }, { filename, fullPage }) => ({ filename, ref, fullPage })
});
const type = (0, import_command.declareCommand)({
  name: "type",
  description: "Type text into editable element",
  args: import_mcpBundle.z.object({
    text: import_mcpBundle.z.string().describe("Text to type into the element")
  }),
  options: import_mcpBundle.z.object({
    submit: import_mcpBundle.z.boolean().optional().describe("Whether to submit entered text (press Enter after)")
  }),
  toolName: "browser_press_sequentially",
  toolParams: ({ text }, { submit }) => ({ text, submit })
});
const waitFor = (0, import_command.declareCommand)({
  name: "wait-for",
  description: "Wait for text to appear or disappear or a specified time to pass",
  args: import_mcpBundle.z.object({}),
  options: import_mcpBundle.z.object({
    time: import_mcpBundle.z.number().optional().describe("The time to wait in seconds"),
    text: import_mcpBundle.z.string().optional().describe("The text to wait for"),
    textGone: import_mcpBundle.z.string().optional().describe("The text to wait for to disappear")
  }),
  toolName: "browser_wait_for",
  toolParams: (_, { time, text, textGone }) => ({ time, text, textGone })
});
const tab = (0, import_command.declareCommand)({
  name: "tab",
  description: "Close a browser tab",
  args: import_mcpBundle.z.object({
    action: import_mcpBundle.z.string().describe(`Action to perform on tabs, 'list' | 'new' | 'close' | 'select'`),
    index: import_mcpBundle.z.number().optional().describe("Tab index. If omitted, current tab is closed.")
  }),
  toolName: "browser_tabs",
  toolParams: ({ action, index }) => ({ action, index })
});
const mouseClickXy = (0, import_command.declareCommand)({
  name: "mouse-click-xy",
  description: "Click left mouse button at a given position",
  args: import_mcpBundle.z.object({
    x: import_mcpBundle.z.number().describe("X coordinate"),
    y: import_mcpBundle.z.number().describe("Y coordinate")
  }),
  toolName: "browser_mouse_click_xy",
  toolParams: ({ x, y }) => ({ x, y })
});
const mouseDragXy = (0, import_command.declareCommand)({
  name: "mouse-drag-xy",
  description: "Drag left mouse button to a given position",
  args: import_mcpBundle.z.object({
    startX: import_mcpBundle.z.number().describe("Start X coordinate"),
    startY: import_mcpBundle.z.number().describe("Start Y coordinate"),
    endX: import_mcpBundle.z.number().describe("End X coordinate"),
    endY: import_mcpBundle.z.number().describe("End Y coordinate")
  }),
  toolName: "browser_mouse_drag_xy",
  toolParams: ({ startX, startY, endX, endY }) => ({ startX, startY, endX, endY })
});
const mouseMoveXy = (0, import_command.declareCommand)({
  name: "mouse-move-xy",
  description: "Move mouse to a given position",
  args: import_mcpBundle.z.object({
    x: import_mcpBundle.z.number().describe("X coordinate"),
    y: import_mcpBundle.z.number().describe("Y coordinate")
  }),
  toolName: "browser_mouse_move_xy",
  toolParams: ({ x, y }) => ({ x, y })
});
const pdfSave = (0, import_command.declareCommand)({
  name: "pdf-save",
  description: "Save page as PDF",
  args: import_mcpBundle.z.object({}),
  options: import_mcpBundle.z.object({
    filename: import_mcpBundle.z.string().optional().describe("File name to save the pdf to. Defaults to `page-{timestamp}.pdf` if not specified.")
  }),
  toolName: "browser_pdf_save",
  toolParams: (_, { filename }) => ({ filename })
});
const startTracing = (0, import_command.declareCommand)({
  name: "start-tracing",
  description: "Start trace recording",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_start_tracing",
  toolParams: () => ({})
});
const stopTracing = (0, import_command.declareCommand)({
  name: "stop-tracing",
  description: "Stop trace recording",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_stop_tracing",
  toolParams: () => ({})
});
const commandsArray = [
  click,
  close,
  doubleClick,
  consoleMessages,
  drag,
  evaluate,
  fileUpload,
  handleDialog,
  hover,
  open,
  navigateBack,
  networkRequests,
  pressKey,
  resize,
  runCode,
  selectOption,
  snapshot,
  screenshot,
  type,
  waitFor,
  tab,
  mouseClickXy,
  mouseDragXy,
  mouseMoveXy,
  pdfSave,
  startTracing,
  stopTracing
];
const commands = Object.fromEntries(commandsArray.map((cmd) => [cmd.name, cmd]));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  commands
});
