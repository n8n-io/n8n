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
var androidDispatcher_exports = {};
__export(androidDispatcher_exports, {
  AndroidDeviceDispatcher: () => AndroidDeviceDispatcher,
  AndroidDispatcher: () => AndroidDispatcher,
  AndroidSocketDispatcher: () => AndroidSocketDispatcher
});
module.exports = __toCommonJS(androidDispatcher_exports);
var import_browserContextDispatcher = require("./browserContextDispatcher");
var import_dispatcher = require("./dispatcher");
var import_android = require("../android/android");
var import_eventsHelper = require("../utils/eventsHelper");
var import_instrumentation = require("../instrumentation");
class AndroidDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, android) {
    super(scope, android, "Android", {});
    this._type_Android = true;
  }
  async devices(params, progress) {
    const devices = await this._object.devices(progress, params);
    return {
      devices: devices.map((d) => AndroidDeviceDispatcher.from(this, d))
    };
  }
}
class AndroidDeviceDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, device) {
    super(scope, device, "AndroidDevice", {
      model: device.model,
      serial: device.serial
    });
    this._type_EventTarget = true;
    this._type_AndroidDevice = true;
    for (const webView of device.webViews())
      this._dispatchEvent("webViewAdded", { webView });
    this.addObjectListener(import_android.AndroidDevice.Events.WebViewAdded, (webView) => this._dispatchEvent("webViewAdded", { webView }));
    this.addObjectListener(import_android.AndroidDevice.Events.WebViewRemoved, (socketName) => this._dispatchEvent("webViewRemoved", { socketName }));
    this.addObjectListener(import_android.AndroidDevice.Events.Close, () => this._dispatchEvent("close"));
  }
  static from(scope, device) {
    const result = scope.connection.existingDispatcher(device);
    return result || new AndroidDeviceDispatcher(scope, device);
  }
  async wait(params, progress) {
    await progress.race(this._object.send("wait", params));
  }
  async fill(params, progress) {
    await progress.race(this._object.send("click", { selector: params.androidSelector }));
    await progress.race(this._object.send("fill", params));
  }
  async tap(params, progress) {
    await progress.race(this._object.send("click", params));
  }
  async drag(params, progress) {
    await progress.race(this._object.send("drag", params));
  }
  async fling(params, progress) {
    await progress.race(this._object.send("fling", params));
  }
  async longTap(params, progress) {
    await progress.race(this._object.send("longClick", params));
  }
  async pinchClose(params, progress) {
    await progress.race(this._object.send("pinchClose", params));
  }
  async pinchOpen(params, progress) {
    await progress.race(this._object.send("pinchOpen", params));
  }
  async scroll(params, progress) {
    await progress.race(this._object.send("scroll", params));
  }
  async swipe(params, progress) {
    await progress.race(this._object.send("swipe", params));
  }
  async info(params, progress) {
    const info = await progress.race(this._object.send("info", params));
    fixupAndroidElementInfo(info);
    return { info };
  }
  async inputType(params, progress) {
    const text = params.text;
    const keyCodes = [];
    for (let i = 0; i < text.length; ++i) {
      const code = keyMap.get(text[i].toUpperCase());
      if (code === void 0)
        throw new Error("No mapping for " + text[i] + " found");
      keyCodes.push(code);
    }
    await progress.race(Promise.all(keyCodes.map((keyCode) => this._object.send("inputPress", { keyCode }))));
  }
  async inputPress(params, progress) {
    if (!keyMap.has(params.key))
      throw new Error("Unknown key: " + params.key);
    await progress.race(this._object.send("inputPress", { keyCode: keyMap.get(params.key) }));
  }
  async inputTap(params, progress) {
    await progress.race(this._object.send("inputClick", params));
  }
  async inputSwipe(params, progress) {
    await progress.race(this._object.send("inputSwipe", params));
  }
  async inputDrag(params, progress) {
    await progress.race(this._object.send("inputDrag", params));
  }
  async screenshot(params, progress) {
    return { binary: await progress.race(this._object.screenshot()) };
  }
  async shell(params, progress) {
    return { result: await progress.race(this._object.shell(params.command)) };
  }
  async open(params, progress) {
    const socket = await this._object.open(progress, params.command);
    return { socket: new AndroidSocketDispatcher(this, new SocketSdkObject(this._object, socket)) };
  }
  async installApk(params, progress) {
    await this._object.installApk(progress, params.file, { args: params.args });
  }
  async push(params, progress) {
    await progress.race(this._object.push(progress, params.file, params.path, params.mode));
  }
  async launchBrowser(params, progress) {
    const context = await this._object.launchBrowser(progress, params.pkg, params);
    return { context: import_browserContextDispatcher.BrowserContextDispatcher.from(this, context) };
  }
  async close(params, progress) {
    await this._object.close();
  }
  async connectToWebView(params, progress) {
    return { context: import_browserContextDispatcher.BrowserContextDispatcher.from(this, await this._object.connectToWebView(progress, params.socketName)) };
  }
}
class SocketSdkObject extends import_instrumentation.SdkObject {
  constructor(parent, socket) {
    super(parent, "socket");
    this._socket = socket;
    this._eventListeners = [
      import_eventsHelper.eventsHelper.addEventListener(socket, "data", (data) => this.emit("data", data)),
      import_eventsHelper.eventsHelper.addEventListener(socket, "close", () => {
        import_eventsHelper.eventsHelper.removeEventListeners(this._eventListeners);
        this.emit("close");
      })
    ];
  }
  async write(data) {
    await this._socket.write(data);
  }
  close() {
    this._socket.close();
  }
}
class AndroidSocketDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, socket) {
    super(scope, socket, "AndroidSocket", {});
    this._type_AndroidSocket = true;
    this.addObjectListener("data", (data) => this._dispatchEvent("data", { data }));
    this.addObjectListener("close", () => {
      this._dispatchEvent("close");
      this._dispose();
    });
  }
  async write(params, progress) {
    await progress.race(this._object.write(params.data));
  }
  async close(params, progress) {
    this._object.close();
  }
}
const keyMap = /* @__PURE__ */ new Map([
  ["Unknown", 0],
  ["SoftLeft", 1],
  ["SoftRight", 2],
  ["Home", 3],
  ["Back", 4],
  ["Call", 5],
  ["EndCall", 6],
  ["0", 7],
  ["1", 8],
  ["2", 9],
  ["3", 10],
  ["4", 11],
  ["5", 12],
  ["6", 13],
  ["7", 14],
  ["8", 15],
  ["9", 16],
  ["Star", 17],
  ["*", 17],
  ["Pound", 18],
  ["#", 18],
  ["DialUp", 19],
  ["DialDown", 20],
  ["DialLeft", 21],
  ["DialRight", 22],
  ["DialCenter", 23],
  ["VolumeUp", 24],
  ["VolumeDown", 25],
  ["Power", 26],
  ["Camera", 27],
  ["Clear", 28],
  ["A", 29],
  ["B", 30],
  ["C", 31],
  ["D", 32],
  ["E", 33],
  ["F", 34],
  ["G", 35],
  ["H", 36],
  ["I", 37],
  ["J", 38],
  ["K", 39],
  ["L", 40],
  ["M", 41],
  ["N", 42],
  ["O", 43],
  ["P", 44],
  ["Q", 45],
  ["R", 46],
  ["S", 47],
  ["T", 48],
  ["U", 49],
  ["V", 50],
  ["W", 51],
  ["X", 52],
  ["Y", 53],
  ["Z", 54],
  ["Comma", 55],
  [",", 55],
  ["Period", 56],
  [".", 56],
  ["AltLeft", 57],
  ["AltRight", 58],
  ["ShiftLeft", 59],
  ["ShiftRight", 60],
  ["Tab", 61],
  ["	", 61],
  ["Space", 62],
  [" ", 62],
  ["Sym", 63],
  ["Explorer", 64],
  ["Envelop", 65],
  ["Enter", 66],
  ["Del", 67],
  ["Grave", 68],
  ["Minus", 69],
  ["-", 69],
  ["Equals", 70],
  ["=", 70],
  ["LeftBracket", 71],
  ["(", 71],
  ["RightBracket", 72],
  [")", 72],
  ["Backslash", 73],
  ["\\", 73],
  ["Semicolon", 74],
  [";", 74],
  ["Apostrophe", 75],
  ["`", 75],
  ["Slash", 76],
  ["/", 76],
  ["At", 77],
  ["@", 77],
  ["Num", 78],
  ["HeadsetHook", 79],
  ["Focus", 80],
  ["Plus", 81],
  ["Menu", 82],
  ["Notification", 83],
  ["Search", 84],
  ["MediaPlayPause", 85],
  ["MediaStop", 86],
  ["MediaNext", 87],
  ["MediaPrevious", 88],
  ["MediaRewind", 89],
  ["MediaFastForward", 90],
  ["MediaPlay", 126],
  ["MediaPause", 127],
  ["MediaClose", 128],
  ["MediaEject", 129],
  ["MediaRecord", 130],
  ["ChannelUp", 166],
  ["ChannelDown", 167],
  ["AppSwitch", 187],
  ["Assist", 219],
  ["MediaAudioTrack", 222],
  ["MediaTopMenu", 226],
  ["MediaSkipForward", 272],
  ["MediaSkipBackward", 273],
  ["MediaStepForward", 274],
  ["MediaStepBackward", 275],
  ["Cut", 277],
  ["Copy", 278],
  ["Paste", 279]
]);
function fixupAndroidElementInfo(info) {
  info.clazz = info.clazz || "";
  info.pkg = info.pkg || "";
  info.res = info.res || "";
  info.desc = info.desc || "";
  info.text = info.text || "";
  for (const child of info.children || [])
    fixupAndroidElementInfo(child);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AndroidDeviceDispatcher,
  AndroidDispatcher,
  AndroidSocketDispatcher
});
