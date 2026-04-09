"use strict";
var d = Object.defineProperty;
var y = Object.getOwnPropertyDescriptor;
var i = Object.getOwnPropertyNames;
var s = Object.prototype.hasOwnProperty;
var A = (t, e) => {
  for (var n in e)
    d(t, n, { get: e[n], enumerable: !0 });
}, T = (t, e, n, a) => {
  if (e && typeof e == "object" || typeof e == "function")
    for (let o of i(e))
      !s.call(t, o) && o !== n && d(t, o, { get: () => e[o], enumerable: !(a = y(e, o)) || a.enumerable });
  return t;
};
var _ = (t) => T(d({}, "__esModule", { value: !0 }), t);

// src/types/index.ts
var m = {};
A(m, {
  Addon_TypesEnum: () => p
});
module.exports = _(m);

// src/types/modules/addons.ts
var p = /* @__PURE__ */ ((r) => (r.TAB = "tab", r.PANEL = "panel", r.TOOL = "tool", r.TOOLEXTRA = "toolextra", r.PREVIEW = "preview", r.experimental_PAGE =
"page", r.experimental_SIDEBAR_BOTTOM = "sidebar-bottom", r.experimental_SIDEBAR_TOP = "sidebar-top", r.experimental_TEST_PROVIDER = "test-p\
rovider", r))(p || {});
