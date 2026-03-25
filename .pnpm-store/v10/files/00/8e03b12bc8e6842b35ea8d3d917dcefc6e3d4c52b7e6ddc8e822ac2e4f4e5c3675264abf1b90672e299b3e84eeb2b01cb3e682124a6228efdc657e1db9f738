// src/jsx/dom/hooks/index.ts
import { PERMALINK } from "../../constants.js";
import { useContext } from "../../context.js";
import { useCallback, useState } from "../../hooks/index.js";
import { createContext } from "../context.js";
var FormContext = createContext({
  pending: false,
  data: null,
  method: null,
  action: null
});
var actions = /* @__PURE__ */ new Set();
var registerAction = (action) => {
  actions.add(action);
  action.finally(() => actions.delete(action));
};
var useFormStatus = () => {
  return useContext(FormContext);
};
var useOptimistic = (state, updateState) => {
  const [optimisticState, setOptimisticState] = useState(state);
  if (actions.size > 0) {
    Promise.all(actions).finally(() => {
      setOptimisticState(state);
    });
  } else {
    setOptimisticState(state);
  }
  const cb = useCallback((newData) => {
    setOptimisticState((currentState) => updateState(currentState, newData));
  }, []);
  return [optimisticState, cb];
};
var useActionState = (fn, initialState, permalink) => {
  const [state, setState] = useState(initialState);
  const actionState = async (data) => {
    setState(await fn(state, data));
  };
  actionState[PERMALINK] = permalink;
  return [state, actionState];
};
export {
  FormContext,
  registerAction,
  useActionState,
  useFormStatus,
  useOptimistic
};
