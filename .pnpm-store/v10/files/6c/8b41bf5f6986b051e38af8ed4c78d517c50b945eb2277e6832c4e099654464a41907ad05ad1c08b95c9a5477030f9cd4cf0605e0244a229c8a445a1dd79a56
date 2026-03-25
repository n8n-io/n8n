import {
  CallStates,
  EVENTS
} from "../_browser-chunks/chunk-ZUWEVLDX.js";
import {
  processError
} from "../_browser-chunks/chunk-RP5RXKFU.js";
import "../_browser-chunks/chunk-A242L54C.js";

// src/instrumenter/instrumenter.ts
import { once } from "storybook/internal/client-logger";
import {
  FORCE_REMOUNT,
  SET_CURRENT_STORY,
  STORY_RENDER_PHASE_CHANGED
} from "storybook/internal/core-events";
import { global } from "@storybook/global";

// src/instrumenter/preview-api.ts
var addons = globalThis.__STORYBOOK_ADDONS_PREVIEW;

// src/instrumenter/instrumenter.ts
var alreadyCompletedException = new Error(
  "This function ran after the play function completed. Did you forget to `await` it?"
), isObject = (o) => Object.prototype.toString.call(o) === "[object Object]", isModule = (o) => Object.prototype.toString.call(o) === "[object Module]", isInstrumentable = (o) => {
  if (!isObject(o) && !isModule(o))
    return !1;
  if (o.constructor === void 0)
    return !0;
  let proto = o.constructor.prototype;
  return !!isObject(proto);
}, construct = (obj) => {
  try {
    return new obj.constructor();
  } catch {
    return {};
  }
}, getInitialState = () => ({
  renderPhase: "preparing",
  isDebugging: !1,
  isPlaying: !1,
  isLocked: !1,
  cursor: 0,
  calls: [],
  shadowCalls: [],
  callRefsByResult: /* @__PURE__ */ new Map(),
  chainedCallIds: /* @__PURE__ */ new Set(),
  ancestors: [],
  playUntil: void 0,
  resolvers: {},
  syncTimeout: void 0
}), getRetainedState = (state, isDebugging = !1) => {
  let calls = (isDebugging ? state.shadowCalls : state.calls).filter((call) => call.retain);
  if (!calls.length)
    return;
  let callRefsByResult = new Map(
    Array.from(state.callRefsByResult.entries()).filter(([, ref]) => ref.retain)
  );
  return { cursor: calls.length, calls, callRefsByResult };
}, Instrumenter = class {
  constructor() {
    this.detached = !1;
    this.initialized = !1;
    // State is tracked per story to deal with multiple stories on the same canvas (i.e. docs mode)
    this.state = {};
    this.loadParentWindowState = () => {
      try {
        this.state = global.window?.parent?.__STORYBOOK_ADDON_INTERACTIONS_INSTRUMENTER_STATE__ || {};
      } catch {
        this.detached = !0;
      }
    };
    this.updateParentWindowState = () => {
      try {
        global.window.parent.__STORYBOOK_ADDON_INTERACTIONS_INSTRUMENTER_STATE__ = this.state;
      } catch {
        this.detached = !0;
      }
    };
    this.loadParentWindowState();
    let resetState = ({
      storyId,
      renderPhase,
      isPlaying = !0,
      isDebugging = !1
    }) => {
      let state = this.getState(storyId);
      this.setState(storyId, {
        ...getInitialState(),
        ...getRetainedState(state, isDebugging),
        renderPhase: renderPhase || state.renderPhase,
        shadowCalls: isDebugging ? state.shadowCalls : [],
        chainedCallIds: isDebugging ? state.chainedCallIds : /* @__PURE__ */ new Set(),
        playUntil: isDebugging ? state.playUntil : void 0,
        isPlaying,
        isDebugging
      }), this.sync(storyId);
    }, start = (channel) => ({ storyId, playUntil }) => {
      this.getState(storyId).isDebugging || this.setState(storyId, ({ calls }) => ({
        calls: [],
        shadowCalls: calls.map((call) => ({ ...call, status: "waiting" /* WAITING */ })),
        isDebugging: !0
      }));
      let log = this.getLog(storyId);
      this.setState(storyId, ({ shadowCalls }) => {
        if (playUntil || !log.length)
          return { playUntil };
        let firstRowIndex = shadowCalls.findIndex((call) => call.id === log[0].callId);
        return {
          playUntil: shadowCalls.slice(0, firstRowIndex).filter((call) => call.interceptable && !call.ancestors?.length).slice(-1)[0]?.id
        };
      }), channel.emit(FORCE_REMOUNT, { storyId, isDebugging: !0 });
    }, back = (channel) => ({ storyId }) => {
      let log = this.getLog(storyId).filter((call) => !call.ancestors?.length), last = log.reduceRight((res, item, index) => res >= 0 || item.status === "waiting" /* WAITING */ ? res : index, -1);
      start(channel)({ storyId, playUntil: log[last - 1]?.callId });
    }, goto = (channel) => ({ storyId, callId }) => {
      let { calls, shadowCalls, resolvers } = this.getState(storyId), call = calls.find(({ id }) => id === callId), shadowCall = shadowCalls.find(({ id }) => id === callId);
      if (!call && shadowCall && Object.values(resolvers).length > 0) {
        let nextId = this.getLog(storyId).find((c) => c.status === "waiting" /* WAITING */)?.callId;
        shadowCall.id !== nextId && this.setState(storyId, { playUntil: shadowCall.id }), Object.values(resolvers).forEach((resolve) => resolve());
      } else
        start(channel)({ storyId, playUntil: callId });
    }, next = (channel) => ({ storyId }) => {
      let { resolvers } = this.getState(storyId);
      if (Object.values(resolvers).length > 0)
        Object.values(resolvers).forEach((resolve) => resolve());
      else {
        let nextId = this.getLog(storyId).find((c) => c.status === "waiting" /* WAITING */)?.callId;
        nextId ? start(channel)({ storyId, playUntil: nextId }) : end({ storyId });
      }
    }, end = ({ storyId }) => {
      this.setState(storyId, { playUntil: void 0, isDebugging: !1 }), Object.values(this.getState(storyId).resolvers).forEach((resolve) => resolve());
    }, renderPhaseChanged = ({
      storyId,
      newPhase
    }) => {
      let { isDebugging } = this.getState(storyId);
      if (newPhase === "preparing" && isDebugging)
        return resetState({ storyId, renderPhase: newPhase, isDebugging });
      if (newPhase === "playing")
        return resetState({ storyId, renderPhase: newPhase, isDebugging });
      newPhase === "played" ? this.setState(storyId, {
        renderPhase: newPhase,
        isLocked: !1,
        isPlaying: !1,
        isDebugging: !1
      }) : newPhase === "errored" ? this.setState(storyId, {
        renderPhase: newPhase,
        isLocked: !1,
        isPlaying: !1
      }) : newPhase === "aborted" ? this.setState(storyId, {
        renderPhase: newPhase,
        isLocked: !0,
        isPlaying: !1
      }) : this.setState(storyId, {
        renderPhase: newPhase
      }), this.sync(storyId);
    };
    addons && addons.ready().then(() => {
      this.channel = addons.getChannel(), this.channel.on(FORCE_REMOUNT, resetState), this.channel.on(STORY_RENDER_PHASE_CHANGED, renderPhaseChanged), this.channel.on(SET_CURRENT_STORY, () => {
        this.initialized ? this.cleanup() : this.initialized = !0;
      }), this.channel.on(EVENTS.START, start(this.channel)), this.channel.on(EVENTS.BACK, back(this.channel)), this.channel.on(EVENTS.GOTO, goto(this.channel)), this.channel.on(EVENTS.NEXT, next(this.channel)), this.channel.on(EVENTS.END, end);
    });
  }
  getState(storyId) {
    return this.state[storyId] || getInitialState();
  }
  setState(storyId, update) {
    if (storyId) {
      let state = this.getState(storyId), patch = typeof update == "function" ? update(state) : update;
      this.state = { ...this.state, [storyId]: { ...state, ...patch } }, this.updateParentWindowState();
    }
  }
  cleanup() {
    this.state = Object.entries(this.state).reduce(
      (acc, [storyId, state]) => {
        let retainedState = getRetainedState(state);
        return retainedState && (acc[storyId] = Object.assign(getInitialState(), retainedState)), acc;
      },
      {}
    );
    let payload = { controlStates: {
      detached: this.detached,
      start: !1,
      back: !1,
      goto: !1,
      next: !1,
      end: !1
    }, logItems: [] };
    this.channel?.emit(EVENTS.SYNC, payload), this.updateParentWindowState();
  }
  getLog(storyId) {
    let { calls, shadowCalls } = this.getState(storyId), merged = [...shadowCalls];
    calls.forEach((call, index) => {
      merged[index] = call;
    });
    let seen = /* @__PURE__ */ new Set();
    return merged.reduceRight((acc, call) => (call.args.forEach((arg) => {
      arg?.__callId__ && seen.add(arg.__callId__);
    }), call.path.forEach((node) => {
      node.__callId__ && seen.add(node.__callId__);
    }), (call.interceptable || call.exception) && !seen.has(call.id) && (acc.unshift({ callId: call.id, status: call.status, ancestors: call.ancestors }), seen.add(call.id)), acc), []);
  }
  // Traverses the object structure to recursively patch all function properties.
  // Returns the original object, or a new object with the same constructor,
  // depending on whether it should mutate.
  instrument(obj, options, depth = 0) {
    if (!isInstrumentable(obj))
      return obj;
    let { mutate = !1, path = [] } = options, keys = options.getKeys ? options.getKeys(obj, depth) : Object.keys(obj);
    return depth += 1, keys.reduce(
      (acc, key) => {
        let descriptor = getPropertyDescriptor(obj, key);
        if (typeof descriptor?.get == "function") {
          if (descriptor.configurable) {
            let getter = () => descriptor?.get?.bind(obj)?.();
            Object.defineProperty(acc, key, {
              get: () => this.instrument(getter(), { ...options, path: path.concat(key) }, depth)
            });
          }
          return acc;
        }
        let value = obj[key];
        return typeof value != "function" ? (acc[key] = this.instrument(value, { ...options, path: path.concat(key) }, depth), acc) : "__originalFn__" in value && typeof value.__originalFn__ == "function" ? (acc[key] = value, acc) : (acc[key] = (...args) => this.track(key, value, obj, args, options), acc[key].__originalFn__ = value, Object.defineProperty(acc[key], "name", { value: key, writable: !1 }), Object.keys(value).length > 0 && Object.assign(
          acc[key],
          this.instrument({ ...value }, { ...options, path: path.concat(key) }, depth)
        ), acc);
      },
      mutate ? obj : construct(obj)
    );
  }
  // Monkey patch an object method to record calls.
  // Returns a function that invokes the original function, records the invocation ("call") and
  // returns the original result.
  track(method, fn, object, args, options) {
    let storyId = args?.[0]?.__storyId__ || global.__STORYBOOK_PREVIEW__?.selectionStore?.selection?.storyId, { cursor, ancestors } = this.getState(storyId);
    this.setState(storyId, { cursor: cursor + 1 });
    let id = `${ancestors.slice(-1)[0] || storyId} [${cursor}] ${method}`, { path = [], intercept = !1, retain = !1 } = options, interceptable = typeof intercept == "function" ? intercept(method, path) : intercept, call = { id, cursor, storyId, ancestors, path, method, args, interceptable, retain }, result = (interceptable && !ancestors.length ? this.intercept : this.invoke).call(this, fn, object, call, options);
    return this.instrument(result, { ...options, mutate: !0, path: [{ __callId__: call.id }] });
  }
  intercept(fn, object, call, options) {
    let { chainedCallIds, isDebugging, playUntil } = this.getState(call.storyId), isChainedUpon = chainedCallIds.has(call.id);
    return !isDebugging || isChainedUpon || playUntil ? (playUntil === call.id && this.setState(call.storyId, { playUntil: void 0 }), this.invoke(fn, object, call, options)) : new Promise((resolve) => {
      this.setState(call.storyId, ({ resolvers }) => ({
        isLocked: !1,
        resolvers: { ...resolvers, [call.id]: resolve }
      }));
    }).then(() => (this.setState(call.storyId, (state) => {
      let { [call.id]: _, ...resolvers } = state.resolvers;
      return { isLocked: !0, resolvers };
    }), this.invoke(fn, object, call, options)));
  }
  invoke(fn, object, call, options) {
    let { callRefsByResult, renderPhase } = this.getState(call.storyId), maximumDepth = 25, serializeValues = (value, depth, seen) => {
      if (seen.includes(value))
        return "[Circular]";
      if (seen = [...seen, value], depth > maximumDepth)
        return "...";
      if (callRefsByResult.has(value))
        return callRefsByResult.get(value);
      if (value instanceof Array)
        return value.map((it) => serializeValues(it, ++depth, seen));
      if (value instanceof Date)
        return { __date__: { value: value.toISOString() } };
      if (value instanceof Error) {
        let { name, message, stack } = value;
        return { __error__: { name, message, stack } };
      }
      if (value instanceof RegExp) {
        let { flags, source } = value;
        return { __regexp__: { flags, source } };
      }
      if (value instanceof global.window?.HTMLElement) {
        let { prefix, localName, id, classList, innerText } = value, classNames = Array.from(classList);
        return { __element__: { prefix, localName, id, classNames, innerText } };
      }
      return typeof value == "function" ? {
        __function__: { name: "getMockName" in value ? value.getMockName() : value.name }
      } : typeof value == "symbol" ? { __symbol__: { description: value.description } } : typeof value == "object" && value?.constructor?.name && value?.constructor?.name !== "Object" ? { __class__: { name: value.constructor.name } } : Object.prototype.toString.call(value) === "[object Object]" ? Object.fromEntries(
        Object.entries(value).map(([key, val]) => [key, serializeValues(val, ++depth, seen)])
      ) : value;
    }, info = {
      ...call,
      args: call.args.map((arg) => serializeValues(arg, 0, []))
    };
    call.path.forEach((ref) => {
      ref?.__callId__ && this.setState(call.storyId, ({ chainedCallIds }) => ({
        chainedCallIds: new Set(Array.from(chainedCallIds).concat(ref.__callId__))
      }));
    });
    let handleException = (e) => {
      if (e instanceof Error) {
        let { name, message, stack, callId = call.id } = e, {
          showDiff = void 0,
          diff = void 0,
          actual = void 0,
          expected = void 0
        } = e.name === "AssertionError" ? processError(e) : e, exception = { name, message, stack, callId, showDiff, diff, actual, expected };
        if (this.update({ ...info, status: "error" /* ERROR */, exception }), this.setState(call.storyId, (state) => ({
          callRefsByResult: new Map([
            ...Array.from(state.callRefsByResult.entries()),
            [e, { __callId__: call.id, retain: call.retain }]
          ])
        })), call.ancestors?.length)
          throw Object.prototype.hasOwnProperty.call(e, "callId") || Object.defineProperty(e, "callId", { value: call.id }), e;
      }
      throw e;
    };
    try {
      if (renderPhase === "played" && !call.retain)
        throw alreadyCompletedException;
      let finalArgs = (options.getArgs ? options.getArgs(call, this.getState(call.storyId)) : call.args).map((arg) => typeof arg != "function" || isClass(arg) || Object.keys(arg).length ? arg : (...args) => {
        let { cursor, ancestors } = this.getState(call.storyId);
        this.setState(call.storyId, { cursor: 0, ancestors: [...ancestors, call.id] });
        let restore = () => this.setState(call.storyId, { cursor, ancestors }), willRestore = !1;
        try {
          let res = arg(...args);
          return res instanceof Promise ? (willRestore = !0, res.finally(restore)) : res;
        } finally {
          willRestore || restore();
        }
      }), result = fn.apply(object, finalArgs);
      return result && ["object", "function", "symbol"].includes(typeof result) && this.setState(call.storyId, (state) => ({
        callRefsByResult: new Map([
          ...Array.from(state.callRefsByResult.entries()),
          [result, { __callId__: call.id, retain: call.retain }]
        ])
      })), this.update({
        ...info,
        status: result instanceof Promise ? "active" /* ACTIVE */ : "done" /* DONE */
      }), result instanceof Promise ? result.then((value) => (this.update({ ...info, status: "done" /* DONE */ }), value), handleException) : result;
    } catch (e) {
      return handleException(e);
    }
  }
  // Sends the call info to the manager and synchronizes the log.
  update(call) {
    this.channel?.emit(EVENTS.CALL, call), this.setState(call.storyId, ({ calls }) => {
      let callsById = calls.concat(call).reduce((a, c) => Object.assign(a, { [c.id]: c }), {});
      return {
        // Calls are sorted to ensure parent calls always come before calls in their callback.
        calls: Object.values(callsById).sort(
          (a, b) => a.id.localeCompare(b.id, void 0, { numeric: !0 })
        )
      };
    }), this.sync(call.storyId);
  }
  // Builds a log of interceptable calls and control states and sends it to the manager.
  // Uses a 0ms debounce because this might get called many times in one tick.
  sync(storyId) {
    let synchronize = () => {
      let { isLocked, isPlaying } = this.getState(storyId), logItems = this.getLog(storyId), pausedAt = logItems.filter(({ ancestors }) => !ancestors.length).find((item) => item.status === "waiting" /* WAITING */)?.callId, hasActive = logItems.some((item) => item.status === "active" /* ACTIVE */);
      if (this.detached || isLocked || hasActive || logItems.length === 0) {
        let payload2 = { controlStates: {
          detached: this.detached,
          start: !1,
          back: !1,
          goto: !1,
          next: !1,
          end: !1
        }, logItems };
        this.channel?.emit(EVENTS.SYNC, payload2);
        return;
      }
      let hasPrevious = logItems.some(
        (item) => item.status === "done" /* DONE */ || item.status === "error" /* ERROR */
      ), payload = { controlStates: {
        detached: this.detached,
        start: hasPrevious,
        back: hasPrevious,
        goto: !0,
        next: isPlaying,
        end: isPlaying
      }, logItems, pausedAt };
      this.channel?.emit(EVENTS.SYNC, payload);
    };
    this.setState(storyId, ({ syncTimeout }) => (clearTimeout(syncTimeout), { syncTimeout: setTimeout(synchronize, 0) }));
  }
};
function instrument(obj, options = {}) {
  try {
    let forceInstrument = !1, skipInstrument = !1;
    return global.window?.location?.search?.includes("instrument=true") ? forceInstrument = !0 : global.window?.location?.search?.includes("instrument=false") && (skipInstrument = !0), global.window?.parent === global.window && !forceInstrument || skipInstrument ? obj : (global.window && !global.window.__STORYBOOK_ADDON_INTERACTIONS_INSTRUMENTER__ && (global.window.__STORYBOOK_ADDON_INTERACTIONS_INSTRUMENTER__ = new Instrumenter()), (global.window?.__STORYBOOK_ADDON_INTERACTIONS_INSTRUMENTER__).instrument(obj, options));
  } catch (e) {
    return once.warn(e), obj;
  }
}
function getPropertyDescriptor(obj, propName) {
  let target = obj;
  for (; target != null; ) {
    let descriptor = Object.getOwnPropertyDescriptor(target, propName);
    if (descriptor)
      return descriptor;
    target = Object.getPrototypeOf(target);
  }
}
function isClass(obj) {
  if (typeof obj != "function")
    return !1;
  let descriptor = Object.getOwnPropertyDescriptor(obj, "prototype");
  return descriptor ? !descriptor.writable : !1;
}
export {
  CallStates,
  EVENTS,
  instrument
};
