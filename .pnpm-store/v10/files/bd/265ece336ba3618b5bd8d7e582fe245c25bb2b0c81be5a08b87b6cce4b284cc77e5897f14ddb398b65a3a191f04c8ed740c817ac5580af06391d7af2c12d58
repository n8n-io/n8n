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
var screenshot_exports = {};
__export(screenshot_exports, {
  default: () => screenshot_default,
  scaleImageToFitMessage: () => scaleImageToFitMessage
});
module.exports = __toCommonJS(screenshot_exports);
var import_utils = require("playwright-core/lib/utils");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_utils2 = require("playwright-core/lib/utils");
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
var import_utils3 = require("./utils");
const screenshotSchema = import_mcpBundle.z.object({
  type: import_mcpBundle.z.enum(["png", "jpeg"]).default("png").describe("Image format for the screenshot. Default is png."),
  filename: import_mcpBundle.z.string().optional().describe("File name to save the screenshot to. Defaults to `page-{timestamp}.{png|jpeg}` if not specified. Prefer relative file names to stay within the output directory."),
  element: import_mcpBundle.z.string().optional().describe("Human-readable element description used to obtain permission to screenshot the element. If not provided, the screenshot will be taken of viewport. If element is provided, ref must be provided too."),
  ref: import_mcpBundle.z.string().optional().describe("Exact target element reference from the page snapshot. If not provided, the screenshot will be taken of viewport. If ref is provided, element must be provided too."),
  fullPage: import_mcpBundle.z.boolean().optional().describe("When true, takes a screenshot of the full scrollable page, instead of the currently visible viewport. Cannot be used with element screenshots.")
});
const screenshot = (0, import_tool.defineTabTool)({
  capability: "core",
  schema: {
    name: "browser_take_screenshot",
    title: "Take a screenshot",
    description: `Take a screenshot of the current page. You can't perform actions based on the screenshot, use browser_snapshot for actions.`,
    inputSchema: screenshotSchema,
    type: "readOnly"
  },
  handle: async (tab, params, response) => {
    if (!!params.element !== !!params.ref)
      throw new Error("Both element and ref must be provided or neither.");
    if (params.fullPage && params.ref)
      throw new Error("fullPage cannot be used with element screenshots.");
    const fileType = params.type || "png";
    const options = {
      type: fileType,
      quality: fileType === "png" ? void 0 : 90,
      scale: "css",
      ...params.fullPage !== void 0 && { fullPage: params.fullPage }
    };
    const isElementScreenshot = params.element && params.ref;
    const screenshotTarget = isElementScreenshot ? params.element : params.fullPage ? "full page" : "viewport";
    const ref = params.ref ? await tab.refLocator({ element: params.element || "", ref: params.ref }) : null;
    const data = ref ? await ref.locator.screenshot(options) : await tab.page.screenshot(options);
    const fileName = params.filename || (0, import_utils3.dateAsFileName)(fileType);
    response.addCode(`// Screenshot ${screenshotTarget} and save it as ${fileName}`);
    if (ref)
      response.addCode(`await page.${ref.resolved}.screenshot(${(0, import_utils2.formatObject)({ ...options, path: fileName })});`);
    else
      response.addCode(`await page.screenshot(${(0, import_utils2.formatObject)({ ...options, path: fileName })});`);
    await response.addResult({ data, title: `Screenshot of ${screenshotTarget}`, suggestedFilename: fileName });
    response.addImage({
      contentType: fileType === "png" ? "image/png" : "image/jpeg",
      data: scaleImageToFitMessage(data, fileType)
    });
  }
});
function scaleImageToFitMessage(buffer, imageType) {
  const image = imageType === "png" ? import_utilsBundle.PNG.sync.read(buffer) : import_utilsBundle.jpegjs.decode(buffer, { maxMemoryUsageInMB: 512 });
  const pixels = image.width * image.height;
  const shrink = Math.min(1568 / image.width, 1568 / image.height, Math.sqrt(1.15 * 1024 * 1024 / pixels));
  if (shrink > 1)
    return buffer;
  const width = image.width * shrink | 0;
  const height = image.height * shrink | 0;
  const scaledImage = (0, import_utils.scaleImageToSize)(image, { width, height });
  return imageType === "png" ? import_utilsBundle.PNG.sync.write(scaledImage) : import_utilsBundle.jpegjs.encode(scaledImage, 80).data;
}
var screenshot_default = [
  screenshot
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  scaleImageToFitMessage
});
