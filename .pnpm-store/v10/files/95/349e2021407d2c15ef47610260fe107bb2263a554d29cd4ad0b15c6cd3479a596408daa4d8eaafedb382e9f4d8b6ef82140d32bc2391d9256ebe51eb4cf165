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
const numberArg = import_mcpBundle.z.preprocess((val, ctx) => {
  const number = Number(val);
  if (Number.isNaN(number)) {
    ctx.issues.push({
      code: "custom",
      message: `expected number, received '${val}'`,
      input: val
    });
  }
  return number;
}, import_mcpBundle.z.number());
const open = (0, import_command.declareCommand)({
  name: "open",
  description: "Open the browser",
  category: "core",
  args: import_mcpBundle.z.object({
    url: import_mcpBundle.z.string().optional().describe("The URL to navigate to")
  }),
  options: import_mcpBundle.z.object({
    browser: import_mcpBundle.z.string().optional().describe("Browser or chrome channel to use, possible values: chrome, firefox, webkit, msedge."),
    config: import_mcpBundle.z.string().optional().describe("Path to the configuration file, defaults to .playwright/cli.config.json"),
    extension: import_mcpBundle.z.boolean().optional().describe("Connect to browser extension"),
    headed: import_mcpBundle.z.boolean().optional().describe("Run browser in headed mode"),
    persistent: import_mcpBundle.z.boolean().optional().describe("Use persistent browser profile"),
    profile: import_mcpBundle.z.string().optional().describe("Use persistent browser profile, store profile in specified directory.")
  }),
  toolName: "browser_navigate",
  toolParams: ({ url }) => ({ url: url || "about:blank" })
});
const close = (0, import_command.declareCommand)({
  name: "close",
  description: "Close the browser",
  category: "core",
  args: import_mcpBundle.z.object({}),
  toolName: "",
  toolParams: () => ({})
});
const goto = (0, import_command.declareCommand)({
  name: "goto",
  description: "Navigate to a URL",
  category: "core",
  args: import_mcpBundle.z.object({
    url: import_mcpBundle.z.string().describe("The URL to navigate to")
  }),
  toolName: "browser_navigate",
  toolParams: ({ url }) => ({ url })
});
const goBack = (0, import_command.declareCommand)({
  name: "go-back",
  description: "Go back to the previous page",
  category: "navigation",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_navigate_back",
  toolParams: () => ({})
});
const goForward = (0, import_command.declareCommand)({
  name: "go-forward",
  description: "Go forward to the next page",
  category: "navigation",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_navigate_forward",
  toolParams: () => ({})
});
const reload = (0, import_command.declareCommand)({
  name: "reload",
  description: "Reload the current page",
  category: "navigation",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_reload",
  toolParams: () => ({})
});
const pressKey = (0, import_command.declareCommand)({
  name: "press",
  description: "Press a key on the keyboard, `a`, `ArrowLeft`",
  category: "keyboard",
  args: import_mcpBundle.z.object({
    key: import_mcpBundle.z.string().describe("Name of the key to press or a character to generate, such as `ArrowLeft` or `a`")
  }),
  toolName: "browser_press_key",
  toolParams: ({ key }) => ({ key })
});
const type = (0, import_command.declareCommand)({
  name: "type",
  description: "Type text into editable element",
  category: "core",
  args: import_mcpBundle.z.object({
    text: import_mcpBundle.z.string().describe("Text to type into the element")
  }),
  options: import_mcpBundle.z.object({
    submit: import_mcpBundle.z.boolean().optional().describe("Whether to submit entered text (press Enter after)")
  }),
  toolName: "browser_press_sequentially",
  toolParams: ({ text, submit }) => ({ text, submit })
});
const keydown = (0, import_command.declareCommand)({
  name: "keydown",
  description: "Press a key down on the keyboard",
  category: "keyboard",
  args: import_mcpBundle.z.object({
    key: import_mcpBundle.z.string().describe("Name of the key to press or a character to generate, such as `ArrowLeft` or `a`")
  }),
  toolName: "browser_keydown",
  toolParams: ({ key }) => ({ key })
});
const keyup = (0, import_command.declareCommand)({
  name: "keyup",
  description: "Press a key up on the keyboard",
  category: "keyboard",
  args: import_mcpBundle.z.object({
    key: import_mcpBundle.z.string().describe("Name of the key to press or a character to generate, such as `ArrowLeft` or `a`")
  }),
  toolName: "browser_keyup",
  toolParams: ({ key }) => ({ key })
});
const mouseMove = (0, import_command.declareCommand)({
  name: "mousemove",
  description: "Move mouse to a given position",
  category: "mouse",
  args: import_mcpBundle.z.object({
    x: numberArg.describe("X coordinate"),
    y: numberArg.describe("Y coordinate")
  }),
  toolName: "browser_mouse_move_xy",
  toolParams: ({ x, y }) => ({ x, y })
});
const mouseDown = (0, import_command.declareCommand)({
  name: "mousedown",
  description: "Press mouse down",
  category: "mouse",
  args: import_mcpBundle.z.object({
    button: import_mcpBundle.z.string().optional().describe("Button to press, defaults to left")
  }),
  toolName: "browser_mouse_down",
  toolParams: ({ button }) => ({ button })
});
const mouseUp = (0, import_command.declareCommand)({
  name: "mouseup",
  description: "Press mouse up",
  category: "mouse",
  args: import_mcpBundle.z.object({
    button: import_mcpBundle.z.string().optional().describe("Button to press, defaults to left")
  }),
  toolName: "browser_mouse_up",
  toolParams: ({ button }) => ({ button })
});
const mouseWheel = (0, import_command.declareCommand)({
  name: "mousewheel",
  description: "Scroll mouse wheel",
  category: "mouse",
  args: import_mcpBundle.z.object({
    dx: numberArg.describe("Y delta"),
    dy: numberArg.describe("X delta")
  }),
  toolName: "browser_mouse_wheel",
  toolParams: ({ dx: deltaY, dy: deltaX }) => ({ deltaY, deltaX })
});
const click = (0, import_command.declareCommand)({
  name: "click",
  description: "Perform click on a web page",
  category: "core",
  args: import_mcpBundle.z.object({
    ref: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot"),
    button: import_mcpBundle.z.string().optional().describe("Button to click, defaults to left")
  }),
  options: import_mcpBundle.z.object({
    modifiers: import_mcpBundle.z.array(import_mcpBundle.z.string()).optional().describe("Modifier keys to press")
  }),
  toolName: "browser_click",
  toolParams: ({ ref, button, modifiers }) => ({ ref, button, modifiers })
});
const doubleClick = (0, import_command.declareCommand)({
  name: "dblclick",
  description: "Perform double click on a web page",
  category: "core",
  args: import_mcpBundle.z.object({
    ref: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot"),
    button: import_mcpBundle.z.string().optional().describe("Button to click, defaults to left")
  }),
  options: import_mcpBundle.z.object({
    modifiers: import_mcpBundle.z.array(import_mcpBundle.z.string()).optional().describe("Modifier keys to press")
  }),
  toolName: "browser_click",
  toolParams: ({ ref, button, modifiers }) => ({ ref, button, modifiers, doubleClick: true })
});
const drag = (0, import_command.declareCommand)({
  name: "drag",
  description: "Perform drag and drop between two elements",
  category: "core",
  args: import_mcpBundle.z.object({
    startRef: import_mcpBundle.z.string().describe("Exact source element reference from the page snapshot"),
    endRef: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot")
  }),
  toolName: "browser_drag",
  toolParams: ({ startRef, endRef }) => ({ startRef, endRef })
});
const fill = (0, import_command.declareCommand)({
  name: "fill",
  description: "Fill text into editable element",
  category: "core",
  args: import_mcpBundle.z.object({
    ref: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot"),
    text: import_mcpBundle.z.string().describe("Text to fill into the element")
  }),
  options: import_mcpBundle.z.object({
    submit: import_mcpBundle.z.boolean().optional().describe("Whether to submit entered text (press Enter after)")
  }),
  toolName: "browser_type",
  toolParams: ({ ref, text, submit }) => ({ ref, text, submit })
});
const hover = (0, import_command.declareCommand)({
  name: "hover",
  description: "Hover over element on page",
  category: "core",
  args: import_mcpBundle.z.object({
    ref: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot")
  }),
  toolName: "browser_hover",
  toolParams: ({ ref }) => ({ ref })
});
const select = (0, import_command.declareCommand)({
  name: "select",
  description: "Select an option in a dropdown",
  category: "core",
  args: import_mcpBundle.z.object({
    ref: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot"),
    val: import_mcpBundle.z.string().describe("Value to select in the dropdown")
  }),
  toolName: "browser_select_option",
  toolParams: ({ ref, val: value }) => ({ ref, values: [value] })
});
const fileUpload = (0, import_command.declareCommand)({
  name: "upload",
  description: "Upload one or multiple files",
  category: "core",
  args: import_mcpBundle.z.object({
    file: import_mcpBundle.z.string().describe("The absolute paths to the files to upload")
  }),
  toolName: "browser_file_upload",
  toolParams: ({ file }) => ({ paths: [file] })
});
const check = (0, import_command.declareCommand)({
  name: "check",
  description: "Check a checkbox or radio button",
  category: "core",
  args: import_mcpBundle.z.object({
    ref: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot")
  }),
  toolName: "browser_check",
  toolParams: ({ ref }) => ({ ref })
});
const uncheck = (0, import_command.declareCommand)({
  name: "uncheck",
  description: "Uncheck a checkbox or radio button",
  category: "core",
  args: import_mcpBundle.z.object({
    ref: import_mcpBundle.z.string().describe("Exact target element reference from the page snapshot")
  }),
  toolName: "browser_uncheck",
  toolParams: ({ ref }) => ({ ref })
});
const snapshot = (0, import_command.declareCommand)({
  name: "snapshot",
  description: "Capture page snapshot to obtain element ref",
  category: "core",
  args: import_mcpBundle.z.object({}),
  options: import_mcpBundle.z.object({
    filename: import_mcpBundle.z.string().optional().describe("Save snapshot to markdown file instead of returning it in the response.")
  }),
  toolName: "browser_snapshot",
  toolParams: ({ filename }) => ({ filename })
});
const evaluate = (0, import_command.declareCommand)({
  name: "eval",
  description: "Evaluate JavaScript expression on page or element",
  category: "core",
  args: import_mcpBundle.z.object({
    func: import_mcpBundle.z.string().describe("() => { /* code */ } or (element) => { /* code */ } when element is provided"),
    ref: import_mcpBundle.z.string().optional().describe("Exact target element reference from the page snapshot")
  }),
  toolName: "browser_evaluate",
  toolParams: ({ func, ref }) => ({ function: func, ref })
});
const dialogAccept = (0, import_command.declareCommand)({
  name: "dialog-accept",
  description: "Accept a dialog",
  category: "core",
  args: import_mcpBundle.z.object({
    prompt: import_mcpBundle.z.string().optional().describe("The text of the prompt in case of a prompt dialog.")
  }),
  toolName: "browser_handle_dialog",
  toolParams: ({ prompt: promptText }) => ({ accept: true, promptText })
});
const dialogDismiss = (0, import_command.declareCommand)({
  name: "dialog-dismiss",
  description: "Dismiss a dialog",
  category: "core",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_handle_dialog",
  toolParams: () => ({ accept: false })
});
const resize = (0, import_command.declareCommand)({
  name: "resize",
  description: "Resize the browser window",
  category: "core",
  args: import_mcpBundle.z.object({
    w: numberArg.describe("Width of the browser window"),
    h: numberArg.describe("Height of the browser window")
  }),
  toolName: "browser_resize",
  toolParams: ({ w: width, h: height }) => ({ width, height })
});
const runCode = (0, import_command.declareCommand)({
  name: "run-code",
  description: "Run Playwright code snippet",
  category: "devtools",
  args: import_mcpBundle.z.object({
    code: import_mcpBundle.z.string().describe("A JavaScript function containing Playwright code to execute. It will be invoked with a single argument, page, which you can use for any page interaction.")
  }),
  toolName: "browser_run_code",
  toolParams: ({ code }) => ({ code })
});
const tabList = (0, import_command.declareCommand)({
  name: "tab-list",
  description: "List all tabs",
  category: "tabs",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_tabs",
  toolParams: () => ({ action: "list" })
});
const tabNew = (0, import_command.declareCommand)({
  name: "tab-new",
  description: "Create a new tab",
  category: "tabs",
  args: import_mcpBundle.z.object({
    url: import_mcpBundle.z.string().optional().describe("The URL to navigate to in the new tab. If omitted, the new tab will be blank.")
  }),
  toolName: "browser_tabs",
  toolParams: ({ url }) => ({ action: "new", url })
});
const tabClose = (0, import_command.declareCommand)({
  name: "tab-close",
  description: "Close a browser tab",
  category: "tabs",
  args: import_mcpBundle.z.object({
    index: numberArg.optional().describe("Tab index. If omitted, current tab is closed.")
  }),
  toolName: "browser_tabs",
  toolParams: ({ index }) => ({ action: "close", index })
});
const tabSelect = (0, import_command.declareCommand)({
  name: "tab-select",
  description: "Select a browser tab",
  category: "tabs",
  args: import_mcpBundle.z.object({
    index: numberArg.describe("Tab index")
  }),
  toolName: "browser_tabs",
  toolParams: ({ index }) => ({ action: "select", index })
});
const stateLoad = (0, import_command.declareCommand)({
  name: "state-load",
  description: "Loads browser storage (authentication) state from a file",
  category: "storage",
  args: import_mcpBundle.z.object({
    filename: import_mcpBundle.z.string().describe("File name to load the storage state from.")
  }),
  toolName: "browser_set_storage_state",
  toolParams: ({ filename }) => ({ filename })
});
const stateSave = (0, import_command.declareCommand)({
  name: "state-save",
  description: "Saves the current storage (authentication) state to a file",
  category: "storage",
  args: import_mcpBundle.z.object({
    filename: import_mcpBundle.z.string().optional().describe("File name to save the storage state to.")
  }),
  toolName: "browser_storage_state",
  toolParams: ({ filename }) => ({ filename })
});
const cookieList = (0, import_command.declareCommand)({
  name: "cookie-list",
  description: "List all cookies (optionally filtered by domain/path)",
  category: "storage",
  args: import_mcpBundle.z.object({}),
  options: import_mcpBundle.z.object({
    domain: import_mcpBundle.z.string().optional().describe("Filter cookies by domain"),
    path: import_mcpBundle.z.string().optional().describe("Filter cookies by path")
  }),
  toolName: "browser_cookie_list",
  toolParams: ({ domain, path }) => ({ domain, path })
});
const cookieGet = (0, import_command.declareCommand)({
  name: "cookie-get",
  description: "Get a specific cookie by name",
  category: "storage",
  args: import_mcpBundle.z.object({
    name: import_mcpBundle.z.string().describe("Cookie name")
  }),
  toolName: "browser_cookie_get",
  toolParams: ({ name }) => ({ name })
});
const cookieSet = (0, import_command.declareCommand)({
  name: "cookie-set",
  description: "Set a cookie with optional flags",
  category: "storage",
  args: import_mcpBundle.z.object({
    name: import_mcpBundle.z.string().describe("Cookie name"),
    value: import_mcpBundle.z.string().describe("Cookie value")
  }),
  options: import_mcpBundle.z.object({
    domain: import_mcpBundle.z.string().optional().describe("Cookie domain"),
    path: import_mcpBundle.z.string().optional().describe("Cookie path"),
    expires: numberArg.optional().describe("Cookie expiration as Unix timestamp"),
    httpOnly: import_mcpBundle.z.boolean().optional().describe("Whether the cookie is HTTP only"),
    secure: import_mcpBundle.z.boolean().optional().describe("Whether the cookie is secure"),
    sameSite: import_mcpBundle.z.enum(["Strict", "Lax", "None"]).optional().describe("Cookie SameSite attribute")
  }),
  toolName: "browser_cookie_set",
  toolParams: ({ name, value, domain, path, expires, httpOnly, secure, sameSite }) => ({ name, value, domain, path, expires, httpOnly, secure, sameSite })
});
const cookieDelete = (0, import_command.declareCommand)({
  name: "cookie-delete",
  description: "Delete a specific cookie",
  category: "storage",
  args: import_mcpBundle.z.object({
    name: import_mcpBundle.z.string().describe("Cookie name")
  }),
  toolName: "browser_cookie_delete",
  toolParams: ({ name }) => ({ name })
});
const cookieClear = (0, import_command.declareCommand)({
  name: "cookie-clear",
  description: "Clear all cookies",
  category: "storage",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_cookie_clear",
  toolParams: () => ({})
});
const localStorageList = (0, import_command.declareCommand)({
  name: "localstorage-list",
  description: "List all localStorage key-value pairs",
  category: "storage",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_localstorage_list",
  toolParams: () => ({})
});
const localStorageGet = (0, import_command.declareCommand)({
  name: "localstorage-get",
  description: "Get a localStorage item by key",
  category: "storage",
  args: import_mcpBundle.z.object({
    key: import_mcpBundle.z.string().describe("Key to get")
  }),
  toolName: "browser_localstorage_get",
  toolParams: ({ key }) => ({ key })
});
const localStorageSet = (0, import_command.declareCommand)({
  name: "localstorage-set",
  description: "Set a localStorage item",
  category: "storage",
  args: import_mcpBundle.z.object({
    key: import_mcpBundle.z.string().describe("Key to set"),
    value: import_mcpBundle.z.string().describe("Value to set")
  }),
  toolName: "browser_localstorage_set",
  toolParams: ({ key, value }) => ({ key, value })
});
const localStorageDelete = (0, import_command.declareCommand)({
  name: "localstorage-delete",
  description: "Delete a localStorage item",
  category: "storage",
  args: import_mcpBundle.z.object({
    key: import_mcpBundle.z.string().describe("Key to delete")
  }),
  toolName: "browser_localstorage_delete",
  toolParams: ({ key }) => ({ key })
});
const localStorageClear = (0, import_command.declareCommand)({
  name: "localstorage-clear",
  description: "Clear all localStorage",
  category: "storage",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_localstorage_clear",
  toolParams: () => ({})
});
const sessionStorageList = (0, import_command.declareCommand)({
  name: "sessionstorage-list",
  description: "List all sessionStorage key-value pairs",
  category: "storage",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_sessionstorage_list",
  toolParams: () => ({})
});
const sessionStorageGet = (0, import_command.declareCommand)({
  name: "sessionstorage-get",
  description: "Get a sessionStorage item by key",
  category: "storage",
  args: import_mcpBundle.z.object({
    key: import_mcpBundle.z.string().describe("Key to get")
  }),
  toolName: "browser_sessionstorage_get",
  toolParams: ({ key }) => ({ key })
});
const sessionStorageSet = (0, import_command.declareCommand)({
  name: "sessionstorage-set",
  description: "Set a sessionStorage item",
  category: "storage",
  args: import_mcpBundle.z.object({
    key: import_mcpBundle.z.string().describe("Key to set"),
    value: import_mcpBundle.z.string().describe("Value to set")
  }),
  toolName: "browser_sessionstorage_set",
  toolParams: ({ key, value }) => ({ key, value })
});
const sessionStorageDelete = (0, import_command.declareCommand)({
  name: "sessionstorage-delete",
  description: "Delete a sessionStorage item",
  category: "storage",
  args: import_mcpBundle.z.object({
    key: import_mcpBundle.z.string().describe("Key to delete")
  }),
  toolName: "browser_sessionstorage_delete",
  toolParams: ({ key }) => ({ key })
});
const sessionStorageClear = (0, import_command.declareCommand)({
  name: "sessionstorage-clear",
  description: "Clear all sessionStorage",
  category: "storage",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_sessionstorage_clear",
  toolParams: () => ({})
});
const routeMock = (0, import_command.declareCommand)({
  name: "route",
  description: "Mock network requests matching a URL pattern",
  category: "network",
  args: import_mcpBundle.z.object({
    pattern: import_mcpBundle.z.string().describe('URL pattern to match (e.g., "**/api/users")')
  }),
  options: import_mcpBundle.z.object({
    status: numberArg.optional().describe("HTTP status code (default: 200)"),
    body: import_mcpBundle.z.string().optional().describe("Response body (text or JSON string)"),
    ["content-type"]: import_mcpBundle.z.string().optional().describe("Content-Type header"),
    header: import_mcpBundle.z.union([import_mcpBundle.z.string(), import_mcpBundle.z.array(import_mcpBundle.z.string())]).optional().transform((v) => v ? Array.isArray(v) ? v : [v] : void 0).describe('Header to add in "Name: Value" format (repeatable)'),
    ["remove-header"]: import_mcpBundle.z.string().optional().describe("Comma-separated header names to remove")
  }),
  toolName: "browser_route",
  toolParams: ({ pattern, status, body, ["content-type"]: contentType, header: headers, ["remove-header"]: removeHeaders }) => ({
    pattern,
    status,
    body,
    contentType,
    headers,
    removeHeaders
  })
});
const routeList = (0, import_command.declareCommand)({
  name: "route-list",
  description: "List all active network routes",
  category: "network",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_route_list",
  toolParams: () => ({})
});
const unroute = (0, import_command.declareCommand)({
  name: "unroute",
  description: "Remove routes matching a pattern (or all routes)",
  category: "network",
  args: import_mcpBundle.z.object({
    pattern: import_mcpBundle.z.string().optional().describe("URL pattern to unroute (omit to remove all)")
  }),
  toolName: "browser_unroute",
  toolParams: ({ pattern }) => ({ pattern })
});
const screenshot = (0, import_command.declareCommand)({
  name: "screenshot",
  description: "screenshot of the current page or element",
  category: "export",
  args: import_mcpBundle.z.object({
    ref: import_mcpBundle.z.string().optional().describe("Exact target element reference from the page snapshot.")
  }),
  options: import_mcpBundle.z.object({
    filename: import_mcpBundle.z.string().optional().describe("File name to save the screenshot to. Defaults to `page-{timestamp}.{png|jpeg}` if not specified."),
    ["full-page"]: import_mcpBundle.z.boolean().optional().describe("When true, takes a screenshot of the full scrollable page, instead of the currently visible viewport.")
  }),
  toolName: "browser_take_screenshot",
  toolParams: ({ ref, filename, ["full-page"]: fullPage }) => ({ filename, ref, fullPage })
});
const pdfSave = (0, import_command.declareCommand)({
  name: "pdf",
  description: "Save page as PDF",
  category: "export",
  args: import_mcpBundle.z.object({}),
  options: import_mcpBundle.z.object({
    filename: import_mcpBundle.z.string().optional().describe("File name to save the pdf to. Defaults to `page-{timestamp}.pdf` if not specified.")
  }),
  toolName: "browser_pdf_save",
  toolParams: ({ filename }) => ({ filename })
});
const consoleList = (0, import_command.declareCommand)({
  name: "console",
  description: "List console messages",
  category: "devtools",
  args: import_mcpBundle.z.object({
    ["min-level"]: import_mcpBundle.z.string().optional().describe('Level of the console messages to return. Each level includes the messages of more severe levels. Defaults to "info".')
  }),
  options: import_mcpBundle.z.object({
    clear: import_mcpBundle.z.boolean().optional().describe("Whether to clear the console list")
  }),
  toolName: ({ clear }) => clear ? "browser_console_clear" : "browser_console_messages",
  toolParams: ({ ["min-level"]: level, clear }) => clear ? {} : { level }
});
const networkRequests = (0, import_command.declareCommand)({
  name: "network",
  description: "List all network requests since loading the page",
  category: "devtools",
  args: import_mcpBundle.z.object({}),
  options: import_mcpBundle.z.object({
    static: import_mcpBundle.z.boolean().optional().describe("Whether to include successful static resources like images, fonts, scripts, etc. Defaults to false."),
    clear: import_mcpBundle.z.boolean().optional().describe("Whether to clear the network list")
  }),
  toolName: ({ clear }) => clear ? "browser_network_clear" : "browser_network_requests",
  toolParams: ({ static: includeStatic, clear }) => clear ? {} : { includeStatic }
});
const tracingStart = (0, import_command.declareCommand)({
  name: "tracing-start",
  description: "Start trace recording",
  category: "devtools",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_start_tracing",
  toolParams: () => ({})
});
const tracingStop = (0, import_command.declareCommand)({
  name: "tracing-stop",
  description: "Stop trace recording",
  category: "devtools",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_stop_tracing",
  toolParams: () => ({})
});
const videoStart = (0, import_command.declareCommand)({
  name: "video-start",
  description: "Start video recording",
  category: "devtools",
  args: import_mcpBundle.z.object({}),
  toolName: "browser_start_video",
  toolParams: () => ({})
});
const videoStop = (0, import_command.declareCommand)({
  name: "video-stop",
  description: "Stop video recording",
  category: "devtools",
  options: import_mcpBundle.z.object({
    filename: import_mcpBundle.z.string().optional().describe("Filename to save the video.")
  }),
  toolName: "browser_stop_video",
  toolParams: ({ filename }) => ({ filename })
});
const sessionList = (0, import_command.declareCommand)({
  name: "list",
  description: "List browser sessions",
  category: "browsers",
  args: import_mcpBundle.z.object({}),
  options: import_mcpBundle.z.object({
    all: import_mcpBundle.z.boolean().optional().describe("List all browser sessions across all workspaces")
  }),
  toolName: "",
  toolParams: () => ({})
});
const sessionCloseAll = (0, import_command.declareCommand)({
  name: "close-all",
  description: "Close all browser sessions",
  category: "browsers",
  toolName: "",
  toolParams: () => ({})
});
const killAll = (0, import_command.declareCommand)({
  name: "kill-all",
  description: "Forcefully kill all browser sessions (for stale/zombie processes)",
  category: "browsers",
  toolName: "",
  toolParams: () => ({})
});
const deleteData = (0, import_command.declareCommand)({
  name: "delete-data",
  description: "Delete session data",
  category: "core",
  toolName: "",
  toolParams: () => ({})
});
const configPrint = (0, import_command.declareCommand)({
  name: "config-print",
  description: "Print the final resolved config after merging CLI options, environment variables and config file.",
  category: "config",
  hidden: true,
  toolName: "browser_get_config",
  toolParams: () => ({})
});
const install = (0, import_command.declareCommand)({
  name: "install",
  description: "Initialize workspace",
  category: "install",
  args: import_mcpBundle.z.object({}),
  options: import_mcpBundle.z.object({
    skills: import_mcpBundle.z.boolean().optional().describe("Install skills for Claude / GitHub Copilot")
  }),
  toolName: "",
  toolParams: () => ({})
});
const installBrowser = (0, import_command.declareCommand)({
  name: "install-browser",
  description: "Install browser",
  category: "install",
  options: import_mcpBundle.z.object({
    browser: import_mcpBundle.z.string().optional().describe("Browser or chrome channel to use, possible values: chrome, firefox, webkit, msedge")
  }),
  toolName: "browser_install",
  toolParams: () => ({})
});
const commandsArray = [
  // core category
  open,
  close,
  goto,
  type,
  click,
  doubleClick,
  fill,
  drag,
  hover,
  select,
  fileUpload,
  check,
  uncheck,
  snapshot,
  evaluate,
  consoleList,
  dialogAccept,
  dialogDismiss,
  resize,
  runCode,
  deleteData,
  // navigation category
  goBack,
  goForward,
  reload,
  // keyboard category
  pressKey,
  keydown,
  keyup,
  // mouse category
  mouseMove,
  mouseDown,
  mouseUp,
  mouseWheel,
  // export category
  screenshot,
  pdfSave,
  // tabs category
  tabList,
  tabNew,
  tabClose,
  tabSelect,
  // storage category
  stateLoad,
  stateSave,
  cookieList,
  cookieGet,
  cookieSet,
  cookieDelete,
  cookieClear,
  localStorageList,
  localStorageGet,
  localStorageSet,
  localStorageDelete,
  localStorageClear,
  sessionStorageList,
  sessionStorageGet,
  sessionStorageSet,
  sessionStorageDelete,
  sessionStorageClear,
  // network category
  routeMock,
  routeList,
  unroute,
  // config category
  configPrint,
  // install category
  install,
  installBrowser,
  // devtools category
  networkRequests,
  tracingStart,
  tracingStop,
  videoStart,
  videoStop,
  // session category
  sessionList,
  sessionCloseAll,
  killAll
];
const commands = Object.fromEntries(commandsArray.map((cmd) => [cmd.name, cmd]));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  commands
});
