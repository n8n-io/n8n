// src/jsx/dom/client.ts
import { useState } from "../hooks/index.js";
import { buildNode, renderNode } from "./render.js";
var createRoot = (element, options = {}) => {
  let setJsxNode = (
    // unmounted
    void 0
  );
  if (Object.keys(options).length > 0) {
    console.warn("createRoot options are not supported yet");
  }
  return {
    render(jsxNode) {
      if (setJsxNode === null) {
        throw new Error("Cannot update an unmounted root");
      }
      if (setJsxNode) {
        setJsxNode(jsxNode);
      } else {
        renderNode(
          buildNode({
            tag: () => {
              const [_jsxNode, _setJsxNode] = useState(jsxNode);
              setJsxNode = _setJsxNode;
              return _jsxNode;
            },
            props: {}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }),
          element
        );
      }
    },
    unmount() {
      setJsxNode?.(null);
      setJsxNode = null;
    }
  };
};
var hydrateRoot = (element, reactNode, options = {}) => {
  const root = createRoot(element, options);
  root.render(reactNode);
  return root;
};
var client_default = {
  createRoot,
  hydrateRoot
};
export {
  createRoot,
  client_default as default,
  hydrateRoot
};
