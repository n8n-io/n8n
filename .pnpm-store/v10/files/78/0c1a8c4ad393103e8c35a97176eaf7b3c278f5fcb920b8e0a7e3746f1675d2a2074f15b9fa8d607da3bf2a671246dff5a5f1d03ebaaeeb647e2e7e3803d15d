import e from "deep-eql";

import { findLastIndex as r, findIndex as u } from "lodash-es";

function equals(r, u) {
  return e(r, u);
}

function defaultFilter(e = {}) {
  const t = e.checker || defaultChecker, n = e.filter || null, i = e.removeFromFirst ? r : u;
  return (e, r, u) => i(u, (r => t(r, e, u, u))) === r && (!n || n(e));
}

function defaultChecker(r, u, t, n) {
  return e(r, u);
}

function array_unique(e, r = {}) {
  if (!Array.isArray(e)) throw new TypeError(`Expected an Array but got ${typeof e}.`);
  const u = defaultFilter(r);
  if (r.overwrite) {
    let r = e.length;
    for (;r--; ) u(e[r], r, e) || e.splice(r, 1);
    return e;
  }
  return e.filter(u);
}

function array_unique_overwrite(e, r = {}) {
  return array_unique(e, {
    ...r,
    overwrite: !0
  });
}

function lazy_unique(...e) {
  return array_unique(e.length > 1 ? e : e[0]);
}

function lazy_unique_overwrite(...e) {
  return array_unique_overwrite(e.length > 1 ? e : e[0]);
}

export { array_unique, array_unique_overwrite, lazy_unique as default, defaultChecker, defaultFilter, equals, lazy_unique, lazy_unique_overwrite };
//# sourceMappingURL=index.esm.mjs.map
