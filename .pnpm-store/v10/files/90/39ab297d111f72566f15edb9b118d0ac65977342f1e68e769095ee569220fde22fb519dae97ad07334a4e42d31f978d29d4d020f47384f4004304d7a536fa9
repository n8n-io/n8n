// ../node_modules/@storybook/global/dist/index.mjs
var l = (() => {
  let e;
  return typeof window < "u" ? e = window : typeof globalThis < "u" ? e = globalThis : typeof global < "u" ? e = global : typeof self < "u" ?
  e = self : e = {}, e;
})();

// src/core-server/presets/common-manager.ts
import { addons as r } from "@storybook/core/manager-api";
var a = "tag-filters", d = "static-filter";
r.register(a, (e) => {
  let i = Object.entries(l.TAGS_OPTIONS ?? {}).reduce(
    (t, o) => {
      let [s, n] = o;
      return n.excludeFromSidebar && (t[s] = !0), t;
    },
    {}
  );
  e.experimental_setFilter(d, (t) => {
    let o = t.tags ?? [];
    return (
      // we can filter out the primary story, but we still want to show autodocs
      (o.includes("dev") || t.type === "docs") && o.filter((s) => i[s]).length === 0
    );
  });
});
