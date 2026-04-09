"use strict";
var E = Object.defineProperty;
var t = Object.getOwnPropertyDescriptor;
var s = Object.getOwnPropertyNames;
var S = Object.prototype.hasOwnProperty;
var T = (O, _) => {
  for (var e in _)
    E(O, e, { get: _[e], enumerable: !0 });
}, n = (O, _, e, r) => {
  if (_ && typeof _ == "object" || typeof _ == "function")
    for (let o of s(_))
      !S.call(O, o) && o !== e && E(O, o, { get: () => _[o], enumerable: !(r = t(_, o)) || r.enumerable });
  return O;
};
var L = (O) => n(E({}, "__esModule", { value: !0 }), O);

// src/preview/globals.ts
var a = {};
T(a, {
  globalPackages: () => y,
  globalsNameReferenceMap: () => R
});
module.exports = L(a);

// src/preview/globals/globals.ts
var R = {
  "@storybook/global": "__STORYBOOK_MODULE_GLOBAL__",
  "storybook/internal/channels": "__STORYBOOK_MODULE_CHANNELS__",
  "@storybook/channels": "__STORYBOOK_MODULE_CHANNELS__",
  "@storybook/core/channels": "__STORYBOOK_MODULE_CHANNELS__",
  "storybook/internal/client-logger": "__STORYBOOK_MODULE_CLIENT_LOGGER__",
  "@storybook/client-logger": "__STORYBOOK_MODULE_CLIENT_LOGGER__",
  "@storybook/core/client-logger": "__STORYBOOK_MODULE_CLIENT_LOGGER__",
  "storybook/internal/core-events": "__STORYBOOK_MODULE_CORE_EVENTS__",
  "@storybook/core-events": "__STORYBOOK_MODULE_CORE_EVENTS__",
  "@storybook/core/core-events": "__STORYBOOK_MODULE_CORE_EVENTS__",
  "storybook/internal/preview-errors": "__STORYBOOK_MODULE_CORE_EVENTS_PREVIEW_ERRORS__",
  "@storybook/core-events/preview-errors": "__STORYBOOK_MODULE_CORE_EVENTS_PREVIEW_ERRORS__",
  "@storybook/core/preview-errors": "__STORYBOOK_MODULE_CORE_EVENTS_PREVIEW_ERRORS__",
  "storybook/internal/preview-api": "__STORYBOOK_MODULE_PREVIEW_API__",
  "@storybook/preview-api": "__STORYBOOK_MODULE_PREVIEW_API__",
  "@storybook/core/preview-api": "__STORYBOOK_MODULE_PREVIEW_API__",
  "storybook/internal/types": "__STORYBOOK_MODULE_TYPES__",
  "@storybook/types": "__STORYBOOK_MODULE_TYPES__",
  "@storybook/core/types": "__STORYBOOK_MODULE_TYPES__"
}, y = Object.keys(R);
