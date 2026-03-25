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
var wkProvisionalPage_exports = {};
__export(wkProvisionalPage_exports, {
  WKProvisionalPage: () => WKProvisionalPage
});
module.exports = __toCommonJS(wkProvisionalPage_exports);
var import_utils = require("../../utils");
var import_eventsHelper = require("../utils/eventsHelper");
class WKProvisionalPage {
  constructor(session, page) {
    this._sessionListeners = [];
    this._mainFrameId = null;
    this._session = session;
    this._wkPage = page;
    this._coopNavigationRequest = page._page.mainFrame().pendingDocument()?.request;
    const overrideFrameId = (handler) => {
      return (payload) => {
        if (payload.frameId)
          payload.frameId = this._wkPage._page.frameManager.mainFrame()._id;
        handler(payload);
      };
    };
    const wkPage = this._wkPage;
    this._sessionListeners = [
      import_eventsHelper.eventsHelper.addEventListener(session, "Network.requestWillBeSent", overrideFrameId((e) => this._onRequestWillBeSent(e))),
      import_eventsHelper.eventsHelper.addEventListener(session, "Network.requestIntercepted", overrideFrameId((e) => wkPage._onRequestIntercepted(session, e))),
      import_eventsHelper.eventsHelper.addEventListener(session, "Network.responseReceived", overrideFrameId((e) => wkPage._onResponseReceived(session, e))),
      import_eventsHelper.eventsHelper.addEventListener(session, "Network.loadingFinished", overrideFrameId((e) => this._onLoadingFinished(e))),
      import_eventsHelper.eventsHelper.addEventListener(session, "Network.loadingFailed", overrideFrameId((e) => this._onLoadingFailed(e)))
    ];
    this.initializationPromise = this._wkPage._initializeSession(session, true, ({ frameTree }) => this._handleFrameTree(frameTree));
  }
  coopNavigationRequest() {
    return this._coopNavigationRequest;
  }
  dispose() {
    import_eventsHelper.eventsHelper.removeEventListeners(this._sessionListeners);
  }
  commit() {
    (0, import_utils.assert)(this._mainFrameId);
    this._wkPage._onFrameAttached(this._mainFrameId, null);
  }
  _onRequestWillBeSent(event) {
    if (this._coopNavigationRequest && this._coopNavigationRequest.url() === event.request.url) {
      this._wkPage._adoptRequestFromNewProcess(this._coopNavigationRequest, this._session, event.requestId);
      return;
    }
    this._wkPage._onRequestWillBeSent(this._session, event);
  }
  _onLoadingFinished(event) {
    this._coopNavigationRequest = void 0;
    this._wkPage._onLoadingFinished(event);
  }
  _onLoadingFailed(event) {
    this._coopNavigationRequest = void 0;
    this._wkPage._onLoadingFailed(this._session, event);
  }
  _handleFrameTree(frameTree) {
    (0, import_utils.assert)(!frameTree.frame.parentId);
    this._mainFrameId = frameTree.frame.id;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WKProvisionalPage
});
