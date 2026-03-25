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
  STASH_EFFECT: () => STASH_EFFECT,
  createRef: () => createRef,
  forwardRef: () => forwardRef,
  startTransition: () => startTransition,
  startViewTransition: () => startViewTransition,
  use: () => use,
  useCallback: () => useCallback,
  useDebugValue: () => useDebugValue,
  useDeferredValue: () => useDeferredValue,
  useEffect: () => useEffect,
  useId: () => useId,
  useImperativeHandle: () => useImperativeHandle,
  useInsertionEffect: () => useInsertionEffect,
  useLayoutEffect: () => useLayoutEffect,
  useMemo: () => useMemo,
  useReducer: () => useReducer,
  useRef: () => useRef,
  useState: () => useState,
  useSyncExternalStore: () => useSyncExternalStore,
  useTransition: () => useTransition,
  useViewTransition: () => useViewTransition
});
module.exports = __toCommonJS(hooks_exports);
var import_constants = require("../constants");
var import_render = require("../dom/render");
const STASH_SATE = 0;
const STASH_EFFECT = 1;
const STASH_CALLBACK = 2;
const STASH_MEMO = 3;
const STASH_REF = 4;
const resolvedPromiseValueMap = /* @__PURE__ */ new WeakMap();
const isDepsChanged = (prevDeps, deps) => !prevDeps || !deps || prevDeps.length !== deps.length || deps.some((dep, i) => dep !== prevDeps[i]);
let viewTransitionState = void 0;
const documentStartViewTransition = (cb) => {
  if (document?.startViewTransition) {
    return document.startViewTransition(cb);
  } else {
    cb();
    return { finished: Promise.resolve() };
  }
};
let updateHook = void 0;
const viewTransitionHook = (context, node, cb) => {
  const state = [true, false];
  let lastVC = node.vC;
  return documentStartViewTransition(() => {
    if (lastVC === node.vC) {
      viewTransitionState = state;
      cb(context);
      viewTransitionState = void 0;
      lastVC = node.vC;
    }
  }).finished.then(() => {
    if (state[1] && lastVC === node.vC) {
      state[0] = false;
      viewTransitionState = state;
      cb(context);
      viewTransitionState = void 0;
    }
  });
};
const startViewTransition = (callback) => {
  updateHook = viewTransitionHook;
  try {
    callback();
  } finally {
    updateHook = void 0;
  }
};
const useViewTransition = () => {
  const buildData = import_render.buildDataStack.at(-1);
  if (!buildData) {
    return [false, () => {
    }];
  }
  if (viewTransitionState) {
    viewTransitionState[1] = true;
  }
  return [!!viewTransitionState?.[0], startViewTransition];
};
const pendingStack = [];
const runCallback = (type, callback) => {
  let resolve;
  const promise = new Promise((r) => resolve = r);
  pendingStack.push([type, promise]);
  try {
    const res = callback();
    if (res instanceof Promise) {
      res.then(resolve, resolve);
    } else {
      resolve();
    }
  } finally {
    pendingStack.pop();
  }
};
const startTransition = (callback) => {
  runCallback(1, callback);
};
const startTransitionHook = (callback) => {
  runCallback(2, callback);
};
const useTransition = () => {
  const buildData = import_render.buildDataStack.at(-1);
  if (!buildData) {
    return [false, () => {
    }];
  }
  const [error, setError] = useState();
  const [state, updateState] = useState();
  if (error) {
    throw error[0];
  }
  const startTransitionLocalHook = useCallback(
    (callback) => {
      startTransitionHook(() => {
        updateState((state2) => !state2);
        let res = callback();
        if (res instanceof Promise) {
          res = res.catch((e) => {
            setError([e]);
          });
        }
        return res;
      });
    },
    [state]
  );
  const [context] = buildData;
  return [context[0] === 2, startTransitionLocalHook];
};
const useDeferredValue = (value, ...rest) => {
  const [values, setValues] = useState(
    rest.length ? [rest[0], rest[0]] : [value, value]
  );
  if (Object.is(values[1], value)) {
    return values[1];
  }
  pendingStack.push([3, Promise.resolve()]);
  updateHook = async (context, _, cb) => {
    cb(context);
    values[0] = value;
  };
  setValues([values[0], value]);
  updateHook = void 0;
  pendingStack.pop();
  return values[0];
};
const useState = (initialState) => {
  const resolveInitialState = () => typeof initialState === "function" ? initialState() : initialState;
  const buildData = import_render.buildDataStack.at(-1);
  if (!buildData) {
    return [resolveInitialState(), () => {
    }];
  }
  const [, node] = buildData;
  const stateArray = node[import_constants.DOM_STASH][1][STASH_SATE] ||= [];
  const hookIndex = node[import_constants.DOM_STASH][0]++;
  return stateArray[hookIndex] ||= [
    resolveInitialState(),
    (newState) => {
      const localUpdateHook = updateHook;
      const stateData = stateArray[hookIndex];
      if (typeof newState === "function") {
        newState = newState(stateData[0]);
      }
      if (!Object.is(newState, stateData[0])) {
        stateData[0] = newState;
        if (pendingStack.length) {
          const [pendingType, pendingPromise] = pendingStack.at(-1);
          Promise.all([
            pendingType === 3 ? node : (0, import_render.update)([pendingType, false, localUpdateHook], node),
            pendingPromise
          ]).then(([node2]) => {
            if (!node2 || !(pendingType === 2 || pendingType === 3)) {
              return;
            }
            const lastVC = node2.vC;
            const addUpdateTask = () => {
              setTimeout(() => {
                if (lastVC !== node2.vC) {
                  return;
                }
                (0, import_render.update)([pendingType === 3 ? 1 : 0, false, localUpdateHook], node2);
              });
            };
            requestAnimationFrame(addUpdateTask);
          });
        } else {
          (0, import_render.update)([0, false, localUpdateHook], node);
        }
      }
    }
  ];
};
const useReducer = (reducer, initialArg, init) => {
  const handler = useCallback(
    (action) => {
      setState((state2) => reducer(state2, action));
    },
    [reducer]
  );
  const [state, setState] = useState(() => init ? init(initialArg) : initialArg);
  return [state, handler];
};
const useEffectCommon = (index, effect, deps) => {
  const buildData = import_render.buildDataStack.at(-1);
  if (!buildData) {
    return;
  }
  const [, node] = buildData;
  const effectDepsArray = node[import_constants.DOM_STASH][1][STASH_EFFECT] ||= [];
  const hookIndex = node[import_constants.DOM_STASH][0]++;
  const [prevDeps, , prevCleanup] = effectDepsArray[hookIndex] ||= [];
  if (isDepsChanged(prevDeps, deps)) {
    if (prevCleanup) {
      prevCleanup();
    }
    const runner = () => {
      data[index] = void 0;
      data[2] = effect();
    };
    const data = [deps, void 0, void 0, void 0, void 0];
    data[index] = runner;
    effectDepsArray[hookIndex] = data;
  }
};
const useEffect = (effect, deps) => useEffectCommon(3, effect, deps);
const useLayoutEffect = (effect, deps) => useEffectCommon(1, effect, deps);
const useInsertionEffect = (effect, deps) => useEffectCommon(4, effect, deps);
const useCallback = (callback, deps) => {
  const buildData = import_render.buildDataStack.at(-1);
  if (!buildData) {
    return callback;
  }
  const [, node] = buildData;
  const callbackArray = node[import_constants.DOM_STASH][1][STASH_CALLBACK] ||= [];
  const hookIndex = node[import_constants.DOM_STASH][0]++;
  const prevDeps = callbackArray[hookIndex];
  if (isDepsChanged(prevDeps?.[1], deps)) {
    callbackArray[hookIndex] = [callback, deps];
  } else {
    callback = callbackArray[hookIndex][0];
  }
  return callback;
};
const useRef = (initialValue) => {
  const buildData = import_render.buildDataStack.at(-1);
  if (!buildData) {
    return { current: initialValue };
  }
  const [, node] = buildData;
  const refArray = node[import_constants.DOM_STASH][1][STASH_REF] ||= [];
  const hookIndex = node[import_constants.DOM_STASH][0]++;
  return refArray[hookIndex] ||= { current: initialValue };
};
const use = (promise) => {
  const cachedRes = resolvedPromiseValueMap.get(promise);
  if (cachedRes) {
    if (cachedRes.length === 2) {
      throw cachedRes[1];
    }
    return cachedRes[0];
  }
  promise.then(
    (res) => resolvedPromiseValueMap.set(promise, [res]),
    (e) => resolvedPromiseValueMap.set(promise, [void 0, e])
  );
  throw promise;
};
const useMemo = (factory, deps) => {
  const buildData = import_render.buildDataStack.at(-1);
  if (!buildData) {
    return factory();
  }
  const [, node] = buildData;
  const memoArray = node[import_constants.DOM_STASH][1][STASH_MEMO] ||= [];
  const hookIndex = node[import_constants.DOM_STASH][0]++;
  const prevDeps = memoArray[hookIndex];
  if (isDepsChanged(prevDeps?.[1], deps)) {
    memoArray[hookIndex] = [factory(), deps];
  }
  return memoArray[hookIndex][0];
};
let idCounter = 0;
const useId = () => useMemo(() => `:r${(idCounter++).toString(32)}:`, []);
const useDebugValue = (_value, _formatter) => {
};
const createRef = () => {
  return { current: null };
};
const forwardRef = (Component) => {
  return (props) => {
    const { ref, ...rest } = props;
    return Component(rest, ref);
  };
};
const useImperativeHandle = (ref, createHandle, deps) => {
  useEffect(() => {
    ref.current = createHandle();
    return () => {
      ref.current = null;
    };
  }, deps);
};
const useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => {
  const buildData = import_render.buildDataStack.at(-1);
  if (!buildData) {
    if (!getServerSnapshot) {
      throw new Error("getServerSnapshot is required for server side rendering");
    }
    return getServerSnapshot();
  }
  const [serverSnapshotIsUsed] = useState(!!(buildData[0][4] && getServerSnapshot));
  const [state, setState] = useState(
    () => serverSnapshotIsUsed ? getServerSnapshot() : getSnapshot()
  );
  useEffect(() => {
    if (serverSnapshotIsUsed) {
      setState(getSnapshot());
    }
    return subscribe(() => {
      setState(getSnapshot());
    });
  }, []);
  return state;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STASH_EFFECT,
  createRef,
  forwardRef,
  startTransition,
  startViewTransition,
  use,
  useCallback,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  useViewTransition
});
