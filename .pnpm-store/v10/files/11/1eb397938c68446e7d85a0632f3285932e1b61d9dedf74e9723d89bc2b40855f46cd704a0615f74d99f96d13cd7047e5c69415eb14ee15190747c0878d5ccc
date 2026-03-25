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
var screencast_exports = {};
__export(screencast_exports, {
  Screencast: () => Screencast
});
module.exports = __toCommonJS(screencast_exports);
var import_path = __toESM(require("path"));
var import_utils = require("../utils");
var import_utils2 = require("../utils");
var import_videoRecorder = require("./videoRecorder");
var import_page = require("./page");
var import_registry = require("./registry");
class Screencast {
  constructor(page) {
    this._videoRecorder = null;
    this._videoId = null;
    this._screencastClients = /* @__PURE__ */ new Set();
    // Aiming at 25 fps by default - each frame is 40ms, but we give some slack with 35ms.
    // When throttling for tracing, 200ms between frames, except for 10 frames around the action.
    this._frameThrottler = new FrameThrottler(10, 35, 200);
    this._frameListener = null;
    this._page = page;
  }
  stopFrameThrottler() {
    this._frameThrottler.dispose();
  }
  setOptions(options) {
    this._setOptions(options).catch((e) => import_utils2.debugLogger.log("error", e));
    this._frameThrottler.setThrottlingEnabled(!!options);
  }
  throttleFrameAck(ack) {
    this._frameThrottler.ack(ack);
  }
  temporarilyDisableThrottling() {
    this._frameThrottler.recharge();
  }
  launchVideoRecorder() {
    const recordVideo = this._page.browserContext._options.recordVideo;
    if (!recordVideo)
      return void 0;
    (0, import_utils.assert)(!this._videoId);
    this._videoId = (0, import_utils.createGuid)();
    const outputFile = import_path.default.join(recordVideo.dir, this._videoId + ".webm");
    const videoOptions = {
      // validateBrowserContextOptions ensures correct video size.
      ...recordVideo.size,
      outputFile
    };
    const ffmpegPath = import_registry.registry.findExecutable("ffmpeg").executablePathOrDie(this._page.browserContext._browser.sdkLanguage());
    this._videoRecorder = new import_videoRecorder.VideoRecorder(ffmpegPath, videoOptions);
    this._frameListener = import_utils.eventsHelper.addEventListener(this._page, import_page.Page.Events.ScreencastFrame, (frame) => this._videoRecorder.writeFrame(frame.buffer, frame.frameSwapWallTime / 1e3));
    this._page.waitForInitializedOrError().then((p) => {
      if (p instanceof Error)
        this.stopVideoRecording().catch(() => {
        });
    });
    return videoOptions;
  }
  async startVideoRecording(options) {
    const videoId = this._videoId;
    (0, import_utils.assert)(videoId);
    this._page.once(import_page.Page.Events.Close, () => this.stopVideoRecording().catch(() => {
    }));
    const gotFirstFrame = new Promise((f) => this._page.once(import_page.Page.Events.ScreencastFrame, f));
    await this._startScreencast(this._videoRecorder, {
      quality: 90,
      width: options.width,
      height: options.height
    });
    gotFirstFrame.then(() => {
      this._page.browserContext._browser._videoStarted(this._page.browserContext, videoId, options.outputFile, this._page.waitForInitializedOrError());
    });
  }
  async stopVideoRecording() {
    if (!this._videoId)
      return;
    if (this._frameListener)
      import_utils.eventsHelper.removeEventListeners([this._frameListener]);
    this._frameListener = null;
    const videoId = this._videoId;
    this._videoId = null;
    const videoRecorder = this._videoRecorder;
    this._videoRecorder = null;
    await this._stopScreencast(videoRecorder);
    await videoRecorder.stop();
    const video = this._page.browserContext._browser._takeVideo(videoId);
    video?.reportFinished();
  }
  async _setOptions(options) {
    if (options)
      await this._startScreencast(this, options);
    else
      await this._stopScreencast(this);
  }
  async _startScreencast(client, options) {
    this._screencastClients.add(client);
    if (this._screencastClients.size === 1) {
      await this._page.delegate.startScreencast({
        width: options.width,
        height: options.height,
        quality: options.quality
      });
    }
  }
  async _stopScreencast(client) {
    this._screencastClients.delete(client);
    if (!this._screencastClients.size)
      await this._page.delegate.stopScreencast();
  }
}
class FrameThrottler {
  constructor(nonThrottledFrames, defaultInterval, throttlingInterval) {
    this._acks = [];
    this._throttlingEnabled = false;
    this._nonThrottledFrames = nonThrottledFrames;
    this._budget = nonThrottledFrames;
    this._defaultInterval = defaultInterval;
    this._throttlingInterval = throttlingInterval;
    this._tick();
  }
  dispose() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = void 0;
    }
  }
  setThrottlingEnabled(enabled) {
    this._throttlingEnabled = enabled;
  }
  recharge() {
    for (const ack of this._acks)
      ack();
    this._acks = [];
    this._budget = this._nonThrottledFrames;
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._tick();
    }
  }
  ack(ack) {
    if (!this._timeoutId) {
      ack();
      return;
    }
    this._acks.push(ack);
  }
  _tick() {
    const ack = this._acks.shift();
    if (ack) {
      --this._budget;
      ack();
    }
    if (this._throttlingEnabled && this._budget <= 0) {
      this._timeoutId = setTimeout(() => this._tick(), this._throttlingInterval);
    } else {
      this._timeoutId = setTimeout(() => this._tick(), this._defaultInterval);
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Screencast
});
