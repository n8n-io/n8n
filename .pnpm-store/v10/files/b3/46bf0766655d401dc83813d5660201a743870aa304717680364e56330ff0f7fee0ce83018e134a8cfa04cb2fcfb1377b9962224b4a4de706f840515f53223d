// src/jsx/dom/jsx-dev-runtime.ts
import * as intrinsicElementTags from "./intrinsic-element/components.js";
var jsxDEV = (tag, props, key) => {
  if (typeof tag === "string" && intrinsicElementTags[tag]) {
    tag = intrinsicElementTags[tag];
  }
  return {
    tag,
    type: tag,
    props,
    key,
    ref: props.ref
  };
};
var Fragment = (props) => jsxDEV("", props, void 0);
export {
  Fragment,
  jsxDEV
};
