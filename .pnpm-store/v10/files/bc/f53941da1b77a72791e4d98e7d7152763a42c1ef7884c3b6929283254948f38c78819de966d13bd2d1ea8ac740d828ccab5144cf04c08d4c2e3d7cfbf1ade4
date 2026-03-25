var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var base_exports = {};
__export(base_exports, {
  Fragment: () => Fragment,
  JSXFragmentNode: () => JSXFragmentNode,
  JSXNode: () => JSXNode,
  booleanAttributes: () => booleanAttributes,
  cloneElement: () => cloneElement,
  getNameSpaceContext: () => getNameSpaceContext,
  isValidElement: () => isValidElement,
  jsx: () => jsx,
  jsxFn: () => jsxFn,
  memo: () => memo,
  reactAPICompatVersion: () => reactAPICompatVersion,
  shallowEqual: () => shallowEqual
});
module.exports = __toCommonJS(base_exports);
var import_html = require("../helper/html");
var import_html2 = require("../utils/html");
var import_constants = require("./constants");
var import_context = require("./context");
var import_common = require("./intrinsic-element/common");
var intrinsicElementTags = __toESM(require("./intrinsic-element/components"), 1);
var import_utils = require("./utils");
let nameSpaceContext = void 0;
const getNameSpaceContext = () => nameSpaceContext;
const toSVGAttributeName = (key) => /[A-Z]/.test(key) && // Presentation attributes are findable in style object. "clip-path", "font-size", "stroke-width", etc.
// Or other un-deprecated kebab-case attributes. "overline-position", "paint-order", "strikethrough-position", etc.
key.match(
  /^(?:al|basel|clip(?:Path|Rule)$|co|do|fill|fl|fo|gl|let|lig|i|marker[EMS]|o|pai|pointe|sh|st[or]|text[^L]|tr|u|ve|w)/
) ? key.replace(/([A-Z])/g, "-$1").toLowerCase() : key;
const emptyTags = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
];
const booleanAttributes = [
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "download",
  "formnovalidate",
  "hidden",
  "inert",
  "ismap",
  "itemscope",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected"
];
const childrenToStringToBuffer = (children, buffer) => {
  for (let i = 0, len = children.length; i < len; i++) {
    const child = children[i];
    if (typeof child === "string") {
      (0, import_html2.escapeToBuffer)(child, buffer);
    } else if (typeof child === "boolean" || child === null || child === void 0) {
      continue;
    } else if (child instanceof JSXNode) {
      child.toStringToBuffer(buffer);
    } else if (typeof child === "number" || child.isEscaped) {
      ;
      buffer[0] += child;
    } else if (child instanceof Promise) {
      buffer.unshift("", child);
    } else {
      childrenToStringToBuffer(child, buffer);
    }
  }
};
class JSXNode {
  tag;
  props;
  key;
  children;
  isEscaped = true;
  localContexts;
  constructor(tag, props, children) {
    this.tag = tag;
    this.props = props;
    this.children = children;
  }
  get type() {
    return this.tag;
  }
  // Added for compatibility with libraries that rely on React's internal structure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get ref() {
    return this.props.ref || null;
  }
  toString() {
    const buffer = [""];
    this.localContexts?.forEach(([context, value]) => {
      context.values.push(value);
    });
    try {
      this.toStringToBuffer(buffer);
    } finally {
      this.localContexts?.forEach(([context]) => {
        context.values.pop();
      });
    }
    return buffer.length === 1 ? "callbacks" in buffer ? (0, import_html2.resolveCallbackSync)((0, import_html.raw)(buffer[0], buffer.callbacks)).toString() : buffer[0] : (0, import_html2.stringBufferToString)(buffer, buffer.callbacks);
  }
  toStringToBuffer(buffer) {
    const tag = this.tag;
    const props = this.props;
    let { children } = this;
    buffer[0] += `<${tag}`;
    const normalizeKey = nameSpaceContext && (0, import_context.useContext)(nameSpaceContext) === "svg" ? (key) => toSVGAttributeName((0, import_utils.normalizeIntrinsicElementKey)(key)) : (key) => (0, import_utils.normalizeIntrinsicElementKey)(key);
    for (let [key, v] of Object.entries(props)) {
      key = normalizeKey(key);
      if (key === "children") {
      } else if (key === "style" && typeof v === "object") {
        let styleStr = "";
        (0, import_utils.styleObjectForEach)(v, (property, value) => {
          if (value != null) {
            styleStr += `${styleStr ? ";" : ""}${property}:${value}`;
          }
        });
        buffer[0] += ' style="';
        (0, import_html2.escapeToBuffer)(styleStr, buffer);
        buffer[0] += '"';
      } else if (typeof v === "string") {
        buffer[0] += ` ${key}="`;
        (0, import_html2.escapeToBuffer)(v, buffer);
        buffer[0] += '"';
      } else if (v === null || v === void 0) {
      } else if (typeof v === "number" || v.isEscaped) {
        buffer[0] += ` ${key}="${v}"`;
      } else if (typeof v === "boolean" && booleanAttributes.includes(key)) {
        if (v) {
          buffer[0] += ` ${key}=""`;
        }
      } else if (key === "dangerouslySetInnerHTML") {
        if (children.length > 0) {
          throw new Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
        }
        children = [(0, import_html.raw)(v.__html)];
      } else if (v instanceof Promise) {
        buffer[0] += ` ${key}="`;
        buffer.unshift('"', v);
      } else if (typeof v === "function") {
        if (!key.startsWith("on") && key !== "ref") {
          throw new Error(`Invalid prop '${key}' of type 'function' supplied to '${tag}'.`);
        }
      } else {
        buffer[0] += ` ${key}="`;
        (0, import_html2.escapeToBuffer)(v.toString(), buffer);
        buffer[0] += '"';
      }
    }
    if (emptyTags.includes(tag) && children.length === 0) {
      buffer[0] += "/>";
      return;
    }
    buffer[0] += ">";
    childrenToStringToBuffer(children, buffer);
    buffer[0] += `</${tag}>`;
  }
}
class JSXFunctionNode extends JSXNode {
  toStringToBuffer(buffer) {
    const { children } = this;
    const props = { ...this.props };
    if (children.length) {
      props.children = children.length === 1 ? children[0] : children;
    }
    const res = this.tag.call(null, props);
    if (typeof res === "boolean" || res == null) {
      return;
    } else if (res instanceof Promise) {
      if (import_context.globalContexts.length === 0) {
        buffer.unshift("", res);
      } else {
        const currentContexts = import_context.globalContexts.map((c) => [c, c.values.at(-1)]);
        buffer.unshift(
          "",
          res.then((childRes) => {
            if (childRes instanceof JSXNode) {
              childRes.localContexts = currentContexts;
            }
            return childRes;
          })
        );
      }
    } else if (res instanceof JSXNode) {
      res.toStringToBuffer(buffer);
    } else if (typeof res === "number" || res.isEscaped) {
      buffer[0] += res;
      if (res.callbacks) {
        buffer.callbacks ||= [];
        buffer.callbacks.push(...res.callbacks);
      }
    } else {
      (0, import_html2.escapeToBuffer)(res, buffer);
    }
  }
}
class JSXFragmentNode extends JSXNode {
  toStringToBuffer(buffer) {
    childrenToStringToBuffer(this.children, buffer);
  }
}
const jsx = (tag, props, ...children) => {
  props ??= {};
  if (children.length) {
    props.children = children.length === 1 ? children[0] : children;
  }
  const key = props.key;
  delete props["key"];
  const node = jsxFn(tag, props, children);
  node.key = key;
  return node;
};
let initDomRenderer = false;
const jsxFn = (tag, props, children) => {
  if (!initDomRenderer) {
    for (const k in import_common.domRenderers) {
      ;
      intrinsicElementTags[k][import_constants.DOM_RENDERER] = import_common.domRenderers[k];
    }
    initDomRenderer = true;
  }
  if (typeof tag === "function") {
    return new JSXFunctionNode(tag, props, children);
  } else if (intrinsicElementTags[tag]) {
    return new JSXFunctionNode(
      intrinsicElementTags[tag],
      props,
      children
    );
  } else if (tag === "svg" || tag === "head") {
    nameSpaceContext ||= (0, import_context.createContext)("");
    return new JSXNode(tag, props, [
      new JSXFunctionNode(
        nameSpaceContext,
        {
          value: tag
        },
        children
      )
    ]);
  } else {
    return new JSXNode(tag, props, children);
  }
};
const shallowEqual = (a, b) => {
  if (a === b) {
    return true;
  }
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  for (let i = 0, len = aKeys.length; i < len; i++) {
    if (aKeys[i] === "children" && bKeys[i] === "children" && !a.children?.length && !b.children?.length) {
      continue;
    } else if (a[aKeys[i]] !== b[aKeys[i]]) {
      return false;
    }
  }
  return true;
};
const memo = (component, propsAreEqual = shallowEqual) => {
  let computed = null;
  let prevProps = void 0;
  const wrapper = ((props) => {
    if (prevProps && !propsAreEqual(prevProps, props)) {
      computed = null;
    }
    prevProps = props;
    return computed ||= component(props);
  });
  wrapper[import_constants.DOM_MEMO] = propsAreEqual;
  wrapper[import_constants.DOM_RENDERER] = component;
  return wrapper;
};
const Fragment = ({
  children
}) => {
  return new JSXFragmentNode(
    "",
    {
      children
    },
    Array.isArray(children) ? children : children ? [children] : []
  );
};
const isValidElement = (element) => {
  return !!(element && typeof element === "object" && "tag" in element && "props" in element);
};
const cloneElement = (element, props, ...children) => {
  let childrenToClone;
  if (children.length > 0) {
    childrenToClone = children;
  } else {
    const c = element.props.children;
    childrenToClone = Array.isArray(c) ? c : [c];
  }
  return jsx(
    element.tag,
    { ...element.props, ...props },
    ...childrenToClone
  );
};
const reactAPICompatVersion = "19.0.0-hono-jsx";
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Fragment,
  JSXFragmentNode,
  JSXNode,
  booleanAttributes,
  cloneElement,
  getNameSpaceContext,
  isValidElement,
  jsx,
  jsxFn,
  memo,
  reactAPICompatVersion,
  shallowEqual
});
