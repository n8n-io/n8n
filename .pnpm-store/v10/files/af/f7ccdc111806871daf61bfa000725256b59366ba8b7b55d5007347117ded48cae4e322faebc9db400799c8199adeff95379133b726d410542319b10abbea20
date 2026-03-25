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
var pdf_exports = {};
__export(pdf_exports, {
  default: () => pdf_default
});
module.exports = __toCommonJS(pdf_exports);
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_utils = require("playwright-core/lib/utils");
var import_tool = require("./tool");
var import_utils2 = require("./utils");
const pdfSchema = import_mcpBundle.z.object({
  filename: import_mcpBundle.z.string().optional().describe("File name to save the pdf to. Defaults to `page-{timestamp}.pdf` if not specified. Prefer relative file names to stay within the output directory.")
});
const pdf = (0, import_tool.defineTabTool)({
  capability: "pdf",
  schema: {
    name: "browser_pdf_save",
    title: "Save as PDF",
    description: "Save page as PDF",
    inputSchema: pdfSchema,
    type: "readOnly"
  },
  handle: async (tab, params, response) => {
    const data = await tab.page.pdf();
    const suggestedFilename = params.filename ?? (0, import_utils2.dateAsFileName)("pdf");
    await response.addResult({ data, title: "Page as pdf", suggestedFilename });
    response.addCode(`await page.pdf(${(0, import_utils.formatObject)({ path: suggestedFilename })});`);
  }
});
var pdf_default = [
  pdf
];
