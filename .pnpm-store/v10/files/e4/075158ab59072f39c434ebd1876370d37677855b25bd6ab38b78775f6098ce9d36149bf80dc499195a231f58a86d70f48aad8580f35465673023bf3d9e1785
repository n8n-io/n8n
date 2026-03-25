"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var response_exports = {};
__export(response_exports, {
  Response: () => Response,
  parseResponse: () => parseResponse,
  renderTabMarkdown: () => renderTabMarkdown,
  renderTabsMarkdown: () => renderTabsMarkdown,
  requestDebug: () => requestDebug
});
module.exports = __toCommonJS(response_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_tab = require("./tab");
var import_screenshot = require("./tools/screenshot");
const requestDebug = (0, import_utilsBundle.debug)("pw:mcp:request");
class Response {
  constructor(context, toolName, toolArgs, relativeTo) {
    this._results = [];
    this._errors = [];
    this._code = [];
    this._includeSnapshot = "none";
    this._imageResults = [];
    this._context = context;
    this.toolName = toolName;
    this.toolArgs = toolArgs;
    this._clientWorkspace = relativeTo ?? context.firstRootPath();
  }
  _computRelativeTo(fileName) {
    if (this._clientWorkspace)
      return import_path.default.relative(this._clientWorkspace, fileName);
    return fileName;
  }
  async resolveClientFile(template, title) {
    let fileName;
    if (template.suggestedFilename)
      fileName = await this._context.workspaceFile(template.suggestedFilename, this._clientWorkspace);
    else
      fileName = await this._context.outputFile(template, { origin: "llm" });
    const relativeName = this._computRelativeTo(fileName);
    const printableLink = `- [${title}](${relativeName})`;
    return { fileName, relativeName, printableLink };
  }
  addTextResult(text) {
    this._results.push(text);
  }
  async addResult(title, data, file) {
    if (this._context.config.outputMode === "file" || file.suggestedFilename || typeof data !== "string") {
      const resolvedFile = await this.resolveClientFile(file, title);
      await this.addFileResult(resolvedFile, data);
    } else {
      this.addTextResult(data);
    }
  }
  async addFileResult(resolvedFile, data) {
    if (typeof data === "string")
      await import_fs.default.promises.writeFile(resolvedFile.fileName, data, "utf-8");
    else if (data)
      await import_fs.default.promises.writeFile(resolvedFile.fileName, data);
    this.addTextResult(resolvedFile.printableLink);
  }
  addFileLink(title, fileName) {
    const relativeName = this._computRelativeTo(fileName);
    this.addTextResult(`- [${title}](${relativeName})`);
  }
  async registerImageResult(data, imageType) {
    this._imageResults.push({ data, imageType });
  }
  addError(error) {
    this._errors.push(error);
  }
  addCode(code) {
    this._code.push(code);
  }
  setIncludeSnapshot() {
    this._includeSnapshot = this._context.config.snapshot.mode;
  }
  setIncludeFullSnapshot(includeSnapshotFileName) {
    this._includeSnapshot = "full";
    this._includeSnapshotFileName = includeSnapshotFileName;
  }
  async serialize() {
    const redactText = (text2) => {
      for (const [secretName, secretValue] of Object.entries(this._context.config.secrets ?? {}))
        text2 = text2.replaceAll(secretValue, `<secret>${secretName}</secret>`);
      return text2;
    };
    const sections = await this._build();
    const text = [];
    for (const section of sections) {
      if (!section.content.length)
        continue;
      text.push(`### ${section.title}`);
      if (section.codeframe)
        text.push(`\`\`\`${section.codeframe}`);
      text.push(...section.content);
      if (section.codeframe)
        text.push("```");
    }
    const content = [
      {
        type: "text",
        text: redactText(text.join("\n"))
      }
    ];
    if (this._context.config.imageResponses !== "omit") {
      for (const imageResult of this._imageResults) {
        const scaledData = (0, import_screenshot.scaleImageToFitMessage)(imageResult.data, imageResult.imageType);
        content.push({ type: "image", data: scaledData.toString("base64"), mimeType: imageResult.imageType === "png" ? "image/png" : "image/jpeg" });
      }
    }
    return {
      content,
      ...sections.some((section) => section.isError) ? { isError: true } : {}
    };
  }
  async _build() {
    const sections = [];
    const addSection = (title, content, codeframe) => {
      const section = { title, content, isError: title === "Error", codeframe };
      sections.push(section);
      return content;
    };
    if (this._errors.length)
      addSection("Error", this._errors);
    if (this._results.length)
      addSection("Result", this._results);
    if (this._context.config.codegen !== "none" && this._code.length)
      addSection("Ran Playwright code", this._code, "js");
    const tabSnapshot = this._context.currentTab() ? await this._context.currentTabOrDie().captureSnapshot(this._clientWorkspace) : void 0;
    const tabHeaders = await Promise.all(this._context.tabs().map((tab) => tab.headerSnapshot()));
    if (this._includeSnapshot !== "none" || tabHeaders.some((header) => header.changed)) {
      if (tabHeaders.length !== 1)
        addSection("Open tabs", renderTabsMarkdown(tabHeaders));
      addSection("Page", renderTabMarkdown(tabHeaders[0]));
    }
    if (tabSnapshot?.modalStates.length)
      addSection("Modal state", (0, import_tab.renderModalStates)(this._context.config, tabSnapshot.modalStates));
    if (tabSnapshot && this._includeSnapshot !== "none") {
      const snapshot = this._includeSnapshot === "full" ? tabSnapshot.ariaSnapshot : tabSnapshot.ariaSnapshotDiff ?? tabSnapshot.ariaSnapshot;
      if (this._context.config.outputMode === "file" || this._includeSnapshotFileName) {
        const resolvedFile = await this.resolveClientFile({ prefix: "page", ext: "yml", suggestedFilename: this._includeSnapshotFileName }, "Snapshot");
        await import_fs.default.promises.writeFile(resolvedFile.fileName, snapshot, "utf-8");
        addSection("Snapshot", [resolvedFile.printableLink]);
      } else {
        addSection("Snapshot", [snapshot], "yaml");
      }
    }
    const text = [];
    if (tabSnapshot?.consoleLink)
      text.push(`- New console entries: ${tabSnapshot.consoleLink}`);
    if (tabSnapshot?.events.filter((event) => event.type !== "request").length) {
      for (const event of tabSnapshot.events) {
        if (event.type === "console" && this._context.config.outputMode !== "file") {
          if ((0, import_tab.shouldIncludeMessage)(this._context.config.console.level, event.message.type))
            text.push(`- ${trimMiddle(event.message.toString(), 100)}`);
        } else if (event.type === "download-start") {
          text.push(`- Downloading file ${event.download.download.suggestedFilename()} ...`);
        } else if (event.type === "download-finish") {
          text.push(`- Downloaded file ${event.download.download.suggestedFilename()} to "${this._computRelativeTo(event.download.outputFile)}"`);
        }
      }
    }
    if (text.length)
      addSection("Events", text);
    return sections;
  }
}
function renderTabMarkdown(tab) {
  const lines = [`- Page URL: ${tab.url}`];
  if (tab.title)
    lines.push(`- Page Title: ${tab.title}`);
  if (tab.console.errors || tab.console.warnings)
    lines.push(`- Console: ${tab.console.errors} errors, ${tab.console.warnings} warnings`);
  return lines;
}
function renderTabsMarkdown(tabs) {
  if (!tabs.length)
    return ["No open tabs. Navigate to a URL to create one."];
  const lines = [];
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const current = tab.current ? " (current)" : "";
    lines.push(`- ${i}:${current} [${tab.title}](${tab.url})`);
  }
  return lines;
}
function trimMiddle(text, maxLength) {
  if (text.length <= maxLength)
    return text;
  return text.slice(0, Math.floor(maxLength / 2)) + "..." + text.slice(-3 - Math.floor(maxLength / 2));
}
function parseSections(text) {
  const sections = /* @__PURE__ */ new Map();
  const sectionHeaders = text.split(/^### /m).slice(1);
  for (const section of sectionHeaders) {
    const firstNewlineIndex = section.indexOf("\n");
    if (firstNewlineIndex === -1)
      continue;
    const sectionName = section.substring(0, firstNewlineIndex);
    const sectionContent = section.substring(firstNewlineIndex + 1).trim();
    sections.set(sectionName, sectionContent);
  }
  return sections;
}
function parseResponse(response) {
  if (response.content?.[0].type !== "text")
    return void 0;
  const text = response.content[0].text;
  const sections = parseSections(text);
  const error = sections.get("Error");
  const result = sections.get("Result");
  const code = sections.get("Ran Playwright code");
  const tabs = sections.get("Open tabs");
  const page = sections.get("Page");
  const snapshot = sections.get("Snapshot");
  const events = sections.get("Events");
  const modalState = sections.get("Modal state");
  const codeNoFrame = code?.replace(/^```js\n/, "").replace(/\n```$/, "");
  const isError = response.isError;
  const attachments = response.content.length > 1 ? response.content.slice(1) : void 0;
  return {
    result,
    error,
    code: codeNoFrame,
    tabs,
    page,
    snapshot,
    events,
    modalState,
    isError,
    attachments,
    text
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Response,
  parseResponse,
  renderTabMarkdown,
  renderTabsMarkdown,
  requestDebug
});
