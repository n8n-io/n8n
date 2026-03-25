import CJS_COMPAT_NODE_URL_etqjn00nkf from 'node:url';
import CJS_COMPAT_NODE_PATH_etqjn00nkf from 'node:path';
import CJS_COMPAT_NODE_MODULE_etqjn00nkf from "node:module";

var __filename = CJS_COMPAT_NODE_URL_etqjn00nkf.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_etqjn00nkf.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_etqjn00nkf.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------

// ../../node_modules/unist-util-is/lib/index.js
var convert = (
  // Note: overloads in JSDoc can’t yet use different `@template`s.
  /**
   * @type {(
   *   (<Condition extends string>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & {type: Condition}) &
   *   (<Condition extends Props>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Condition) &
   *   (<Condition extends TestFunction>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Predicate<Condition, Node>) &
   *   ((test?: null | undefined) => (node?: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node) &
   *   ((test?: Test) => Check)
   * )}
   */
  /**
   * @param {Test} [test]
   * @returns {Check}
   */
  (function(test) {
    if (test == null)
      return ok;
    if (typeof test == "function")
      return castFactory(test);
    if (typeof test == "object")
      return Array.isArray(test) ? anyFactory(test) : (
        // Cast because `ReadonlyArray` goes into the above but `isArray`
        // narrows to `Array`.
        propertiesFactory(
          /** @type {Props} */
          test
        )
      );
    if (typeof test == "string")
      return typeFactory(test);
    throw new Error("Expected function, string, or object as test");
  })
);
function anyFactory(tests) {
  let checks = [], index = -1;
  for (; ++index < tests.length; )
    checks[index] = convert(tests[index]);
  return castFactory(any);
  function any(...parameters) {
    let index2 = -1;
    for (; ++index2 < checks.length; )
      if (checks[index2].apply(this, parameters)) return !0;
    return !1;
  }
}
function propertiesFactory(check) {
  let checkAsRecord = (
    /** @type {Record<string, unknown>} */
    check
  );
  return castFactory(all);
  function all(node) {
    let nodeAsRecord = (
      /** @type {Record<string, unknown>} */
      /** @type {unknown} */
      node
    ), key;
    for (key in check)
      if (nodeAsRecord[key] !== checkAsRecord[key]) return !1;
    return !0;
  }
}
function typeFactory(check) {
  return castFactory(type);
  function type(node) {
    return node && node.type === check;
  }
}
function castFactory(testFunction) {
  return check;
  function check(value, index, parent) {
    return !!(looksLikeANode(value) && testFunction.call(
      this,
      value,
      typeof index == "number" ? index : void 0,
      parent || void 0
    ));
  }
}
function ok() {
  return !0;
}
function looksLikeANode(value) {
  return value !== null && typeof value == "object" && "type" in value;
}

// ../../node_modules/unist-util-visit-parents/lib/color.node.js
function color(d) {
  return "\x1B[33m" + d + "\x1B[39m";
}

// ../../node_modules/unist-util-visit-parents/lib/index.js
var empty = [], CONTINUE = !0, EXIT = !1, SKIP = "skip";
function visitParents(tree, test, visitor, reverse) {
  let check;
  typeof test == "function" && typeof visitor != "function" ? (reverse = visitor, visitor = test) : check = test;
  let is2 = convert(check), step = reverse ? -1 : 1;
  factory(tree, void 0, [])();
  function factory(node, index, parents) {
    let value = (
      /** @type {Record<string, unknown>} */
      node && typeof node == "object" ? node : {}
    );
    if (typeof value.type == "string") {
      let name = (
        // `hast`
        typeof value.tagName == "string" ? value.tagName : (
          // `xast`
          typeof value.name == "string" ? value.name : void 0
        )
      );
      Object.defineProperty(visit2, "name", {
        value: "node (" + color(node.type + (name ? "<" + name + ">" : "")) + ")"
      });
    }
    return visit2;
    function visit2() {
      let result = empty, subresult, offset, grandparents;
      if ((!test || is2(node, index, parents[parents.length - 1] || void 0)) && (result = toResult(visitor(node, parents)), result[0] === EXIT))
        return result;
      if ("children" in node && node.children) {
        let nodeAsParent = (
          /** @type {UnistParent} */
          node
        );
        if (nodeAsParent.children && result[0] !== SKIP)
          for (offset = (reverse ? nodeAsParent.children.length : -1) + step, grandparents = parents.concat(nodeAsParent); offset > -1 && offset < nodeAsParent.children.length; ) {
            let child = nodeAsParent.children[offset];
            if (subresult = factory(child, offset, grandparents)(), subresult[0] === EXIT)
              return subresult;
            offset = typeof subresult[1] == "number" ? subresult[1] : offset + step;
          }
      }
      return result;
    }
  }
}
function toResult(value) {
  return Array.isArray(value) ? value : typeof value == "number" ? [CONTINUE, value] : value == null ? empty : [value];
}

// ../../node_modules/unist-util-visit/lib/index.js
function visit(tree, testOrVisitor, visitorOrReverse, maybeReverse) {
  let reverse, test, visitor;
  typeof testOrVisitor == "function" && typeof visitorOrReverse != "function" ? (test = void 0, visitor = testOrVisitor, reverse = visitorOrReverse) : (test = testOrVisitor, visitor = visitorOrReverse, reverse = maybeReverse), visitParents(tree, test, overload, reverse);
  function overload(node, parents) {
    let parent = parents[parents.length - 1], index = parent ? parent.children.indexOf(node) : void 0;
    return visitor(node, index, parent);
  }
}

export {
  visit
};
