import { registerDefault as l } from "@ts-graphviz/core";
export * from "@ts-graphviz/core";
import { RootModelsContext as d, createModelsContext as y } from "@ts-graphviz/common";
export * from "@ts-graphviz/common";
import { parse as h, toModel as m, fromModel as g, stringify as b } from "@ts-graphviz/ast";
const j = new Proxy(
  Object.freeze({}),
  {
    get: (r, t) => t
  }
);
function f(r, t) {
  return (...e) => {
    const a = r ? this.Digraph : this.Graph, p = e.find((o) => typeof o == "string"), u = e.find(
      (o) => typeof o == "object"
    ), c = e.find(
      (o) => typeof o == "function"
    ), i = new a(p, t, u);
    return i.with(this), typeof c == "function" && c(i), i;
  };
}
function n(r, t = d) {
  return Object.freeze({
    digraph: f.call(t, !0, r),
    graph: f.call(t, !1, r)
  });
}
const s = n(!1), A = s.digraph, C = s.graph, D = n(!0);
function z(r) {
  const t = y(r);
  return Object.freeze({
    ...n(!1, t),
    strict: n(!0, t)
  });
}
function G(r, t) {
  const e = h(r, t?.parse);
  if (Array.isArray(e) || e.type === "Attribute" || e.type === "AttributeList" || e.type === "Comment" || e.type === "NodeRef" || e.type === "NodeRefGroup" || e.type === "Literal")
    throw new Error();
  return m(e, t?.convert);
}
function O(r, t) {
  const e = g(r, t?.convert);
  return b(e, t?.print);
}
l();
export {
  j as attribute,
  A as digraph,
  G as fromDot,
  C as graph,
  D as strict,
  O as toDot,
  z as withContext
};
