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
var dom_exports = {};
__export(dom_exports, {
  Children: () => import_children.Children,
  ErrorBoundary: () => import_components.ErrorBoundary,
  Fragment: () => import_jsx_runtime.Fragment,
  StrictMode: () => import_jsx_runtime.Fragment,
  Suspense: () => import_components.Suspense,
  cloneElement: () => cloneElement,
  createContext: () => import_context2.createContext,
  createElement: () => createElement,
  createPortal: () => import_render.createPortal,
  createRef: () => import_hooks.createRef,
  default: () => dom_default,
  flushSync: () => import_render.flushSync,
  forwardRef: () => import_hooks.forwardRef,
  isValidElement: () => import_base.isValidElement,
  jsx: () => createElement,
  memo: () => memo,
  render: () => import_render2.render,
  startTransition: () => import_hooks.startTransition,
  startViewTransition: () => import_hooks.startViewTransition,
  use: () => import_hooks.use,
  useActionState: () => import_hooks2.useActionState,
  useCallback: () => import_hooks.useCallback,
  useContext: () => import_context.useContext,
  useDebugValue: () => import_hooks.useDebugValue,
  useDeferredValue: () => import_hooks.useDeferredValue,
  useEffect: () => import_hooks.useEffect,
  useFormStatus: () => import_hooks2.useFormStatus,
  useId: () => import_hooks.useId,
  useImperativeHandle: () => import_hooks.useImperativeHandle,
  useInsertionEffect: () => import_hooks.useInsertionEffect,
  useLayoutEffect: () => import_hooks.useLayoutEffect,
  useMemo: () => import_hooks.useMemo,
  useOptimistic: () => import_hooks2.useOptimistic,
  useReducer: () => import_hooks.useReducer,
  useRef: () => import_hooks.useRef,
  useState: () => import_hooks.useState,
  useSyncExternalStore: () => import_hooks.useSyncExternalStore,
  useTransition: () => import_hooks.useTransition,
  useViewTransition: () => import_hooks.useViewTransition,
  version: () => import_base.reactAPICompatVersion
});
module.exports = __toCommonJS(dom_exports);
var import_base = require("../base");
var import_children = require("../children");
var import_constants = require("../constants");
var import_context = require("../context");
var import_hooks = require("../hooks");
var import_components = require("./components");
var import_context2 = require("./context");
var import_hooks2 = require("./hooks");
var import_jsx_runtime = require("./jsx-runtime");
var import_render = require("./render");
var import_render2 = require("./render");
const createElement = (tag, props, ...children) => {
  const jsxProps = props ? { ...props } : {};
  if (children.length) {
    jsxProps.children = children.length === 1 ? children[0] : children;
  }
  let key = void 0;
  if ("key" in jsxProps) {
    key = jsxProps.key;
    delete jsxProps.key;
  }
  return (0, import_jsx_runtime.jsx)(tag, jsxProps, key);
};
const cloneElement = (element, props, ...children) => {
  return (0, import_jsx_runtime.jsx)(
    element.tag,
    {
      ...element.props,
      ...props,
      children: children.length ? children : element.props.children
    },
    element.key
  );
};
const memo = (component, propsAreEqual = import_base.shallowEqual) => {
  const wrapper = ((props) => component(props));
  wrapper[import_constants.DOM_MEMO] = propsAreEqual;
  return wrapper;
};
var dom_default = {
  version: import_base.reactAPICompatVersion,
  useState: import_hooks.useState,
  useEffect: import_hooks.useEffect,
  useRef: import_hooks.useRef,
  useCallback: import_hooks.useCallback,
  use: import_hooks.use,
  startTransition: import_hooks.startTransition,
  useTransition: import_hooks.useTransition,
  useDeferredValue: import_hooks.useDeferredValue,
  startViewTransition: import_hooks.startViewTransition,
  useViewTransition: import_hooks.useViewTransition,
  useMemo: import_hooks.useMemo,
  useLayoutEffect: import_hooks.useLayoutEffect,
  useInsertionEffect: import_hooks.useInsertionEffect,
  useReducer: import_hooks.useReducer,
  useId: import_hooks.useId,
  useDebugValue: import_hooks.useDebugValue,
  createRef: import_hooks.createRef,
  forwardRef: import_hooks.forwardRef,
  useImperativeHandle: import_hooks.useImperativeHandle,
  useSyncExternalStore: import_hooks.useSyncExternalStore,
  useFormStatus: import_hooks2.useFormStatus,
  useActionState: import_hooks2.useActionState,
  useOptimistic: import_hooks2.useOptimistic,
  Suspense: import_components.Suspense,
  ErrorBoundary: import_components.ErrorBoundary,
  createContext: import_context2.createContext,
  useContext: import_context.useContext,
  memo,
  isValidElement: import_base.isValidElement,
  createElement,
  cloneElement,
  Children: import_children.Children,
  Fragment: import_jsx_runtime.Fragment,
  StrictMode: import_jsx_runtime.Fragment,
  flushSync: import_render.flushSync,
  createPortal: import_render.createPortal
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Children,
  ErrorBoundary,
  Fragment,
  StrictMode,
  Suspense,
  cloneElement,
  createContext,
  createElement,
  createPortal,
  createRef,
  flushSync,
  forwardRef,
  isValidElement,
  jsx,
  memo,
  render,
  startTransition,
  startViewTransition,
  use,
  useActionState,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useFormStatus,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  useViewTransition,
  version
});
