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
var client_exports = {};
__export(client_exports, {
  createRoot: () => createRoot,
  default: () => client_default,
  hydrateRoot: () => hydrateRoot
});
module.exports = __toCommonJS(client_exports);
var import_hooks = require("../hooks");
var import_render = require("./render");
const createRoot = (element, options = {}) => {
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
        (0, import_render.renderNode)(
          (0, import_render.buildNode)({
            tag: () => {
              const [_jsxNode, _setJsxNode] = (0, import_hooks.useState)(jsxNode);
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
const hydrateRoot = (element, reactNode, options = {}) => {
  const root = createRoot(element, options);
  root.render(reactNode);
  return root;
};
var client_default = {
  createRoot,
  hydrateRoot
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createRoot,
  hydrateRoot
});
