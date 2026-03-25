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
var validator_exports = {};
__export(validator_exports, {
  ValidationError: () => import_validatorPrimitives2.ValidationError,
  createMetadataValidator: () => import_validatorPrimitives2.createMetadataValidator,
  findValidator: () => import_validatorPrimitives2.findValidator,
  maybeFindValidator: () => import_validatorPrimitives2.maybeFindValidator
});
module.exports = __toCommonJS(validator_exports);
var import_validatorPrimitives = require("./validatorPrimitives");
var import_validatorPrimitives2 = require("./validatorPrimitives");
import_validatorPrimitives.scheme.StackFrame = (0, import_validatorPrimitives.tObject)({
  file: import_validatorPrimitives.tString,
  line: import_validatorPrimitives.tInt,
  column: import_validatorPrimitives.tInt,
  function: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.Metadata = (0, import_validatorPrimitives.tObject)({
  location: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    file: import_validatorPrimitives.tString,
    line: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
    column: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
  })),
  title: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  internal: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  stepId: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.ClientSideCallMetadata = (0, import_validatorPrimitives.tObject)({
  id: import_validatorPrimitives.tInt,
  stack: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("StackFrame")))
});
import_validatorPrimitives.scheme.Point = (0, import_validatorPrimitives.tObject)({
  x: import_validatorPrimitives.tFloat,
  y: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.Rect = (0, import_validatorPrimitives.tObject)({
  x: import_validatorPrimitives.tFloat,
  y: import_validatorPrimitives.tFloat,
  width: import_validatorPrimitives.tFloat,
  height: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.SerializedValue = (0, import_validatorPrimitives.tObject)({
  n: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  b: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  s: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  v: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["null", "undefined", "NaN", "Infinity", "-Infinity", "-0"])),
  d: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  u: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  bi: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  ta: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    b: import_validatorPrimitives.tBinary,
    k: (0, import_validatorPrimitives.tEnum)(["i8", "ui8", "ui8c", "i16", "ui16", "i32", "ui32", "f32", "f64", "bi64", "bui64"])
  })),
  e: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    m: import_validatorPrimitives.tString,
    n: import_validatorPrimitives.tString,
    s: import_validatorPrimitives.tString
  })),
  r: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    p: import_validatorPrimitives.tString,
    f: import_validatorPrimitives.tString
  })),
  a: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("SerializedValue"))),
  o: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    k: import_validatorPrimitives.tString,
    v: (0, import_validatorPrimitives.tType)("SerializedValue")
  }))),
  h: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  id: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  ref: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.SerializedArgument = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tType)("SerializedValue"),
  handles: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tChannel)("*"))
});
import_validatorPrimitives.scheme.ExpectedTextValue = (0, import_validatorPrimitives.tObject)({
  string: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  regexSource: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  regexFlags: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  matchSubstring: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  ignoreCase: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  normalizeWhiteSpace: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.SelectorEngine = (0, import_validatorPrimitives.tObject)({
  name: import_validatorPrimitives.tString,
  source: import_validatorPrimitives.tString,
  contentScript: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.SetNetworkCookie = (0, import_validatorPrimitives.tObject)({
  name: import_validatorPrimitives.tString,
  value: import_validatorPrimitives.tString,
  url: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  domain: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  path: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  expires: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  httpOnly: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  secure: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  sameSite: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["Strict", "Lax", "None"])),
  partitionKey: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  _crHasCrossSiteAncestor: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.NetworkCookie = (0, import_validatorPrimitives.tObject)({
  name: import_validatorPrimitives.tString,
  value: import_validatorPrimitives.tString,
  domain: import_validatorPrimitives.tString,
  path: import_validatorPrimitives.tString,
  expires: import_validatorPrimitives.tFloat,
  httpOnly: import_validatorPrimitives.tBoolean,
  secure: import_validatorPrimitives.tBoolean,
  sameSite: (0, import_validatorPrimitives.tEnum)(["Strict", "Lax", "None"]),
  partitionKey: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  _crHasCrossSiteAncestor: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.NameValue = (0, import_validatorPrimitives.tObject)({
  name: import_validatorPrimitives.tString,
  value: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.IndexedDBDatabase = (0, import_validatorPrimitives.tObject)({
  name: import_validatorPrimitives.tString,
  version: import_validatorPrimitives.tInt,
  stores: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    name: import_validatorPrimitives.tString,
    autoIncrement: import_validatorPrimitives.tBoolean,
    keyPath: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    keyPathArray: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)),
    records: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
      key: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tAny),
      keyEncoded: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tAny),
      value: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tAny),
      valueEncoded: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tAny)
    })),
    indexes: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
      name: import_validatorPrimitives.tString,
      keyPath: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
      keyPathArray: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)),
      multiEntry: import_validatorPrimitives.tBoolean,
      unique: import_validatorPrimitives.tBoolean
    }))
  }))
});
import_validatorPrimitives.scheme.SetOriginStorage = (0, import_validatorPrimitives.tObject)({
  origin: import_validatorPrimitives.tString,
  localStorage: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue")),
  indexedDB: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("IndexedDBDatabase")))
});
import_validatorPrimitives.scheme.OriginStorage = (0, import_validatorPrimitives.tObject)({
  origin: import_validatorPrimitives.tString,
  localStorage: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue")),
  indexedDB: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("IndexedDBDatabase")))
});
import_validatorPrimitives.scheme.SerializedError = (0, import_validatorPrimitives.tObject)({
  error: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    message: import_validatorPrimitives.tString,
    name: import_validatorPrimitives.tString,
    stack: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
  })),
  value: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("SerializedValue"))
});
import_validatorPrimitives.scheme.RecordHarOptions = (0, import_validatorPrimitives.tObject)({
  zip: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  content: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["embed", "attach", "omit"])),
  mode: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["full", "minimal"])),
  urlGlob: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  urlRegexSource: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  urlRegexFlags: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.FormField = (0, import_validatorPrimitives.tObject)({
  name: import_validatorPrimitives.tString,
  value: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  file: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    name: import_validatorPrimitives.tString,
    mimeType: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    buffer: import_validatorPrimitives.tBinary
  }))
});
import_validatorPrimitives.scheme.SDKLanguage = (0, import_validatorPrimitives.tEnum)(["javascript", "python", "java", "csharp"]);
import_validatorPrimitives.scheme.APIRequestContextInitializer = (0, import_validatorPrimitives.tObject)({
  tracing: (0, import_validatorPrimitives.tChannel)(["Tracing"])
});
import_validatorPrimitives.scheme.APIRequestContextFetchParams = (0, import_validatorPrimitives.tObject)({
  url: import_validatorPrimitives.tString,
  encodedParams: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  params: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  method: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  headers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  postData: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
  jsonData: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  formData: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  multipartData: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("FormField"))),
  timeout: import_validatorPrimitives.tFloat,
  failOnStatusCode: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  ignoreHTTPSErrors: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  maxRedirects: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  maxRetries: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.APIRequestContextFetchResult = (0, import_validatorPrimitives.tObject)({
  response: (0, import_validatorPrimitives.tType)("APIResponse")
});
import_validatorPrimitives.scheme.APIRequestContextFetchResponseBodyParams = (0, import_validatorPrimitives.tObject)({
  fetchUid: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.APIRequestContextFetchResponseBodyResult = (0, import_validatorPrimitives.tObject)({
  binary: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary)
});
import_validatorPrimitives.scheme.APIRequestContextFetchLogParams = (0, import_validatorPrimitives.tObject)({
  fetchUid: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.APIRequestContextFetchLogResult = (0, import_validatorPrimitives.tObject)({
  log: (0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.APIRequestContextStorageStateParams = (0, import_validatorPrimitives.tObject)({
  indexedDB: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.APIRequestContextStorageStateResult = (0, import_validatorPrimitives.tObject)({
  cookies: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NetworkCookie")),
  origins: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("OriginStorage"))
});
import_validatorPrimitives.scheme.APIRequestContextDisposeAPIResponseParams = (0, import_validatorPrimitives.tObject)({
  fetchUid: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.APIRequestContextDisposeAPIResponseResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.APIRequestContextDisposeParams = (0, import_validatorPrimitives.tObject)({
  reason: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.APIRequestContextDisposeResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.APIResponse = (0, import_validatorPrimitives.tObject)({
  fetchUid: import_validatorPrimitives.tString,
  url: import_validatorPrimitives.tString,
  status: import_validatorPrimitives.tInt,
  statusText: import_validatorPrimitives.tString,
  headers: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))
});
import_validatorPrimitives.scheme.LifecycleEvent = (0, import_validatorPrimitives.tEnum)(["load", "domcontentloaded", "networkidle", "commit"]);
import_validatorPrimitives.scheme.LocalUtilsInitializer = (0, import_validatorPrimitives.tObject)({
  deviceDescriptors: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    name: import_validatorPrimitives.tString,
    descriptor: (0, import_validatorPrimitives.tObject)({
      userAgent: import_validatorPrimitives.tString,
      viewport: (0, import_validatorPrimitives.tObject)({
        width: import_validatorPrimitives.tInt,
        height: import_validatorPrimitives.tInt
      }),
      screen: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
        width: import_validatorPrimitives.tInt,
        height: import_validatorPrimitives.tInt
      })),
      deviceScaleFactor: import_validatorPrimitives.tFloat,
      isMobile: import_validatorPrimitives.tBoolean,
      hasTouch: import_validatorPrimitives.tBoolean,
      defaultBrowserType: (0, import_validatorPrimitives.tEnum)(["chromium", "firefox", "webkit"])
    })
  }))
});
import_validatorPrimitives.scheme.LocalUtilsZipParams = (0, import_validatorPrimitives.tObject)({
  zipFile: import_validatorPrimitives.tString,
  entries: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue")),
  stacksId: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  mode: (0, import_validatorPrimitives.tEnum)(["write", "append"]),
  includeSources: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.LocalUtilsZipResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.LocalUtilsHarOpenParams = (0, import_validatorPrimitives.tObject)({
  file: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.LocalUtilsHarOpenResult = (0, import_validatorPrimitives.tObject)({
  harId: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  error: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.LocalUtilsHarLookupParams = (0, import_validatorPrimitives.tObject)({
  harId: import_validatorPrimitives.tString,
  url: import_validatorPrimitives.tString,
  method: import_validatorPrimitives.tString,
  headers: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue")),
  postData: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
  isNavigationRequest: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.LocalUtilsHarLookupResult = (0, import_validatorPrimitives.tObject)({
  action: (0, import_validatorPrimitives.tEnum)(["error", "redirect", "fulfill", "noentry"]),
  message: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  redirectURL: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  status: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  headers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  body: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary)
});
import_validatorPrimitives.scheme.LocalUtilsHarCloseParams = (0, import_validatorPrimitives.tObject)({
  harId: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.LocalUtilsHarCloseResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.LocalUtilsHarUnzipParams = (0, import_validatorPrimitives.tObject)({
  zipFile: import_validatorPrimitives.tString,
  harFile: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.LocalUtilsHarUnzipResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.LocalUtilsConnectParams = (0, import_validatorPrimitives.tObject)({
  wsEndpoint: import_validatorPrimitives.tString,
  headers: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tAny),
  exposeNetwork: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  slowMo: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  timeout: import_validatorPrimitives.tFloat,
  socksProxyRedirectPortForTest: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.LocalUtilsConnectResult = (0, import_validatorPrimitives.tObject)({
  pipe: (0, import_validatorPrimitives.tChannel)(["JsonPipe"]),
  headers: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))
});
import_validatorPrimitives.scheme.LocalUtilsTracingStartedParams = (0, import_validatorPrimitives.tObject)({
  tracesDir: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  traceName: import_validatorPrimitives.tString,
  live: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.LocalUtilsTracingStartedResult = (0, import_validatorPrimitives.tObject)({
  stacksId: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.LocalUtilsAddStackToTracingNoReplyParams = (0, import_validatorPrimitives.tObject)({
  callData: (0, import_validatorPrimitives.tType)("ClientSideCallMetadata")
});
import_validatorPrimitives.scheme.LocalUtilsAddStackToTracingNoReplyResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.LocalUtilsTraceDiscardedParams = (0, import_validatorPrimitives.tObject)({
  stacksId: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.LocalUtilsTraceDiscardedResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.LocalUtilsGlobToRegexParams = (0, import_validatorPrimitives.tObject)({
  glob: import_validatorPrimitives.tString,
  baseURL: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  webSocketUrl: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.LocalUtilsGlobToRegexResult = (0, import_validatorPrimitives.tObject)({
  regex: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.RootInitializer = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.RootInitializeParams = (0, import_validatorPrimitives.tObject)({
  sdkLanguage: (0, import_validatorPrimitives.tType)("SDKLanguage")
});
import_validatorPrimitives.scheme.RootInitializeResult = (0, import_validatorPrimitives.tObject)({
  playwright: (0, import_validatorPrimitives.tChannel)(["Playwright"])
});
import_validatorPrimitives.scheme.PlaywrightInitializer = (0, import_validatorPrimitives.tObject)({
  chromium: (0, import_validatorPrimitives.tChannel)(["BrowserType"]),
  firefox: (0, import_validatorPrimitives.tChannel)(["BrowserType"]),
  webkit: (0, import_validatorPrimitives.tChannel)(["BrowserType"]),
  android: (0, import_validatorPrimitives.tChannel)(["Android"]),
  electron: (0, import_validatorPrimitives.tChannel)(["Electron"]),
  utils: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["LocalUtils"])),
  preLaunchedBrowser: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Browser"])),
  preConnectedAndroidDevice: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["AndroidDevice"])),
  socksSupport: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["SocksSupport"]))
});
import_validatorPrimitives.scheme.PlaywrightNewRequestParams = (0, import_validatorPrimitives.tObject)({
  baseURL: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  userAgent: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  ignoreHTTPSErrors: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  extraHTTPHeaders: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  failOnStatusCode: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  clientCertificates: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    origin: import_validatorPrimitives.tString,
    cert: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
    key: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
    passphrase: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    pfx: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary)
  }))),
  maxRedirects: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  httpCredentials: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    username: import_validatorPrimitives.tString,
    password: import_validatorPrimitives.tString,
    origin: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    send: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["always", "unauthorized"]))
  })),
  proxy: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    server: import_validatorPrimitives.tString,
    bypass: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    username: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    password: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
  })),
  storageState: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    cookies: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NetworkCookie"))),
    origins: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("SetOriginStorage")))
  })),
  tracesDir: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.PlaywrightNewRequestResult = (0, import_validatorPrimitives.tObject)({
  request: (0, import_validatorPrimitives.tChannel)(["APIRequestContext"])
});
import_validatorPrimitives.scheme.RecorderSource = (0, import_validatorPrimitives.tObject)({
  isRecorded: import_validatorPrimitives.tBoolean,
  id: import_validatorPrimitives.tString,
  label: import_validatorPrimitives.tString,
  text: import_validatorPrimitives.tString,
  language: import_validatorPrimitives.tString,
  highlight: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    line: import_validatorPrimitives.tInt,
    type: import_validatorPrimitives.tString
  })),
  revealLine: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  group: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.DebugControllerInitializer = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.DebugControllerInspectRequestedEvent = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  locator: import_validatorPrimitives.tString,
  ariaSnapshot: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.DebugControllerSetModeRequestedEvent = (0, import_validatorPrimitives.tObject)({
  mode: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.DebugControllerStateChangedEvent = (0, import_validatorPrimitives.tObject)({
  pageCount: import_validatorPrimitives.tInt
});
import_validatorPrimitives.scheme.DebugControllerSourceChangedEvent = (0, import_validatorPrimitives.tObject)({
  text: import_validatorPrimitives.tString,
  header: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  footer: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  actions: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString))
});
import_validatorPrimitives.scheme.DebugControllerPausedEvent = (0, import_validatorPrimitives.tObject)({
  paused: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.DebugControllerInitializeParams = (0, import_validatorPrimitives.tObject)({
  codegenId: import_validatorPrimitives.tString,
  sdkLanguage: (0, import_validatorPrimitives.tType)("SDKLanguage")
});
import_validatorPrimitives.scheme.DebugControllerInitializeResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.DebugControllerSetReportStateChangedParams = (0, import_validatorPrimitives.tObject)({
  enabled: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.DebugControllerSetReportStateChangedResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.DebugControllerSetRecorderModeParams = (0, import_validatorPrimitives.tObject)({
  mode: (0, import_validatorPrimitives.tEnum)(["inspecting", "recording", "none"]),
  testIdAttributeName: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  generateAutoExpect: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.DebugControllerSetRecorderModeResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.DebugControllerHighlightParams = (0, import_validatorPrimitives.tObject)({
  selector: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  ariaTemplate: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.DebugControllerHighlightResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.DebugControllerHideHighlightParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.DebugControllerHideHighlightResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.DebugControllerResumeParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.DebugControllerResumeResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.DebugControllerKillParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.DebugControllerKillResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.SocksSupportInitializer = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.SocksSupportSocksRequestedEvent = (0, import_validatorPrimitives.tObject)({
  uid: import_validatorPrimitives.tString,
  host: import_validatorPrimitives.tString,
  port: import_validatorPrimitives.tInt
});
import_validatorPrimitives.scheme.SocksSupportSocksDataEvent = (0, import_validatorPrimitives.tObject)({
  uid: import_validatorPrimitives.tString,
  data: import_validatorPrimitives.tBinary
});
import_validatorPrimitives.scheme.SocksSupportSocksClosedEvent = (0, import_validatorPrimitives.tObject)({
  uid: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.SocksSupportSocksConnectedParams = (0, import_validatorPrimitives.tObject)({
  uid: import_validatorPrimitives.tString,
  host: import_validatorPrimitives.tString,
  port: import_validatorPrimitives.tInt
});
import_validatorPrimitives.scheme.SocksSupportSocksConnectedResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.SocksSupportSocksFailedParams = (0, import_validatorPrimitives.tObject)({
  uid: import_validatorPrimitives.tString,
  errorCode: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.SocksSupportSocksFailedResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.SocksSupportSocksDataParams = (0, import_validatorPrimitives.tObject)({
  uid: import_validatorPrimitives.tString,
  data: import_validatorPrimitives.tBinary
});
import_validatorPrimitives.scheme.SocksSupportSocksDataResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.SocksSupportSocksErrorParams = (0, import_validatorPrimitives.tObject)({
  uid: import_validatorPrimitives.tString,
  error: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.SocksSupportSocksErrorResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.SocksSupportSocksEndParams = (0, import_validatorPrimitives.tObject)({
  uid: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.SocksSupportSocksEndResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserTypeInitializer = (0, import_validatorPrimitives.tObject)({
  executablePath: import_validatorPrimitives.tString,
  name: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.BrowserTypeLaunchParams = (0, import_validatorPrimitives.tObject)({
  channel: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  executablePath: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  args: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)),
  ignoreAllDefaultArgs: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  ignoreDefaultArgs: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)),
  assistantMode: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  handleSIGINT: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  handleSIGTERM: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  handleSIGHUP: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat,
  env: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  headless: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  proxy: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    server: import_validatorPrimitives.tString,
    bypass: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    username: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    password: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
  })),
  downloadsPath: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  tracesDir: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  chromiumSandbox: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  firefoxUserPrefs: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tAny),
  cdpPort: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  slowMo: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat)
});
import_validatorPrimitives.scheme.BrowserTypeLaunchResult = (0, import_validatorPrimitives.tObject)({
  browser: (0, import_validatorPrimitives.tChannel)(["Browser"])
});
import_validatorPrimitives.scheme.BrowserTypeLaunchPersistentContextParams = (0, import_validatorPrimitives.tObject)({
  channel: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  executablePath: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  args: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)),
  ignoreAllDefaultArgs: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  ignoreDefaultArgs: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)),
  assistantMode: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  handleSIGINT: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  handleSIGTERM: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  handleSIGHUP: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat,
  env: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  headless: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  proxy: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    server: import_validatorPrimitives.tString,
    bypass: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    username: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    password: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
  })),
  downloadsPath: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  tracesDir: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  chromiumSandbox: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  firefoxUserPrefs: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tAny),
  cdpPort: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  noDefaultViewport: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  viewport: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    width: import_validatorPrimitives.tInt,
    height: import_validatorPrimitives.tInt
  })),
  screen: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    width: import_validatorPrimitives.tInt,
    height: import_validatorPrimitives.tInt
  })),
  ignoreHTTPSErrors: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  clientCertificates: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    origin: import_validatorPrimitives.tString,
    cert: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
    key: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
    passphrase: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    pfx: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary)
  }))),
  javaScriptEnabled: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  bypassCSP: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  userAgent: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  locale: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  timezoneId: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  geolocation: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    longitude: import_validatorPrimitives.tFloat,
    latitude: import_validatorPrimitives.tFloat,
    accuracy: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat)
  })),
  permissions: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)),
  extraHTTPHeaders: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  offline: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  httpCredentials: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    username: import_validatorPrimitives.tString,
    password: import_validatorPrimitives.tString,
    origin: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    send: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["always", "unauthorized"]))
  })),
  deviceScaleFactor: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  isMobile: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  hasTouch: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  colorScheme: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["dark", "light", "no-preference", "no-override"])),
  reducedMotion: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["reduce", "no-preference", "no-override"])),
  forcedColors: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["active", "none", "no-override"])),
  acceptDownloads: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["accept", "deny", "internal-browser-default"])),
  contrast: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["no-preference", "more", "no-override"])),
  baseURL: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  recordVideo: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    dir: import_validatorPrimitives.tString,
    size: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
      width: import_validatorPrimitives.tInt,
      height: import_validatorPrimitives.tInt
    }))
  })),
  strictSelectors: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  serviceWorkers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["allow", "block"])),
  selectorEngines: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("SelectorEngine"))),
  testIdAttributeName: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  userDataDir: import_validatorPrimitives.tString,
  slowMo: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat)
});
import_validatorPrimitives.scheme.BrowserTypeLaunchPersistentContextResult = (0, import_validatorPrimitives.tObject)({
  browser: (0, import_validatorPrimitives.tChannel)(["Browser"]),
  context: (0, import_validatorPrimitives.tChannel)(["BrowserContext"])
});
import_validatorPrimitives.scheme.BrowserTypeConnectOverCDPParams = (0, import_validatorPrimitives.tObject)({
  endpointURL: import_validatorPrimitives.tString,
  headers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  slowMo: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  timeout: import_validatorPrimitives.tFloat,
  isLocal: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.BrowserTypeConnectOverCDPResult = (0, import_validatorPrimitives.tObject)({
  browser: (0, import_validatorPrimitives.tChannel)(["Browser"]),
  defaultContext: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["BrowserContext"]))
});
import_validatorPrimitives.scheme.BrowserInitializer = (0, import_validatorPrimitives.tObject)({
  version: import_validatorPrimitives.tString,
  name: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.BrowserContextEvent = (0, import_validatorPrimitives.tObject)({
  context: (0, import_validatorPrimitives.tChannel)(["BrowserContext"])
});
import_validatorPrimitives.scheme.BrowserCloseEvent = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserCloseParams = (0, import_validatorPrimitives.tObject)({
  reason: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.BrowserCloseResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserKillForTestsParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserKillForTestsResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserDefaultUserAgentForTestParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserDefaultUserAgentForTestResult = (0, import_validatorPrimitives.tObject)({
  userAgent: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.BrowserNewContextParams = (0, import_validatorPrimitives.tObject)({
  noDefaultViewport: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  viewport: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    width: import_validatorPrimitives.tInt,
    height: import_validatorPrimitives.tInt
  })),
  screen: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    width: import_validatorPrimitives.tInt,
    height: import_validatorPrimitives.tInt
  })),
  ignoreHTTPSErrors: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  clientCertificates: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    origin: import_validatorPrimitives.tString,
    cert: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
    key: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
    passphrase: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    pfx: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary)
  }))),
  javaScriptEnabled: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  bypassCSP: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  userAgent: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  locale: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  timezoneId: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  geolocation: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    longitude: import_validatorPrimitives.tFloat,
    latitude: import_validatorPrimitives.tFloat,
    accuracy: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat)
  })),
  permissions: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)),
  extraHTTPHeaders: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  offline: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  httpCredentials: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    username: import_validatorPrimitives.tString,
    password: import_validatorPrimitives.tString,
    origin: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    send: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["always", "unauthorized"]))
  })),
  deviceScaleFactor: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  isMobile: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  hasTouch: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  colorScheme: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["dark", "light", "no-preference", "no-override"])),
  reducedMotion: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["reduce", "no-preference", "no-override"])),
  forcedColors: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["active", "none", "no-override"])),
  acceptDownloads: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["accept", "deny", "internal-browser-default"])),
  contrast: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["no-preference", "more", "no-override"])),
  baseURL: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  recordVideo: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    dir: import_validatorPrimitives.tString,
    size: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
      width: import_validatorPrimitives.tInt,
      height: import_validatorPrimitives.tInt
    }))
  })),
  strictSelectors: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  serviceWorkers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["allow", "block"])),
  selectorEngines: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("SelectorEngine"))),
  testIdAttributeName: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  proxy: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    server: import_validatorPrimitives.tString,
    bypass: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    username: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    password: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
  })),
  storageState: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    cookies: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("SetNetworkCookie"))),
    origins: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("SetOriginStorage")))
  }))
});
import_validatorPrimitives.scheme.BrowserNewContextResult = (0, import_validatorPrimitives.tObject)({
  context: (0, import_validatorPrimitives.tChannel)(["BrowserContext"])
});
import_validatorPrimitives.scheme.BrowserNewContextForReuseParams = (0, import_validatorPrimitives.tObject)({
  noDefaultViewport: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  viewport: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    width: import_validatorPrimitives.tInt,
    height: import_validatorPrimitives.tInt
  })),
  screen: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    width: import_validatorPrimitives.tInt,
    height: import_validatorPrimitives.tInt
  })),
  ignoreHTTPSErrors: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  clientCertificates: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    origin: import_validatorPrimitives.tString,
    cert: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
    key: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
    passphrase: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    pfx: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary)
  }))),
  javaScriptEnabled: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  bypassCSP: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  userAgent: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  locale: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  timezoneId: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  geolocation: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    longitude: import_validatorPrimitives.tFloat,
    latitude: import_validatorPrimitives.tFloat,
    accuracy: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat)
  })),
  permissions: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)),
  extraHTTPHeaders: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  offline: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  httpCredentials: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    username: import_validatorPrimitives.tString,
    password: import_validatorPrimitives.tString,
    origin: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    send: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["always", "unauthorized"]))
  })),
  deviceScaleFactor: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  isMobile: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  hasTouch: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  colorScheme: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["dark", "light", "no-preference", "no-override"])),
  reducedMotion: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["reduce", "no-preference", "no-override"])),
  forcedColors: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["active", "none", "no-override"])),
  acceptDownloads: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["accept", "deny", "internal-browser-default"])),
  contrast: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["no-preference", "more", "no-override"])),
  baseURL: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  recordVideo: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    dir: import_validatorPrimitives.tString,
    size: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
      width: import_validatorPrimitives.tInt,
      height: import_validatorPrimitives.tInt
    }))
  })),
  strictSelectors: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  serviceWorkers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["allow", "block"])),
  selectorEngines: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("SelectorEngine"))),
  testIdAttributeName: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  proxy: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    server: import_validatorPrimitives.tString,
    bypass: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    username: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    password: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
  })),
  storageState: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    cookies: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("SetNetworkCookie"))),
    origins: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("SetOriginStorage")))
  }))
});
import_validatorPrimitives.scheme.BrowserNewContextForReuseResult = (0, import_validatorPrimitives.tObject)({
  context: (0, import_validatorPrimitives.tChannel)(["BrowserContext"])
});
import_validatorPrimitives.scheme.BrowserDisconnectFromReusedContextParams = (0, import_validatorPrimitives.tObject)({
  reason: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.BrowserDisconnectFromReusedContextResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserNewBrowserCDPSessionParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserNewBrowserCDPSessionResult = (0, import_validatorPrimitives.tObject)({
  session: (0, import_validatorPrimitives.tChannel)(["CDPSession"])
});
import_validatorPrimitives.scheme.BrowserStartTracingParams = (0, import_validatorPrimitives.tObject)({
  page: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Page"])),
  screenshots: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  categories: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString))
});
import_validatorPrimitives.scheme.BrowserStartTracingResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserStopTracingParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserStopTracingResult = (0, import_validatorPrimitives.tObject)({
  artifact: (0, import_validatorPrimitives.tChannel)(["Artifact"])
});
import_validatorPrimitives.scheme.EventTargetInitializer = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.EventTargetWaitForEventInfoParams = (0, import_validatorPrimitives.tObject)({
  info: (0, import_validatorPrimitives.tObject)({
    waitId: import_validatorPrimitives.tString,
    phase: (0, import_validatorPrimitives.tEnum)(["before", "after", "log"]),
    event: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    message: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    error: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
  })
});
import_validatorPrimitives.scheme.BrowserContextWaitForEventInfoParams = (0, import_validatorPrimitives.tType)("EventTargetWaitForEventInfoParams");
import_validatorPrimitives.scheme.PageWaitForEventInfoParams = (0, import_validatorPrimitives.tType)("EventTargetWaitForEventInfoParams");
import_validatorPrimitives.scheme.WorkerWaitForEventInfoParams = (0, import_validatorPrimitives.tType)("EventTargetWaitForEventInfoParams");
import_validatorPrimitives.scheme.WebSocketWaitForEventInfoParams = (0, import_validatorPrimitives.tType)("EventTargetWaitForEventInfoParams");
import_validatorPrimitives.scheme.ElectronApplicationWaitForEventInfoParams = (0, import_validatorPrimitives.tType)("EventTargetWaitForEventInfoParams");
import_validatorPrimitives.scheme.AndroidDeviceWaitForEventInfoParams = (0, import_validatorPrimitives.tType)("EventTargetWaitForEventInfoParams");
import_validatorPrimitives.scheme.PageAgentWaitForEventInfoParams = (0, import_validatorPrimitives.tType)("EventTargetWaitForEventInfoParams");
import_validatorPrimitives.scheme.EventTargetWaitForEventInfoResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextWaitForEventInfoResult = (0, import_validatorPrimitives.tType)("EventTargetWaitForEventInfoResult");
import_validatorPrimitives.scheme.PageWaitForEventInfoResult = (0, import_validatorPrimitives.tType)("EventTargetWaitForEventInfoResult");
import_validatorPrimitives.scheme.WorkerWaitForEventInfoResult = (0, import_validatorPrimitives.tType)("EventTargetWaitForEventInfoResult");
import_validatorPrimitives.scheme.WebSocketWaitForEventInfoResult = (0, import_validatorPrimitives.tType)("EventTargetWaitForEventInfoResult");
import_validatorPrimitives.scheme.ElectronApplicationWaitForEventInfoResult = (0, import_validatorPrimitives.tType)("EventTargetWaitForEventInfoResult");
import_validatorPrimitives.scheme.AndroidDeviceWaitForEventInfoResult = (0, import_validatorPrimitives.tType)("EventTargetWaitForEventInfoResult");
import_validatorPrimitives.scheme.PageAgentWaitForEventInfoResult = (0, import_validatorPrimitives.tType)("EventTargetWaitForEventInfoResult");
import_validatorPrimitives.scheme.BrowserContextInitializer = (0, import_validatorPrimitives.tObject)({
  isChromium: import_validatorPrimitives.tBoolean,
  requestContext: (0, import_validatorPrimitives.tChannel)(["APIRequestContext"]),
  tracing: (0, import_validatorPrimitives.tChannel)(["Tracing"]),
  options: (0, import_validatorPrimitives.tObject)({
    noDefaultViewport: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
    viewport: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
      width: import_validatorPrimitives.tInt,
      height: import_validatorPrimitives.tInt
    })),
    screen: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
      width: import_validatorPrimitives.tInt,
      height: import_validatorPrimitives.tInt
    })),
    ignoreHTTPSErrors: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
    clientCertificates: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
      origin: import_validatorPrimitives.tString,
      cert: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
      key: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
      passphrase: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
      pfx: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary)
    }))),
    javaScriptEnabled: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
    bypassCSP: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
    userAgent: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    locale: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    timezoneId: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    geolocation: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
      longitude: import_validatorPrimitives.tFloat,
      latitude: import_validatorPrimitives.tFloat,
      accuracy: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat)
    })),
    permissions: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)),
    extraHTTPHeaders: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
    offline: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
    httpCredentials: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
      username: import_validatorPrimitives.tString,
      password: import_validatorPrimitives.tString,
      origin: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
      send: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["always", "unauthorized"]))
    })),
    deviceScaleFactor: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
    isMobile: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
    hasTouch: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
    colorScheme: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["dark", "light", "no-preference", "no-override"])),
    reducedMotion: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["reduce", "no-preference", "no-override"])),
    forcedColors: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["active", "none", "no-override"])),
    acceptDownloads: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["accept", "deny", "internal-browser-default"])),
    contrast: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["no-preference", "more", "no-override"])),
    baseURL: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    recordVideo: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
      dir: import_validatorPrimitives.tString,
      size: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
        width: import_validatorPrimitives.tInt,
        height: import_validatorPrimitives.tInt
      }))
    })),
    strictSelectors: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
    serviceWorkers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["allow", "block"])),
    selectorEngines: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("SelectorEngine"))),
    testIdAttributeName: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
  })
});
import_validatorPrimitives.scheme.BrowserContextBindingCallEvent = (0, import_validatorPrimitives.tObject)({
  binding: (0, import_validatorPrimitives.tChannel)(["BindingCall"])
});
import_validatorPrimitives.scheme.BrowserContextConsoleEvent = (0, import_validatorPrimitives.tObject)({
  type: import_validatorPrimitives.tString,
  text: import_validatorPrimitives.tString,
  args: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tChannel)(["ElementHandle", "JSHandle"])),
  location: (0, import_validatorPrimitives.tObject)({
    url: import_validatorPrimitives.tString,
    lineNumber: import_validatorPrimitives.tInt,
    columnNumber: import_validatorPrimitives.tInt
  }),
  page: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Page"])),
  worker: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Worker"]))
});
import_validatorPrimitives.scheme.BrowserContextCloseEvent = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextDialogEvent = (0, import_validatorPrimitives.tObject)({
  dialog: (0, import_validatorPrimitives.tChannel)(["Dialog"])
});
import_validatorPrimitives.scheme.BrowserContextPageEvent = (0, import_validatorPrimitives.tObject)({
  page: (0, import_validatorPrimitives.tChannel)(["Page"])
});
import_validatorPrimitives.scheme.BrowserContextPageErrorEvent = (0, import_validatorPrimitives.tObject)({
  error: (0, import_validatorPrimitives.tType)("SerializedError"),
  page: (0, import_validatorPrimitives.tChannel)(["Page"])
});
import_validatorPrimitives.scheme.BrowserContextRouteEvent = (0, import_validatorPrimitives.tObject)({
  route: (0, import_validatorPrimitives.tChannel)(["Route"])
});
import_validatorPrimitives.scheme.BrowserContextWebSocketRouteEvent = (0, import_validatorPrimitives.tObject)({
  webSocketRoute: (0, import_validatorPrimitives.tChannel)(["WebSocketRoute"])
});
import_validatorPrimitives.scheme.BrowserContextVideoEvent = (0, import_validatorPrimitives.tObject)({
  artifact: (0, import_validatorPrimitives.tChannel)(["Artifact"])
});
import_validatorPrimitives.scheme.BrowserContextServiceWorkerEvent = (0, import_validatorPrimitives.tObject)({
  worker: (0, import_validatorPrimitives.tChannel)(["Worker"])
});
import_validatorPrimitives.scheme.BrowserContextRequestEvent = (0, import_validatorPrimitives.tObject)({
  request: (0, import_validatorPrimitives.tChannel)(["Request"]),
  page: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Page"]))
});
import_validatorPrimitives.scheme.BrowserContextRequestFailedEvent = (0, import_validatorPrimitives.tObject)({
  request: (0, import_validatorPrimitives.tChannel)(["Request"]),
  failureText: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  responseEndTiming: import_validatorPrimitives.tFloat,
  page: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Page"]))
});
import_validatorPrimitives.scheme.BrowserContextRequestFinishedEvent = (0, import_validatorPrimitives.tObject)({
  request: (0, import_validatorPrimitives.tChannel)(["Request"]),
  response: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Response"])),
  responseEndTiming: import_validatorPrimitives.tFloat,
  page: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Page"]))
});
import_validatorPrimitives.scheme.BrowserContextResponseEvent = (0, import_validatorPrimitives.tObject)({
  response: (0, import_validatorPrimitives.tChannel)(["Response"]),
  page: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Page"]))
});
import_validatorPrimitives.scheme.BrowserContextRecorderEventEvent = (0, import_validatorPrimitives.tObject)({
  event: (0, import_validatorPrimitives.tEnum)(["actionAdded", "actionUpdated", "signalAdded"]),
  data: import_validatorPrimitives.tAny,
  page: (0, import_validatorPrimitives.tChannel)(["Page"]),
  code: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.BrowserContextAddCookiesParams = (0, import_validatorPrimitives.tObject)({
  cookies: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("SetNetworkCookie"))
});
import_validatorPrimitives.scheme.BrowserContextAddCookiesResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextAddInitScriptParams = (0, import_validatorPrimitives.tObject)({
  source: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.BrowserContextAddInitScriptResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextClearCookiesParams = (0, import_validatorPrimitives.tObject)({
  name: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  nameRegexSource: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  nameRegexFlags: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  domain: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  domainRegexSource: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  domainRegexFlags: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  path: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  pathRegexSource: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  pathRegexFlags: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.BrowserContextClearCookiesResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextClearPermissionsParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextClearPermissionsResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextCloseParams = (0, import_validatorPrimitives.tObject)({
  reason: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.BrowserContextCloseResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextCookiesParams = (0, import_validatorPrimitives.tObject)({
  urls: (0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.BrowserContextCookiesResult = (0, import_validatorPrimitives.tObject)({
  cookies: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NetworkCookie"))
});
import_validatorPrimitives.scheme.BrowserContextExposeBindingParams = (0, import_validatorPrimitives.tObject)({
  name: import_validatorPrimitives.tString,
  needsHandle: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.BrowserContextExposeBindingResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextGrantPermissionsParams = (0, import_validatorPrimitives.tObject)({
  permissions: (0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString),
  origin: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.BrowserContextGrantPermissionsResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextNewPageParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextNewPageResult = (0, import_validatorPrimitives.tObject)({
  page: (0, import_validatorPrimitives.tChannel)(["Page"])
});
import_validatorPrimitives.scheme.BrowserContextRegisterSelectorEngineParams = (0, import_validatorPrimitives.tObject)({
  selectorEngine: (0, import_validatorPrimitives.tType)("SelectorEngine")
});
import_validatorPrimitives.scheme.BrowserContextRegisterSelectorEngineResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextSetTestIdAttributeNameParams = (0, import_validatorPrimitives.tObject)({
  testIdAttributeName: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.BrowserContextSetTestIdAttributeNameResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextSetExtraHTTPHeadersParams = (0, import_validatorPrimitives.tObject)({
  headers: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))
});
import_validatorPrimitives.scheme.BrowserContextSetExtraHTTPHeadersResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextSetGeolocationParams = (0, import_validatorPrimitives.tObject)({
  geolocation: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    longitude: import_validatorPrimitives.tFloat,
    latitude: import_validatorPrimitives.tFloat,
    accuracy: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat)
  }))
});
import_validatorPrimitives.scheme.BrowserContextSetGeolocationResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextSetHTTPCredentialsParams = (0, import_validatorPrimitives.tObject)({
  httpCredentials: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    username: import_validatorPrimitives.tString,
    password: import_validatorPrimitives.tString,
    origin: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
  }))
});
import_validatorPrimitives.scheme.BrowserContextSetHTTPCredentialsResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextSetNetworkInterceptionPatternsParams = (0, import_validatorPrimitives.tObject)({
  patterns: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    glob: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    regexSource: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    regexFlags: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
  }))
});
import_validatorPrimitives.scheme.BrowserContextSetNetworkInterceptionPatternsResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextSetWebSocketInterceptionPatternsParams = (0, import_validatorPrimitives.tObject)({
  patterns: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    glob: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    regexSource: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    regexFlags: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
  }))
});
import_validatorPrimitives.scheme.BrowserContextSetWebSocketInterceptionPatternsResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextSetOfflineParams = (0, import_validatorPrimitives.tObject)({
  offline: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.BrowserContextSetOfflineResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextStorageStateParams = (0, import_validatorPrimitives.tObject)({
  indexedDB: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.BrowserContextStorageStateResult = (0, import_validatorPrimitives.tObject)({
  cookies: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NetworkCookie")),
  origins: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("OriginStorage"))
});
import_validatorPrimitives.scheme.BrowserContextPauseParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextPauseResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextEnableRecorderParams = (0, import_validatorPrimitives.tObject)({
  language: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  mode: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["inspecting", "recording"])),
  recorderMode: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["default", "api"])),
  pauseOnNextStatement: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  testIdAttributeName: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  launchOptions: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tAny),
  contextOptions: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tAny),
  device: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  saveStorage: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  outputFile: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  handleSIGINT: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  omitCallTracking: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.BrowserContextEnableRecorderResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextDisableRecorderParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextDisableRecorderResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextExposeConsoleApiParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextExposeConsoleApiResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextNewCDPSessionParams = (0, import_validatorPrimitives.tObject)({
  page: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Page"])),
  frame: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Frame"]))
});
import_validatorPrimitives.scheme.BrowserContextNewCDPSessionResult = (0, import_validatorPrimitives.tObject)({
  session: (0, import_validatorPrimitives.tChannel)(["CDPSession"])
});
import_validatorPrimitives.scheme.BrowserContextHarStartParams = (0, import_validatorPrimitives.tObject)({
  page: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Page"])),
  options: (0, import_validatorPrimitives.tType)("RecordHarOptions")
});
import_validatorPrimitives.scheme.BrowserContextHarStartResult = (0, import_validatorPrimitives.tObject)({
  harId: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.BrowserContextHarExportParams = (0, import_validatorPrimitives.tObject)({
  harId: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.BrowserContextHarExportResult = (0, import_validatorPrimitives.tObject)({
  artifact: (0, import_validatorPrimitives.tChannel)(["Artifact"])
});
import_validatorPrimitives.scheme.BrowserContextCreateTempFilesParams = (0, import_validatorPrimitives.tObject)({
  rootDirName: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  items: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    name: import_validatorPrimitives.tString,
    lastModifiedMs: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat)
  }))
});
import_validatorPrimitives.scheme.BrowserContextCreateTempFilesResult = (0, import_validatorPrimitives.tObject)({
  rootDir: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["WritableStream"])),
  writableStreams: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tChannel)(["WritableStream"]))
});
import_validatorPrimitives.scheme.BrowserContextUpdateSubscriptionParams = (0, import_validatorPrimitives.tObject)({
  event: (0, import_validatorPrimitives.tEnum)(["console", "dialog", "request", "response", "requestFinished", "requestFailed"]),
  enabled: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.BrowserContextUpdateSubscriptionResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextClockFastForwardParams = (0, import_validatorPrimitives.tObject)({
  ticksNumber: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  ticksString: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.BrowserContextClockFastForwardResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextClockInstallParams = (0, import_validatorPrimitives.tObject)({
  timeNumber: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  timeString: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.BrowserContextClockInstallResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextClockPauseAtParams = (0, import_validatorPrimitives.tObject)({
  timeNumber: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  timeString: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.BrowserContextClockPauseAtResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextClockResumeParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextClockResumeResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextClockRunForParams = (0, import_validatorPrimitives.tObject)({
  ticksNumber: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  ticksString: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.BrowserContextClockRunForResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextClockSetFixedTimeParams = (0, import_validatorPrimitives.tObject)({
  timeNumber: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  timeString: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.BrowserContextClockSetFixedTimeResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BrowserContextClockSetSystemTimeParams = (0, import_validatorPrimitives.tObject)({
  timeNumber: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  timeString: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.BrowserContextClockSetSystemTimeResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageInitializer = (0, import_validatorPrimitives.tObject)({
  mainFrame: (0, import_validatorPrimitives.tChannel)(["Frame"]),
  viewportSize: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    width: import_validatorPrimitives.tInt,
    height: import_validatorPrimitives.tInt
  })),
  isClosed: import_validatorPrimitives.tBoolean,
  opener: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Page"]))
});
import_validatorPrimitives.scheme.PageBindingCallEvent = (0, import_validatorPrimitives.tObject)({
  binding: (0, import_validatorPrimitives.tChannel)(["BindingCall"])
});
import_validatorPrimitives.scheme.PageCloseEvent = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageCrashEvent = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageDownloadEvent = (0, import_validatorPrimitives.tObject)({
  url: import_validatorPrimitives.tString,
  suggestedFilename: import_validatorPrimitives.tString,
  artifact: (0, import_validatorPrimitives.tChannel)(["Artifact"])
});
import_validatorPrimitives.scheme.PageViewportSizeChangedEvent = (0, import_validatorPrimitives.tObject)({
  viewportSize: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    width: import_validatorPrimitives.tInt,
    height: import_validatorPrimitives.tInt
  }))
});
import_validatorPrimitives.scheme.PageFileChooserEvent = (0, import_validatorPrimitives.tObject)({
  element: (0, import_validatorPrimitives.tChannel)(["ElementHandle"]),
  isMultiple: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.PageFrameAttachedEvent = (0, import_validatorPrimitives.tObject)({
  frame: (0, import_validatorPrimitives.tChannel)(["Frame"])
});
import_validatorPrimitives.scheme.PageFrameDetachedEvent = (0, import_validatorPrimitives.tObject)({
  frame: (0, import_validatorPrimitives.tChannel)(["Frame"])
});
import_validatorPrimitives.scheme.PageLocatorHandlerTriggeredEvent = (0, import_validatorPrimitives.tObject)({
  uid: import_validatorPrimitives.tInt
});
import_validatorPrimitives.scheme.PageRouteEvent = (0, import_validatorPrimitives.tObject)({
  route: (0, import_validatorPrimitives.tChannel)(["Route"])
});
import_validatorPrimitives.scheme.PageWebSocketRouteEvent = (0, import_validatorPrimitives.tObject)({
  webSocketRoute: (0, import_validatorPrimitives.tChannel)(["WebSocketRoute"])
});
import_validatorPrimitives.scheme.PageVideoEvent = (0, import_validatorPrimitives.tObject)({
  artifact: (0, import_validatorPrimitives.tChannel)(["Artifact"])
});
import_validatorPrimitives.scheme.PageWebSocketEvent = (0, import_validatorPrimitives.tObject)({
  webSocket: (0, import_validatorPrimitives.tChannel)(["WebSocket"])
});
import_validatorPrimitives.scheme.PageWorkerEvent = (0, import_validatorPrimitives.tObject)({
  worker: (0, import_validatorPrimitives.tChannel)(["Worker"])
});
import_validatorPrimitives.scheme.PageAddInitScriptParams = (0, import_validatorPrimitives.tObject)({
  source: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.PageAddInitScriptResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageCloseParams = (0, import_validatorPrimitives.tObject)({
  runBeforeUnload: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  reason: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.PageCloseResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageConsoleMessagesParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageConsoleMessagesResult = (0, import_validatorPrimitives.tObject)({
  messages: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    type: import_validatorPrimitives.tString,
    text: import_validatorPrimitives.tString,
    args: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tChannel)(["ElementHandle", "JSHandle"])),
    location: (0, import_validatorPrimitives.tObject)({
      url: import_validatorPrimitives.tString,
      lineNumber: import_validatorPrimitives.tInt,
      columnNumber: import_validatorPrimitives.tInt
    })
  }))
});
import_validatorPrimitives.scheme.PageEmulateMediaParams = (0, import_validatorPrimitives.tObject)({
  media: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["screen", "print", "no-override"])),
  colorScheme: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["dark", "light", "no-preference", "no-override"])),
  reducedMotion: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["reduce", "no-preference", "no-override"])),
  forcedColors: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["active", "none", "no-override"])),
  contrast: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["no-preference", "more", "no-override"]))
});
import_validatorPrimitives.scheme.PageEmulateMediaResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageExposeBindingParams = (0, import_validatorPrimitives.tObject)({
  name: import_validatorPrimitives.tString,
  needsHandle: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.PageExposeBindingResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageGoBackParams = (0, import_validatorPrimitives.tObject)({
  timeout: import_validatorPrimitives.tFloat,
  waitUntil: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("LifecycleEvent"))
});
import_validatorPrimitives.scheme.PageGoBackResult = (0, import_validatorPrimitives.tObject)({
  response: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Response"]))
});
import_validatorPrimitives.scheme.PageGoForwardParams = (0, import_validatorPrimitives.tObject)({
  timeout: import_validatorPrimitives.tFloat,
  waitUntil: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("LifecycleEvent"))
});
import_validatorPrimitives.scheme.PageGoForwardResult = (0, import_validatorPrimitives.tObject)({
  response: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Response"]))
});
import_validatorPrimitives.scheme.PageRequestGCParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageRequestGCResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageRegisterLocatorHandlerParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  noWaitAfter: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.PageRegisterLocatorHandlerResult = (0, import_validatorPrimitives.tObject)({
  uid: import_validatorPrimitives.tInt
});
import_validatorPrimitives.scheme.PageResolveLocatorHandlerNoReplyParams = (0, import_validatorPrimitives.tObject)({
  uid: import_validatorPrimitives.tInt,
  remove: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.PageResolveLocatorHandlerNoReplyResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageUnregisterLocatorHandlerParams = (0, import_validatorPrimitives.tObject)({
  uid: import_validatorPrimitives.tInt
});
import_validatorPrimitives.scheme.PageUnregisterLocatorHandlerResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageReloadParams = (0, import_validatorPrimitives.tObject)({
  timeout: import_validatorPrimitives.tFloat,
  waitUntil: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("LifecycleEvent"))
});
import_validatorPrimitives.scheme.PageReloadResult = (0, import_validatorPrimitives.tObject)({
  response: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Response"]))
});
import_validatorPrimitives.scheme.PageExpectScreenshotParams = (0, import_validatorPrimitives.tObject)({
  expected: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
  timeout: import_validatorPrimitives.tFloat,
  isNot: import_validatorPrimitives.tBoolean,
  locator: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    frame: (0, import_validatorPrimitives.tChannel)(["Frame"]),
    selector: import_validatorPrimitives.tString
  })),
  comparator: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  maxDiffPixels: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  maxDiffPixelRatio: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  threshold: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  fullPage: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  clip: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Rect")),
  omitBackground: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  caret: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["hide", "initial"])),
  animations: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["disabled", "allow"])),
  scale: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["css", "device"])),
  mask: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    frame: (0, import_validatorPrimitives.tChannel)(["Frame"]),
    selector: import_validatorPrimitives.tString
  }))),
  maskColor: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  style: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.PageExpectScreenshotResult = (0, import_validatorPrimitives.tObject)({
  diff: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
  errorMessage: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  actual: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
  previous: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
  timedOut: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  log: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString))
});
import_validatorPrimitives.scheme.PageScreenshotParams = (0, import_validatorPrimitives.tObject)({
  timeout: import_validatorPrimitives.tFloat,
  type: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["png", "jpeg"])),
  quality: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  fullPage: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  clip: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Rect")),
  omitBackground: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  caret: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["hide", "initial"])),
  animations: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["disabled", "allow"])),
  scale: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["css", "device"])),
  mask: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    frame: (0, import_validatorPrimitives.tChannel)(["Frame"]),
    selector: import_validatorPrimitives.tString
  }))),
  maskColor: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  style: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.PageScreenshotResult = (0, import_validatorPrimitives.tObject)({
  binary: import_validatorPrimitives.tBinary
});
import_validatorPrimitives.scheme.PageSetExtraHTTPHeadersParams = (0, import_validatorPrimitives.tObject)({
  headers: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))
});
import_validatorPrimitives.scheme.PageSetExtraHTTPHeadersResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageSetNetworkInterceptionPatternsParams = (0, import_validatorPrimitives.tObject)({
  patterns: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    glob: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    regexSource: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    regexFlags: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
  }))
});
import_validatorPrimitives.scheme.PageSetNetworkInterceptionPatternsResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageSetWebSocketInterceptionPatternsParams = (0, import_validatorPrimitives.tObject)({
  patterns: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    glob: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    regexSource: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    regexFlags: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
  }))
});
import_validatorPrimitives.scheme.PageSetWebSocketInterceptionPatternsResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageSetViewportSizeParams = (0, import_validatorPrimitives.tObject)({
  viewportSize: (0, import_validatorPrimitives.tObject)({
    width: import_validatorPrimitives.tInt,
    height: import_validatorPrimitives.tInt
  })
});
import_validatorPrimitives.scheme.PageSetViewportSizeResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageKeyboardDownParams = (0, import_validatorPrimitives.tObject)({
  key: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.PageKeyboardDownResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageKeyboardUpParams = (0, import_validatorPrimitives.tObject)({
  key: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.PageKeyboardUpResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageKeyboardInsertTextParams = (0, import_validatorPrimitives.tObject)({
  text: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.PageKeyboardInsertTextResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageKeyboardTypeParams = (0, import_validatorPrimitives.tObject)({
  text: import_validatorPrimitives.tString,
  delay: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat)
});
import_validatorPrimitives.scheme.PageKeyboardTypeResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageKeyboardPressParams = (0, import_validatorPrimitives.tObject)({
  key: import_validatorPrimitives.tString,
  delay: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat)
});
import_validatorPrimitives.scheme.PageKeyboardPressResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageMouseMoveParams = (0, import_validatorPrimitives.tObject)({
  x: import_validatorPrimitives.tFloat,
  y: import_validatorPrimitives.tFloat,
  steps: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.PageMouseMoveResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageMouseDownParams = (0, import_validatorPrimitives.tObject)({
  button: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["left", "right", "middle"])),
  clickCount: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.PageMouseDownResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageMouseUpParams = (0, import_validatorPrimitives.tObject)({
  button: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["left", "right", "middle"])),
  clickCount: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.PageMouseUpResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageMouseClickParams = (0, import_validatorPrimitives.tObject)({
  x: import_validatorPrimitives.tFloat,
  y: import_validatorPrimitives.tFloat,
  delay: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  button: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["left", "right", "middle"])),
  clickCount: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.PageMouseClickResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageMouseWheelParams = (0, import_validatorPrimitives.tObject)({
  deltaX: import_validatorPrimitives.tFloat,
  deltaY: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.PageMouseWheelResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageTouchscreenTapParams = (0, import_validatorPrimitives.tObject)({
  x: import_validatorPrimitives.tFloat,
  y: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.PageTouchscreenTapResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PagePageErrorsParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PagePageErrorsResult = (0, import_validatorPrimitives.tObject)({
  errors: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("SerializedError"))
});
import_validatorPrimitives.scheme.PagePdfParams = (0, import_validatorPrimitives.tObject)({
  scale: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  displayHeaderFooter: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  headerTemplate: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  footerTemplate: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  printBackground: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  landscape: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  pageRanges: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  format: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  width: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  height: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  preferCSSPageSize: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  margin: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    top: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    bottom: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    left: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    right: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
  })),
  tagged: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  outline: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.PagePdfResult = (0, import_validatorPrimitives.tObject)({
  pdf: import_validatorPrimitives.tBinary
});
import_validatorPrimitives.scheme.PageRequestsParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageRequestsResult = (0, import_validatorPrimitives.tObject)({
  requests: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tChannel)(["Request"]))
});
import_validatorPrimitives.scheme.PageSnapshotForAIParams = (0, import_validatorPrimitives.tObject)({
  track: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.PageSnapshotForAIResult = (0, import_validatorPrimitives.tObject)({
  full: import_validatorPrimitives.tString,
  incremental: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.PageStartJSCoverageParams = (0, import_validatorPrimitives.tObject)({
  resetOnNavigation: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  reportAnonymousScripts: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.PageStartJSCoverageResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageStopJSCoverageParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageStopJSCoverageResult = (0, import_validatorPrimitives.tObject)({
  entries: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    url: import_validatorPrimitives.tString,
    scriptId: import_validatorPrimitives.tString,
    source: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    functions: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
      functionName: import_validatorPrimitives.tString,
      isBlockCoverage: import_validatorPrimitives.tBoolean,
      ranges: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
        startOffset: import_validatorPrimitives.tInt,
        endOffset: import_validatorPrimitives.tInt,
        count: import_validatorPrimitives.tInt
      }))
    }))
  }))
});
import_validatorPrimitives.scheme.PageStartCSSCoverageParams = (0, import_validatorPrimitives.tObject)({
  resetOnNavigation: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.PageStartCSSCoverageResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageStopCSSCoverageParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageStopCSSCoverageResult = (0, import_validatorPrimitives.tObject)({
  entries: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    url: import_validatorPrimitives.tString,
    text: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    ranges: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
      start: import_validatorPrimitives.tInt,
      end: import_validatorPrimitives.tInt
    }))
  }))
});
import_validatorPrimitives.scheme.PageBringToFrontParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageBringToFrontResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageUpdateSubscriptionParams = (0, import_validatorPrimitives.tObject)({
  event: (0, import_validatorPrimitives.tEnum)(["console", "dialog", "fileChooser", "request", "response", "requestFinished", "requestFailed"]),
  enabled: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.PageUpdateSubscriptionResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageAgentParams = (0, import_validatorPrimitives.tObject)({
  api: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  apiKey: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  apiEndpoint: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  apiTimeout: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  apiCacheFile: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  cacheFile: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  cacheOutFile: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  doNotRenderActive: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  maxActions: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  maxActionRetries: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  maxTokens: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  model: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  secrets: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  systemPrompt: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.PageAgentResult = (0, import_validatorPrimitives.tObject)({
  agent: (0, import_validatorPrimitives.tChannel)(["PageAgent"])
});
import_validatorPrimitives.scheme.FrameInitializer = (0, import_validatorPrimitives.tObject)({
  url: import_validatorPrimitives.tString,
  name: import_validatorPrimitives.tString,
  parentFrame: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Frame"])),
  loadStates: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("LifecycleEvent"))
});
import_validatorPrimitives.scheme.FrameLoadstateEvent = (0, import_validatorPrimitives.tObject)({
  add: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("LifecycleEvent")),
  remove: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("LifecycleEvent"))
});
import_validatorPrimitives.scheme.FrameNavigatedEvent = (0, import_validatorPrimitives.tObject)({
  url: import_validatorPrimitives.tString,
  name: import_validatorPrimitives.tString,
  newDocument: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    request: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Request"]))
  })),
  error: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.FrameEvalOnSelectorParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  expression: import_validatorPrimitives.tString,
  isFunction: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  arg: (0, import_validatorPrimitives.tType)("SerializedArgument")
});
import_validatorPrimitives.scheme.FrameEvalOnSelectorResult = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tType)("SerializedValue")
});
import_validatorPrimitives.scheme.FrameEvalOnSelectorAllParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  expression: import_validatorPrimitives.tString,
  isFunction: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  arg: (0, import_validatorPrimitives.tType)("SerializedArgument")
});
import_validatorPrimitives.scheme.FrameEvalOnSelectorAllResult = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tType)("SerializedValue")
});
import_validatorPrimitives.scheme.FrameAddScriptTagParams = (0, import_validatorPrimitives.tObject)({
  url: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  content: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  type: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.FrameAddScriptTagResult = (0, import_validatorPrimitives.tObject)({
  element: (0, import_validatorPrimitives.tChannel)(["ElementHandle"])
});
import_validatorPrimitives.scheme.FrameAddStyleTagParams = (0, import_validatorPrimitives.tObject)({
  url: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  content: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.FrameAddStyleTagResult = (0, import_validatorPrimitives.tObject)({
  element: (0, import_validatorPrimitives.tChannel)(["ElementHandle"])
});
import_validatorPrimitives.scheme.FrameAriaSnapshotParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameAriaSnapshotResult = (0, import_validatorPrimitives.tObject)({
  snapshot: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.FrameBlurParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameBlurResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameCheckParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  position: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Point")),
  timeout: import_validatorPrimitives.tFloat,
  trial: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.FrameCheckResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameClickParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  noWaitAfter: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  modifiers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tEnum)(["Alt", "Control", "ControlOrMeta", "Meta", "Shift"]))),
  position: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Point")),
  delay: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  button: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["left", "right", "middle"])),
  clickCount: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  timeout: import_validatorPrimitives.tFloat,
  trial: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  steps: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.FrameClickResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameContentParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameContentResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.FrameDragAndDropParams = (0, import_validatorPrimitives.tObject)({
  source: import_validatorPrimitives.tString,
  target: import_validatorPrimitives.tString,
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat,
  trial: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  sourcePosition: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Point")),
  targetPosition: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Point")),
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  steps: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.FrameDragAndDropResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameDblclickParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  modifiers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tEnum)(["Alt", "Control", "ControlOrMeta", "Meta", "Shift"]))),
  position: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Point")),
  delay: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  button: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["left", "right", "middle"])),
  timeout: import_validatorPrimitives.tFloat,
  trial: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  steps: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.FrameDblclickResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameDispatchEventParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  type: import_validatorPrimitives.tString,
  eventInit: (0, import_validatorPrimitives.tType)("SerializedArgument"),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameDispatchEventResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameEvaluateExpressionParams = (0, import_validatorPrimitives.tObject)({
  expression: import_validatorPrimitives.tString,
  isFunction: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  arg: (0, import_validatorPrimitives.tType)("SerializedArgument")
});
import_validatorPrimitives.scheme.FrameEvaluateExpressionResult = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tType)("SerializedValue")
});
import_validatorPrimitives.scheme.FrameEvaluateExpressionHandleParams = (0, import_validatorPrimitives.tObject)({
  expression: import_validatorPrimitives.tString,
  isFunction: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  arg: (0, import_validatorPrimitives.tType)("SerializedArgument")
});
import_validatorPrimitives.scheme.FrameEvaluateExpressionHandleResult = (0, import_validatorPrimitives.tObject)({
  handle: (0, import_validatorPrimitives.tChannel)(["ElementHandle", "JSHandle"])
});
import_validatorPrimitives.scheme.FrameFillParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  value: import_validatorPrimitives.tString,
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameFillResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameFocusParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameFocusResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameFrameElementParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameFrameElementResult = (0, import_validatorPrimitives.tObject)({
  element: (0, import_validatorPrimitives.tChannel)(["ElementHandle"])
});
import_validatorPrimitives.scheme.FrameResolveSelectorParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.FrameResolveSelectorResult = (0, import_validatorPrimitives.tObject)({
  resolvedSelector: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.FrameHighlightParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.FrameHighlightResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameGetAttributeParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  name: import_validatorPrimitives.tString,
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameGetAttributeResult = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.FrameGotoParams = (0, import_validatorPrimitives.tObject)({
  url: import_validatorPrimitives.tString,
  timeout: import_validatorPrimitives.tFloat,
  waitUntil: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("LifecycleEvent")),
  referer: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.FrameGotoResult = (0, import_validatorPrimitives.tObject)({
  response: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Response"]))
});
import_validatorPrimitives.scheme.FrameHoverParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  modifiers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tEnum)(["Alt", "Control", "ControlOrMeta", "Meta", "Shift"]))),
  position: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Point")),
  timeout: import_validatorPrimitives.tFloat,
  trial: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.FrameHoverResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameInnerHTMLParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameInnerHTMLResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.FrameInnerTextParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameInnerTextResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.FrameInputValueParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameInputValueResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.FrameIsCheckedParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameIsCheckedResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.FrameIsDisabledParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameIsDisabledResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.FrameIsEnabledParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameIsEnabledResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.FrameIsHiddenParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.FrameIsHiddenResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.FrameIsVisibleParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.FrameIsVisibleResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.FrameIsEditableParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameIsEditableResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.FramePressParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  key: import_validatorPrimitives.tString,
  delay: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  noWaitAfter: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FramePressResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameQuerySelectorParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.FrameQuerySelectorResult = (0, import_validatorPrimitives.tObject)({
  element: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["ElementHandle"]))
});
import_validatorPrimitives.scheme.FrameQuerySelectorAllParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.FrameQuerySelectorAllResult = (0, import_validatorPrimitives.tObject)({
  elements: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tChannel)(["ElementHandle"]))
});
import_validatorPrimitives.scheme.FrameQueryCountParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.FrameQueryCountResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tInt
});
import_validatorPrimitives.scheme.FrameSelectOptionParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  elements: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tChannel)(["ElementHandle"]))),
  options: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    valueOrLabel: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    value: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    label: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    index: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
  }))),
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameSelectOptionResult = (0, import_validatorPrimitives.tObject)({
  values: (0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.FrameSetContentParams = (0, import_validatorPrimitives.tObject)({
  html: import_validatorPrimitives.tString,
  timeout: import_validatorPrimitives.tFloat,
  waitUntil: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("LifecycleEvent"))
});
import_validatorPrimitives.scheme.FrameSetContentResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameSetInputFilesParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  payloads: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    name: import_validatorPrimitives.tString,
    mimeType: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    buffer: import_validatorPrimitives.tBinary
  }))),
  localDirectory: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  directoryStream: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["WritableStream"])),
  localPaths: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)),
  streams: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tChannel)(["WritableStream"]))),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameSetInputFilesResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameTapParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  modifiers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tEnum)(["Alt", "Control", "ControlOrMeta", "Meta", "Shift"]))),
  position: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Point")),
  timeout: import_validatorPrimitives.tFloat,
  trial: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.FrameTapResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameTextContentParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameTextContentResult = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.FrameTitleParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameTitleResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.FrameTypeParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  text: import_validatorPrimitives.tString,
  delay: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameTypeResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameUncheckParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  position: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Point")),
  timeout: import_validatorPrimitives.tFloat,
  trial: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.FrameUncheckResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameWaitForTimeoutParams = (0, import_validatorPrimitives.tObject)({
  waitTimeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameWaitForTimeoutResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.FrameWaitForFunctionParams = (0, import_validatorPrimitives.tObject)({
  expression: import_validatorPrimitives.tString,
  isFunction: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  arg: (0, import_validatorPrimitives.tType)("SerializedArgument"),
  timeout: import_validatorPrimitives.tFloat,
  pollingInterval: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat)
});
import_validatorPrimitives.scheme.FrameWaitForFunctionResult = (0, import_validatorPrimitives.tObject)({
  handle: (0, import_validatorPrimitives.tChannel)(["ElementHandle", "JSHandle"])
});
import_validatorPrimitives.scheme.FrameWaitForSelectorParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat,
  state: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["attached", "detached", "visible", "hidden"])),
  omitReturnValue: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.FrameWaitForSelectorResult = (0, import_validatorPrimitives.tObject)({
  element: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["ElementHandle"]))
});
import_validatorPrimitives.scheme.FrameExpectParams = (0, import_validatorPrimitives.tObject)({
  selector: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  expression: import_validatorPrimitives.tString,
  expressionArg: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tAny),
  expectedText: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("ExpectedTextValue"))),
  expectedNumber: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  expectedValue: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("SerializedArgument")),
  useInnerText: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  isNot: import_validatorPrimitives.tBoolean,
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.FrameExpectResult = (0, import_validatorPrimitives.tObject)({
  matches: import_validatorPrimitives.tBoolean,
  received: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("SerializedValue")),
  timedOut: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  errorMessage: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  log: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString))
});
import_validatorPrimitives.scheme.WorkerInitializer = (0, import_validatorPrimitives.tObject)({
  url: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.WorkerCloseEvent = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.WorkerEvaluateExpressionParams = (0, import_validatorPrimitives.tObject)({
  expression: import_validatorPrimitives.tString,
  isFunction: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  arg: (0, import_validatorPrimitives.tType)("SerializedArgument")
});
import_validatorPrimitives.scheme.WorkerEvaluateExpressionResult = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tType)("SerializedValue")
});
import_validatorPrimitives.scheme.WorkerEvaluateExpressionHandleParams = (0, import_validatorPrimitives.tObject)({
  expression: import_validatorPrimitives.tString,
  isFunction: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  arg: (0, import_validatorPrimitives.tType)("SerializedArgument")
});
import_validatorPrimitives.scheme.WorkerEvaluateExpressionHandleResult = (0, import_validatorPrimitives.tObject)({
  handle: (0, import_validatorPrimitives.tChannel)(["ElementHandle", "JSHandle"])
});
import_validatorPrimitives.scheme.WorkerUpdateSubscriptionParams = (0, import_validatorPrimitives.tObject)({
  event: (0, import_validatorPrimitives.tEnum)(["console"]),
  enabled: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.WorkerUpdateSubscriptionResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.JSHandleInitializer = (0, import_validatorPrimitives.tObject)({
  preview: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.JSHandlePreviewUpdatedEvent = (0, import_validatorPrimitives.tObject)({
  preview: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.ElementHandlePreviewUpdatedEvent = (0, import_validatorPrimitives.tType)("JSHandlePreviewUpdatedEvent");
import_validatorPrimitives.scheme.JSHandleDisposeParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleDisposeParams = (0, import_validatorPrimitives.tType)("JSHandleDisposeParams");
import_validatorPrimitives.scheme.JSHandleDisposeResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleDisposeResult = (0, import_validatorPrimitives.tType)("JSHandleDisposeResult");
import_validatorPrimitives.scheme.JSHandleEvaluateExpressionParams = (0, import_validatorPrimitives.tObject)({
  expression: import_validatorPrimitives.tString,
  isFunction: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  arg: (0, import_validatorPrimitives.tType)("SerializedArgument")
});
import_validatorPrimitives.scheme.ElementHandleEvaluateExpressionParams = (0, import_validatorPrimitives.tType)("JSHandleEvaluateExpressionParams");
import_validatorPrimitives.scheme.JSHandleEvaluateExpressionResult = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tType)("SerializedValue")
});
import_validatorPrimitives.scheme.ElementHandleEvaluateExpressionResult = (0, import_validatorPrimitives.tType)("JSHandleEvaluateExpressionResult");
import_validatorPrimitives.scheme.JSHandleEvaluateExpressionHandleParams = (0, import_validatorPrimitives.tObject)({
  expression: import_validatorPrimitives.tString,
  isFunction: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  arg: (0, import_validatorPrimitives.tType)("SerializedArgument")
});
import_validatorPrimitives.scheme.ElementHandleEvaluateExpressionHandleParams = (0, import_validatorPrimitives.tType)("JSHandleEvaluateExpressionHandleParams");
import_validatorPrimitives.scheme.JSHandleEvaluateExpressionHandleResult = (0, import_validatorPrimitives.tObject)({
  handle: (0, import_validatorPrimitives.tChannel)(["ElementHandle", "JSHandle"])
});
import_validatorPrimitives.scheme.ElementHandleEvaluateExpressionHandleResult = (0, import_validatorPrimitives.tType)("JSHandleEvaluateExpressionHandleResult");
import_validatorPrimitives.scheme.JSHandleGetPropertyListParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleGetPropertyListParams = (0, import_validatorPrimitives.tType)("JSHandleGetPropertyListParams");
import_validatorPrimitives.scheme.JSHandleGetPropertyListResult = (0, import_validatorPrimitives.tObject)({
  properties: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    name: import_validatorPrimitives.tString,
    value: (0, import_validatorPrimitives.tChannel)(["ElementHandle", "JSHandle"])
  }))
});
import_validatorPrimitives.scheme.ElementHandleGetPropertyListResult = (0, import_validatorPrimitives.tType)("JSHandleGetPropertyListResult");
import_validatorPrimitives.scheme.JSHandleGetPropertyParams = (0, import_validatorPrimitives.tObject)({
  name: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.ElementHandleGetPropertyParams = (0, import_validatorPrimitives.tType)("JSHandleGetPropertyParams");
import_validatorPrimitives.scheme.JSHandleGetPropertyResult = (0, import_validatorPrimitives.tObject)({
  handle: (0, import_validatorPrimitives.tChannel)(["ElementHandle", "JSHandle"])
});
import_validatorPrimitives.scheme.ElementHandleGetPropertyResult = (0, import_validatorPrimitives.tType)("JSHandleGetPropertyResult");
import_validatorPrimitives.scheme.JSHandleJsonValueParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleJsonValueParams = (0, import_validatorPrimitives.tType)("JSHandleJsonValueParams");
import_validatorPrimitives.scheme.JSHandleJsonValueResult = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tType)("SerializedValue")
});
import_validatorPrimitives.scheme.ElementHandleJsonValueResult = (0, import_validatorPrimitives.tType)("JSHandleJsonValueResult");
import_validatorPrimitives.scheme.ElementHandleInitializer = (0, import_validatorPrimitives.tObject)({
  preview: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.ElementHandleEvalOnSelectorParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  expression: import_validatorPrimitives.tString,
  isFunction: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  arg: (0, import_validatorPrimitives.tType)("SerializedArgument")
});
import_validatorPrimitives.scheme.ElementHandleEvalOnSelectorResult = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tType)("SerializedValue")
});
import_validatorPrimitives.scheme.ElementHandleEvalOnSelectorAllParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  expression: import_validatorPrimitives.tString,
  isFunction: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  arg: (0, import_validatorPrimitives.tType)("SerializedArgument")
});
import_validatorPrimitives.scheme.ElementHandleEvalOnSelectorAllResult = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tType)("SerializedValue")
});
import_validatorPrimitives.scheme.ElementHandleBoundingBoxParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleBoundingBoxResult = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Rect"))
});
import_validatorPrimitives.scheme.ElementHandleCheckParams = (0, import_validatorPrimitives.tObject)({
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  position: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Point")),
  timeout: import_validatorPrimitives.tFloat,
  trial: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.ElementHandleCheckResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleClickParams = (0, import_validatorPrimitives.tObject)({
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  noWaitAfter: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  modifiers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tEnum)(["Alt", "Control", "ControlOrMeta", "Meta", "Shift"]))),
  position: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Point")),
  delay: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  button: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["left", "right", "middle"])),
  clickCount: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  timeout: import_validatorPrimitives.tFloat,
  trial: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  steps: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.ElementHandleClickResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleContentFrameParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleContentFrameResult = (0, import_validatorPrimitives.tObject)({
  frame: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Frame"]))
});
import_validatorPrimitives.scheme.ElementHandleDblclickParams = (0, import_validatorPrimitives.tObject)({
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  modifiers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tEnum)(["Alt", "Control", "ControlOrMeta", "Meta", "Shift"]))),
  position: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Point")),
  delay: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  button: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["left", "right", "middle"])),
  timeout: import_validatorPrimitives.tFloat,
  trial: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  steps: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.ElementHandleDblclickResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleDispatchEventParams = (0, import_validatorPrimitives.tObject)({
  type: import_validatorPrimitives.tString,
  eventInit: (0, import_validatorPrimitives.tType)("SerializedArgument")
});
import_validatorPrimitives.scheme.ElementHandleDispatchEventResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleFillParams = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tString,
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.ElementHandleFillResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleFocusParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleFocusResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleGetAttributeParams = (0, import_validatorPrimitives.tObject)({
  name: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.ElementHandleGetAttributeResult = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.ElementHandleHoverParams = (0, import_validatorPrimitives.tObject)({
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  modifiers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tEnum)(["Alt", "Control", "ControlOrMeta", "Meta", "Shift"]))),
  position: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Point")),
  timeout: import_validatorPrimitives.tFloat,
  trial: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.ElementHandleHoverResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleInnerHTMLParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleInnerHTMLResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.ElementHandleInnerTextParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleInnerTextResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.ElementHandleInputValueParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleInputValueResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.ElementHandleIsCheckedParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleIsCheckedResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.ElementHandleIsDisabledParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleIsDisabledResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.ElementHandleIsEditableParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleIsEditableResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.ElementHandleIsEnabledParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleIsEnabledResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.ElementHandleIsHiddenParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleIsHiddenResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.ElementHandleIsVisibleParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleIsVisibleResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.ElementHandleOwnerFrameParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleOwnerFrameResult = (0, import_validatorPrimitives.tObject)({
  frame: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Frame"]))
});
import_validatorPrimitives.scheme.ElementHandlePressParams = (0, import_validatorPrimitives.tObject)({
  key: import_validatorPrimitives.tString,
  delay: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  timeout: import_validatorPrimitives.tFloat,
  noWaitAfter: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.ElementHandlePressResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleQuerySelectorParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.ElementHandleQuerySelectorResult = (0, import_validatorPrimitives.tObject)({
  element: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["ElementHandle"]))
});
import_validatorPrimitives.scheme.ElementHandleQuerySelectorAllParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.ElementHandleQuerySelectorAllResult = (0, import_validatorPrimitives.tObject)({
  elements: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tChannel)(["ElementHandle"]))
});
import_validatorPrimitives.scheme.ElementHandleScreenshotParams = (0, import_validatorPrimitives.tObject)({
  timeout: import_validatorPrimitives.tFloat,
  type: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["png", "jpeg"])),
  quality: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  omitBackground: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  caret: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["hide", "initial"])),
  animations: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["disabled", "allow"])),
  scale: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["css", "device"])),
  mask: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    frame: (0, import_validatorPrimitives.tChannel)(["Frame"]),
    selector: import_validatorPrimitives.tString
  }))),
  maskColor: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  style: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.ElementHandleScreenshotResult = (0, import_validatorPrimitives.tObject)({
  binary: import_validatorPrimitives.tBinary
});
import_validatorPrimitives.scheme.ElementHandleScrollIntoViewIfNeededParams = (0, import_validatorPrimitives.tObject)({
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.ElementHandleScrollIntoViewIfNeededResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleSelectOptionParams = (0, import_validatorPrimitives.tObject)({
  elements: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tChannel)(["ElementHandle"]))),
  options: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    valueOrLabel: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    value: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    label: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    index: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
  }))),
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.ElementHandleSelectOptionResult = (0, import_validatorPrimitives.tObject)({
  values: (0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.ElementHandleSelectTextParams = (0, import_validatorPrimitives.tObject)({
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.ElementHandleSelectTextResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleSetInputFilesParams = (0, import_validatorPrimitives.tObject)({
  payloads: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    name: import_validatorPrimitives.tString,
    mimeType: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    buffer: import_validatorPrimitives.tBinary
  }))),
  localDirectory: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  directoryStream: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["WritableStream"])),
  localPaths: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)),
  streams: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tChannel)(["WritableStream"]))),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.ElementHandleSetInputFilesResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleTapParams = (0, import_validatorPrimitives.tObject)({
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  modifiers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tEnum)(["Alt", "Control", "ControlOrMeta", "Meta", "Shift"]))),
  position: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Point")),
  timeout: import_validatorPrimitives.tFloat,
  trial: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.ElementHandleTapResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleTextContentParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleTextContentResult = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.ElementHandleTypeParams = (0, import_validatorPrimitives.tObject)({
  text: import_validatorPrimitives.tString,
  delay: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.ElementHandleTypeResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleUncheckParams = (0, import_validatorPrimitives.tObject)({
  force: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  position: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("Point")),
  timeout: import_validatorPrimitives.tFloat,
  trial: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.ElementHandleUncheckResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleWaitForElementStateParams = (0, import_validatorPrimitives.tObject)({
  state: (0, import_validatorPrimitives.tEnum)(["visible", "hidden", "stable", "enabled", "disabled", "editable"]),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.ElementHandleWaitForElementStateResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElementHandleWaitForSelectorParams = (0, import_validatorPrimitives.tObject)({
  selector: import_validatorPrimitives.tString,
  strict: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timeout: import_validatorPrimitives.tFloat,
  state: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["attached", "detached", "visible", "hidden"]))
});
import_validatorPrimitives.scheme.ElementHandleWaitForSelectorResult = (0, import_validatorPrimitives.tObject)({
  element: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["ElementHandle"]))
});
import_validatorPrimitives.scheme.RequestInitializer = (0, import_validatorPrimitives.tObject)({
  frame: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Frame"])),
  serviceWorker: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Worker"])),
  url: import_validatorPrimitives.tString,
  resourceType: import_validatorPrimitives.tString,
  method: import_validatorPrimitives.tString,
  postData: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
  headers: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue")),
  isNavigationRequest: import_validatorPrimitives.tBoolean,
  redirectedFrom: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Request"])),
  hasResponse: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.RequestResponseEvent = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.RequestResponseParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.RequestResponseResult = (0, import_validatorPrimitives.tObject)({
  response: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Response"]))
});
import_validatorPrimitives.scheme.RequestRawRequestHeadersParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.RequestRawRequestHeadersResult = (0, import_validatorPrimitives.tObject)({
  headers: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))
});
import_validatorPrimitives.scheme.RouteInitializer = (0, import_validatorPrimitives.tObject)({
  request: (0, import_validatorPrimitives.tChannel)(["Request"])
});
import_validatorPrimitives.scheme.RouteRedirectNavigationRequestParams = (0, import_validatorPrimitives.tObject)({
  url: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.RouteRedirectNavigationRequestResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.RouteAbortParams = (0, import_validatorPrimitives.tObject)({
  errorCode: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.RouteAbortResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.RouteContinueParams = (0, import_validatorPrimitives.tObject)({
  url: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  method: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  headers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  postData: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
  isFallback: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.RouteContinueResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.RouteFulfillParams = (0, import_validatorPrimitives.tObject)({
  status: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  headers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  body: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  isBase64: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  fetchResponseUid: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.RouteFulfillResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.WebSocketRouteInitializer = (0, import_validatorPrimitives.tObject)({
  url: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.WebSocketRouteMessageFromPageEvent = (0, import_validatorPrimitives.tObject)({
  message: import_validatorPrimitives.tString,
  isBase64: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.WebSocketRouteMessageFromServerEvent = (0, import_validatorPrimitives.tObject)({
  message: import_validatorPrimitives.tString,
  isBase64: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.WebSocketRouteClosePageEvent = (0, import_validatorPrimitives.tObject)({
  code: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  reason: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  wasClean: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.WebSocketRouteCloseServerEvent = (0, import_validatorPrimitives.tObject)({
  code: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  reason: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  wasClean: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.WebSocketRouteConnectParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.WebSocketRouteConnectResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.WebSocketRouteEnsureOpenedParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.WebSocketRouteEnsureOpenedResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.WebSocketRouteSendToPageParams = (0, import_validatorPrimitives.tObject)({
  message: import_validatorPrimitives.tString,
  isBase64: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.WebSocketRouteSendToPageResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.WebSocketRouteSendToServerParams = (0, import_validatorPrimitives.tObject)({
  message: import_validatorPrimitives.tString,
  isBase64: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.WebSocketRouteSendToServerResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.WebSocketRouteClosePageParams = (0, import_validatorPrimitives.tObject)({
  code: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  reason: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  wasClean: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.WebSocketRouteClosePageResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.WebSocketRouteCloseServerParams = (0, import_validatorPrimitives.tObject)({
  code: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  reason: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  wasClean: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.WebSocketRouteCloseServerResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ResourceTiming = (0, import_validatorPrimitives.tObject)({
  startTime: import_validatorPrimitives.tFloat,
  domainLookupStart: import_validatorPrimitives.tFloat,
  domainLookupEnd: import_validatorPrimitives.tFloat,
  connectStart: import_validatorPrimitives.tFloat,
  secureConnectionStart: import_validatorPrimitives.tFloat,
  connectEnd: import_validatorPrimitives.tFloat,
  requestStart: import_validatorPrimitives.tFloat,
  responseStart: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.ResponseInitializer = (0, import_validatorPrimitives.tObject)({
  request: (0, import_validatorPrimitives.tChannel)(["Request"]),
  url: import_validatorPrimitives.tString,
  status: import_validatorPrimitives.tInt,
  statusText: import_validatorPrimitives.tString,
  headers: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue")),
  timing: (0, import_validatorPrimitives.tType)("ResourceTiming"),
  fromServiceWorker: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.ResponseBodyParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ResponseBodyResult = (0, import_validatorPrimitives.tObject)({
  binary: import_validatorPrimitives.tBinary
});
import_validatorPrimitives.scheme.ResponseSecurityDetailsParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ResponseSecurityDetailsResult = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("SecurityDetails"))
});
import_validatorPrimitives.scheme.ResponseServerAddrParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ResponseServerAddrResult = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tType)("RemoteAddr"))
});
import_validatorPrimitives.scheme.ResponseRawResponseHeadersParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ResponseRawResponseHeadersResult = (0, import_validatorPrimitives.tObject)({
  headers: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))
});
import_validatorPrimitives.scheme.ResponseSizesParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ResponseSizesResult = (0, import_validatorPrimitives.tObject)({
  sizes: (0, import_validatorPrimitives.tType)("RequestSizes")
});
import_validatorPrimitives.scheme.SecurityDetails = (0, import_validatorPrimitives.tObject)({
  issuer: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  protocol: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  subjectName: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  validFrom: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  validTo: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat)
});
import_validatorPrimitives.scheme.RequestSizes = (0, import_validatorPrimitives.tObject)({
  requestBodySize: import_validatorPrimitives.tInt,
  requestHeadersSize: import_validatorPrimitives.tInt,
  responseBodySize: import_validatorPrimitives.tInt,
  responseHeadersSize: import_validatorPrimitives.tInt
});
import_validatorPrimitives.scheme.RemoteAddr = (0, import_validatorPrimitives.tObject)({
  ipAddress: import_validatorPrimitives.tString,
  port: import_validatorPrimitives.tInt
});
import_validatorPrimitives.scheme.WebSocketInitializer = (0, import_validatorPrimitives.tObject)({
  url: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.WebSocketOpenEvent = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.WebSocketFrameSentEvent = (0, import_validatorPrimitives.tObject)({
  opcode: import_validatorPrimitives.tInt,
  data: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.WebSocketFrameReceivedEvent = (0, import_validatorPrimitives.tObject)({
  opcode: import_validatorPrimitives.tInt,
  data: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.WebSocketSocketErrorEvent = (0, import_validatorPrimitives.tObject)({
  error: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.WebSocketCloseEvent = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BindingCallInitializer = (0, import_validatorPrimitives.tObject)({
  frame: (0, import_validatorPrimitives.tChannel)(["Frame"]),
  name: import_validatorPrimitives.tString,
  args: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("SerializedValue"))),
  handle: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["ElementHandle", "JSHandle"]))
});
import_validatorPrimitives.scheme.BindingCallRejectParams = (0, import_validatorPrimitives.tObject)({
  error: (0, import_validatorPrimitives.tType)("SerializedError")
});
import_validatorPrimitives.scheme.BindingCallRejectResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.BindingCallResolveParams = (0, import_validatorPrimitives.tObject)({
  result: (0, import_validatorPrimitives.tType)("SerializedArgument")
});
import_validatorPrimitives.scheme.BindingCallResolveResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.DialogInitializer = (0, import_validatorPrimitives.tObject)({
  page: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Page"])),
  type: import_validatorPrimitives.tString,
  message: import_validatorPrimitives.tString,
  defaultValue: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.DialogAcceptParams = (0, import_validatorPrimitives.tObject)({
  promptText: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.DialogAcceptResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.DialogDismissParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.DialogDismissResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.TracingInitializer = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.TracingTracingStartParams = (0, import_validatorPrimitives.tObject)({
  name: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  snapshots: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  screenshots: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  live: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.TracingTracingStartResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.TracingTracingStartChunkParams = (0, import_validatorPrimitives.tObject)({
  name: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  title: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.TracingTracingStartChunkResult = (0, import_validatorPrimitives.tObject)({
  traceName: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.TracingTracingGroupParams = (0, import_validatorPrimitives.tObject)({
  name: import_validatorPrimitives.tString,
  location: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    file: import_validatorPrimitives.tString,
    line: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
    column: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
  }))
});
import_validatorPrimitives.scheme.TracingTracingGroupResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.TracingTracingGroupEndParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.TracingTracingGroupEndResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.TracingTracingStopChunkParams = (0, import_validatorPrimitives.tObject)({
  mode: (0, import_validatorPrimitives.tEnum)(["archive", "discard", "entries"])
});
import_validatorPrimitives.scheme.TracingTracingStopChunkResult = (0, import_validatorPrimitives.tObject)({
  artifact: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tChannel)(["Artifact"])),
  entries: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue")))
});
import_validatorPrimitives.scheme.TracingTracingStopParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.TracingTracingStopResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ArtifactInitializer = (0, import_validatorPrimitives.tObject)({
  absolutePath: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.ArtifactPathAfterFinishedParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ArtifactPathAfterFinishedResult = (0, import_validatorPrimitives.tObject)({
  value: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.ArtifactSaveAsParams = (0, import_validatorPrimitives.tObject)({
  path: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.ArtifactSaveAsResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ArtifactSaveAsStreamParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ArtifactSaveAsStreamResult = (0, import_validatorPrimitives.tObject)({
  stream: (0, import_validatorPrimitives.tChannel)(["Stream"])
});
import_validatorPrimitives.scheme.ArtifactFailureParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ArtifactFailureResult = (0, import_validatorPrimitives.tObject)({
  error: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.ArtifactStreamParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ArtifactStreamResult = (0, import_validatorPrimitives.tObject)({
  stream: (0, import_validatorPrimitives.tChannel)(["Stream"])
});
import_validatorPrimitives.scheme.ArtifactCancelParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ArtifactCancelResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ArtifactDeleteParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ArtifactDeleteResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.StreamInitializer = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.StreamReadParams = (0, import_validatorPrimitives.tObject)({
  size: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.StreamReadResult = (0, import_validatorPrimitives.tObject)({
  binary: import_validatorPrimitives.tBinary
});
import_validatorPrimitives.scheme.StreamCloseParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.StreamCloseResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.WritableStreamInitializer = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.WritableStreamWriteParams = (0, import_validatorPrimitives.tObject)({
  binary: import_validatorPrimitives.tBinary
});
import_validatorPrimitives.scheme.WritableStreamWriteResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.WritableStreamCloseParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.WritableStreamCloseResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.CDPSessionInitializer = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.CDPSessionEventEvent = (0, import_validatorPrimitives.tObject)({
  method: import_validatorPrimitives.tString,
  params: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tAny)
});
import_validatorPrimitives.scheme.CDPSessionSendParams = (0, import_validatorPrimitives.tObject)({
  method: import_validatorPrimitives.tString,
  params: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tAny)
});
import_validatorPrimitives.scheme.CDPSessionSendResult = (0, import_validatorPrimitives.tObject)({
  result: import_validatorPrimitives.tAny
});
import_validatorPrimitives.scheme.CDPSessionDetachParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.CDPSessionDetachResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElectronInitializer = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElectronLaunchParams = (0, import_validatorPrimitives.tObject)({
  executablePath: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  args: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)),
  cwd: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  env: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  timeout: import_validatorPrimitives.tFloat,
  acceptDownloads: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["accept", "deny", "internal-browser-default"])),
  bypassCSP: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  colorScheme: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["dark", "light", "no-preference", "no-override"])),
  extraHTTPHeaders: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  geolocation: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    longitude: import_validatorPrimitives.tFloat,
    latitude: import_validatorPrimitives.tFloat,
    accuracy: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat)
  })),
  httpCredentials: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    username: import_validatorPrimitives.tString,
    password: import_validatorPrimitives.tString,
    origin: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
  })),
  ignoreHTTPSErrors: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  locale: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  offline: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  recordVideo: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    dir: import_validatorPrimitives.tString,
    size: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
      width: import_validatorPrimitives.tInt,
      height: import_validatorPrimitives.tInt
    }))
  })),
  strictSelectors: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  timezoneId: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  tracesDir: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  selectorEngines: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("SelectorEngine"))),
  testIdAttributeName: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.ElectronLaunchResult = (0, import_validatorPrimitives.tObject)({
  electronApplication: (0, import_validatorPrimitives.tChannel)(["ElectronApplication"])
});
import_validatorPrimitives.scheme.ElectronApplicationInitializer = (0, import_validatorPrimitives.tObject)({
  context: (0, import_validatorPrimitives.tChannel)(["BrowserContext"])
});
import_validatorPrimitives.scheme.ElectronApplicationCloseEvent = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.ElectronApplicationConsoleEvent = (0, import_validatorPrimitives.tObject)({
  type: import_validatorPrimitives.tString,
  text: import_validatorPrimitives.tString,
  args: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tChannel)(["ElementHandle", "JSHandle"])),
  location: (0, import_validatorPrimitives.tObject)({
    url: import_validatorPrimitives.tString,
    lineNumber: import_validatorPrimitives.tInt,
    columnNumber: import_validatorPrimitives.tInt
  })
});
import_validatorPrimitives.scheme.ElectronApplicationBrowserWindowParams = (0, import_validatorPrimitives.tObject)({
  page: (0, import_validatorPrimitives.tChannel)(["Page"])
});
import_validatorPrimitives.scheme.ElectronApplicationBrowserWindowResult = (0, import_validatorPrimitives.tObject)({
  handle: (0, import_validatorPrimitives.tChannel)(["ElementHandle", "JSHandle"])
});
import_validatorPrimitives.scheme.ElectronApplicationEvaluateExpressionParams = (0, import_validatorPrimitives.tObject)({
  expression: import_validatorPrimitives.tString,
  isFunction: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  arg: (0, import_validatorPrimitives.tType)("SerializedArgument")
});
import_validatorPrimitives.scheme.ElectronApplicationEvaluateExpressionResult = (0, import_validatorPrimitives.tObject)({
  value: (0, import_validatorPrimitives.tType)("SerializedValue")
});
import_validatorPrimitives.scheme.ElectronApplicationEvaluateExpressionHandleParams = (0, import_validatorPrimitives.tObject)({
  expression: import_validatorPrimitives.tString,
  isFunction: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  arg: (0, import_validatorPrimitives.tType)("SerializedArgument")
});
import_validatorPrimitives.scheme.ElectronApplicationEvaluateExpressionHandleResult = (0, import_validatorPrimitives.tObject)({
  handle: (0, import_validatorPrimitives.tChannel)(["ElementHandle", "JSHandle"])
});
import_validatorPrimitives.scheme.ElectronApplicationUpdateSubscriptionParams = (0, import_validatorPrimitives.tObject)({
  event: (0, import_validatorPrimitives.tEnum)(["console"]),
  enabled: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.ElectronApplicationUpdateSubscriptionResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidInitializer = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDevicesParams = (0, import_validatorPrimitives.tObject)({
  host: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  port: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  omitDriverInstall: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean)
});
import_validatorPrimitives.scheme.AndroidDevicesResult = (0, import_validatorPrimitives.tObject)({
  devices: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tChannel)(["AndroidDevice"]))
});
import_validatorPrimitives.scheme.AndroidSocketInitializer = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidSocketDataEvent = (0, import_validatorPrimitives.tObject)({
  data: import_validatorPrimitives.tBinary
});
import_validatorPrimitives.scheme.AndroidSocketCloseEvent = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidSocketWriteParams = (0, import_validatorPrimitives.tObject)({
  data: import_validatorPrimitives.tBinary
});
import_validatorPrimitives.scheme.AndroidSocketWriteResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidSocketCloseParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidSocketCloseResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceInitializer = (0, import_validatorPrimitives.tObject)({
  model: import_validatorPrimitives.tString,
  serial: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.AndroidDeviceCloseEvent = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceWebViewAddedEvent = (0, import_validatorPrimitives.tObject)({
  webView: (0, import_validatorPrimitives.tType)("AndroidWebView")
});
import_validatorPrimitives.scheme.AndroidDeviceWebViewRemovedEvent = (0, import_validatorPrimitives.tObject)({
  socketName: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.AndroidDeviceWaitParams = (0, import_validatorPrimitives.tObject)({
  androidSelector: (0, import_validatorPrimitives.tType)("AndroidSelector"),
  state: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["gone"])),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.AndroidDeviceWaitResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceFillParams = (0, import_validatorPrimitives.tObject)({
  androidSelector: (0, import_validatorPrimitives.tType)("AndroidSelector"),
  text: import_validatorPrimitives.tString,
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.AndroidDeviceFillResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceTapParams = (0, import_validatorPrimitives.tObject)({
  androidSelector: (0, import_validatorPrimitives.tType)("AndroidSelector"),
  duration: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.AndroidDeviceTapResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceDragParams = (0, import_validatorPrimitives.tObject)({
  androidSelector: (0, import_validatorPrimitives.tType)("AndroidSelector"),
  dest: (0, import_validatorPrimitives.tType)("Point"),
  speed: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.AndroidDeviceDragResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceFlingParams = (0, import_validatorPrimitives.tObject)({
  androidSelector: (0, import_validatorPrimitives.tType)("AndroidSelector"),
  direction: (0, import_validatorPrimitives.tEnum)(["up", "down", "left", "right"]),
  speed: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.AndroidDeviceFlingResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceLongTapParams = (0, import_validatorPrimitives.tObject)({
  androidSelector: (0, import_validatorPrimitives.tType)("AndroidSelector"),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.AndroidDeviceLongTapResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDevicePinchCloseParams = (0, import_validatorPrimitives.tObject)({
  androidSelector: (0, import_validatorPrimitives.tType)("AndroidSelector"),
  percent: import_validatorPrimitives.tFloat,
  speed: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.AndroidDevicePinchCloseResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDevicePinchOpenParams = (0, import_validatorPrimitives.tObject)({
  androidSelector: (0, import_validatorPrimitives.tType)("AndroidSelector"),
  percent: import_validatorPrimitives.tFloat,
  speed: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.AndroidDevicePinchOpenResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceScrollParams = (0, import_validatorPrimitives.tObject)({
  androidSelector: (0, import_validatorPrimitives.tType)("AndroidSelector"),
  direction: (0, import_validatorPrimitives.tEnum)(["up", "down", "left", "right"]),
  percent: import_validatorPrimitives.tFloat,
  speed: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.AndroidDeviceScrollResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceSwipeParams = (0, import_validatorPrimitives.tObject)({
  androidSelector: (0, import_validatorPrimitives.tType)("AndroidSelector"),
  direction: (0, import_validatorPrimitives.tEnum)(["up", "down", "left", "right"]),
  percent: import_validatorPrimitives.tFloat,
  speed: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  timeout: import_validatorPrimitives.tFloat
});
import_validatorPrimitives.scheme.AndroidDeviceSwipeResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceInfoParams = (0, import_validatorPrimitives.tObject)({
  androidSelector: (0, import_validatorPrimitives.tType)("AndroidSelector")
});
import_validatorPrimitives.scheme.AndroidDeviceInfoResult = (0, import_validatorPrimitives.tObject)({
  info: (0, import_validatorPrimitives.tType)("AndroidElementInfo")
});
import_validatorPrimitives.scheme.AndroidDeviceScreenshotParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceScreenshotResult = (0, import_validatorPrimitives.tObject)({
  binary: import_validatorPrimitives.tBinary
});
import_validatorPrimitives.scheme.AndroidDeviceInputTypeParams = (0, import_validatorPrimitives.tObject)({
  text: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.AndroidDeviceInputTypeResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceInputPressParams = (0, import_validatorPrimitives.tObject)({
  key: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.AndroidDeviceInputPressResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceInputTapParams = (0, import_validatorPrimitives.tObject)({
  point: (0, import_validatorPrimitives.tType)("Point")
});
import_validatorPrimitives.scheme.AndroidDeviceInputTapResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceInputSwipeParams = (0, import_validatorPrimitives.tObject)({
  segments: (0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("Point")),
  steps: import_validatorPrimitives.tInt
});
import_validatorPrimitives.scheme.AndroidDeviceInputSwipeResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceInputDragParams = (0, import_validatorPrimitives.tObject)({
  from: (0, import_validatorPrimitives.tType)("Point"),
  to: (0, import_validatorPrimitives.tType)("Point"),
  steps: import_validatorPrimitives.tInt
});
import_validatorPrimitives.scheme.AndroidDeviceInputDragResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceLaunchBrowserParams = (0, import_validatorPrimitives.tObject)({
  noDefaultViewport: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  viewport: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    width: import_validatorPrimitives.tInt,
    height: import_validatorPrimitives.tInt
  })),
  screen: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    width: import_validatorPrimitives.tInt,
    height: import_validatorPrimitives.tInt
  })),
  ignoreHTTPSErrors: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  clientCertificates: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tObject)({
    origin: import_validatorPrimitives.tString,
    cert: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
    key: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary),
    passphrase: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    pfx: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBinary)
  }))),
  javaScriptEnabled: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  bypassCSP: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  userAgent: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  locale: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  timezoneId: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  geolocation: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    longitude: import_validatorPrimitives.tFloat,
    latitude: import_validatorPrimitives.tFloat,
    accuracy: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat)
  })),
  permissions: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)),
  extraHTTPHeaders: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("NameValue"))),
  offline: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  httpCredentials: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    username: import_validatorPrimitives.tString,
    password: import_validatorPrimitives.tString,
    origin: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    send: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["always", "unauthorized"]))
  })),
  deviceScaleFactor: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tFloat),
  isMobile: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  hasTouch: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  colorScheme: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["dark", "light", "no-preference", "no-override"])),
  reducedMotion: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["reduce", "no-preference", "no-override"])),
  forcedColors: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["active", "none", "no-override"])),
  acceptDownloads: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["accept", "deny", "internal-browser-default"])),
  contrast: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["no-preference", "more", "no-override"])),
  baseURL: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  recordVideo: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    dir: import_validatorPrimitives.tString,
    size: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
      width: import_validatorPrimitives.tInt,
      height: import_validatorPrimitives.tInt
    }))
  })),
  strictSelectors: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  serviceWorkers: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tEnum)(["allow", "block"])),
  selectorEngines: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("SelectorEngine"))),
  testIdAttributeName: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  pkg: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  args: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString)),
  proxy: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    server: import_validatorPrimitives.tString,
    bypass: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    username: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
    password: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
  }))
});
import_validatorPrimitives.scheme.AndroidDeviceLaunchBrowserResult = (0, import_validatorPrimitives.tObject)({
  context: (0, import_validatorPrimitives.tChannel)(["BrowserContext"])
});
import_validatorPrimitives.scheme.AndroidDeviceOpenParams = (0, import_validatorPrimitives.tObject)({
  command: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.AndroidDeviceOpenResult = (0, import_validatorPrimitives.tObject)({
  socket: (0, import_validatorPrimitives.tChannel)(["AndroidSocket"])
});
import_validatorPrimitives.scheme.AndroidDeviceShellParams = (0, import_validatorPrimitives.tObject)({
  command: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.AndroidDeviceShellResult = (0, import_validatorPrimitives.tObject)({
  result: import_validatorPrimitives.tBinary
});
import_validatorPrimitives.scheme.AndroidDeviceInstallApkParams = (0, import_validatorPrimitives.tObject)({
  file: import_validatorPrimitives.tBinary,
  args: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)(import_validatorPrimitives.tString))
});
import_validatorPrimitives.scheme.AndroidDeviceInstallApkResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDevicePushParams = (0, import_validatorPrimitives.tObject)({
  file: import_validatorPrimitives.tBinary,
  path: import_validatorPrimitives.tString,
  mode: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.AndroidDevicePushResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceConnectToWebViewParams = (0, import_validatorPrimitives.tObject)({
  socketName: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.AndroidDeviceConnectToWebViewResult = (0, import_validatorPrimitives.tObject)({
  context: (0, import_validatorPrimitives.tChannel)(["BrowserContext"])
});
import_validatorPrimitives.scheme.AndroidDeviceCloseParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidDeviceCloseResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.AndroidWebView = (0, import_validatorPrimitives.tObject)({
  pid: import_validatorPrimitives.tInt,
  pkg: import_validatorPrimitives.tString,
  socketName: import_validatorPrimitives.tString
});
import_validatorPrimitives.scheme.AndroidSelector = (0, import_validatorPrimitives.tObject)({
  checkable: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  checked: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  clazz: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  clickable: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  depth: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  desc: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  enabled: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  focusable: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  focused: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  hasChild: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    androidSelector: (0, import_validatorPrimitives.tType)("AndroidSelector")
  })),
  hasDescendant: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    androidSelector: (0, import_validatorPrimitives.tType)("AndroidSelector"),
    maxDepth: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
  })),
  longClickable: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  pkg: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  res: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  scrollable: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  selected: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tBoolean),
  text: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.AndroidElementInfo = (0, import_validatorPrimitives.tObject)({
  children: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tArray)((0, import_validatorPrimitives.tType)("AndroidElementInfo"))),
  clazz: import_validatorPrimitives.tString,
  desc: import_validatorPrimitives.tString,
  res: import_validatorPrimitives.tString,
  pkg: import_validatorPrimitives.tString,
  text: import_validatorPrimitives.tString,
  bounds: (0, import_validatorPrimitives.tType)("Rect"),
  checkable: import_validatorPrimitives.tBoolean,
  checked: import_validatorPrimitives.tBoolean,
  clickable: import_validatorPrimitives.tBoolean,
  enabled: import_validatorPrimitives.tBoolean,
  focusable: import_validatorPrimitives.tBoolean,
  focused: import_validatorPrimitives.tBoolean,
  longClickable: import_validatorPrimitives.tBoolean,
  scrollable: import_validatorPrimitives.tBoolean,
  selected: import_validatorPrimitives.tBoolean
});
import_validatorPrimitives.scheme.JsonPipeInitializer = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.JsonPipeMessageEvent = (0, import_validatorPrimitives.tObject)({
  message: import_validatorPrimitives.tAny
});
import_validatorPrimitives.scheme.JsonPipeClosedEvent = (0, import_validatorPrimitives.tObject)({
  reason: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString)
});
import_validatorPrimitives.scheme.JsonPipeSendParams = (0, import_validatorPrimitives.tObject)({
  message: import_validatorPrimitives.tAny
});
import_validatorPrimitives.scheme.JsonPipeSendResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.JsonPipeCloseParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.JsonPipeCloseResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageAgentInitializer = (0, import_validatorPrimitives.tObject)({
  page: (0, import_validatorPrimitives.tChannel)(["Page"])
});
import_validatorPrimitives.scheme.PageAgentTurnEvent = (0, import_validatorPrimitives.tObject)({
  role: import_validatorPrimitives.tString,
  message: import_validatorPrimitives.tString,
  usage: (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({
    inputTokens: import_validatorPrimitives.tInt,
    outputTokens: import_validatorPrimitives.tInt
  }))
});
import_validatorPrimitives.scheme.PageAgentPerformParams = (0, import_validatorPrimitives.tObject)({
  task: import_validatorPrimitives.tString,
  maxActions: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  maxActionRetries: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  maxTokens: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  cacheKey: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  timeout: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.PageAgentPerformResult = (0, import_validatorPrimitives.tObject)({
  usage: (0, import_validatorPrimitives.tType)("AgentUsage")
});
import_validatorPrimitives.scheme.PageAgentExpectParams = (0, import_validatorPrimitives.tObject)({
  expectation: import_validatorPrimitives.tString,
  maxActions: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  maxActionRetries: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  maxTokens: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  cacheKey: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  timeout: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.PageAgentExpectResult = (0, import_validatorPrimitives.tObject)({
  usage: (0, import_validatorPrimitives.tType)("AgentUsage")
});
import_validatorPrimitives.scheme.PageAgentExtractParams = (0, import_validatorPrimitives.tObject)({
  query: import_validatorPrimitives.tString,
  schema: import_validatorPrimitives.tAny,
  maxActions: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  maxActionRetries: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  maxTokens: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt),
  cacheKey: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tString),
  timeout: (0, import_validatorPrimitives.tOptional)(import_validatorPrimitives.tInt)
});
import_validatorPrimitives.scheme.PageAgentExtractResult = (0, import_validatorPrimitives.tObject)({
  result: import_validatorPrimitives.tAny,
  usage: (0, import_validatorPrimitives.tType)("AgentUsage")
});
import_validatorPrimitives.scheme.PageAgentDisposeParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageAgentDisposeResult = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageAgentUsageParams = (0, import_validatorPrimitives.tOptional)((0, import_validatorPrimitives.tObject)({}));
import_validatorPrimitives.scheme.PageAgentUsageResult = (0, import_validatorPrimitives.tObject)({
  usage: (0, import_validatorPrimitives.tType)("AgentUsage")
});
import_validatorPrimitives.scheme.AgentUsage = (0, import_validatorPrimitives.tObject)({
  turns: import_validatorPrimitives.tInt,
  inputTokens: import_validatorPrimitives.tInt,
  outputTokens: import_validatorPrimitives.tInt
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ValidationError,
  createMetadataValidator,
  findValidator,
  maybeFindValidator
});
