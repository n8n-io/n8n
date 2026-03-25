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
var bidiProtocolCore_exports = {};
__export(bidiProtocolCore_exports, {
  BrowsingContext: () => BrowsingContext,
  Emulation: () => Emulation,
  ErrorCode: () => ErrorCode,
  Input: () => Input,
  Log: () => Log,
  Network: () => Network,
  Script: () => Script,
  Session: () => Session
});
module.exports = __toCommonJS(bidiProtocolCore_exports);
var ErrorCode = /* @__PURE__ */ ((ErrorCode2) => {
  ErrorCode2["InvalidArgument"] = "invalid argument";
  ErrorCode2["InvalidSelector"] = "invalid selector";
  ErrorCode2["InvalidSessionId"] = "invalid session id";
  ErrorCode2["InvalidWebExtension"] = "invalid web extension";
  ErrorCode2["MoveTargetOutOfBounds"] = "move target out of bounds";
  ErrorCode2["NoSuchAlert"] = "no such alert";
  ErrorCode2["NoSuchNetworkCollector"] = "no such network collector";
  ErrorCode2["NoSuchElement"] = "no such element";
  ErrorCode2["NoSuchFrame"] = "no such frame";
  ErrorCode2["NoSuchHandle"] = "no such handle";
  ErrorCode2["NoSuchHistoryEntry"] = "no such history entry";
  ErrorCode2["NoSuchIntercept"] = "no such intercept";
  ErrorCode2["NoSuchNetworkData"] = "no such network data";
  ErrorCode2["NoSuchNode"] = "no such node";
  ErrorCode2["NoSuchRequest"] = "no such request";
  ErrorCode2["NoSuchScript"] = "no such script";
  ErrorCode2["NoSuchStoragePartition"] = "no such storage partition";
  ErrorCode2["NoSuchUserContext"] = "no such user context";
  ErrorCode2["NoSuchWebExtension"] = "no such web extension";
  ErrorCode2["SessionNotCreated"] = "session not created";
  ErrorCode2["UnableToCaptureScreen"] = "unable to capture screen";
  ErrorCode2["UnableToCloseBrowser"] = "unable to close browser";
  ErrorCode2["UnableToSetCookie"] = "unable to set cookie";
  ErrorCode2["UnableToSetFileInput"] = "unable to set file input";
  ErrorCode2["UnavailableNetworkData"] = "unavailable network data";
  ErrorCode2["UnderspecifiedStoragePartition"] = "underspecified storage partition";
  ErrorCode2["UnknownCommand"] = "unknown command";
  ErrorCode2["UnknownError"] = "unknown error";
  ErrorCode2["UnsupportedOperation"] = "unsupported operation";
  return ErrorCode2;
})(ErrorCode || {});
var Session;
((Session2) => {
  let UserPromptHandlerType;
  ((UserPromptHandlerType2) => {
    UserPromptHandlerType2["Accept"] = "accept";
    UserPromptHandlerType2["Dismiss"] = "dismiss";
    UserPromptHandlerType2["Ignore"] = "ignore";
  })(UserPromptHandlerType = Session2.UserPromptHandlerType || (Session2.UserPromptHandlerType = {}));
})(Session || (Session = {}));
var BrowsingContext;
((BrowsingContext2) => {
  let ReadinessState;
  ((ReadinessState2) => {
    ReadinessState2["None"] = "none";
    ReadinessState2["Interactive"] = "interactive";
    ReadinessState2["Complete"] = "complete";
  })(ReadinessState = BrowsingContext2.ReadinessState || (BrowsingContext2.ReadinessState = {}));
})(BrowsingContext || (BrowsingContext = {}));
((BrowsingContext2) => {
  let UserPromptType;
  ((UserPromptType2) => {
    UserPromptType2["Alert"] = "alert";
    UserPromptType2["Beforeunload"] = "beforeunload";
    UserPromptType2["Confirm"] = "confirm";
    UserPromptType2["Prompt"] = "prompt";
  })(UserPromptType = BrowsingContext2.UserPromptType || (BrowsingContext2.UserPromptType = {}));
})(BrowsingContext || (BrowsingContext = {}));
((BrowsingContext2) => {
  let CreateType;
  ((CreateType2) => {
    CreateType2["Tab"] = "tab";
    CreateType2["Window"] = "window";
  })(CreateType = BrowsingContext2.CreateType || (BrowsingContext2.CreateType = {}));
})(BrowsingContext || (BrowsingContext = {}));
var Emulation;
((Emulation2) => {
  let ForcedColorsModeTheme;
  ((ForcedColorsModeTheme2) => {
    ForcedColorsModeTheme2["Light"] = "light";
    ForcedColorsModeTheme2["Dark"] = "dark";
  })(ForcedColorsModeTheme = Emulation2.ForcedColorsModeTheme || (Emulation2.ForcedColorsModeTheme = {}));
})(Emulation || (Emulation = {}));
((Emulation2) => {
  let ScreenOrientationNatural;
  ((ScreenOrientationNatural2) => {
    ScreenOrientationNatural2["Portrait"] = "portrait";
    ScreenOrientationNatural2["Landscape"] = "landscape";
  })(ScreenOrientationNatural = Emulation2.ScreenOrientationNatural || (Emulation2.ScreenOrientationNatural = {}));
})(Emulation || (Emulation = {}));
var Network;
((Network2) => {
  let CollectorType;
  ((CollectorType2) => {
    CollectorType2["Blob"] = "blob";
  })(CollectorType = Network2.CollectorType || (Network2.CollectorType = {}));
})(Network || (Network = {}));
((Network2) => {
  let SameSite;
  ((SameSite2) => {
    SameSite2["Strict"] = "strict";
    SameSite2["Lax"] = "lax";
    SameSite2["None"] = "none";
    SameSite2["Default"] = "default";
  })(SameSite = Network2.SameSite || (Network2.SameSite = {}));
})(Network || (Network = {}));
((Network2) => {
  let DataType;
  ((DataType2) => {
    DataType2["Request"] = "request";
    DataType2["Response"] = "response";
  })(DataType = Network2.DataType || (Network2.DataType = {}));
})(Network || (Network = {}));
((Network2) => {
  let InterceptPhase;
  ((InterceptPhase2) => {
    InterceptPhase2["BeforeRequestSent"] = "beforeRequestSent";
    InterceptPhase2["ResponseStarted"] = "responseStarted";
    InterceptPhase2["AuthRequired"] = "authRequired";
  })(InterceptPhase = Network2.InterceptPhase || (Network2.InterceptPhase = {}));
})(Network || (Network = {}));
var Script;
((Script2) => {
  let ResultOwnership;
  ((ResultOwnership2) => {
    ResultOwnership2["Root"] = "root";
    ResultOwnership2["None"] = "none";
  })(ResultOwnership = Script2.ResultOwnership || (Script2.ResultOwnership = {}));
})(Script || (Script = {}));
var Log;
((Log2) => {
  let Level;
  ((Level2) => {
    Level2["Debug"] = "debug";
    Level2["Info"] = "info";
    Level2["Warn"] = "warn";
    Level2["Error"] = "error";
  })(Level = Log2.Level || (Log2.Level = {}));
})(Log || (Log = {}));
var Input;
((Input2) => {
  let PointerType;
  ((PointerType2) => {
    PointerType2["Mouse"] = "mouse";
    PointerType2["Pen"] = "pen";
    PointerType2["Touch"] = "touch";
  })(PointerType = Input2.PointerType || (Input2.PointerType = {}));
})(Input || (Input = {}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BrowsingContext,
  Emulation,
  ErrorCode,
  Input,
  Log,
  Network,
  Script,
  Session
});
