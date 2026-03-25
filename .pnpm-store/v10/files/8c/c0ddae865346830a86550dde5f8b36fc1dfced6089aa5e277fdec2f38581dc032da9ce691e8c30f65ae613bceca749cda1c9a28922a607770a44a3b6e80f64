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
var components_exports = {};
__export(components_exports, {
  button: () => button,
  form: () => form,
  input: () => input,
  link: () => link,
  meta: () => meta,
  script: () => script,
  style: () => style,
  title: () => title
});
module.exports = __toCommonJS(components_exports);
var import_html = require("../../helper/html");
var import_base = require("../base");
var import_children = require("../children");
var import_constants = require("../constants");
var import_context = require("../context");
var import_common = require("./common");
const metaTagMap = /* @__PURE__ */ new WeakMap();
const insertIntoHead = (tagName, tag, props, precedence) => ({ buffer, context }) => {
  if (!buffer) {
    return;
  }
  const map = metaTagMap.get(context) || {};
  metaTagMap.set(context, map);
  const tags = map[tagName] ||= [];
  let duped = false;
  const deDupeKeys = import_common.deDupeKeyMap[tagName];
  const deDupeByKey = (0, import_common.shouldDeDupeByKey)(tagName, precedence !== void 0);
  if (deDupeByKey) {
    LOOP: for (const [, tagProps] of tags) {
      if (tagName === "link" && !(tagProps.rel === "stylesheet" && tagProps[import_common.dataPrecedenceAttr] !== void 0)) {
        continue;
      }
      for (const key of deDupeKeys) {
        if ((tagProps?.[key] ?? null) === props?.[key]) {
          duped = true;
          break LOOP;
        }
      }
    }
  }
  if (duped) {
    buffer[0] = buffer[0].replaceAll(tag, "");
  } else if (deDupeByKey || tagName === "link") {
    tags.push([tag, props, precedence]);
  } else {
    tags.unshift([tag, props, precedence]);
  }
  if (buffer[0].indexOf("</head>") !== -1) {
    let insertTags;
    if (tagName === "link" || precedence !== void 0) {
      const precedences = [];
      insertTags = tags.map(([tag2, , tagPrecedence], index) => {
        if (tagPrecedence === void 0) {
          return [tag2, Number.MAX_SAFE_INTEGER, index];
        }
        let order = precedences.indexOf(tagPrecedence);
        if (order === -1) {
          precedences.push(tagPrecedence);
          order = precedences.length - 1;
        }
        return [tag2, order, index];
      }).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(([tag2]) => tag2);
    } else {
      insertTags = tags.map(([tag2]) => tag2);
    }
    insertTags.forEach((tag2) => {
      buffer[0] = buffer[0].replaceAll(tag2, "");
    });
    buffer[0] = buffer[0].replace(/(?=<\/head>)/, insertTags.join(""));
  }
};
const returnWithoutSpecialBehavior = (tag, children, props) => (0, import_html.raw)(new import_base.JSXNode(tag, props, (0, import_children.toArray)(children ?? [])).toString());
const documentMetadataTag = (tag, children, props, sort) => {
  if ("itemProp" in props) {
    return returnWithoutSpecialBehavior(tag, children, props);
  }
  let { precedence, blocking, ...restProps } = props;
  precedence = sort ? precedence ?? "" : void 0;
  if (sort) {
    restProps[import_common.dataPrecedenceAttr] = precedence;
  }
  const string = new import_base.JSXNode(tag, restProps, (0, import_children.toArray)(children || [])).toString();
  if (string instanceof Promise) {
    return string.then(
      (resString) => (0, import_html.raw)(string, [
        ...resString.callbacks || [],
        insertIntoHead(tag, resString, restProps, precedence)
      ])
    );
  } else {
    return (0, import_html.raw)(string, [insertIntoHead(tag, string, restProps, precedence)]);
  }
};
const title = ({ children, ...props }) => {
  const nameSpaceContext = (0, import_base.getNameSpaceContext)();
  if (nameSpaceContext) {
    const context = (0, import_context.useContext)(nameSpaceContext);
    if (context === "svg" || context === "head") {
      return new import_base.JSXNode(
        "title",
        props,
        (0, import_children.toArray)(children ?? [])
      );
    }
  }
  return documentMetadataTag("title", children, props, false);
};
const script = ({
  children,
  ...props
}) => {
  const nameSpaceContext = (0, import_base.getNameSpaceContext)();
  if (["src", "async"].some((k) => !props[k]) || nameSpaceContext && (0, import_context.useContext)(nameSpaceContext) === "head") {
    return returnWithoutSpecialBehavior("script", children, props);
  }
  return documentMetadataTag("script", children, props, false);
};
const style = ({
  children,
  ...props
}) => {
  if (!["href", "precedence"].every((k) => k in props)) {
    return returnWithoutSpecialBehavior("style", children, props);
  }
  props["data-href"] = props.href;
  delete props.href;
  return documentMetadataTag("style", children, props, true);
};
const link = ({ children, ...props }) => {
  if (["onLoad", "onError"].some((k) => k in props) || props.rel === "stylesheet" && (!("precedence" in props) || "disabled" in props)) {
    return returnWithoutSpecialBehavior("link", children, props);
  }
  return documentMetadataTag("link", children, props, (0, import_common.isStylesheetLinkWithPrecedence)(props));
};
const meta = ({ children, ...props }) => {
  const nameSpaceContext = (0, import_base.getNameSpaceContext)();
  if (nameSpaceContext && (0, import_context.useContext)(nameSpaceContext) === "head") {
    return returnWithoutSpecialBehavior("meta", children, props);
  }
  return documentMetadataTag("meta", children, props, false);
};
const newJSXNode = (tag, { children, ...props }) => (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new import_base.JSXNode(tag, props, (0, import_children.toArray)(children ?? []))
);
const form = (props) => {
  if (typeof props.action === "function") {
    props.action = import_constants.PERMALINK in props.action ? props.action[import_constants.PERMALINK] : void 0;
  }
  return newJSXNode("form", props);
};
const formActionableElement = (tag, props) => {
  if (typeof props.formAction === "function") {
    props.formAction = import_constants.PERMALINK in props.formAction ? props.formAction[import_constants.PERMALINK] : void 0;
  }
  return newJSXNode(tag, props);
};
const input = (props) => formActionableElement("input", props);
const button = (props) => formActionableElement("button", props);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  button,
  form,
  input,
  link,
  meta,
  script,
  style,
  title
});
