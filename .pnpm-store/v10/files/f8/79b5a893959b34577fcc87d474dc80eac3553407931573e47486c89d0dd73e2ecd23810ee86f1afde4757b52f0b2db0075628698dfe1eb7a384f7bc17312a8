// src/react-18.tsx
import * as React from "react";
import * as ReactDOM from "react-dom/client";
var nodes = /* @__PURE__ */ new Map();
function getIsReactActEnvironment() {
  return globalThis.IS_REACT_ACT_ENVIRONMENT;
}
var WithCallback = ({
  callback,
  children
}) => {
  let once = React.useRef();
  return React.useLayoutEffect(() => {
    once.current !== callback && (once.current = callback, callback());
  }, [callback]), children;
};
typeof Promise.withResolvers > "u" && (Promise.withResolvers = () => {
  let resolve = null, reject = null;
  return { promise: new Promise((res, rej) => {
    resolve = res, reject = rej;
  }), resolve, reject };
});
var renderElement = async (node, el, rootOptions) => {
  let root = await getReactRoot(el, rootOptions);
  if (getIsReactActEnvironment()) {
    root.render(node);
    return;
  }
  let { promise, resolve } = Promise.withResolvers();
  return root.render(React.createElement(WithCallback, { callback: resolve }, node)), promise;
}, unmountElement = (el, shouldUseNewRootApi) => {
  let root = nodes.get(el);
  root && (root.unmount(), nodes.delete(el));
}, getReactRoot = async (el, rootOptions) => {
  let root = nodes.get(el);
  return root || (root = ReactDOM.createRoot(el, rootOptions), nodes.set(el, root)), root;
};
export {
  renderElement,
  unmountElement
};
