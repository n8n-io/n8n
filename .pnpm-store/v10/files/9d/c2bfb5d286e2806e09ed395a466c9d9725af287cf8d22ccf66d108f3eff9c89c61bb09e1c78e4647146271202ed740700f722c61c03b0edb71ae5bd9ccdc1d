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
var import_utils = require("./tools/utils");
const requestDebug = (0, import_utilsBundle.debug)("pw:mcp:request");
class Response {
  constructor(ordinal, context, toolName, toolArgs) {
    this._results = [];
    this._errors = [];
    this._code = [];
    this._images = [];
    this._includeSnapshot = "none";
    this._ordinal = ordinal;
    this._context = context;
    this.toolName = toolName;
    this.toolArgs = toolArgs;
  }
  static {
    this._ordinal = 0;
  }
  static create(context, toolName, toolArgs) {
    return new Response(++Response._ordinal, context, toolName, toolArgs);
  }
  addTextResult(result) {
    this._results.push({ text: result });
  }
  async addResult(result) {
    if (result.data && !result.suggestedFilename)
      result.suggestedFilename = (0, import_utils.dateAsFileName)(result.ext ?? "bin");
    if (this._context.config.outputMode === "file") {
      if (!result.suggestedFilename)
        result.suggestedFilename = (0, import_utils.dateAsFileName)(result.ext ?? (result.text ? "txt" : "bin"));
    }
    const entry = { text: result.text, data: result.data, title: result.title };
    if (result.suggestedFilename)
      entry.filename = await this._context.outputFile(result.suggestedFilename, { origin: "llm", title: result.title ?? "Saved result" });
    this._results.push(entry);
    return { fileName: entry.filename };
  }
  addError(error) {
    this._errors.push(error);
  }
  addCode(code) {
    this._code.push(code);
  }
  addImage(image) {
    this._images.push(image);
  }
  setIncludeSnapshot() {
    this._includeSnapshot = this._context.config.snapshot.mode;
  }
  setIncludeFullSnapshot(includeSnapshotFileName) {
    this._includeSnapshot = "full";
    this._includeSnapshotFileName = includeSnapshotFileName;
  }
  async build() {
    const rootPath = this._context.firstRootPath();
    const sections = [];
    const addSection = (title) => {
      const section = { title, content: [] };
      sections.push(section);
      return section.content;
    };
    if (this._errors.length) {
      const text = addSection("Error");
      text.push("### Error");
      text.push(this._errors.join("\n"));
    }
    if (this._results.length) {
      const text = addSection("Result");
      for (const result of this._results) {
        if (result.filename) {
          text.push(`- [${result.title}](${rootPath ? import_path.default.relative(rootPath, result.filename) : result.filename})`);
          if (result.data)
            await import_fs.default.promises.writeFile(result.filename, result.data);
          else if (result.text)
            await import_fs.default.promises.writeFile(result.filename, this._redactText(result.text));
        } else if (result.text) {
          text.push(result.text);
        }
      }
    }
    if (this._context.config.codegen !== "none" && this._code.length) {
      const text = addSection("Ran Playwright code");
      text.push(...this._code);
    }
    const tabSnapshot = this._context.currentTab() ? await this._context.currentTabOrDie().captureSnapshot() : void 0;
    const tabHeaders = await Promise.all(this._context.tabs().map((tab) => tab.headerSnapshot()));
    if (tabHeaders.some((header) => header.changed)) {
      if (tabHeaders.length !== 1) {
        const text2 = addSection("Open tabs");
        text2.push(...renderTabsMarkdown(tabHeaders));
      }
      const text = addSection("Page");
      text.push(...renderTabMarkdown(tabHeaders[0]));
    }
    if (tabSnapshot?.modalStates.length) {
      const text = addSection("Modal state");
      text.push(...(0, import_tab.renderModalStates)(tabSnapshot.modalStates));
    }
    if (tabSnapshot && this._includeSnapshot === "full") {
      let fileName;
      if (this._includeSnapshotFileName)
        fileName = await this._context.outputFile(this._includeSnapshotFileName, { origin: "llm", title: "Saved snapshot" });
      else if (this._context.config.outputMode === "file")
        fileName = await this._context.outputFile(`snapshot-${this._ordinal}.yml`, { origin: "code", title: "Saved snapshot" });
      if (fileName) {
        await import_fs.default.promises.writeFile(fileName, tabSnapshot.ariaSnapshot);
        const text = addSection("Snapshot");
        text.push(`- File: ${rootPath ? import_path.default.relative(rootPath, fileName) : fileName}`);
      } else {
        const text = addSection("Snapshot");
        text.push("```yaml");
        text.push(tabSnapshot.ariaSnapshot);
        text.push("```");
      }
    }
    if (tabSnapshot && this._includeSnapshot === "incremental") {
      const text = addSection("Snapshot");
      text.push("```yaml");
      if (tabSnapshot.ariaSnapshotDiff !== void 0)
        text.push(tabSnapshot.ariaSnapshotDiff);
      else
        text.push(tabSnapshot.ariaSnapshot);
      text.push("```");
    }
    if (tabSnapshot?.events.filter((event) => event.type !== "request").length) {
      const text = addSection("Events");
      for (const event of tabSnapshot.events) {
        if (event.type === "console") {
          if ((0, import_tab.shouldIncludeMessage)(this._context.config.console.level, event.message.type))
            text.push(`- ${trimMiddle(event.message.toString(), 100)}`);
        } else if (event.type === "download-start") {
          text.push(`- Downloading file ${event.download.download.suggestedFilename()} ...`);
        } else if (event.type === "download-finish") {
          text.push(`- Downloaded file ${event.download.download.suggestedFilename()} to "${rootPath ? import_path.default.relative(rootPath, event.download.outputFile) : event.download.outputFile}"`);
        }
      }
    }
    const allText = sections.flatMap((section) => {
      const content2 = [];
      content2.push(`### ${section.title}`);
      content2.push(...section.content);
      content2.push("");
      return content2;
    }).join("\n");
    const content = [
      {
        type: "text",
        text: this._redactText(allText)
      }
    ];
    if (this._context.config.imageResponses !== "omit") {
      for (const image of this._images)
        content.push({ type: "image", data: image.data.toString("base64"), mimeType: image.contentType });
    }
    return {
      content,
      ...this._errors.length > 0 ? { isError: true } : {}
    };
  }
  _redactText(text) {
    for (const [secretName, secretValue] of Object.entries(this._context.config.secrets ?? {}))
      text = text.replaceAll(secretValue, `<secret>${secretName}</secret>`);
    return text;
  }
}
function renderTabMarkdown(tab) {
  const lines = [`- Page URL: ${tab.url}`];
  if (tab.title)
    lines.push(`- Page Title: ${tab.title}`);
  return lines;
}
function renderTabsMarkdown(tabs) {
  if (!tabs.length)
    return ['No open tabs. Use the "browser_navigate" tool to navigate to a page first.'];
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
