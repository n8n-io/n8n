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
var hooks_exports = {};
__export(hooks_exports, {
  FormContext: () => FormContext,
  registerAction: () => registerAction,
  useActionState: () => useActionState,
  useFormStatus: () => useFormStatus,
  useOptimistic: () => useOptimistic
});
module.exports = __toCommonJS(hooks_exports);
var import_constants = require("../../constants");
var import_context = require("../../context");
var import_hooks = require("../../hooks");
var import_context2 = require("../context");
const FormContext = (0, import_context2.createContext)({
  pending: false,
  data: null,
  method: null,
  action: null
});
const actions = /* @__PURE__ */ new Set();
const registerAction = (action) => {
  actions.add(action);
  action.finally(() => actions.delete(action));
};
const useFormStatus = () => {
  return (0, import_context.useContext)(FormContext);
};
const useOptimistic = (state, updateState) => {
  const [optimisticState, setOptimisticState] = (0, import_hooks.useState)(state);
  if (actions.size > 0) {
    Promise.all(actions).finally(() => {
      setOptimisticState(state);
    });
  } else {
    setOptimisticState(state);
  }
  const cb = (0, import_hooks.useCallback)((newData) => {
    setOptimisticState((currentState) => updateState(currentState, newData));
  }, []);
  return [optimisticState, cb];
};
const useActionState = (fn, initialState, permalink) => {
  const [state, setState] = (0, import_hooks.useState)(initialState);
  const actionState = async (data) => {
    setState(await fn(state, data));
  };
  actionState[import_constants.PERMALINK] = permalink;
  return [state, actionState];
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FormContext,
  registerAction,
  useActionState,
  useFormStatus,
  useOptimistic
});
