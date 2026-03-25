import {
  dedent
} from "./chunk-JP7NCOJX.js";

// src/shared/universal-store/instances.ts
var instances = /* @__PURE__ */ new Map();

// src/shared/universal-store/index.ts
var CHANNEL_EVENT_PREFIX = "UNIVERSAL_STORE:", ProgressState = {
  PENDING: "PENDING",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED"
}, _UniversalStore = class _UniversalStore {
  constructor(options, environmentOverrides) {
    /** Enable debug logs for this store */
    this.debugging = !1;
    // TODO: narrow type of listeners based on event type
    this.listeners = /* @__PURE__ */ new Map([["*", /* @__PURE__ */ new Set()]]);
    /** Gets the current state */
    this.getState = () => (this.debug("getState", { state: this.state }), this.state);
    /**
     * Subscribes to store events
     *
     * @returns A function to unsubscribe
     */
    this.subscribe = (eventTypeOrListener, maybeListener) => {
      let subscribesToAllEvents = typeof eventTypeOrListener == "function", eventType = subscribesToAllEvents ? "*" : eventTypeOrListener, listener = subscribesToAllEvents ? eventTypeOrListener : maybeListener;
      if (this.debug("subscribe", { eventType, listener }), !listener)
        throw new TypeError(
          `Missing first subscribe argument, or second if first is the event type, when subscribing to a UniversalStore with id '${this.id}'`
        );
      return this.listeners.has(eventType) || this.listeners.set(eventType, /* @__PURE__ */ new Set()), this.listeners.get(eventType).add(listener), () => {
        this.debug("unsubscribe", { eventType, listener }), this.listeners.has(eventType) && (this.listeners.get(eventType).delete(listener), this.listeners.get(eventType)?.size === 0 && this.listeners.delete(eventType));
      };
    };
    /** Sends a custom event to the other stores */
    this.send = (event) => {
      if (this.debug("send", { event }), this.status !== _UniversalStore.Status.READY)
        throw new TypeError(
          dedent`Cannot send event before store is ready. You can get the current status with store.status,
        or await store.readyPromise to wait for the store to be ready before sending events.
        ${JSON.stringify(
            {
              event,
              id: this.id,
              actor: this.actor,
              environment: this.environment
            },
            null,
            2
          )}`
        );
      this.emitToListeners(event, { actor: this.actor }), this.emitToChannel(event, { actor: this.actor });
    };
    if (this.debugging = options.debug ?? !1, !_UniversalStore.isInternalConstructing)
      throw new TypeError(
        "UniversalStore is not constructable - use UniversalStore.create() instead"
      );
    if (_UniversalStore.isInternalConstructing = !1, this.id = options.id, this.actorId = Date.now().toString(36) + Math.random().toString(36).substring(2), this.actorType = options.leader ? _UniversalStore.ActorType.LEADER : _UniversalStore.ActorType.FOLLOWER, this.state = options.initialState, this.channelEventName = `${CHANNEL_EVENT_PREFIX}${this.id}`, this.debug("constructor", {
      options,
      environmentOverrides,
      channelEventName: this.channelEventName
    }), this.actor.type === _UniversalStore.ActorType.LEADER)
      this.syncing = {
        state: ProgressState.RESOLVED,
        promise: Promise.resolve()
      };
    else {
      let syncingResolve, syncingReject, syncingPromise = new Promise((resolve, reject) => {
        syncingResolve = () => {
          this.syncing.state === ProgressState.PENDING && (this.syncing.state = ProgressState.RESOLVED, resolve());
        }, syncingReject = (reason) => {
          this.syncing.state === ProgressState.PENDING && (this.syncing.state = ProgressState.REJECTED, reject(reason));
        };
      });
      this.syncing = {
        state: ProgressState.PENDING,
        promise: syncingPromise,
        resolve: syncingResolve,
        reject: syncingReject
      };
    }
    this.getState = this.getState.bind(this), this.setState = this.setState.bind(this), this.subscribe = this.subscribe.bind(this), this.onStateChange = this.onStateChange.bind(this), this.send = this.send.bind(this), this.emitToChannel = this.emitToChannel.bind(this), this.prepareThis = this.prepareThis.bind(this), this.emitToListeners = this.emitToListeners.bind(this), this.handleChannelEvents = this.handleChannelEvents.bind(this), this.debug = this.debug.bind(this), this.channel = environmentOverrides?.channel ?? _UniversalStore.preparation.channel, this.environment = environmentOverrides?.environment ?? _UniversalStore.preparation.environment, this.channel && this.environment ? (_UniversalStore.preparation.resolve({ channel: this.channel, environment: this.environment }), this.prepareThis({ channel: this.channel, environment: this.environment })) : _UniversalStore.preparation.promise.then(this.prepareThis);
  }
  static setupPreparationPromise() {
    let resolveRef, rejectRef, promise = new Promise(
      (resolve, reject) => {
        resolveRef = (args) => {
          resolve(args);
        }, rejectRef = (...args) => {
          reject(args);
        };
      }
    );
    _UniversalStore.preparation = {
      resolve: resolveRef,
      reject: rejectRef,
      promise
    };
  }
  /** The actor object representing the store instance with a unique ID and a type */
  get actor() {
    return Object.freeze({
      id: this.actorId,
      type: this.actorType,
      environment: this.environment ?? _UniversalStore.Environment.UNKNOWN
    });
  }
  /**
   * The current state of the store, that signals both if the store is prepared by Storybook and
   * also - in the case of a follower - if the state has been synced with the leader's state.
   */
  get status() {
    if (!this.channel || !this.environment)
      return _UniversalStore.Status.UNPREPARED;
    switch (this.syncing?.state) {
      case ProgressState.PENDING:
      case void 0:
        return _UniversalStore.Status.SYNCING;
      case ProgressState.REJECTED:
        return _UniversalStore.Status.ERROR;
      case ProgressState.RESOLVED:
      default:
        return _UniversalStore.Status.READY;
    }
  }
  /**
   * A promise that resolves when the store is fully ready. A leader will be ready when the store
   * has been prepared by Storybook, which is almost instantly.
   *
   * A follower will be ready when the state has been synced with the leader's state, within a few
   * hundred milliseconds.
   */
  untilReady() {
    return Promise.all([_UniversalStore.preparation.promise, this.syncing?.promise]);
  }
  /** Creates a new instance of UniversalStore */
  static create(options) {
    if (!options || typeof options?.id != "string")
      throw new TypeError("id is required and must be a string, when creating a UniversalStore");
    options.debug && console.debug(
      dedent`[UniversalStore]
        create`,
      { options }
    );
    let existing = instances.get(options.id);
    if (existing)
      return console.warn(dedent`UniversalStore with id "${options.id}" already exists in this environment, re-using existing.
        You should reuse the existing instance instead of trying to create a new one.`), existing;
    _UniversalStore.isInternalConstructing = !0;
    let store = new _UniversalStore(options);
    return instances.set(options.id, store), store;
  }
  /**
   * Used by Storybook to set the channel for all instances of UniversalStore in the given
   * environment.
   *
   * @internal
   */
  static __prepare(channel, environment) {
    _UniversalStore.preparation.channel = channel, _UniversalStore.preparation.environment = environment, _UniversalStore.preparation.resolve({ channel, environment });
  }
  /**
   * Updates the store's state
   *
   * Either a new state or a state updater function can be passed to the method.
   */
  setState(updater) {
    let previousState = this.state, newState = typeof updater == "function" ? updater(previousState) : updater;
    if (this.debug("setState", { newState, previousState, updater }), this.status !== _UniversalStore.Status.READY)
      throw new TypeError(
        dedent`Cannot set state before store is ready. You can get the current status with store.status,
        or await store.readyPromise to wait for the store to be ready before sending events.
        ${JSON.stringify(
          {
            newState,
            id: this.id,
            actor: this.actor,
            environment: this.environment
          },
          null,
          2
        )}`
      );
    this.state = newState;
    let event = {
      type: _UniversalStore.InternalEventType.SET_STATE,
      payload: {
        state: newState,
        previousState
      }
    };
    this.emitToChannel(event, { actor: this.actor }), this.emitToListeners(event, { actor: this.actor });
  }
  /**
   * Subscribes to state changes
   *
   * @returns Unsubscribe function
   */
  onStateChange(listener) {
    return this.debug("onStateChange", { listener }), this.subscribe(
      _UniversalStore.InternalEventType.SET_STATE,
      ({ payload }, eventInfo) => {
        listener(payload.state, payload.previousState, eventInfo);
      }
    );
  }
  emitToChannel(event, eventInfo) {
    this.debug("emitToChannel", { event, eventInfo, channel: !!this.channel }), this.channel?.emit(this.channelEventName, {
      event,
      eventInfo
    });
  }
  prepareThis({
    channel,
    environment
  }) {
    this.channel = channel, this.environment = environment, this.debug("prepared", { channel: !!channel, environment }), this.channel.on(this.channelEventName, this.handleChannelEvents), this.actor.type === _UniversalStore.ActorType.LEADER ? this.emitToChannel(
      { type: _UniversalStore.InternalEventType.LEADER_CREATED },
      { actor: this.actor }
    ) : (this.emitToChannel(
      { type: _UniversalStore.InternalEventType.FOLLOWER_CREATED },
      { actor: this.actor }
    ), this.emitToChannel(
      { type: _UniversalStore.InternalEventType.EXISTING_STATE_REQUEST },
      { actor: this.actor }
    ), setTimeout(() => {
      this.syncing.reject(
        new TypeError(
          `No existing state found for follower with id: '${this.id}'. Make sure a leader with the same id exists before creating a follower.`
        )
      );
    }, 1e3));
  }
  emitToListeners(event, eventInfo) {
    let eventTypeListeners = this.listeners.get(event.type), everythingListeners = this.listeners.get("*");
    this.debug("emitToListeners", {
      event,
      eventInfo,
      eventTypeListeners,
      everythingListeners
    }), [...eventTypeListeners ?? [], ...everythingListeners ?? []].forEach(
      (listener) => listener(event, eventInfo)
    );
  }
  handleChannelEvents(channelEvent) {
    let { event, eventInfo } = channelEvent;
    if ([eventInfo.actor.id, eventInfo.forwardingActor?.id].includes(this.actor.id)) {
      this.debug("handleChannelEvents: Ignoring event from self", { channelEvent });
      return;
    } else if (this.syncing?.state === ProgressState.PENDING && event.type !== _UniversalStore.InternalEventType.EXISTING_STATE_RESPONSE) {
      this.debug("handleChannelEvents: Ignoring event while syncing", { channelEvent });
      return;
    }
    if (this.debug("handleChannelEvents", { channelEvent }), this.actor.type === _UniversalStore.ActorType.LEADER) {
      let shouldForwardEvent = !0;
      switch (event.type) {
        case _UniversalStore.InternalEventType.EXISTING_STATE_REQUEST:
          shouldForwardEvent = !1;
          let responseEvent = {
            type: _UniversalStore.InternalEventType.EXISTING_STATE_RESPONSE,
            payload: this.state
          };
          this.debug("handleChannelEvents: responding to existing state request", {
            responseEvent
          }), this.emitToChannel(responseEvent, { actor: this.actor }), this.emitToListeners(responseEvent, { actor: this.actor });
          break;
        case _UniversalStore.InternalEventType.LEADER_CREATED:
          shouldForwardEvent = !1, this.syncing.state = ProgressState.REJECTED, this.debug("handleChannelEvents: erroring due to second leader being created", {
            event
          }), console.error(
            dedent`Detected multiple UniversalStore leaders created with the same id "${this.id}".
            Only one leader can exists at a time, your stores are now in an invalid state.
            Leaders detected:
            this: ${JSON.stringify(this.actor, null, 2)}
            other: ${JSON.stringify(eventInfo.actor, null, 2)}`
          );
          break;
      }
      shouldForwardEvent && (this.debug("handleChannelEvents: forwarding event", { channelEvent }), this.emitToChannel(event, { actor: eventInfo.actor, forwardingActor: this.actor }));
    }
    if (this.actor.type === _UniversalStore.ActorType.FOLLOWER)
      switch (event.type) {
        case _UniversalStore.InternalEventType.EXISTING_STATE_RESPONSE:
          if (this.debug("handleChannelEvents: Setting state from leader's existing state response", {
            event
          }), this.syncing?.state !== ProgressState.PENDING)
            break;
          this.syncing.resolve?.();
          let setStateEvent = {
            type: _UniversalStore.InternalEventType.SET_STATE,
            payload: {
              state: event.payload,
              previousState: this.state
            }
          };
          this.state = event.payload, this.emitToListeners(setStateEvent, eventInfo);
          break;
      }
    switch (event.type) {
      case _UniversalStore.InternalEventType.SET_STATE:
        this.debug("handleChannelEvents: Setting state", { event }), this.state = event.payload.state;
        break;
    }
    this.emitToListeners(event, { actor: eventInfo.actor });
  }
  debug(message, data) {
    this.debugging && console.debug(
      dedent`[UniversalStore::${this.id}::${this.environment ?? _UniversalStore.Environment.UNKNOWN}]
        ${message}`,
      JSON.stringify(
        {
          data,
          actor: this.actor,
          state: this.state,
          status: this.status
        },
        null,
        2
      )
    );
  }
  /**
   * Used to reset the static fields of the UniversalStore class when cleaning up tests
   *
   * @internal
   */
  static __reset() {
    _UniversalStore.preparation.reject(new Error("reset")), _UniversalStore.setupPreparationPromise(), _UniversalStore.isInternalConstructing = !1;
  }
};
/**
 * Defines the possible actor types in the store system
 *
 * @readonly
 */
_UniversalStore.ActorType = {
  LEADER: "LEADER",
  FOLLOWER: "FOLLOWER"
}, /**
 * Defines the possible environments the store can run in
 *
 * @readonly
 */
_UniversalStore.Environment = {
  SERVER: "SERVER",
  MANAGER: "MANAGER",
  PREVIEW: "PREVIEW",
  UNKNOWN: "UNKNOWN",
  MOCK: "MOCK"
}, /**
 * Internal event types used for store synchronization
 *
 * @readonly
 */
_UniversalStore.InternalEventType = {
  EXISTING_STATE_REQUEST: "__EXISTING_STATE_REQUEST",
  EXISTING_STATE_RESPONSE: "__EXISTING_STATE_RESPONSE",
  SET_STATE: "__SET_STATE",
  LEADER_CREATED: "__LEADER_CREATED",
  FOLLOWER_CREATED: "__FOLLOWER_CREATED"
}, _UniversalStore.Status = {
  UNPREPARED: "UNPREPARED",
  SYNCING: "SYNCING",
  READY: "READY",
  ERROR: "ERROR"
}, // This is used to check if constructor was called from the static factory create()
_UniversalStore.isInternalConstructing = !1, _UniversalStore.setupPreparationPromise();
var UniversalStore = _UniversalStore;

// ../node_modules/telejson/dist/chunk-EAFQLD22.mjs
var __create = Object.create, __defProp = Object.defineProperty, __getOwnPropDesc = Object.getOwnPropertyDescriptor, __getOwnPropNames = Object.getOwnPropertyNames, __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty, __commonJS = (cb, mod) => function() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
}, __copyProps = (to, from, except, desc) => {
  if (from && typeof from == "object" || typeof from == "function")
    for (let key of __getOwnPropNames(from))
      !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  return to;
}, __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: !0 }) : target,
  mod
)), eventProperties = [
  "bubbles",
  "cancelBubble",
  "cancelable",
  "composed",
  "currentTarget",
  "defaultPrevented",
  "eventPhase",
  "isTrusted",
  "returnValue",
  "srcElement",
  "target",
  "timeStamp",
  "type"
], customEventSpecificProperties = ["detail"];
function extractEventHiddenProperties(event) {
  let rebuildEvent = eventProperties.filter((value) => event[value] !== void 0).reduce((acc, value) => (acc[value] = event[value], acc), {});
  if (event instanceof CustomEvent)
    for (let value of customEventSpecificProperties.filter(
      (value2) => event[value2] !== void 0
    ))
      rebuildEvent[value] = event[value];
  return rebuildEvent;
}

// ../node_modules/telejson/dist/index.mjs
var require_es_object_atoms = __commonJS({
  "node_modules/.pnpm/es-object-atoms@1.1.1/node_modules/es-object-atoms/index.js"(exports, module) {
    "use strict";
    module.exports = Object;
  }
}), require_es_errors = __commonJS({
  "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/index.js"(exports, module) {
    "use strict";
    module.exports = Error;
  }
}), require_eval = __commonJS({
  "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/eval.js"(exports, module) {
    "use strict";
    module.exports = EvalError;
  }
}), require_range = __commonJS({
  "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/range.js"(exports, module) {
    "use strict";
    module.exports = RangeError;
  }
}), require_ref = __commonJS({
  "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/ref.js"(exports, module) {
    "use strict";
    module.exports = ReferenceError;
  }
}), require_syntax = __commonJS({
  "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/syntax.js"(exports, module) {
    "use strict";
    module.exports = SyntaxError;
  }
}), require_type = __commonJS({
  "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/type.js"(exports, module) {
    "use strict";
    module.exports = TypeError;
  }
}), require_uri = __commonJS({
  "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/uri.js"(exports, module) {
    "use strict";
    module.exports = URIError;
  }
}), require_abs = __commonJS({
  "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/abs.js"(exports, module) {
    "use strict";
    module.exports = Math.abs;
  }
}), require_floor = __commonJS({
  "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/floor.js"(exports, module) {
    "use strict";
    module.exports = Math.floor;
  }
}), require_max = __commonJS({
  "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/max.js"(exports, module) {
    "use strict";
    module.exports = Math.max;
  }
}), require_min = __commonJS({
  "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/min.js"(exports, module) {
    "use strict";
    module.exports = Math.min;
  }
}), require_pow = __commonJS({
  "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/pow.js"(exports, module) {
    "use strict";
    module.exports = Math.pow;
  }
}), require_round = __commonJS({
  "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/round.js"(exports, module) {
    "use strict";
    module.exports = Math.round;
  }
}), require_isNaN = __commonJS({
  "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/isNaN.js"(exports, module) {
    "use strict";
    module.exports = Number.isNaN || function(a) {
      return a !== a;
    };
  }
}), require_sign = __commonJS({
  "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/sign.js"(exports, module) {
    "use strict";
    var $isNaN = require_isNaN();
    module.exports = function(number) {
      return $isNaN(number) || number === 0 ? number : number < 0 ? -1 : 1;
    };
  }
}), require_gOPD = __commonJS({
  "node_modules/.pnpm/gopd@1.2.0/node_modules/gopd/gOPD.js"(exports, module) {
    "use strict";
    module.exports = Object.getOwnPropertyDescriptor;
  }
}), require_gopd = __commonJS({
  "node_modules/.pnpm/gopd@1.2.0/node_modules/gopd/index.js"(exports, module) {
    "use strict";
    var $gOPD = require_gOPD();
    if ($gOPD)
      try {
        $gOPD([], "length");
      } catch {
        $gOPD = null;
      }
    module.exports = $gOPD;
  }
}), require_es_define_property = __commonJS({
  "node_modules/.pnpm/es-define-property@1.0.1/node_modules/es-define-property/index.js"(exports, module) {
    "use strict";
    var $defineProperty = Object.defineProperty || !1;
    if ($defineProperty)
      try {
        $defineProperty({}, "a", { value: 1 });
      } catch {
        $defineProperty = !1;
      }
    module.exports = $defineProperty;
  }
}), require_shams = __commonJS({
  "node_modules/.pnpm/has-symbols@1.1.0/node_modules/has-symbols/shams.js"(exports, module) {
    "use strict";
    module.exports = function() {
      if (typeof Symbol != "function" || typeof Object.getOwnPropertySymbols != "function")
        return !1;
      if (typeof Symbol.iterator == "symbol")
        return !0;
      var obj = {}, sym = Symbol("test"), symObj = Object(sym);
      if (typeof sym == "string" || Object.prototype.toString.call(sym) !== "[object Symbol]" || Object.prototype.toString.call(symObj) !== "[object Symbol]")
        return !1;
      var symVal = 42;
      obj[sym] = symVal;
      for (var _ in obj)
        return !1;
      if (typeof Object.keys == "function" && Object.keys(obj).length !== 0 || typeof Object.getOwnPropertyNames == "function" && Object.getOwnPropertyNames(obj).length !== 0)
        return !1;
      var syms = Object.getOwnPropertySymbols(obj);
      if (syms.length !== 1 || syms[0] !== sym || !Object.prototype.propertyIsEnumerable.call(obj, sym))
        return !1;
      if (typeof Object.getOwnPropertyDescriptor == "function") {
        var descriptor = (
          /** @type {PropertyDescriptor} */
          Object.getOwnPropertyDescriptor(obj, sym)
        );
        if (descriptor.value !== symVal || descriptor.enumerable !== !0)
          return !1;
      }
      return !0;
    };
  }
}), require_has_symbols = __commonJS({
  "node_modules/.pnpm/has-symbols@1.1.0/node_modules/has-symbols/index.js"(exports, module) {
    "use strict";
    var origSymbol = typeof Symbol < "u" && Symbol, hasSymbolSham = require_shams();
    module.exports = function() {
      return typeof origSymbol != "function" || typeof Symbol != "function" || typeof origSymbol("foo") != "symbol" || typeof Symbol("bar") != "symbol" ? !1 : hasSymbolSham();
    };
  }
}), require_Reflect_getPrototypeOf = __commonJS({
  "node_modules/.pnpm/get-proto@1.0.1/node_modules/get-proto/Reflect.getPrototypeOf.js"(exports, module) {
    "use strict";
    module.exports = typeof Reflect < "u" && Reflect.getPrototypeOf || null;
  }
}), require_Object_getPrototypeOf = __commonJS({
  "node_modules/.pnpm/get-proto@1.0.1/node_modules/get-proto/Object.getPrototypeOf.js"(exports, module) {
    "use strict";
    var $Object = require_es_object_atoms();
    module.exports = $Object.getPrototypeOf || null;
  }
}), require_implementation = __commonJS({
  "node_modules/.pnpm/function-bind@1.1.2/node_modules/function-bind/implementation.js"(exports, module) {
    "use strict";
    var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ", toStr = Object.prototype.toString, max = Math.max, funcType = "[object Function]", concatty = function(a, b) {
      for (var arr = [], i = 0; i < a.length; i += 1)
        arr[i] = a[i];
      for (var j = 0; j < b.length; j += 1)
        arr[j + a.length] = b[j];
      return arr;
    }, slicy = function(arrLike, offset) {
      for (var arr = [], i = offset || 0, j = 0; i < arrLike.length; i += 1, j += 1)
        arr[j] = arrLike[i];
      return arr;
    }, joiny = function(arr, joiner) {
      for (var str = "", i = 0; i < arr.length; i += 1)
        str += arr[i], i + 1 < arr.length && (str += joiner);
      return str;
    };
    module.exports = function(that) {
      var target = this;
      if (typeof target != "function" || toStr.apply(target) !== funcType)
        throw new TypeError(ERROR_MESSAGE + target);
      for (var args = slicy(arguments, 1), bound, binder = function() {
        if (this instanceof bound) {
          var result = target.apply(
            this,
            concatty(args, arguments)
          );
          return Object(result) === result ? result : this;
        }
        return target.apply(
          that,
          concatty(args, arguments)
        );
      }, boundLength = max(0, target.length - args.length), boundArgs = [], i = 0; i < boundLength; i++)
        boundArgs[i] = "$" + i;
      if (bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder), target.prototype) {
        var Empty = function() {
        };
        Empty.prototype = target.prototype, bound.prototype = new Empty(), Empty.prototype = null;
      }
      return bound;
    };
  }
}), require_function_bind = __commonJS({
  "node_modules/.pnpm/function-bind@1.1.2/node_modules/function-bind/index.js"(exports, module) {
    "use strict";
    var implementation = require_implementation();
    module.exports = Function.prototype.bind || implementation;
  }
}), require_functionCall = __commonJS({
  "node_modules/.pnpm/call-bind-apply-helpers@1.0.2/node_modules/call-bind-apply-helpers/functionCall.js"(exports, module) {
    "use strict";
    module.exports = Function.prototype.call;
  }
}), require_functionApply = __commonJS({
  "node_modules/.pnpm/call-bind-apply-helpers@1.0.2/node_modules/call-bind-apply-helpers/functionApply.js"(exports, module) {
    "use strict";
    module.exports = Function.prototype.apply;
  }
}), require_reflectApply = __commonJS({
  "node_modules/.pnpm/call-bind-apply-helpers@1.0.2/node_modules/call-bind-apply-helpers/reflectApply.js"(exports, module) {
    "use strict";
    module.exports = typeof Reflect < "u" && Reflect && Reflect.apply;
  }
}), require_actualApply = __commonJS({
  "node_modules/.pnpm/call-bind-apply-helpers@1.0.2/node_modules/call-bind-apply-helpers/actualApply.js"(exports, module) {
    "use strict";
    var bind = require_function_bind(), $apply = require_functionApply(), $call = require_functionCall(), $reflectApply = require_reflectApply();
    module.exports = $reflectApply || bind.call($call, $apply);
  }
}), require_call_bind_apply_helpers = __commonJS({
  "node_modules/.pnpm/call-bind-apply-helpers@1.0.2/node_modules/call-bind-apply-helpers/index.js"(exports, module) {
    "use strict";
    var bind = require_function_bind(), $TypeError = require_type(), $call = require_functionCall(), $actualApply = require_actualApply();
    module.exports = function(args) {
      if (args.length < 1 || typeof args[0] != "function")
        throw new $TypeError("a function is required");
      return $actualApply(bind, $call, args);
    };
  }
}), require_get = __commonJS({
  "node_modules/.pnpm/dunder-proto@1.0.1/node_modules/dunder-proto/get.js"(exports, module) {
    "use strict";
    var callBind = require_call_bind_apply_helpers(), gOPD = require_gopd(), hasProtoAccessor;
    try {
      hasProtoAccessor = /** @type {{ __proto__?: typeof Array.prototype }} */
      [].__proto__ === Array.prototype;
    } catch (e) {
      if (!e || typeof e != "object" || !("code" in e) || e.code !== "ERR_PROTO_ACCESS")
        throw e;
    }
    var desc = !!hasProtoAccessor && gOPD && gOPD(
      Object.prototype,
      /** @type {keyof typeof Object.prototype} */
      "__proto__"
    ), $Object = Object, $getPrototypeOf = $Object.getPrototypeOf;
    module.exports = desc && typeof desc.get == "function" ? callBind([desc.get]) : typeof $getPrototypeOf == "function" ? (
      /** @type {import('./get')} */
      (function(value) {
        return $getPrototypeOf(value == null ? value : $Object(value));
      })
    ) : !1;
  }
}), require_get_proto = __commonJS({
  "node_modules/.pnpm/get-proto@1.0.1/node_modules/get-proto/index.js"(exports, module) {
    "use strict";
    var reflectGetProto = require_Reflect_getPrototypeOf(), originalGetProto = require_Object_getPrototypeOf(), getDunderProto = require_get();
    module.exports = reflectGetProto ? function(O) {
      return reflectGetProto(O);
    } : originalGetProto ? function(O) {
      if (!O || typeof O != "object" && typeof O != "function")
        throw new TypeError("getProto: not an object");
      return originalGetProto(O);
    } : getDunderProto ? function(O) {
      return getDunderProto(O);
    } : null;
  }
}), require_hasown = __commonJS({
  "node_modules/.pnpm/hasown@2.0.2/node_modules/hasown/index.js"(exports, module) {
    "use strict";
    var call = Function.prototype.call, $hasOwn = Object.prototype.hasOwnProperty, bind = require_function_bind();
    module.exports = bind.call(call, $hasOwn);
  }
}), require_get_intrinsic = __commonJS({
  "node_modules/.pnpm/get-intrinsic@1.3.0/node_modules/get-intrinsic/index.js"(exports, module) {
    "use strict";
    var undefined2, $Object = require_es_object_atoms(), $Error = require_es_errors(), $EvalError = require_eval(), $RangeError = require_range(), $ReferenceError = require_ref(), $SyntaxError = require_syntax(), $TypeError = require_type(), $URIError = require_uri(), abs = require_abs(), floor = require_floor(), max = require_max(), min = require_min(), pow = require_pow(), round = require_round(), sign = require_sign(), $Function = Function, getEvalledConstructor = function(expressionSyntax) {
      try {
        return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
      } catch {
      }
    }, $gOPD = require_gopd(), $defineProperty = require_es_define_property(), throwTypeError = function() {
      throw new $TypeError();
    }, ThrowTypeError = $gOPD ? (function() {
      try {
        return arguments.callee, throwTypeError;
      } catch {
        try {
          return $gOPD(arguments, "callee").get;
        } catch {
          return throwTypeError;
        }
      }
    })() : throwTypeError, hasSymbols = require_has_symbols()(), getProto = require_get_proto(), $ObjectGPO = require_Object_getPrototypeOf(), $ReflectGPO = require_Reflect_getPrototypeOf(), $apply = require_functionApply(), $call = require_functionCall(), needsEval = {}, TypedArray = typeof Uint8Array > "u" || !getProto ? undefined2 : getProto(Uint8Array), INTRINSICS = {
      __proto__: null,
      "%AggregateError%": typeof AggregateError > "u" ? undefined2 : AggregateError,
      "%Array%": Array,
      "%ArrayBuffer%": typeof ArrayBuffer > "u" ? undefined2 : ArrayBuffer,
      "%ArrayIteratorPrototype%": hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined2,
      "%AsyncFromSyncIteratorPrototype%": undefined2,
      "%AsyncFunction%": needsEval,
      "%AsyncGenerator%": needsEval,
      "%AsyncGeneratorFunction%": needsEval,
      "%AsyncIteratorPrototype%": needsEval,
      "%Atomics%": typeof Atomics > "u" ? undefined2 : Atomics,
      "%BigInt%": typeof BigInt > "u" ? undefined2 : BigInt,
      "%BigInt64Array%": typeof BigInt64Array > "u" ? undefined2 : BigInt64Array,
      "%BigUint64Array%": typeof BigUint64Array > "u" ? undefined2 : BigUint64Array,
      "%Boolean%": Boolean,
      "%DataView%": typeof DataView > "u" ? undefined2 : DataView,
      "%Date%": Date,
      "%decodeURI%": decodeURI,
      "%decodeURIComponent%": decodeURIComponent,
      "%encodeURI%": encodeURI,
      "%encodeURIComponent%": encodeURIComponent,
      "%Error%": $Error,
      "%eval%": eval,
      // eslint-disable-line no-eval
      "%EvalError%": $EvalError,
      "%Float16Array%": typeof Float16Array > "u" ? undefined2 : Float16Array,
      "%Float32Array%": typeof Float32Array > "u" ? undefined2 : Float32Array,
      "%Float64Array%": typeof Float64Array > "u" ? undefined2 : Float64Array,
      "%FinalizationRegistry%": typeof FinalizationRegistry > "u" ? undefined2 : FinalizationRegistry,
      "%Function%": $Function,
      "%GeneratorFunction%": needsEval,
      "%Int8Array%": typeof Int8Array > "u" ? undefined2 : Int8Array,
      "%Int16Array%": typeof Int16Array > "u" ? undefined2 : Int16Array,
      "%Int32Array%": typeof Int32Array > "u" ? undefined2 : Int32Array,
      "%isFinite%": isFinite,
      "%isNaN%": isNaN,
      "%IteratorPrototype%": hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined2,
      "%JSON%": typeof JSON == "object" ? JSON : undefined2,
      "%Map%": typeof Map > "u" ? undefined2 : Map,
      "%MapIteratorPrototype%": typeof Map > "u" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Map())[Symbol.iterator]()),
      "%Math%": Math,
      "%Number%": Number,
      "%Object%": $Object,
      "%Object.getOwnPropertyDescriptor%": $gOPD,
      "%parseFloat%": parseFloat,
      "%parseInt%": parseInt,
      "%Promise%": typeof Promise > "u" ? undefined2 : Promise,
      "%Proxy%": typeof Proxy > "u" ? undefined2 : Proxy,
      "%RangeError%": $RangeError,
      "%ReferenceError%": $ReferenceError,
      "%Reflect%": typeof Reflect > "u" ? undefined2 : Reflect,
      "%RegExp%": RegExp,
      "%Set%": typeof Set > "u" ? undefined2 : Set,
      "%SetIteratorPrototype%": typeof Set > "u" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Set())[Symbol.iterator]()),
      "%SharedArrayBuffer%": typeof SharedArrayBuffer > "u" ? undefined2 : SharedArrayBuffer,
      "%String%": String,
      "%StringIteratorPrototype%": hasSymbols && getProto ? getProto(""[Symbol.iterator]()) : undefined2,
      "%Symbol%": hasSymbols ? Symbol : undefined2,
      "%SyntaxError%": $SyntaxError,
      "%ThrowTypeError%": ThrowTypeError,
      "%TypedArray%": TypedArray,
      "%TypeError%": $TypeError,
      "%Uint8Array%": typeof Uint8Array > "u" ? undefined2 : Uint8Array,
      "%Uint8ClampedArray%": typeof Uint8ClampedArray > "u" ? undefined2 : Uint8ClampedArray,
      "%Uint16Array%": typeof Uint16Array > "u" ? undefined2 : Uint16Array,
      "%Uint32Array%": typeof Uint32Array > "u" ? undefined2 : Uint32Array,
      "%URIError%": $URIError,
      "%WeakMap%": typeof WeakMap > "u" ? undefined2 : WeakMap,
      "%WeakRef%": typeof WeakRef > "u" ? undefined2 : WeakRef,
      "%WeakSet%": typeof WeakSet > "u" ? undefined2 : WeakSet,
      "%Function.prototype.call%": $call,
      "%Function.prototype.apply%": $apply,
      "%Object.defineProperty%": $defineProperty,
      "%Object.getPrototypeOf%": $ObjectGPO,
      "%Math.abs%": abs,
      "%Math.floor%": floor,
      "%Math.max%": max,
      "%Math.min%": min,
      "%Math.pow%": pow,
      "%Math.round%": round,
      "%Math.sign%": sign,
      "%Reflect.getPrototypeOf%": $ReflectGPO
    };
    if (getProto)
      try {
        null.error;
      } catch (e) {
        errorProto = getProto(getProto(e)), INTRINSICS["%Error.prototype%"] = errorProto;
      }
    var errorProto, doEval = function doEval2(name) {
      var value;
      if (name === "%AsyncFunction%")
        value = getEvalledConstructor("async function () {}");
      else if (name === "%GeneratorFunction%")
        value = getEvalledConstructor("function* () {}");
      else if (name === "%AsyncGeneratorFunction%")
        value = getEvalledConstructor("async function* () {}");
      else if (name === "%AsyncGenerator%") {
        var fn = doEval2("%AsyncGeneratorFunction%");
        fn && (value = fn.prototype);
      } else if (name === "%AsyncIteratorPrototype%") {
        var gen = doEval2("%AsyncGenerator%");
        gen && getProto && (value = getProto(gen.prototype));
      }
      return INTRINSICS[name] = value, value;
    }, LEGACY_ALIASES = {
      __proto__: null,
      "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
      "%ArrayPrototype%": ["Array", "prototype"],
      "%ArrayProto_entries%": ["Array", "prototype", "entries"],
      "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
      "%ArrayProto_keys%": ["Array", "prototype", "keys"],
      "%ArrayProto_values%": ["Array", "prototype", "values"],
      "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
      "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
      "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
      "%BooleanPrototype%": ["Boolean", "prototype"],
      "%DataViewPrototype%": ["DataView", "prototype"],
      "%DatePrototype%": ["Date", "prototype"],
      "%ErrorPrototype%": ["Error", "prototype"],
      "%EvalErrorPrototype%": ["EvalError", "prototype"],
      "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
      "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
      "%FunctionPrototype%": ["Function", "prototype"],
      "%Generator%": ["GeneratorFunction", "prototype"],
      "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
      "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
      "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
      "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
      "%JSONParse%": ["JSON", "parse"],
      "%JSONStringify%": ["JSON", "stringify"],
      "%MapPrototype%": ["Map", "prototype"],
      "%NumberPrototype%": ["Number", "prototype"],
      "%ObjectPrototype%": ["Object", "prototype"],
      "%ObjProto_toString%": ["Object", "prototype", "toString"],
      "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
      "%PromisePrototype%": ["Promise", "prototype"],
      "%PromiseProto_then%": ["Promise", "prototype", "then"],
      "%Promise_all%": ["Promise", "all"],
      "%Promise_reject%": ["Promise", "reject"],
      "%Promise_resolve%": ["Promise", "resolve"],
      "%RangeErrorPrototype%": ["RangeError", "prototype"],
      "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
      "%RegExpPrototype%": ["RegExp", "prototype"],
      "%SetPrototype%": ["Set", "prototype"],
      "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
      "%StringPrototype%": ["String", "prototype"],
      "%SymbolPrototype%": ["Symbol", "prototype"],
      "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
      "%TypedArrayPrototype%": ["TypedArray", "prototype"],
      "%TypeErrorPrototype%": ["TypeError", "prototype"],
      "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
      "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
      "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
      "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
      "%URIErrorPrototype%": ["URIError", "prototype"],
      "%WeakMapPrototype%": ["WeakMap", "prototype"],
      "%WeakSetPrototype%": ["WeakSet", "prototype"]
    }, bind = require_function_bind(), hasOwn = require_hasown(), $concat = bind.call($call, Array.prototype.concat), $spliceApply = bind.call($apply, Array.prototype.splice), $replace = bind.call($call, String.prototype.replace), $strSlice = bind.call($call, String.prototype.slice), $exec = bind.call($call, RegExp.prototype.exec), rePropName2 = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g, reEscapeChar2 = /\\(\\)?/g, stringToPath2 = function(string) {
      var first = $strSlice(string, 0, 1), last = $strSlice(string, -1);
      if (first === "%" && last !== "%")
        throw new $SyntaxError("invalid intrinsic syntax, expected closing `%`");
      if (last === "%" && first !== "%")
        throw new $SyntaxError("invalid intrinsic syntax, expected opening `%`");
      var result = [];
      return $replace(string, rePropName2, function(match, number, quote, subString) {
        result[result.length] = quote ? $replace(subString, reEscapeChar2, "$1") : number || match;
      }), result;
    }, getBaseIntrinsic = function(name, allowMissing) {
      var intrinsicName = name, alias;
      if (hasOwn(LEGACY_ALIASES, intrinsicName) && (alias = LEGACY_ALIASES[intrinsicName], intrinsicName = "%" + alias[0] + "%"), hasOwn(INTRINSICS, intrinsicName)) {
        var value = INTRINSICS[intrinsicName];
        if (value === needsEval && (value = doEval(intrinsicName)), typeof value > "u" && !allowMissing)
          throw new $TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!");
        return {
          alias,
          name: intrinsicName,
          value
        };
      }
      throw new $SyntaxError("intrinsic " + name + " does not exist!");
    };
    module.exports = function(name, allowMissing) {
      if (typeof name != "string" || name.length === 0)
        throw new $TypeError("intrinsic name must be a non-empty string");
      if (arguments.length > 1 && typeof allowMissing != "boolean")
        throw new $TypeError('"allowMissing" argument must be a boolean');
      if ($exec(/^%?[^%]*%?$/, name) === null)
        throw new $SyntaxError("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
      var parts = stringToPath2(name), intrinsicBaseName = parts.length > 0 ? parts[0] : "", intrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing), intrinsicRealName = intrinsic.name, value = intrinsic.value, skipFurtherCaching = !1, alias = intrinsic.alias;
      alias && (intrinsicBaseName = alias[0], $spliceApply(parts, $concat([0, 1], alias)));
      for (var i = 1, isOwn = !0; i < parts.length; i += 1) {
        var part = parts[i], first = $strSlice(part, 0, 1), last = $strSlice(part, -1);
        if ((first === '"' || first === "'" || first === "`" || last === '"' || last === "'" || last === "`") && first !== last)
          throw new $SyntaxError("property names with quotes must have matching quotes");
        if ((part === "constructor" || !isOwn) && (skipFurtherCaching = !0), intrinsicBaseName += "." + part, intrinsicRealName = "%" + intrinsicBaseName + "%", hasOwn(INTRINSICS, intrinsicRealName))
          value = INTRINSICS[intrinsicRealName];
        else if (value != null) {
          if (!(part in value)) {
            if (!allowMissing)
              throw new $TypeError("base intrinsic for " + name + " exists, but the property is not available.");
            return;
          }
          if ($gOPD && i + 1 >= parts.length) {
            var desc = $gOPD(value, part);
            isOwn = !!desc, isOwn && "get" in desc && !("originalValue" in desc.get) ? value = desc.get : value = value[part];
          } else
            isOwn = hasOwn(value, part), value = value[part];
          isOwn && !skipFurtherCaching && (INTRINSICS[intrinsicRealName] = value);
        }
      }
      return value;
    };
  }
}), require_call_bound = __commonJS({
  "node_modules/.pnpm/call-bound@1.0.4/node_modules/call-bound/index.js"(exports, module) {
    "use strict";
    var GetIntrinsic = require_get_intrinsic(), callBindBasic = require_call_bind_apply_helpers(), $indexOf = callBindBasic([GetIntrinsic("%String.prototype.indexOf%")]);
    module.exports = function(name, allowMissing) {
      var intrinsic = (
        /** @type {(this: unknown, ...args: unknown[]) => unknown} */
        GetIntrinsic(name, !!allowMissing)
      );
      return typeof intrinsic == "function" && $indexOf(name, ".prototype.") > -1 ? callBindBasic(
        /** @type {const} */
        [intrinsic]
      ) : intrinsic;
    };
  }
}), require_shams2 = __commonJS({
  "node_modules/.pnpm/has-tostringtag@1.0.2/node_modules/has-tostringtag/shams.js"(exports, module) {
    "use strict";
    var hasSymbols = require_shams();
    module.exports = function() {
      return hasSymbols() && !!Symbol.toStringTag;
    };
  }
}), require_is_regex = __commonJS({
  "node_modules/.pnpm/is-regex@1.2.1/node_modules/is-regex/index.js"(exports, module) {
    "use strict";
    var callBound = require_call_bound(), hasToStringTag = require_shams2()(), hasOwn = require_hasown(), gOPD = require_gopd(), fn;
    hasToStringTag ? ($exec = callBound("RegExp.prototype.exec"), isRegexMarker = {}, throwRegexMarker = function() {
      throw isRegexMarker;
    }, badStringifier = {
      toString: throwRegexMarker,
      valueOf: throwRegexMarker
    }, typeof Symbol.toPrimitive == "symbol" && (badStringifier[Symbol.toPrimitive] = throwRegexMarker), fn = function(value) {
      if (!value || typeof value != "object")
        return !1;
      var descriptor = (
        /** @type {NonNullable<typeof gOPD>} */
        gOPD(
          /** @type {{ lastIndex?: unknown }} */
          value,
          "lastIndex"
        )
      ), hasLastIndexDataProperty = descriptor && hasOwn(descriptor, "value");
      if (!hasLastIndexDataProperty)
        return !1;
      try {
        $exec(
          value,
          /** @type {string} */
          /** @type {unknown} */
          badStringifier
        );
      } catch (e) {
        return e === isRegexMarker;
      }
    }) : ($toString = callBound("Object.prototype.toString"), regexClass = "[object RegExp]", fn = function(value) {
      return !value || typeof value != "object" && typeof value != "function" ? !1 : $toString(value) === regexClass;
    });
    var $exec, isRegexMarker, throwRegexMarker, badStringifier, $toString, regexClass;
    module.exports = fn;
  }
}), require_is_function = __commonJS({
  "node_modules/.pnpm/is-function@1.0.2/node_modules/is-function/index.js"(exports, module) {
    module.exports = isFunction3;
    var toString2 = Object.prototype.toString;
    function isFunction3(fn) {
      if (!fn)
        return !1;
      var string = toString2.call(fn);
      return string === "[object Function]" || typeof fn == "function" && string !== "[object RegExp]" || typeof window < "u" && // IE8 and below
      (fn === window.setTimeout || fn === window.alert || fn === window.confirm || fn === window.prompt);
    }
  }
}), require_safe_regex_test = __commonJS({
  "node_modules/.pnpm/safe-regex-test@1.1.0/node_modules/safe-regex-test/index.js"(exports, module) {
    "use strict";
    var callBound = require_call_bound(), isRegex = require_is_regex(), $exec = callBound("RegExp.prototype.exec"), $TypeError = require_type();
    module.exports = function(regex) {
      if (!isRegex(regex))
        throw new $TypeError("`regex` must be a RegExp");
      return function(s) {
        return $exec(regex, s) !== null;
      };
    };
  }
}), require_is_symbol = __commonJS({
  "node_modules/.pnpm/is-symbol@1.1.1/node_modules/is-symbol/index.js"(exports, module) {
    "use strict";
    var callBound = require_call_bound(), $toString = callBound("Object.prototype.toString"), hasSymbols = require_has_symbols()(), safeRegexTest = require_safe_regex_test();
    hasSymbols ? ($symToStr = callBound("Symbol.prototype.toString"), isSymString = safeRegexTest(/^Symbol\(.*\)$/), isSymbolObject = function(value) {
      return typeof value.valueOf() != "symbol" ? !1 : isSymString($symToStr(value));
    }, module.exports = function(value) {
      if (typeof value == "symbol")
        return !0;
      if (!value || typeof value != "object" || $toString(value) !== "[object Symbol]")
        return !1;
      try {
        return isSymbolObject(value);
      } catch {
        return !1;
      }
    }) : module.exports = function(value) {
      return !1;
    };
    var $symToStr, isSymString, isSymbolObject;
  }
}), import_is_regex = __toESM(require_is_regex()), import_is_function = __toESM(require_is_function()), import_is_symbol = __toESM(require_is_symbol());
function isObject(val) {
  return val != null && typeof val == "object" && Array.isArray(val) === !1;
}
var freeGlobal = typeof global == "object" && global && global.Object === Object && global, freeGlobal_default = freeGlobal, freeSelf = typeof self == "object" && self && self.Object === Object && self, root = freeGlobal_default || freeSelf || Function("return this")(), root_default = root, Symbol2 = root_default.Symbol, Symbol_default = Symbol2, objectProto = Object.prototype, hasOwnProperty = objectProto.hasOwnProperty, nativeObjectToString = objectProto.toString, symToStringTag = Symbol_default ? Symbol_default.toStringTag : void 0;
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
  try {
    value[symToStringTag] = void 0;
    var unmasked = !0;
  } catch {
  }
  var result = nativeObjectToString.call(value);
  return unmasked && (isOwn ? value[symToStringTag] = tag : delete value[symToStringTag]), result;
}
var getRawTag_default = getRawTag, objectProto2 = Object.prototype, nativeObjectToString2 = objectProto2.toString;
function objectToString(value) {
  return nativeObjectToString2.call(value);
}
var objectToString_default = objectToString, nullTag = "[object Null]", undefinedTag = "[object Undefined]", symToStringTag2 = Symbol_default ? Symbol_default.toStringTag : void 0;
function baseGetTag(value) {
  return value == null ? value === void 0 ? undefinedTag : nullTag : symToStringTag2 && symToStringTag2 in Object(value) ? getRawTag_default(value) : objectToString_default(value);
}
var baseGetTag_default = baseGetTag;
function isObjectLike(value) {
  return value != null && typeof value == "object";
}
var isObjectLike_default = isObjectLike, symbolTag = "[object Symbol]";
function isSymbol(value) {
  return typeof value == "symbol" || isObjectLike_default(value) && baseGetTag_default(value) == symbolTag;
}
var isSymbol_default = isSymbol;
function arrayMap(array, iteratee) {
  for (var index = -1, length = array == null ? 0 : array.length, result = Array(length); ++index < length; )
    result[index] = iteratee(array[index], index, array);
  return result;
}
var arrayMap_default = arrayMap, isArray = Array.isArray, isArray_default = isArray, INFINITY = 1 / 0, symbolProto = Symbol_default ? Symbol_default.prototype : void 0, symbolToString = symbolProto ? symbolProto.toString : void 0;
function baseToString(value) {
  if (typeof value == "string")
    return value;
  if (isArray_default(value))
    return arrayMap_default(value, baseToString) + "";
  if (isSymbol_default(value))
    return symbolToString ? symbolToString.call(value) : "";
  var result = value + "";
  return result == "0" && 1 / value == -INFINITY ? "-0" : result;
}
var baseToString_default = baseToString;
function isObject2(value) {
  var type = typeof value;
  return value != null && (type == "object" || type == "function");
}
var isObject_default = isObject2, asyncTag = "[object AsyncFunction]", funcTag = "[object Function]", genTag = "[object GeneratorFunction]", proxyTag = "[object Proxy]";
function isFunction(value) {
  if (!isObject_default(value))
    return !1;
  var tag = baseGetTag_default(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}
var isFunction_default = isFunction, coreJsData = root_default["__core-js_shared__"], coreJsData_default = coreJsData, maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData_default && coreJsData_default.keys && coreJsData_default.keys.IE_PROTO || "");
  return uid ? "Symbol(src)_1." + uid : "";
})();
function isMasked(func) {
  return !!maskSrcKey && maskSrcKey in func;
}
var isMasked_default = isMasked, funcProto = Function.prototype, funcToString = funcProto.toString;
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch {
    }
    try {
      return func + "";
    } catch {
    }
  }
  return "";
}
var toSource_default = toSource, reRegExpChar = /[\\^$.*+?()[\]{}|]/g, reIsHostCtor = /^\[object .+?Constructor\]$/, funcProto2 = Function.prototype, objectProto3 = Object.prototype, funcToString2 = funcProto2.toString, hasOwnProperty2 = objectProto3.hasOwnProperty, reIsNative = RegExp(
  "^" + funcToString2.call(hasOwnProperty2).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
);
function baseIsNative(value) {
  if (!isObject_default(value) || isMasked_default(value))
    return !1;
  var pattern = isFunction_default(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource_default(value));
}
var baseIsNative_default = baseIsNative;
function getValue(object, key) {
  return object?.[key];
}
var getValue_default = getValue;
function getNative(object, key) {
  var value = getValue_default(object, key);
  return baseIsNative_default(value) ? value : void 0;
}
var getNative_default = getNative;
function eq(value, other) {
  return value === other || value !== value && other !== other;
}
var eq_default = eq, reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, reIsPlainProp = /^\w*$/;
function isKey(value, object) {
  if (isArray_default(value))
    return !1;
  var type = typeof value;
  return type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol_default(value) ? !0 : reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object(object);
}
var isKey_default = isKey, nativeCreate = getNative_default(Object, "create"), nativeCreate_default = nativeCreate;
function hashClear() {
  this.__data__ = nativeCreate_default ? nativeCreate_default(null) : {}, this.size = 0;
}
var hashClear_default = hashClear;
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  return this.size -= result ? 1 : 0, result;
}
var hashDelete_default = hashDelete, HASH_UNDEFINED = "__lodash_hash_undefined__", objectProto4 = Object.prototype, hasOwnProperty3 = objectProto4.hasOwnProperty;
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate_default) {
    var result = data[key];
    return result === HASH_UNDEFINED ? void 0 : result;
  }
  return hasOwnProperty3.call(data, key) ? data[key] : void 0;
}
var hashGet_default = hashGet, objectProto5 = Object.prototype, hasOwnProperty4 = objectProto5.hasOwnProperty;
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate_default ? data[key] !== void 0 : hasOwnProperty4.call(data, key);
}
var hashHas_default = hashHas, HASH_UNDEFINED2 = "__lodash_hash_undefined__";
function hashSet(key, value) {
  var data = this.__data__;
  return this.size += this.has(key) ? 0 : 1, data[key] = nativeCreate_default && value === void 0 ? HASH_UNDEFINED2 : value, this;
}
var hashSet_default = hashSet;
function Hash(entries) {
  var index = -1, length = entries == null ? 0 : entries.length;
  for (this.clear(); ++index < length; ) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}
Hash.prototype.clear = hashClear_default;
Hash.prototype.delete = hashDelete_default;
Hash.prototype.get = hashGet_default;
Hash.prototype.has = hashHas_default;
Hash.prototype.set = hashSet_default;
var Hash_default = Hash;
function listCacheClear() {
  this.__data__ = [], this.size = 0;
}
var listCacheClear_default = listCacheClear;
function assocIndexOf(array, key) {
  for (var length = array.length; length--; )
    if (eq_default(array[length][0], key))
      return length;
  return -1;
}
var assocIndexOf_default = assocIndexOf, arrayProto = Array.prototype, splice = arrayProto.splice;
function listCacheDelete(key) {
  var data = this.__data__, index = assocIndexOf_default(data, key);
  if (index < 0)
    return !1;
  var lastIndex = data.length - 1;
  return index == lastIndex ? data.pop() : splice.call(data, index, 1), --this.size, !0;
}
var listCacheDelete_default = listCacheDelete;
function listCacheGet(key) {
  var data = this.__data__, index = assocIndexOf_default(data, key);
  return index < 0 ? void 0 : data[index][1];
}
var listCacheGet_default = listCacheGet;
function listCacheHas(key) {
  return assocIndexOf_default(this.__data__, key) > -1;
}
var listCacheHas_default = listCacheHas;
function listCacheSet(key, value) {
  var data = this.__data__, index = assocIndexOf_default(data, key);
  return index < 0 ? (++this.size, data.push([key, value])) : data[index][1] = value, this;
}
var listCacheSet_default = listCacheSet;
function ListCache(entries) {
  var index = -1, length = entries == null ? 0 : entries.length;
  for (this.clear(); ++index < length; ) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}
ListCache.prototype.clear = listCacheClear_default;
ListCache.prototype.delete = listCacheDelete_default;
ListCache.prototype.get = listCacheGet_default;
ListCache.prototype.has = listCacheHas_default;
ListCache.prototype.set = listCacheSet_default;
var ListCache_default = ListCache, Map2 = getNative_default(root_default, "Map"), Map_default = Map2;
function mapCacheClear() {
  this.size = 0, this.__data__ = {
    hash: new Hash_default(),
    map: new (Map_default || ListCache_default)(),
    string: new Hash_default()
  };
}
var mapCacheClear_default = mapCacheClear;
function isKeyable(value) {
  var type = typeof value;
  return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
}
var isKeyable_default = isKeyable;
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable_default(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
}
var getMapData_default = getMapData;
function mapCacheDelete(key) {
  var result = getMapData_default(this, key).delete(key);
  return this.size -= result ? 1 : 0, result;
}
var mapCacheDelete_default = mapCacheDelete;
function mapCacheGet(key) {
  return getMapData_default(this, key).get(key);
}
var mapCacheGet_default = mapCacheGet;
function mapCacheHas(key) {
  return getMapData_default(this, key).has(key);
}
var mapCacheHas_default = mapCacheHas;
function mapCacheSet(key, value) {
  var data = getMapData_default(this, key), size = data.size;
  return data.set(key, value), this.size += data.size == size ? 0 : 1, this;
}
var mapCacheSet_default = mapCacheSet;
function MapCache(entries) {
  var index = -1, length = entries == null ? 0 : entries.length;
  for (this.clear(); ++index < length; ) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}
MapCache.prototype.clear = mapCacheClear_default;
MapCache.prototype.delete = mapCacheDelete_default;
MapCache.prototype.get = mapCacheGet_default;
MapCache.prototype.has = mapCacheHas_default;
MapCache.prototype.set = mapCacheSet_default;
var MapCache_default = MapCache, FUNC_ERROR_TEXT = "Expected a function";
function memoize(func, resolver) {
  if (typeof func != "function" || resolver != null && typeof resolver != "function")
    throw new TypeError(FUNC_ERROR_TEXT);
  var memoized = function() {
    var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
    if (cache.has(key))
      return cache.get(key);
    var result = func.apply(this, args);
    return memoized.cache = cache.set(key, result) || cache, result;
  };
  return memoized.cache = new (memoize.Cache || MapCache_default)(), memoized;
}
memoize.Cache = MapCache_default;
var memoize_default = memoize, MAX_MEMOIZE_SIZE = 500;
function memoizeCapped(func) {
  var result = memoize_default(func, function(key) {
    return cache.size === MAX_MEMOIZE_SIZE && cache.clear(), key;
  }), cache = result.cache;
  return result;
}
var memoizeCapped_default = memoizeCapped, rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g, reEscapeChar = /\\(\\)?/g, stringToPath = memoizeCapped_default(function(string) {
  var result = [];
  return string.charCodeAt(0) === 46 && result.push(""), string.replace(rePropName, function(match, number, quote, subString) {
    result.push(quote ? subString.replace(reEscapeChar, "$1") : number || match);
  }), result;
}), stringToPath_default = stringToPath;
function toString(value) {
  return value == null ? "" : baseToString_default(value);
}
var toString_default = toString;
function castPath(value, object) {
  return isArray_default(value) ? value : isKey_default(value, object) ? [value] : stringToPath_default(toString_default(value));
}
var castPath_default = castPath, INFINITY2 = 1 / 0;
function toKey(value) {
  if (typeof value == "string" || isSymbol_default(value))
    return value;
  var result = value + "";
  return result == "0" && 1 / value == -INFINITY2 ? "-0" : result;
}
var toKey_default = toKey;
function baseGet(object, path) {
  path = castPath_default(path, object);
  for (var index = 0, length = path.length; object != null && index < length; )
    object = object[toKey_default(path[index++])];
  return index && index == length ? object : void 0;
}
var baseGet_default = baseGet;
function get(object, path, defaultValue) {
  var result = object == null ? void 0 : baseGet_default(object, path);
  return result === void 0 ? defaultValue : result;
}
var get_default = get, isObject3 = isObject, dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/, isJSON = (input) => input.match(/^[\[\{\"\}].*[\]\}\"]$/);
function convertUnconventionalData(data) {
  if (!isObject3(data))
    return data;
  let result = data, wasMutated = !1;
  return typeof Event < "u" && data instanceof Event && (result = extractEventHiddenProperties(result), wasMutated = !0), result = Object.keys(result).reduce((acc, key) => {
    try {
      result[key] && result[key].toJSON, acc[key] = result[key];
    } catch {
      wasMutated = !0;
    }
    return acc;
  }, {}), wasMutated ? result : data;
}
var replacer = function(options) {
  let objects, map, stack, keys;
  return function(key, value) {
    try {
      if (key === "")
        return keys = [], objects = /* @__PURE__ */ new Map([[value, "[]"]]), map = /* @__PURE__ */ new Map(), stack = [], value;
      let origin = map.get(this) || this;
      for (; stack.length && origin !== stack[0]; )
        stack.shift(), keys.pop();
      if (typeof value == "boolean")
        return value;
      if (value === void 0)
        return options.allowUndefined ? "_undefined_" : void 0;
      if (value === null)
        return null;
      if (typeof value == "number")
        return value === Number.NEGATIVE_INFINITY ? "_-Infinity_" : value === Number.POSITIVE_INFINITY ? "_Infinity_" : Number.isNaN(value) ? "_NaN_" : value;
      if (typeof value == "bigint")
        return `_bigint_${value.toString()}`;
      if (typeof value == "string")
        return dateFormat.test(value) ? options.allowDate ? `_date_${value}` : void 0 : value;
      if ((0, import_is_regex.default)(value))
        return options.allowRegExp ? `_regexp_${value.flags}|${value.source}` : void 0;
      if ((0, import_is_function.default)(value))
        return;
      if ((0, import_is_symbol.default)(value)) {
        if (!options.allowSymbol)
          return;
        let globalRegistryKey = Symbol.keyFor(value);
        return globalRegistryKey !== void 0 ? `_gsymbol_${globalRegistryKey}` : `_symbol_${value.toString().slice(7, -1)}`;
      }
      if (stack.length >= options.maxDepth)
        return Array.isArray(value) ? `[Array(${value.length})]` : "[Object]";
      if (value === this)
        return `_duplicate_${JSON.stringify(keys)}`;
      if (value instanceof Error && options.allowError)
        return {
          __isConvertedError__: !0,
          errorProperties: {
            // @ts-expect-error cause is not defined in the current tsconfig target(es2020)
            ...value.cause ? { cause: value.cause } : {},
            ...value,
            name: value.name,
            message: value.message,
            stack: value.stack,
            "_constructor-name_": value.constructor.name
          }
        };
      if (value?.constructor?.name && value.constructor.name !== "Object" && !Array.isArray(value)) {
        let found2 = objects.get(value);
        if (!found2) {
          let plainObject = {
            __isClassInstance__: !0,
            __className__: value.constructor.name,
            ...Object.getOwnPropertyNames(value).reduce(
              (acc, prop) => {
                try {
                  acc[prop] = value[prop];
                } catch {
                }
                return acc;
              },
              {}
            )
          };
          return keys.push(key), stack.unshift(plainObject), objects.set(value, JSON.stringify(keys)), value !== plainObject && map.set(value, plainObject), plainObject;
        }
        return `_duplicate_${found2}`;
      }
      let found = objects.get(value);
      if (!found) {
        let converted = Array.isArray(value) ? value : convertUnconventionalData(value);
        return keys.push(key), stack.unshift(converted), objects.set(value, JSON.stringify(keys)), value !== converted && map.set(value, converted), converted;
      }
      return `_duplicate_${found}`;
    } catch {
      return;
    }
  };
}, reviver = function(options) {
  let refs = [], root2;
  return function(key, value) {
    if (key === "" && (root2 = value, refs.forEach(({ target, container, replacement }) => {
      let replacementArr = isJSON(replacement) ? JSON.parse(replacement) : replacement.split(".");
      replacementArr.length === 0 ? container[target] = root2 : container[target] = get_default(root2, replacementArr);
    })), key === "_constructor-name_")
      return value;
    if (isObject3(value) && value.__isConvertedError__) {
      let { message, ...properties } = value.errorProperties, error = new Error(message);
      return Object.assign(error, properties), error;
    }
    if (typeof value == "string" && value.startsWith("_regexp_") && options.allowRegExp) {
      let [, flags, source] = value.match(/_regexp_([^|]*)\|(.*)/) || [];
      return new RegExp(source, flags);
    }
    return typeof value == "string" && value.startsWith("_date_") && options.allowDate ? new Date(value.replace("_date_", "")) : typeof value == "string" && value.startsWith("_duplicate_") ? (refs.push({ target: key, container: this, replacement: value.replace(/^_duplicate_/, "") }), null) : typeof value == "string" && value.startsWith("_symbol_") && options.allowSymbol ? Symbol(value.replace("_symbol_", "")) : typeof value == "string" && value.startsWith("_gsymbol_") && options.allowSymbol ? Symbol.for(value.replace("_gsymbol_", "")) : typeof value == "string" && value === "_-Infinity_" ? Number.NEGATIVE_INFINITY : typeof value == "string" && value === "_Infinity_" ? Number.POSITIVE_INFINITY : typeof value == "string" && value === "_NaN_" ? Number.NaN : typeof value == "string" && value.startsWith("_bigint_") && typeof BigInt == "function" ? BigInt(value.replace("_bigint_", "")) : value;
  };
}, defaultOptions = {
  maxDepth: 10,
  space: void 0,
  allowRegExp: !0,
  allowDate: !0,
  allowError: !0,
  allowUndefined: !0,
  allowSymbol: !0
}, stringify = (data, options = {}) => {
  let mergedOptions = { ...defaultOptions, ...options };
  return JSON.stringify(convertUnconventionalData(data), replacer(mergedOptions), options.space);
}, mutator = () => {
  let mutated = /* @__PURE__ */ new Map();
  return function mutateUndefined(value) {
    isObject3(value) && Object.entries(value).forEach(([k, v]) => {
      v === "_undefined_" ? value[k] = void 0 : mutated.get(v) || (mutated.set(v, !0), mutateUndefined(v));
    }), Array.isArray(value) && value.forEach((v, index) => {
      v === "_undefined_" ? (mutated.set(v, !0), value[index] = void 0) : mutated.get(v) || (mutated.set(v, !0), mutateUndefined(v));
    });
  };
}, parse = (data, options = {}) => {
  let mergedOptions = { ...defaultOptions, ...options }, result = JSON.parse(data, reviver(mergedOptions));
  return mutator()(result), result;
};

export {
  UniversalStore,
  isJSON,
  stringify,
  parse
};
