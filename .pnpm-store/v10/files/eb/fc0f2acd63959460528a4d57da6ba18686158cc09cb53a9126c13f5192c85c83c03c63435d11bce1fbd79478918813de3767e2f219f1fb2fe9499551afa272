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
var crDragDrop_exports = {};
__export(crDragDrop_exports, {
  DragManager: () => DragManager
});
module.exports = __toCommonJS(crDragDrop_exports);
var import_crProtocolHelper = require("./crProtocolHelper");
var import_utils = require("../../utils");
class DragManager {
  constructor(page) {
    this._dragState = null;
    this._lastPosition = { x: 0, y: 0 };
    this._crPage = page;
  }
  async cancelDrag() {
    if (!this._dragState)
      return false;
    await this._crPage._mainFrameSession._client.send("Input.dispatchDragEvent", {
      type: "dragCancel",
      x: this._lastPosition.x,
      y: this._lastPosition.y,
      data: {
        items: [],
        dragOperationsMask: 65535
      }
    });
    this._dragState = null;
    return true;
  }
  async interceptDragCausedByMove(progress, x, y, button, buttons, modifiers, moveCallback) {
    this._lastPosition = { x, y };
    if (this._dragState) {
      await progress.race(this._crPage._mainFrameSession._client.send("Input.dispatchDragEvent", {
        type: "dragOver",
        x,
        y,
        data: this._dragState,
        modifiers: (0, import_crProtocolHelper.toModifiersMask)(modifiers)
      }));
      return;
    }
    if (button !== "left")
      return moveCallback();
    const client = this._crPage._mainFrameSession._client;
    let onDragIntercepted;
    const dragInterceptedPromise = new Promise((x2) => onDragIntercepted = x2);
    function setupDragListeners() {
      let didStartDrag = Promise.resolve(false);
      let dragEvent = null;
      const dragListener = (event) => dragEvent = event;
      const mouseListener = () => {
        didStartDrag = new Promise((callback) => {
          window.addEventListener("dragstart", dragListener, { once: true, capture: true });
          setTimeout(() => callback(dragEvent ? !dragEvent.defaultPrevented : false), 0);
        });
      };
      window.addEventListener("mousemove", mouseListener, { once: true, capture: true });
      window.__cleanupDrag = async () => {
        const val = await didStartDrag;
        window.removeEventListener("mousemove", mouseListener, { capture: true });
        window.removeEventListener("dragstart", dragListener, { capture: true });
        delete window.__cleanupDrag;
        return val;
      };
    }
    try {
      let expectingDrag = false;
      await progress.race(this._crPage._page.safeNonStallingEvaluateInAllFrames(`(${setupDragListeners.toString()})()`, "utility"));
      client.on("Input.dragIntercepted", onDragIntercepted);
      await client.send("Input.setInterceptDrags", { enabled: true });
      try {
        await progress.race(moveCallback());
        expectingDrag = (await Promise.all(this._crPage._page.frames().map(async (frame) => {
          return frame.nonStallingEvaluateInExistingContext("window.__cleanupDrag?.()", "utility").catch(() => false);
        }))).some((x2) => x2);
      } finally {
        client.off("Input.dragIntercepted", onDragIntercepted);
        await client.send("Input.setInterceptDrags", { enabled: false });
      }
      this._dragState = expectingDrag ? (await dragInterceptedPromise).data : null;
    } catch (error) {
      this._crPage._page.safeNonStallingEvaluateInAllFrames("window.__cleanupDrag?.()", "utility").catch(() => {
      });
      throw error;
    }
    if (this._dragState) {
      await progress.race(this._crPage._mainFrameSession._client.send("Input.dispatchDragEvent", {
        type: "dragEnter",
        x,
        y,
        data: this._dragState,
        modifiers: (0, import_crProtocolHelper.toModifiersMask)(modifiers)
      }));
    }
  }
  isDragging() {
    return !!this._dragState;
  }
  async drop(progress, x, y, modifiers) {
    (0, import_utils.assert)(this._dragState, "missing drag state");
    await progress.race(this._crPage._mainFrameSession._client.send("Input.dispatchDragEvent", {
      type: "drop",
      x,
      y,
      data: this._dragState,
      modifiers: (0, import_crProtocolHelper.toModifiersMask)(modifiers)
    }));
    this._dragState = null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DragManager
});
