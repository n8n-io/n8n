// src/jsx/hooks/index.ts
import { DOM_STASH } from "../constants.js";
import { buildDataStack, update } from "../dom/render.js";
var STASH_SATE = 0;
var STASH_EFFECT = 1;
var STASH_CALLBACK = 2;
var STASH_MEMO = 3;
var STASH_REF = 4;
var resolvedPromiseValueMap = /* @__PURE__ */ new WeakMap();
var isDepsChanged = (prevDeps, deps) => !prevDeps || !deps || prevDeps.length !== deps.length || deps.some((dep, i) => dep !== prevDeps[i]);
var viewTransitionState = void 0;
var documentStartViewTransition = (cb) => {
  if (document?.startViewTransition) {
    return document.startViewTransition(cb);
  } else {
    cb();
    return { finished: Promise.resolve() };
  }
};
var updateHook = void 0;
var viewTransitionHook = (context, node, cb) => {
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
var startViewTransition = (callback) => {
  updateHook = viewTransitionHook;
  try {
    callback();
  } finally {
    updateHook = void 0;
  }
};
var useViewTransition = () => {
  const buildData = buildDataStack.at(-1);
  if (!buildData) {
    return [false, () => {
    }];
  }
  if (viewTransitionState) {
    viewTransitionState[1] = true;
  }
  return [!!viewTransitionState?.[0], startViewTransition];
};
var pendingStack = [];
var runCallback = (type, callback) => {
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
var startTransition = (callback) => {
  runCallback(1, callback);
};
var startTransitionHook = (callback) => {
  runCallback(2, callback);
};
var useTransition = () => {
  const buildData = buildDataStack.at(-1);
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
var useDeferredValue = (value, ...rest) => {
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
var useState = (initialState) => {
  const resolveInitialState = () => typeof initialState === "function" ? initialState() : initialState;
  const buildData = buildDataStack.at(-1);
  if (!buildData) {
    return [resolveInitialState(), () => {
    }];
  }
  const [, node] = buildData;
  const stateArray = node[DOM_STASH][1][STASH_SATE] ||= [];
  const hookIndex = node[DOM_STASH][0]++;
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
            pendingType === 3 ? node : update([pendingType, false, localUpdateHook], node),
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
                update([pendingType === 3 ? 1 : 0, false, localUpdateHook], node2);
              });
            };
            requestAnimationFrame(addUpdateTask);
          });
        } else {
          update([0, false, localUpdateHook], node);
        }
      }
    }
  ];
};
var useReducer = (reducer, initialArg, init) => {
  const handler = useCallback(
    (action) => {
      setState((state2) => reducer(state2, action));
    },
    [reducer]
  );
  const [state, setState] = useState(() => init ? init(initialArg) : initialArg);
  return [state, handler];
};
var useEffectCommon = (index, effect, deps) => {
  const buildData = buildDataStack.at(-1);
  if (!buildData) {
    return;
  }
  const [, node] = buildData;
  const effectDepsArray = node[DOM_STASH][1][STASH_EFFECT] ||= [];
  const hookIndex = node[DOM_STASH][0]++;
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
var useEffect = (effect, deps) => useEffectCommon(3, effect, deps);
var useLayoutEffect = (effect, deps) => useEffectCommon(1, effect, deps);
var useInsertionEffect = (effect, deps) => useEffectCommon(4, effect, deps);
var useCallback = (callback, deps) => {
  const buildData = buildDataStack.at(-1);
  if (!buildData) {
    return callback;
  }
  const [, node] = buildData;
  const callbackArray = node[DOM_STASH][1][STASH_CALLBACK] ||= [];
  const hookIndex = node[DOM_STASH][0]++;
  const prevDeps = callbackArray[hookIndex];
  if (isDepsChanged(prevDeps?.[1], deps)) {
    callbackArray[hookIndex] = [callback, deps];
  } else {
    callback = callbackArray[hookIndex][0];
  }
  return callback;
};
var useRef = (initialValue) => {
  const buildData = buildDataStack.at(-1);
  if (!buildData) {
    return { current: initialValue };
  }
  const [, node] = buildData;
  const refArray = node[DOM_STASH][1][STASH_REF] ||= [];
  const hookIndex = node[DOM_STASH][0]++;
  return refArray[hookIndex] ||= { current: initialValue };
};
var use = (promise) => {
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
var useMemo = (factory, deps) => {
  const buildData = buildDataStack.at(-1);
  if (!buildData) {
    return factory();
  }
  const [, node] = buildData;
  const memoArray = node[DOM_STASH][1][STASH_MEMO] ||= [];
  const hookIndex = node[DOM_STASH][0]++;
  const prevDeps = memoArray[hookIndex];
  if (isDepsChanged(prevDeps?.[1], deps)) {
    memoArray[hookIndex] = [factory(), deps];
  }
  return memoArray[hookIndex][0];
};
var idCounter = 0;
var useId = () => useMemo(() => `:r${(idCounter++).toString(32)}:`, []);
var useDebugValue = (_value, _formatter) => {
};
var createRef = () => {
  return { current: null };
};
var forwardRef = (Component) => {
  return (props) => {
    const { ref, ...rest } = props;
    return Component(rest, ref);
  };
};
var useImperativeHandle = (ref, createHandle, deps) => {
  useEffect(() => {
    ref.current = createHandle();
    return () => {
      ref.current = null;
    };
  }, deps);
};
var useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => {
  const buildData = buildDataStack.at(-1);
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
export {
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
};
