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
var video_exports = {};
__export(video_exports, {
  default: () => video_default
});
module.exports = __toCommonJS(video_exports);
var import_path = __toESM(require("path"));
var import_mcpBundle = require("playwright-core/lib/mcpBundle");
var import_tool = require("./tool");
const startVideo = (0, import_tool.defineTool)({
  capability: "devtools",
  schema: {
    name: "browser_start_video",
    title: "Start video",
    description: "Start video recording",
    inputSchema: import_mcpBundle.z.object({
      size: import_mcpBundle.z.object({
        width: import_mcpBundle.z.number().describe("Video width"),
        height: import_mcpBundle.z.number().describe("Video height")
      }).optional().describe("Video size")
    }),
    type: "readOnly"
  },
  handle: async (context, params, response) => {
    await context.startVideoRecording({ size: params.size });
    response.addTextResult("Video recording started.");
  }
});
const stopVideo = (0, import_tool.defineTool)({
  capability: "devtools",
  schema: {
    name: "browser_stop_video",
    title: "Stop video",
    description: "Stop video recording",
    inputSchema: import_mcpBundle.z.object({
      filename: import_mcpBundle.z.string().optional().describe("Filename to save the video")
    }),
    type: "readOnly"
  },
  handle: async (context, params, response) => {
    const videos = await context.stopVideoRecording();
    if (!videos.size) {
      response.addTextResult("No videos were recorded.");
      return;
    }
    for (const [index, video] of [...videos].entries()) {
      const suffix = index ? `-${index}` : "";
      let suggestedFilename = params.filename;
      if (suggestedFilename && suffix) {
        const ext = import_path.default.extname(suggestedFilename);
        suggestedFilename = import_path.default.basename(suggestedFilename, ext) + suffix + ext;
      }
      const resolvedFile = await response.resolveClientFile({ prefix: "video" + suffix, ext: "webm", suggestedFilename }, "Video");
      await video.saveAs(resolvedFile.fileName);
      await response.addFileResult(resolvedFile, null);
    }
  }
});
var video_default = [
  startVideo,
  stopVideo
];
