// src/jsx/jsx-dev-runtime.ts
import { jsxFn } from "./base.js";
import { Fragment } from "./base.js";
function jsxDEV(tag, props, key) {
  let node;
  if (!props || !("children" in props)) {
    node = jsxFn(tag, props, []);
  } else {
    const children = props.children;
    node = Array.isArray(children) ? jsxFn(tag, props, children) : jsxFn(tag, props, [children]);
  }
  node.key = key;
  return node;
}
export {
  Fragment,
  jsxDEV
};
