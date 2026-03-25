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
  clearCache: () => clearCache,
  composeRef: () => composeRef,
  form: () => form,
  input: () => input,
  link: () => link,
  meta: () => meta,
  script: () => script,
  style: () => style,
  title: () => title
});
module.exports = __toCommonJS(components_exports);
var import_context = require("../../context");
var import_hooks = require("../../hooks");
var import_common = require("../../intrinsic-element/common");
var import_hooks2 = require("../hooks");
var import_render = require("../render");
const clearCache = () => {
  blockingPromiseMap = /* @__PURE__ */ Object.create(null);
  createdElements = /* @__PURE__ */ Object.create(null);
};
const composeRef = (ref, cb) => {
  return (0, import_hooks.useMemo)(
    () => (e) => {
      let refCleanup;
      if (ref) {
        if (typeof ref === "function") {
          refCleanup = ref(e) || (() => {
            ref(null);
          });
        } else if (ref && "current" in ref) {
          ref.current = e;
          refCleanup = () => {
            ref.current = null;
          };
        }
      }
      const cbCleanup = cb(e);
      return () => {
        cbCleanup?.();
        refCleanup?.();
      };
    },
    [ref]
  );
};
let blockingPromiseMap = /* @__PURE__ */ Object.create(null);
let createdElements = /* @__PURE__ */ Object.create(null);
const documentMetadataTag = (tag, props, preserveNodeType, supportSort, supportBlocking) => {
  if (props?.itemProp) {
    return {
      tag,
      props,
      type: tag,
      ref: props.ref
    };
  }
  const head = document.head;
  let { onLoad, onError, precedence, blocking, ...restProps } = props;
  let element = null;
  let created = false;
  const deDupeKeys = import_common.deDupeKeyMap[tag];
  const deDupeByKey = (0, import_common.shouldDeDupeByKey)(tag, supportSort);
  const isDeDupeCandidateLink = (e) => e.getAttribute("rel") === "stylesheet" && e.getAttribute(import_common.dataPrecedenceAttr) !== null;
  let existingElements = void 0;
  if (deDupeByKey) {
    const tags = head.querySelectorAll(tag);
    LOOP: for (const e of tags) {
      if (tag === "link" && !isDeDupeCandidateLink(e)) {
        continue;
      }
      for (const key of deDupeKeys) {
        if (e.getAttribute(key) === props[key]) {
          element = e;
          break LOOP;
        }
      }
    }
    if (!element) {
      const cacheKey = deDupeKeys.reduce(
        (acc, key) => props[key] === void 0 ? acc : `${acc}-${key}-${props[key]}`,
        tag
      );
      created = !createdElements[cacheKey];
      element = createdElements[cacheKey] ||= (() => {
        const e = document.createElement(tag);
        for (const key of deDupeKeys) {
          if (props[key] !== void 0) {
            e.setAttribute(key, props[key]);
          }
        }
        if (props.rel) {
          e.setAttribute("rel", props.rel);
        }
        return e;
      })();
    }
  } else {
    existingElements = head.querySelectorAll(tag);
  }
  precedence = supportSort ? precedence ?? "" : void 0;
  if (supportSort) {
    restProps[import_common.dataPrecedenceAttr] = precedence;
  }
  const insert = (0, import_hooks.useCallback)(
    (e) => {
      if (deDupeByKey) {
        if (tag === "link" && precedence !== void 0) {
          let found2 = false;
          for (const existingElement of head.querySelectorAll(tag)) {
            const existingPrecedence = existingElement.getAttribute(import_common.dataPrecedenceAttr);
            if (existingPrecedence === null) {
              head.insertBefore(e, existingElement);
              return;
            }
            if (found2 && existingPrecedence !== precedence) {
              head.insertBefore(e, existingElement);
              return;
            }
            if (existingPrecedence === precedence) {
              found2 = true;
            }
          }
          head.appendChild(e);
          return;
        }
        let found = false;
        for (const existingElement of head.querySelectorAll(tag)) {
          if (found && existingElement.getAttribute(import_common.dataPrecedenceAttr) !== precedence) {
            head.insertBefore(e, existingElement);
            return;
          }
          if (existingElement.getAttribute(import_common.dataPrecedenceAttr) === precedence) {
            found = true;
          }
        }
        head.appendChild(e);
      } else if (tag === "link") {
        if (!head.contains(e)) {
          head.appendChild(e);
        }
      } else if (existingElements) {
        let found = false;
        for (const existingElement of existingElements) {
          if (existingElement === e) {
            found = true;
            break;
          }
        }
        if (!found) {
          head.insertBefore(
            e,
            head.contains(existingElements[0]) ? existingElements[0] : head.querySelector(tag)
          );
        }
        existingElements = void 0;
      }
    },
    [deDupeByKey, precedence, tag]
  );
  const ref = composeRef(props.ref, (e) => {
    const key = deDupeKeys[0];
    if (preserveNodeType === 2) {
      e.innerHTML = "";
    }
    if (created || existingElements) {
      insert(e);
    }
    if (!onError && !onLoad) {
      return;
    }
    if (!key) {
      return;
    }
    let promise = blockingPromiseMap[e.getAttribute(key)] ||= new Promise(
      (resolve, reject) => {
        e.addEventListener("load", resolve);
        e.addEventListener("error", reject);
      }
    );
    if (onLoad) {
      promise = promise.then(onLoad);
    }
    if (onError) {
      promise = promise.catch(onError);
    }
    promise.catch(() => {
    });
  });
  if (supportBlocking && blocking === "render") {
    const key = import_common.deDupeKeyMap[tag][0];
    if (key && props[key]) {
      const value = props[key];
      const promise = blockingPromiseMap[value] ||= new Promise((resolve, reject) => {
        insert(element);
        element.addEventListener("load", resolve);
        element.addEventListener("error", reject);
      });
      (0, import_hooks.use)(promise);
    }
  }
  const jsxNode = {
    tag,
    type: tag,
    props: {
      ...restProps,
      ref
    },
    ref
  };
  jsxNode.p = preserveNodeType;
  if (element) {
    jsxNode.e = element;
  }
  return (0, import_render.createPortal)(
    jsxNode,
    head
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  );
};
const title = (props) => {
  const nameSpaceContext = (0, import_render.getNameSpaceContext)();
  const ns = nameSpaceContext && (0, import_context.useContext)(nameSpaceContext);
  if (ns?.endsWith("svg")) {
    return {
      tag: "title",
      props,
      type: "title",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref: props.ref
    };
  }
  return documentMetadataTag("title", props, void 0, false, false);
};
const script = (props) => {
  if (!props || ["src", "async"].some((k) => !props[k])) {
    return {
      tag: "script",
      props,
      type: "script",
      ref: props.ref
    };
  }
  return documentMetadataTag("script", props, 1, false, true);
};
const style = (props) => {
  if (!props || !["href", "precedence"].every((k) => k in props)) {
    return {
      tag: "style",
      props,
      type: "style",
      ref: props.ref
    };
  }
  props["data-href"] = props.href;
  delete props.href;
  return documentMetadataTag("style", props, 2, true, true);
};
const link = (props) => {
  if (!props || ["onLoad", "onError"].some((k) => k in props) || props.rel === "stylesheet" && (!("precedence" in props) || "disabled" in props)) {
    return {
      tag: "link",
      props,
      type: "link",
      ref: props.ref
    };
  }
  return documentMetadataTag("link", props, 1, (0, import_common.isStylesheetLinkWithPrecedence)(props), true);
};
const meta = (props) => {
  return documentMetadataTag("meta", props, void 0, false, false);
};
const customEventFormAction = /* @__PURE__ */ Symbol();
const form = (props) => {
  const { action, ...restProps } = props;
  if (typeof action !== "function") {
    ;
    restProps.action = action;
  }
  const [state, setState] = (0, import_hooks.useState)([null, false]);
  const onSubmit = (0, import_hooks.useCallback)(
    async (ev) => {
      const currentAction = ev.isTrusted ? action : ev.detail[customEventFormAction];
      if (typeof currentAction !== "function") {
        return;
      }
      ev.preventDefault();
      const formData = new FormData(ev.target);
      setState([formData, true]);
      const actionRes = currentAction(formData);
      if (actionRes instanceof Promise) {
        (0, import_hooks2.registerAction)(actionRes);
        await actionRes;
      }
      setState([null, true]);
    },
    []
  );
  const ref = composeRef(props.ref, (el) => {
    el.addEventListener("submit", onSubmit);
    return () => {
      el.removeEventListener("submit", onSubmit);
    };
  });
  const [data, isDirty] = state;
  state[1] = false;
  return {
    tag: import_hooks2.FormContext,
    props: {
      value: {
        pending: data !== null,
        data,
        method: data ? "post" : null,
        action: data ? action : null
      },
      children: {
        tag: "form",
        props: {
          ...restProps,
          ref
        },
        type: "form",
        ref
      }
    },
    f: isDirty
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  };
};
const formActionableElement = (tag, {
  formAction,
  ...props
}) => {
  if (typeof formAction === "function") {
    const onClick = (0, import_hooks.useCallback)((ev) => {
      ev.preventDefault();
      ev.currentTarget.form.dispatchEvent(
        new CustomEvent("submit", { detail: { [customEventFormAction]: formAction } })
      );
    }, []);
    props.ref = composeRef(props.ref, (el) => {
      el.addEventListener("click", onClick);
      return () => {
        el.removeEventListener("click", onClick);
      };
    });
  }
  return {
    tag,
    props,
    type: tag,
    ref: props.ref
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  };
};
const input = (props) => formActionableElement("input", props);
const button = (props) => formActionableElement("button", props);
Object.assign(import_common.domRenderers, {
  title,
  script,
  style,
  link,
  meta,
  form,
  input,
  button
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  button,
  clearCache,
  composeRef,
  form,
  input,
  link,
  meta,
  script,
  style,
  title
});
