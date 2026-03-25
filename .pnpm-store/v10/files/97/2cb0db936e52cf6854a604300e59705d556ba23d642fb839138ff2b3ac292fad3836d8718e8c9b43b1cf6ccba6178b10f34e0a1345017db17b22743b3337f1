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
var videoRecorder_exports = {};
__export(videoRecorder_exports, {
  VideoRecorder: () => VideoRecorder
});
module.exports = __toCommonJS(videoRecorder_exports);
var import_utils = require("../utils");
var import_processLauncher = require("./utils/processLauncher");
const fps = 25;
class VideoRecorder {
  constructor(ffmpegPath, options) {
    this._process = null;
    this._gracefullyClose = null;
    this._lastWritePromise = Promise.resolve();
    this._firstFrameTimestamp = 0;
    this._lastFrame = null;
    this._lastWriteNodeTime = 0;
    this._frameQueue = [];
    this._isStopped = false;
    this._ffmpegPath = ffmpegPath;
    if (!options.outputFile.endsWith(".webm"))
      throw new Error("File must have .webm extension");
    this._launchPromise = this._launch(options).catch((e) => e);
  }
  async _launch(options) {
    await (0, import_utils.mkdirIfNeeded)(options.outputFile);
    const w = options.width;
    const h = options.height;
    const args = `-loglevel error -f image2pipe -avioflags direct -fpsprobesize 0 -probesize 32 -analyzeduration 0 -c:v mjpeg -i pipe:0 -y -an -r ${fps} -c:v vp8 -qmin 0 -qmax 50 -crf 8 -deadline realtime -speed 8 -b:v 1M -threads 1 -vf pad=${w}:${h}:0:0:gray,crop=${w}:${h}:0:0`.split(" ");
    args.push(options.outputFile);
    const { launchedProcess, gracefullyClose } = await (0, import_processLauncher.launchProcess)({
      command: this._ffmpegPath,
      args,
      stdio: "stdin",
      log: (message) => import_utils.debugLogger.log("browser", message),
      tempDirectories: [],
      attemptToGracefullyClose: async () => {
        import_utils.debugLogger.log("browser", "Closing stdin...");
        launchedProcess.stdin.end();
      },
      onExit: (exitCode, signal) => {
        import_utils.debugLogger.log("browser", `ffmpeg onkill exitCode=${exitCode} signal=${signal}`);
      }
    });
    launchedProcess.stdin.on("finish", () => {
      import_utils.debugLogger.log("browser", "ffmpeg finished input.");
    });
    launchedProcess.stdin.on("error", () => {
      import_utils.debugLogger.log("browser", "ffmpeg error.");
    });
    this._process = launchedProcess;
    this._gracefullyClose = gracefullyClose;
  }
  writeFrame(frame, timestamp) {
    this._launchPromise.then((error) => {
      if (error)
        return;
      this._writeFrame(frame, timestamp);
    });
  }
  _writeFrame(frame, timestamp) {
    (0, import_utils.assert)(this._process);
    if (this._isStopped)
      return;
    if (!this._firstFrameTimestamp)
      this._firstFrameTimestamp = timestamp;
    const frameNumber = Math.floor((timestamp - this._firstFrameTimestamp) * fps);
    if (this._lastFrame) {
      const repeatCount = frameNumber - this._lastFrame.frameNumber;
      for (let i = 0; i < repeatCount; ++i)
        this._frameQueue.push(this._lastFrame.buffer);
      this._lastWritePromise = this._lastWritePromise.then(() => this._sendFrames());
    }
    this._lastFrame = { buffer: frame, timestamp, frameNumber };
    this._lastWriteNodeTime = (0, import_utils.monotonicTime)();
  }
  async _sendFrames() {
    while (this._frameQueue.length)
      await this._sendFrame(this._frameQueue.shift());
  }
  async _sendFrame(frame) {
    return new Promise((f) => this._process.stdin.write(frame, f)).then((error) => {
      if (error)
        import_utils.debugLogger.log("browser", `ffmpeg failed to write: ${String(error)}`);
    });
  }
  async stop() {
    const error = await this._launchPromise;
    if (error)
      throw error;
    if (this._isStopped || !this._lastFrame)
      return;
    const addTime = Math.max(((0, import_utils.monotonicTime)() - this._lastWriteNodeTime) / 1e3, 1);
    this._writeFrame(Buffer.from([]), this._lastFrame.timestamp + addTime);
    this._isStopped = true;
    try {
      await this._lastWritePromise;
      await this._gracefullyClose();
    } catch (e) {
      import_utils.debugLogger.log("error", `ffmpeg failed to stop: ${String(e)}`);
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VideoRecorder
});
