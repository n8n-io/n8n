var ae = Object.create;
var ut = Object.defineProperty;
var se = Object.getOwnPropertyDescriptor;
var le = Object.getOwnPropertyNames;
var ce = Object.getPrototypeOf, pe = Object.prototype.hasOwnProperty;
var a = (r, t) => ut(r, "name", { value: t, configurable: !0 }), H = /* @__PURE__ */ ((r) => typeof require < "u" ? require : typeof Proxy <
"u" ? new Proxy(r, {
  get: (t, e) => (typeof require < "u" ? require : t)[e]
}) : r)(function(r) {
  if (typeof require < "u") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + r + '" is not supported');
});
var ue = (r, t) => () => (t || r((t = { exports: {} }).exports, t), t.exports);
var fe = (r, t, e, n) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let o of le(t))
      !pe.call(r, o) && o !== e && ut(r, o, { get: () => t[o], enumerable: !(n = se(t, o)) || n.enumerable });
  return r;
};
var he = (r, t, e) => (e = r != null ? ae(ce(r)) : {}, fe(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  t || !r || !r.__esModule ? ut(e, "default", { value: r, enumerable: !0 }) : e,
  r
));

// ../node_modules/memoizerific/memoizerific.js
var xt = ue((It, yt) => {
  (function(r) {
    if (typeof It == "object" && typeof yt < "u")
      yt.exports = r();
    else if (typeof define == "function" && define.amd)
      define([], r);
    else {
      var t;
      typeof window < "u" ? t = window : typeof global < "u" ? t = global : typeof self < "u" ? t = self : t = this, t.memoizerific = r();
    }
  })(function() {
    var r, t, e;
    return (/* @__PURE__ */ a(function n(o, s, l) {
      function c(p, u) {
        if (!s[p]) {
          if (!o[p]) {
            var y = typeof H == "function" && H;
            if (!u && y) return y(p, !0);
            if (i) return i(p, !0);
            var v = new Error("Cannot find module '" + p + "'");
            throw v.code = "MODULE_NOT_FOUND", v;
          }
          var d = s[p] = { exports: {} };
          o[p][0].call(d.exports, function(m) {
            var E = o[p][1][m];
            return c(E || m);
          }, d, d.exports, n, o, s, l);
        }
        return s[p].exports;
      }
      a(c, "s");
      for (var i = typeof H == "function" && H, g = 0; g < l.length; g++) c(l[g]);
      return c;
    }, "e"))({ 1: [function(n, o, s) {
      o.exports = function(l) {
        if (typeof Map != "function" || l) {
          var c = n("./similar");
          return new c();
        } else
          return /* @__PURE__ */ new Map();
      };
    }, { "./similar": 2 }], 2: [function(n, o, s) {
      function l() {
        return this.list = [], this.lastItem = void 0, this.size = 0, this;
      }
      a(l, "Similar"), l.prototype.get = function(c) {
        var i;
        if (this.lastItem && this.isEqual(this.lastItem.key, c))
          return this.lastItem.val;
        if (i = this.indexOf(c), i >= 0)
          return this.lastItem = this.list[i], this.list[i].val;
      }, l.prototype.set = function(c, i) {
        var g;
        return this.lastItem && this.isEqual(this.lastItem.key, c) ? (this.lastItem.val = i, this) : (g = this.indexOf(c), g >= 0 ? (this.lastItem =
        this.list[g], this.list[g].val = i, this) : (this.lastItem = { key: c, val: i }, this.list.push(this.lastItem), this.size++, this));
      }, l.prototype.delete = function(c) {
        var i;
        if (this.lastItem && this.isEqual(this.lastItem.key, c) && (this.lastItem = void 0), i = this.indexOf(c), i >= 0)
          return this.size--, this.list.splice(i, 1)[0];
      }, l.prototype.has = function(c) {
        var i;
        return this.lastItem && this.isEqual(this.lastItem.key, c) ? !0 : (i = this.indexOf(c), i >= 0 ? (this.lastItem = this.list[i], !0) :
        !1);
      }, l.prototype.forEach = function(c, i) {
        var g;
        for (g = 0; g < this.size; g++)
          c.call(i || this, this.list[g].val, this.list[g].key, this);
      }, l.prototype.indexOf = function(c) {
        var i;
        for (i = 0; i < this.size; i++)
          if (this.isEqual(this.list[i].key, c))
            return i;
        return -1;
      }, l.prototype.isEqual = function(c, i) {
        return c === i || c !== c && i !== i;
      }, o.exports = l;
    }, {}], 3: [function(n, o, s) {
      var l = n("map-or-similar");
      o.exports = function(p) {
        var u = new l(!1), y = [];
        return function(v) {
          var d = /* @__PURE__ */ a(function() {
            var m = u, E, I, T = arguments.length - 1, R = Array(T + 1), C = !0, N;
            if ((d.numArgs || d.numArgs === 0) && d.numArgs !== T + 1)
              throw new Error("Memoizerific functions should always be called with the same number of arguments");
            for (N = 0; N < T; N++) {
              if (R[N] = {
                cacheItem: m,
                arg: arguments[N]
              }, m.has(arguments[N])) {
                m = m.get(arguments[N]);
                continue;
              }
              C = !1, E = new l(!1), m.set(arguments[N], E), m = E;
            }
            return C && (m.has(arguments[T]) ? I = m.get(arguments[T]) : C = !1), C || (I = v.apply(null, arguments), m.set(arguments[T], I)),
            p > 0 && (R[T] = {
              cacheItem: m,
              arg: arguments[T]
            }, C ? c(y, R) : y.push(R), y.length > p && i(y.shift())), d.wasMemoized = C, d.numArgs = T + 1, I;
          }, "memoizerific");
          return d.limit = p, d.wasMemoized = !1, d.cache = u, d.lru = y, d;
        };
      };
      function c(p, u) {
        var y = p.length, v = u.length, d, m, E;
        for (m = 0; m < y; m++) {
          for (d = !0, E = 0; E < v; E++)
            if (!g(p[m][E].arg, u[E].arg)) {
              d = !1;
              break;
            }
          if (d)
            break;
        }
        p.push(p.splice(m, 1)[0]);
      }
      a(c, "moveToMostRecentLru");
      function i(p) {
        var u = p.length, y = p[u - 1], v, d;
        for (y.cacheItem.delete(y.arg), d = u - 2; d >= 0 && (y = p[d], v = y.cacheItem.get(y.arg), !v || !v.size); d--)
          y.cacheItem.delete(y.arg);
      }
      a(i, "removeCachedResult");
      function g(p, u) {
        return p === u || p !== p && u !== u;
      }
      a(g, "isEqual");
    }, { "map-or-similar": 1 }] }, {}, [3])(3);
  });
});

// ../node_modules/@storybook/global/dist/index.mjs
var S = (() => {
  let r;
  return typeof window < "u" ? r = window : typeof globalThis < "u" ? r = globalThis : typeof global < "u" ? r = global : typeof self < "u" ?
  r = self : r = {}, r;
})();

// ../node_modules/ts-dedent/esm/index.js
function F(r) {
  for (var t = [], e = 1; e < arguments.length; e++)
    t[e - 1] = arguments[e];
  var n = Array.from(typeof r == "string" ? [r] : r);
  n[n.length - 1] = n[n.length - 1].replace(/\r?\n([\t ]*)$/, "");
  var o = n.reduce(function(c, i) {
    var g = i.match(/\n([\t ]+|(?!\s).)/g);
    return g ? c.concat(g.map(function(p) {
      var u, y;
      return (y = (u = p.match(/[\t ]/g)) === null || u === void 0 ? void 0 : u.length) !== null && y !== void 0 ? y : 0;
    })) : c;
  }, []);
  if (o.length) {
    var s = new RegExp(`
[	 ]{` + Math.min.apply(Math, o) + "}", "g");
    n = n.map(function(c) {
      return c.replace(s, `
`);
    });
  }
  n[0] = n[0].replace(/^\r?\n/, "");
  var l = n[0];
  return t.forEach(function(c, i) {
    var g = l.match(/(?:^|\n)( *)$/), p = g ? g[1] : "", u = c;
    typeof c == "string" && c.includes(`
`) && (u = String(c).split(`
`).map(function(y, v) {
      return v === 0 ? y : "" + p + y;
    }).join(`
`)), l += u + n[i + 1];
  }), l;
}
a(F, "dedent");

// src/shared/universal-store/instances.ts
var ft = /* @__PURE__ */ new Map();

// src/shared/universal-store/index.ts
var ye = "UNIVERSAL_STORE:", x = {
  PENDING: "PENDING",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED"
}, h = class h {
  constructor(t, e) {
    /** Enable debug logs for this store */
    this.debugging = !1;
    // TODO: narrow type of listeners based on event type
    this.listeners = /* @__PURE__ */ new Map([["*", /* @__PURE__ */ new Set()]]);
    /** Gets the current state */
    this.getState = /* @__PURE__ */ a(() => (this.debug("getState", { state: this.state }), this.state), "getState");
    /**
     * Subscribes to store events
     *
     * @returns A function to unsubscribe
     */
    this.subscribe = /* @__PURE__ */ a((t, e) => {
      let n = typeof t == "function", o = n ? "*" : t, s = n ? t : e;
      if (this.debug("subscribe", { eventType: o, listener: s }), !s)
        throw new TypeError(
          `Missing first subscribe argument, or second if first is the event type, when subscribing to a UniversalStore with id '${this.id}'`
        );
      return this.listeners.has(o) || this.listeners.set(o, /* @__PURE__ */ new Set()), this.listeners.get(o).add(s), () => {
        this.debug("unsubscribe", { eventType: o, listener: s }), this.listeners.has(o) && (this.listeners.get(o).delete(s), this.listeners.
        get(o)?.size === 0 && this.listeners.delete(o));
      };
    }, "subscribe");
    /** Sends a custom event to the other stores */
    this.send = /* @__PURE__ */ a((t) => {
      if (this.debug("send", { event: t }), this.status !== h.Status.READY)
        throw new TypeError(
          F`Cannot send event before store is ready. You can get the current status with store.status,
        or await store.readyPromise to wait for the store to be ready before sending events.
        ${JSON.stringify(
            {
              event: t,
              id: this.id,
              actor: this.actor,
              environment: this.environment
            },
            null,
            2
          )}`
        );
      this.emitToListeners(t, { actor: this.actor }), this.emitToChannel(t, { actor: this.actor });
    }, "send");
    if (this.debugging = t.debug ?? !1, !h.isInternalConstructing)
      throw new TypeError(
        "UniversalStore is not constructable - use UniversalStore.create() instead"
      );
    if (h.isInternalConstructing = !1, this.id = t.id, this.actorId = Date.now().toString(36) + Math.random().toString(36).substring(2), this.
    actorType = t.leader ? h.ActorType.LEADER : h.ActorType.FOLLOWER, this.state = t.initialState, this.channelEventName = `${ye}${this.id}`,
    this.debug("constructor", {
      options: t,
      environmentOverrides: e,
      channelEventName: this.channelEventName
    }), this.actor.type === h.ActorType.LEADER)
      this.syncing = {
        state: x.RESOLVED,
        promise: Promise.resolve()
      };
    else {
      let n, o, s = new Promise((l, c) => {
        n = /* @__PURE__ */ a(() => {
          this.syncing.state === x.PENDING && (this.syncing.state = x.RESOLVED, l());
        }, "syncingResolve"), o = /* @__PURE__ */ a((i) => {
          this.syncing.state === x.PENDING && (this.syncing.state = x.REJECTED, c(i));
        }, "syncingReject");
      });
      this.syncing = {
        state: x.PENDING,
        promise: s,
        resolve: n,
        reject: o
      };
    }
    this.getState = this.getState.bind(this), this.setState = this.setState.bind(this), this.subscribe = this.subscribe.bind(this), this.onStateChange =
    this.onStateChange.bind(this), this.send = this.send.bind(this), this.emitToChannel = this.emitToChannel.bind(this), this.prepareThis = this.
    prepareThis.bind(this), this.emitToListeners = this.emitToListeners.bind(this), this.handleChannelEvents = this.handleChannelEvents.bind(
    this), this.debug = this.debug.bind(this), this.channel = e?.channel ?? h.preparation.channel, this.environment = e?.environment ?? h.preparation.
    environment, this.channel && this.environment ? this.prepareThis({ channel: this.channel, environment: this.environment }) : h.preparation.
    promise.then(this.prepareThis);
  }
  static setupPreparationPromise() {
    let t, e, n = new Promise(
      (o, s) => {
        t = /* @__PURE__ */ a((l) => {
          o(l);
        }, "resolveRef"), e = /* @__PURE__ */ a((...l) => {
          s(l);
        }, "rejectRef");
      }
    );
    h.preparation = {
      resolve: t,
      reject: e,
      promise: n
    };
  }
  /** The actor object representing the store instance with a unique ID and a type */
  get actor() {
    return Object.freeze({
      id: this.actorId,
      type: this.actorType,
      environment: this.environment ?? h.Environment.UNKNOWN
    });
  }
  /**
   * The current state of the store, that signals both if the store is prepared by Storybook and
   * also - in the case of a follower - if the state has been synced with the leader's state.
   */
  get status() {
    if (!this.channel || !this.environment)
      return h.Status.UNPREPARED;
    switch (this.syncing?.state) {
      case x.PENDING:
      case void 0:
        return h.Status.SYNCING;
      case x.REJECTED:
        return h.Status.ERROR;
      case x.RESOLVED:
      default:
        return h.Status.READY;
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
    return Promise.all([h.preparation.promise, this.syncing?.promise]);
  }
  /** Creates a new instance of UniversalStore */
  static create(t) {
    if (!t || typeof t?.id != "string")
      throw new TypeError("id is required and must be a string, when creating a UniversalStore");
    t.debug && console.debug(
      F`[UniversalStore]
        create`,
      { options: t }
    );
    let e = ft.get(t.id);
    if (e)
      return console.warn(F`UniversalStore with id "${t.id}" already exists in this environment, re-using existing.
        You should reuse the existing instance instead of trying to create a new one.`), e;
    h.isInternalConstructing = !0;
    let n = new h(t);
    return ft.set(t.id, n), n;
  }
  /**
   * Used by Storybook to set the channel for all instances of UniversalStore in the given
   * environment.
   *
   * @internal
   */
  static __prepare(t, e) {
    h.preparation.channel = t, h.preparation.environment = e, h.preparation.resolve({ channel: t, environment: e });
  }
  /**
   * Updates the store's state
   *
   * Either a new state or a state updater function can be passed to the method.
   */
  setState(t) {
    let e = this.state, n = typeof t == "function" ? t(e) : t;
    if (this.debug("setState", { newState: n, previousState: e, updater: t }), this.status !== h.Status.READY)
      throw new TypeError(
        F`Cannot set state before store is ready. You can get the current status with store.status,
        or await store.readyPromise to wait for the store to be ready before sending events.
        ${JSON.stringify(
          {
            newState: n,
            id: this.id,
            actor: this.actor,
            environment: this.environment
          },
          null,
          2
        )}`
      );
    this.state = n;
    let o = {
      type: h.InternalEventType.SET_STATE,
      payload: {
        state: n,
        previousState: e
      }
    };
    this.emitToChannel(o, { actor: this.actor }), this.emitToListeners(o, { actor: this.actor });
  }
  /**
   * Subscribes to state changes
   *
   * @returns Unsubscribe function
   */
  onStateChange(t) {
    return this.debug("onStateChange", { listener: t }), this.subscribe(
      h.InternalEventType.SET_STATE,
      ({ payload: e }, n) => {
        t(e.state, e.previousState, n);
      }
    );
  }
  emitToChannel(t, e) {
    this.debug("emitToChannel", { event: t, eventInfo: e, channel: this.channel }), this.channel?.emit(this.channelEventName, {
      event: t,
      eventInfo: e
    });
  }
  prepareThis({
    channel: t,
    environment: e
  }) {
    this.channel = t, this.environment = e, this.debug("prepared", { channel: t, environment: e }), this.channel.on(this.channelEventName, this.
    handleChannelEvents), this.actor.type === h.ActorType.LEADER ? this.emitToChannel(
      { type: h.InternalEventType.LEADER_CREATED },
      { actor: this.actor }
    ) : (this.emitToChannel(
      { type: h.InternalEventType.FOLLOWER_CREATED },
      { actor: this.actor }
    ), this.emitToChannel(
      { type: h.InternalEventType.EXISTING_STATE_REQUEST },
      { actor: this.actor }
    ), setTimeout(() => {
      this.syncing.reject(
        new TypeError(
          `No existing state found for follower with id: '${this.id}'. Make sure a leader with the same id exists before creating a follower\
.`
        )
      );
    }, 1e3));
  }
  emitToListeners(t, e) {
    let n = this.listeners.get(t.type), o = this.listeners.get("*");
    this.debug("emitToListeners", {
      event: t,
      eventInfo: e,
      eventTypeListeners: n,
      everythingListeners: o
    }), [...n ?? [], ...o ?? []].forEach(
      (s) => s(t, e)
    );
  }
  handleChannelEvents(t) {
    let { event: e, eventInfo: n } = t;
    if ([n.actor.id, n.forwardingActor?.id].includes(this.actor.id)) {
      this.debug("handleChannelEvents: Ignoring event from self", { channelEvent: t });
      return;
    } else if (this.syncing?.state === x.PENDING && e.type !== h.InternalEventType.EXISTING_STATE_RESPONSE) {
      this.debug("handleChannelEvents: Ignoring event while syncing", { channelEvent: t });
      return;
    }
    if (this.debug("handleChannelEvents", { channelEvent: t }), this.actor.type === h.ActorType.LEADER) {
      let o = !0;
      switch (e.type) {
        case h.InternalEventType.EXISTING_STATE_REQUEST:
          o = !1;
          let s = {
            type: h.InternalEventType.EXISTING_STATE_RESPONSE,
            payload: this.state
          };
          this.debug("handleChannelEvents: responding to existing state request", {
            responseEvent: s
          }), this.emitToChannel(s, { actor: this.actor });
          break;
        case h.InternalEventType.LEADER_CREATED:
          o = !1, this.syncing.state = x.REJECTED, this.debug("handleChannelEvents: erroring due to second leader being created", {
            event: e
          }), console.error(
            F`Detected multiple UniversalStore leaders created with the same id "${this.id}".
            Only one leader can exists at a time, your stores are now in an invalid state.
            Leaders detected:
            this: ${JSON.stringify(this.actor, null, 2)}
            other: ${JSON.stringify(n.actor, null, 2)}`
          );
          break;
      }
      o && (this.debug("handleChannelEvents: forwarding event", { channelEvent: t }), this.emitToChannel(e, { actor: n.actor, forwardingActor: this.
      actor }));
    }
    if (this.actor.type === h.ActorType.FOLLOWER)
      switch (e.type) {
        case h.InternalEventType.EXISTING_STATE_RESPONSE:
          if (this.debug("handleChannelEvents: Setting state from leader's existing state response", {
            event: e
          }), this.syncing?.state !== x.PENDING)
            break;
          this.syncing.resolve?.();
          let o = {
            type: h.InternalEventType.SET_STATE,
            payload: {
              state: e.payload,
              previousState: this.state
            }
          };
          this.state = e.payload, this.emitToListeners(o, n);
          break;
      }
    switch (e.type) {
      case h.InternalEventType.SET_STATE:
        this.debug("handleChannelEvents: Setting state", { event: e }), this.state = e.payload.state;
        break;
    }
    this.emitToListeners(e, { actor: n.actor });
  }
  debug(t, e) {
    this.debugging && console.debug(
      F`[UniversalStore::${this.id}::${this.environment ?? h.Environment.UNKNOWN}]
        ${t}`,
      JSON.stringify(
        {
          data: e,
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
    h.preparation.reject(new Error("reset")), h.setupPreparationPromise(), h.isInternalConstructing = !1;
  }
};
a(h, "UniversalStore"), /**
 * Defines the possible actor types in the store system
 *
 * @readonly
 */
h.ActorType = {
  LEADER: "LEADER",
  FOLLOWER: "FOLLOWER"
}, /**
 * Defines the possible environments the store can run in
 *
 * @readonly
 */
h.Environment = {
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
h.InternalEventType = {
  EXISTING_STATE_REQUEST: "__EXISTING_STATE_REQUEST",
  EXISTING_STATE_RESPONSE: "__EXISTING_STATE_RESPONSE",
  SET_STATE: "__SET_STATE",
  LEADER_CREATED: "__LEADER_CREATED",
  FOLLOWER_CREATED: "__FOLLOWER_CREATED"
}, h.Status = {
  UNPREPARED: "UNPREPARED",
  SYNCING: "SYNCING",
  READY: "READY",
  ERROR: "ERROR"
}, // This is used to check if constructor was called from the static factory create()
h.isInternalConstructing = !1, h.setupPreparationPromise();
var $ = h;

// src/channels/main.ts
var de = /* @__PURE__ */ a((r) => r.transports !== void 0, "isMulti"), ge = /* @__PURE__ */ a(() => Math.random().toString(16).slice(2), "ge\
nerateRandomId"), ht = class ht {
  constructor(t = {}) {
    this.sender = ge();
    this.events = {};
    this.data = {};
    this.transports = [];
    this.isAsync = t.async || !1, de(t) ? (this.transports = t.transports || [], this.transports.forEach((e) => {
      e.setHandler((n) => this.handleEvent(n));
    })) : this.transports = t.transport ? [t.transport] : [], this.transports.forEach((e) => {
      e.setHandler((n) => this.handleEvent(n));
    });
  }
  get hasTransport() {
    return this.transports.length > 0;
  }
  addListener(t, e) {
    this.events[t] = this.events[t] || [], this.events[t].push(e);
  }
  emit(t, ...e) {
    let n = { type: t, args: e, from: this.sender }, o = {};
    e.length >= 1 && e[0] && e[0].options && (o = e[0].options);
    let s = /* @__PURE__ */ a(() => {
      this.transports.forEach((l) => {
        l.send(n, o);
      }), this.handleEvent(n);
    }, "handler");
    this.isAsync ? setImmediate(s) : s();
  }
  last(t) {
    return this.data[t];
  }
  eventNames() {
    return Object.keys(this.events);
  }
  listenerCount(t) {
    let e = this.listeners(t);
    return e ? e.length : 0;
  }
  listeners(t) {
    return this.events[t] || void 0;
  }
  once(t, e) {
    let n = this.onceListener(t, e);
    this.addListener(t, n);
  }
  removeAllListeners(t) {
    t ? this.events[t] && delete this.events[t] : this.events = {};
  }
  removeListener(t, e) {
    let n = this.listeners(t);
    n && (this.events[t] = n.filter((o) => o !== e));
  }
  on(t, e) {
    this.addListener(t, e);
  }
  off(t, e) {
    this.removeListener(t, e);
  }
  handleEvent(t) {
    let e = this.listeners(t.type);
    e && e.length && e.forEach((n) => {
      n.apply(t, t.args);
    }), this.data[t.type] = t.args;
  }
  onceListener(t, e) {
    let n = /* @__PURE__ */ a((...o) => (this.removeListener(t, n), e(...o)), "onceListener");
    return n;
  }
};
a(ht, "Channel");
var B = ht;

// src/channels/postmessage/index.ts
import { logger as Kt, pretty as Yt } from "@storybook/core/client-logger";
import * as so from "@storybook/core/core-events";

// ../node_modules/telejson/dist/chunk-465TF3XA.mjs
var ve = Object.create, Ot = Object.defineProperty, me = Object.getOwnPropertyDescriptor, Ct = Object.getOwnPropertyNames, Ee = Object.getPrototypeOf,
be = Object.prototype.hasOwnProperty, P = /* @__PURE__ */ a((r, t) => /* @__PURE__ */ a(function() {
  return t || (0, r[Ct(r)[0]])((t = { exports: {} }).exports, t), t.exports;
}, "__require"), "__commonJS"), Se = /* @__PURE__ */ a((r, t, e, n) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let o of Ct(t))
      !be.call(r, o) && o !== e && Ot(r, o, { get: /* @__PURE__ */ a(() => t[o], "get"), enumerable: !(n = me(t, o)) || n.enumerable });
  return r;
}, "__copyProps"), ot = /* @__PURE__ */ a((r, t, e) => (e = r != null ? ve(Ee(r)) : {}, Se(
  t || !r || !r.__esModule ? Ot(e, "default", { value: r, enumerable: !0 }) : e,
  r
)), "__toESM"), _e = [
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
], Te = ["detail"];
function Pt(r) {
  let t = _e.filter((e) => r[e] !== void 0).reduce((e, n) => ({ ...e, [n]: r[n] }), {});
  return r instanceof CustomEvent && Te.filter((e) => r[e] !== void 0).forEach((e) => {
    t[e] = r[e];
  }), t;
}
a(Pt, "extractEventHiddenProperties");

// ../node_modules/telejson/dist/index.mjs
var Bt = he(xt(), 1);
var Ft = P({
  "node_modules/has-symbols/shams.js"(r, t) {
    "use strict";
    t.exports = /* @__PURE__ */ a(function() {
      if (typeof Symbol != "function" || typeof Object.getOwnPropertySymbols != "function")
        return !1;
      if (typeof Symbol.iterator == "symbol")
        return !0;
      var n = {}, o = Symbol("test"), s = Object(o);
      if (typeof o == "string" || Object.prototype.toString.call(o) !== "[object Symbol]" || Object.prototype.toString.call(s) !== "[object \
Symbol]")
        return !1;
      var l = 42;
      n[o] = l;
      for (o in n)
        return !1;
      if (typeof Object.keys == "function" && Object.keys(n).length !== 0 || typeof Object.getOwnPropertyNames == "function" && Object.getOwnPropertyNames(
      n).length !== 0)
        return !1;
      var c = Object.getOwnPropertySymbols(n);
      if (c.length !== 1 || c[0] !== o || !Object.prototype.propertyIsEnumerable.call(n, o))
        return !1;
      if (typeof Object.getOwnPropertyDescriptor == "function") {
        var i = Object.getOwnPropertyDescriptor(n, o);
        if (i.value !== l || i.enumerable !== !0)
          return !1;
      }
      return !0;
    }, "hasSymbols");
  }
}), Mt = P({
  "node_modules/has-symbols/index.js"(r, t) {
    "use strict";
    var e = typeof Symbol < "u" && Symbol, n = Ft();
    t.exports = /* @__PURE__ */ a(function() {
      return typeof e != "function" || typeof Symbol != "function" || typeof e("foo") != "symbol" || typeof Symbol("bar") != "symbol" ? !1 :
      n();
    }, "hasNativeSymbols");
  }
}), Ae = P({
  "node_modules/function-bind/implementation.js"(r, t) {
    "use strict";
    var e = "Function.prototype.bind called on incompatible ", n = Array.prototype.slice, o = Object.prototype.toString, s = "[object Functi\
on]";
    t.exports = /* @__PURE__ */ a(function(c) {
      var i = this;
      if (typeof i != "function" || o.call(i) !== s)
        throw new TypeError(e + i);
      for (var g = n.call(arguments, 1), p, u = /* @__PURE__ */ a(function() {
        if (this instanceof p) {
          var E = i.apply(
            this,
            g.concat(n.call(arguments))
          );
          return Object(E) === E ? E : this;
        } else
          return i.apply(
            c,
            g.concat(n.call(arguments))
          );
      }, "binder"), y = Math.max(0, i.length - g.length), v = [], d = 0; d < y; d++)
        v.push("$" + d);
      if (p = Function("binder", "return function (" + v.join(",") + "){ return binder.apply(this,arguments); }")(u), i.prototype) {
        var m = /* @__PURE__ */ a(function() {
        }, "Empty2");
        m.prototype = i.prototype, p.prototype = new m(), m.prototype = null;
      }
      return p;
    }, "bind");
  }
}), gt = P({
  "node_modules/function-bind/index.js"(r, t) {
    "use strict";
    var e = Ae();
    t.exports = Function.prototype.bind || e;
  }
}), we = P({
  "node_modules/has/src/index.js"(r, t) {
    "use strict";
    var e = gt();
    t.exports = e.call(Function.call, Object.prototype.hasOwnProperty);
  }
}), $t = P({
  "node_modules/get-intrinsic/index.js"(r, t) {
    "use strict";
    var e, n = SyntaxError, o = Function, s = TypeError, l = /* @__PURE__ */ a(function(j) {
      try {
        return o('"use strict"; return (' + j + ").constructor;")();
      } catch {
      }
    }, "getEvalledConstructor"), c = Object.getOwnPropertyDescriptor;
    if (c)
      try {
        c({}, "");
      } catch {
        c = null;
      }
    var i = /* @__PURE__ */ a(function() {
      throw new s();
    }, "throwTypeError"), g = c ? function() {
      try {
        return arguments.callee, i;
      } catch {
        try {
          return c(arguments, "callee").get;
        } catch {
          return i;
        }
      }
    }() : i, p = Mt()(), u = Object.getPrototypeOf || function(j) {
      return j.__proto__;
    }, y = {}, v = typeof Uint8Array > "u" ? e : u(Uint8Array), d = {
      "%AggregateError%": typeof AggregateError > "u" ? e : AggregateError,
      "%Array%": Array,
      "%ArrayBuffer%": typeof ArrayBuffer > "u" ? e : ArrayBuffer,
      "%ArrayIteratorPrototype%": p ? u([][Symbol.iterator]()) : e,
      "%AsyncFromSyncIteratorPrototype%": e,
      "%AsyncFunction%": y,
      "%AsyncGenerator%": y,
      "%AsyncGeneratorFunction%": y,
      "%AsyncIteratorPrototype%": y,
      "%Atomics%": typeof Atomics > "u" ? e : Atomics,
      "%BigInt%": typeof BigInt > "u" ? e : BigInt,
      "%Boolean%": Boolean,
      "%DataView%": typeof DataView > "u" ? e : DataView,
      "%Date%": Date,
      "%decodeURI%": decodeURI,
      "%decodeURIComponent%": decodeURIComponent,
      "%encodeURI%": encodeURI,
      "%encodeURIComponent%": encodeURIComponent,
      "%Error%": Error,
      "%eval%": eval,
      "%EvalError%": EvalError,
      "%Float32Array%": typeof Float32Array > "u" ? e : Float32Array,
      "%Float64Array%": typeof Float64Array > "u" ? e : Float64Array,
      "%FinalizationRegistry%": typeof FinalizationRegistry > "u" ? e : FinalizationRegistry,
      "%Function%": o,
      "%GeneratorFunction%": y,
      "%Int8Array%": typeof Int8Array > "u" ? e : Int8Array,
      "%Int16Array%": typeof Int16Array > "u" ? e : Int16Array,
      "%Int32Array%": typeof Int32Array > "u" ? e : Int32Array,
      "%isFinite%": isFinite,
      "%isNaN%": isNaN,
      "%IteratorPrototype%": p ? u(u([][Symbol.iterator]())) : e,
      "%JSON%": typeof JSON == "object" ? JSON : e,
      "%Map%": typeof Map > "u" ? e : Map,
      "%MapIteratorPrototype%": typeof Map > "u" || !p ? e : u((/* @__PURE__ */ new Map())[Symbol.iterator]()),
      "%Math%": Math,
      "%Number%": Number,
      "%Object%": Object,
      "%parseFloat%": parseFloat,
      "%parseInt%": parseInt,
      "%Promise%": typeof Promise > "u" ? e : Promise,
      "%Proxy%": typeof Proxy > "u" ? e : Proxy,
      "%RangeError%": RangeError,
      "%ReferenceError%": ReferenceError,
      "%Reflect%": typeof Reflect > "u" ? e : Reflect,
      "%RegExp%": RegExp,
      "%Set%": typeof Set > "u" ? e : Set,
      "%SetIteratorPrototype%": typeof Set > "u" || !p ? e : u((/* @__PURE__ */ new Set())[Symbol.iterator]()),
      "%SharedArrayBuffer%": typeof SharedArrayBuffer > "u" ? e : SharedArrayBuffer,
      "%String%": String,
      "%StringIteratorPrototype%": p ? u(""[Symbol.iterator]()) : e,
      "%Symbol%": p ? Symbol : e,
      "%SyntaxError%": n,
      "%ThrowTypeError%": g,
      "%TypedArray%": v,
      "%TypeError%": s,
      "%Uint8Array%": typeof Uint8Array > "u" ? e : Uint8Array,
      "%Uint8ClampedArray%": typeof Uint8ClampedArray > "u" ? e : Uint8ClampedArray,
      "%Uint16Array%": typeof Uint16Array > "u" ? e : Uint16Array,
      "%Uint32Array%": typeof Uint32Array > "u" ? e : Uint32Array,
      "%URIError%": URIError,
      "%WeakMap%": typeof WeakMap > "u" ? e : WeakMap,
      "%WeakRef%": typeof WeakRef > "u" ? e : WeakRef,
      "%WeakSet%": typeof WeakSet > "u" ? e : WeakSet
    }, m = /* @__PURE__ */ a(function j(b) {
      var A;
      if (b === "%AsyncFunction%")
        A = l("async function () {}");
      else if (b === "%GeneratorFunction%")
        A = l("function* () {}");
      else if (b === "%AsyncGeneratorFunction%")
        A = l("async function* () {}");
      else if (b === "%AsyncGenerator%") {
        var _ = j("%AsyncGeneratorFunction%");
        _ && (A = _.prototype);
      } else if (b === "%AsyncIteratorPrototype%") {
        var w = j("%AsyncGenerator%");
        w && (A = u(w.prototype));
      }
      return d[b] = A, A;
    }, "doEval2"), E = {
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
    }, I = gt(), T = we(), R = I.call(Function.call, Array.prototype.concat), C = I.call(Function.apply, Array.prototype.splice), N = I.call(
    Function.call, String.prototype.replace), Q = I.call(Function.call, String.prototype.slice), ee = I.call(Function.call, RegExp.prototype.
    exec), re = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g, ne = /\\(\\)?/g, oe = /* @__PURE__ */ a(
    function(b) {
      var A = Q(b, 0, 1), _ = Q(b, -1);
      if (A === "%" && _ !== "%")
        throw new n("invalid intrinsic syntax, expected closing `%`");
      if (_ === "%" && A !== "%")
        throw new n("invalid intrinsic syntax, expected opening `%`");
      var w = [];
      return N(b, re, function(L, M, O, Z) {
        w[w.length] = O ? N(Z, ne, "$1") : M || L;
      }), w;
    }, "stringToPath3"), ie = /* @__PURE__ */ a(function(b, A) {
      var _ = b, w;
      if (T(E, _) && (w = E[_], _ = "%" + w[0] + "%"), T(d, _)) {
        var L = d[_];
        if (L === y && (L = m(_)), typeof L > "u" && !A)
          throw new s("intrinsic " + b + " exists, but is not available. Please file an issue!");
        return {
          alias: w,
          name: _,
          value: L
        };
      }
      throw new n("intrinsic " + b + " does not exist!");
    }, "getBaseIntrinsic2");
    t.exports = /* @__PURE__ */ a(function(b, A) {
      if (typeof b != "string" || b.length === 0)
        throw new s("intrinsic name must be a non-empty string");
      if (arguments.length > 1 && typeof A != "boolean")
        throw new s('"allowMissing" argument must be a boolean');
      if (ee(/^%?[^%]*%?$/, b) === null)
        throw new n("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
      var _ = oe(b), w = _.length > 0 ? _[0] : "", L = ie("%" + w + "%", A), M = L.name, O = L.value, Z = !1, pt = L.alias;
      pt && (w = pt[0], C(_, R([0, 1], pt)));
      for (var tt = 1, z = !0; tt < _.length; tt += 1) {
        var D = _[tt], et = Q(D, 0, 1), rt = Q(D, -1);
        if ((et === '"' || et === "'" || et === "`" || rt === '"' || rt === "'" || rt === "`") && et !== rt)
          throw new n("property names with quotes must have matching quotes");
        if ((D === "constructor" || !z) && (Z = !0), w += "." + D, M = "%" + w + "%", T(d, M))
          O = d[M];
        else if (O != null) {
          if (!(D in O)) {
            if (!A)
              throw new s("base intrinsic for " + b + " exists, but the property is not available.");
            return;
          }
          if (c && tt + 1 >= _.length) {
            var nt = c(O, D);
            z = !!nt, z && "get" in nt && !("originalValue" in nt.get) ? O = nt.get : O = O[D];
          } else
            z = T(O, D), O = O[D];
          z && !Z && (d[M] = O);
        }
      }
      return O;
    }, "GetIntrinsic");
  }
}), Oe = P({
  "node_modules/call-bind/index.js"(r, t) {
    "use strict";
    var e = gt(), n = $t(), o = n("%Function.prototype.apply%"), s = n("%Function.prototype.call%"), l = n("%Reflect.apply%", !0) || e.call(
    s, o), c = n("%Object.getOwnPropertyDescriptor%", !0), i = n("%Object.defineProperty%", !0), g = n("%Math.max%");
    if (i)
      try {
        i({}, "a", { value: 1 });
      } catch {
        i = null;
      }
    t.exports = /* @__PURE__ */ a(function(y) {
      var v = l(e, s, arguments);
      if (c && i) {
        var d = c(v, "length");
        d.configurable && i(
          v,
          "length",
          { value: 1 + g(0, y.length - (arguments.length - 1)) }
        );
      }
      return v;
    }, "callBind");
    var p = /* @__PURE__ */ a(function() {
      return l(e, o, arguments);
    }, "applyBind2");
    i ? i(t.exports, "apply", { value: p }) : t.exports.apply = p;
  }
}), Ce = P({
  "node_modules/call-bind/callBound.js"(r, t) {
    "use strict";
    var e = $t(), n = Oe(), o = n(e("String.prototype.indexOf"));
    t.exports = /* @__PURE__ */ a(function(l, c) {
      var i = e(l, !!c);
      return typeof i == "function" && o(l, ".prototype.") > -1 ? n(i) : i;
    }, "callBoundIntrinsic");
  }
}), Pe = P({
  "node_modules/has-tostringtag/shams.js"(r, t) {
    "use strict";
    var e = Ft();
    t.exports = /* @__PURE__ */ a(function() {
      return e() && !!Symbol.toStringTag;
    }, "hasToStringTagShams");
  }
}), Ie = P({
  "node_modules/is-regex/index.js"(r, t) {
    "use strict";
    var e = Ce(), n = Pe()(), o, s, l, c;
    n && (o = e("Object.prototype.hasOwnProperty"), s = e("RegExp.prototype.exec"), l = {}, i = /* @__PURE__ */ a(function() {
      throw l;
    }, "throwRegexMarker"), c = {
      toString: i,
      valueOf: i
    }, typeof Symbol.toPrimitive == "symbol" && (c[Symbol.toPrimitive] = i));
    var i, g = e("Object.prototype.toString"), p = Object.getOwnPropertyDescriptor, u = "[object RegExp]";
    t.exports = /* @__PURE__ */ a(n ? function(v) {
      if (!v || typeof v != "object")
        return !1;
      var d = p(v, "lastIndex"), m = d && o(d, "value");
      if (!m)
        return !1;
      try {
        s(v, c);
      } catch (E) {
        return E === l;
      }
    } : function(v) {
      return !v || typeof v != "object" && typeof v != "function" ? !1 : g(v) === u;
    }, "isRegex");
  }
}), xe = P({
  "node_modules/is-function/index.js"(r, t) {
    t.exports = n;
    var e = Object.prototype.toString;
    function n(o) {
      if (!o)
        return !1;
      var s = e.call(o);
      return s === "[object Function]" || typeof o == "function" && s !== "[object RegExp]" || typeof window < "u" && (o === window.setTimeout ||
      o === window.alert || o === window.confirm || o === window.prompt);
    }
    a(n, "isFunction3");
  }
}), Re = P({
  "node_modules/is-symbol/index.js"(r, t) {
    "use strict";
    var e = Object.prototype.toString, n = Mt()();
    n ? (o = Symbol.prototype.toString, s = /^Symbol\(.*\)$/, l = /* @__PURE__ */ a(function(i) {
      return typeof i.valueOf() != "symbol" ? !1 : s.test(o.call(i));
    }, "isRealSymbolObject"), t.exports = /* @__PURE__ */ a(function(i) {
      if (typeof i == "symbol")
        return !0;
      if (e.call(i) !== "[object Symbol]")
        return !1;
      try {
        return l(i);
      } catch {
        return !1;
      }
    }, "isSymbol3")) : t.exports = /* @__PURE__ */ a(function(i) {
      return !1;
    }, "isSymbol3");
    var o, s, l;
  }
}), Ne = ot(Ie()), je = ot(xe()), Le = ot(Re());
function De(r) {
  return r != null && typeof r == "object" && Array.isArray(r) === !1;
}
a(De, "isObject");
var Fe = typeof global == "object" && global && global.Object === Object && global, Me = Fe, $e = typeof self == "object" && self && self.Object ===
Object && self, Ue = Me || $e || Function("return this")(), vt = Ue, ke = vt.Symbol, U = ke, Ut = Object.prototype, Ge = Ut.hasOwnProperty, We = Ut.
toString, q = U ? U.toStringTag : void 0;
function ze(r) {
  var t = Ge.call(r, q), e = r[q];
  try {
    r[q] = void 0;
    var n = !0;
  } catch {
  }
  var o = We.call(r);
  return n && (t ? r[q] = e : delete r[q]), o;
}
a(ze, "getRawTag");
var He = ze, Be = Object.prototype, qe = Be.toString;
function Ve(r) {
  return qe.call(r);
}
a(Ve, "objectToString");
var Je = Ve, Ke = "[object Null]", Ye = "[object Undefined]", Rt = U ? U.toStringTag : void 0;
function Xe(r) {
  return r == null ? r === void 0 ? Ye : Ke : Rt && Rt in Object(r) ? He(r) : Je(r);
}
a(Xe, "baseGetTag");
var kt = Xe;
function Qe(r) {
  return r != null && typeof r == "object";
}
a(Qe, "isObjectLike");
var Ze = Qe, tr = "[object Symbol]";
function er(r) {
  return typeof r == "symbol" || Ze(r) && kt(r) == tr;
}
a(er, "isSymbol");
var mt = er;
function rr(r, t) {
  for (var e = -1, n = r == null ? 0 : r.length, o = Array(n); ++e < n; )
    o[e] = t(r[e], e, r);
  return o;
}
a(rr, "arrayMap");
var nr = rr, or = Array.isArray, Et = or, ir = 1 / 0, Nt = U ? U.prototype : void 0, jt = Nt ? Nt.toString : void 0;
function Gt(r) {
  if (typeof r == "string")
    return r;
  if (Et(r))
    return nr(r, Gt) + "";
  if (mt(r))
    return jt ? jt.call(r) : "";
  var t = r + "";
  return t == "0" && 1 / r == -ir ? "-0" : t;
}
a(Gt, "baseToString");
var ar = Gt;
function sr(r) {
  var t = typeof r;
  return r != null && (t == "object" || t == "function");
}
a(sr, "isObject2");
var Wt = sr, lr = "[object AsyncFunction]", cr = "[object Function]", pr = "[object GeneratorFunction]", ur = "[object Proxy]";
function fr(r) {
  if (!Wt(r))
    return !1;
  var t = kt(r);
  return t == cr || t == pr || t == lr || t == ur;
}
a(fr, "isFunction");
var hr = fr, yr = vt["__core-js_shared__"], dt = yr, Lt = function() {
  var r = /[^.]+$/.exec(dt && dt.keys && dt.keys.IE_PROTO || "");
  return r ? "Symbol(src)_1." + r : "";
}();
function dr(r) {
  return !!Lt && Lt in r;
}
a(dr, "isMasked");
var gr = dr, vr = Function.prototype, mr = vr.toString;
function Er(r) {
  if (r != null) {
    try {
      return mr.call(r);
    } catch {
    }
    try {
      return r + "";
    } catch {
    }
  }
  return "";
}
a(Er, "toSource");
var br = Er, Sr = /[\\^$.*+?()[\]{}|]/g, _r = /^\[object .+?Constructor\]$/, Tr = Function.prototype, Ar = Object.prototype, wr = Tr.toString,
Or = Ar.hasOwnProperty, Cr = RegExp(
  "^" + wr.call(Or).replace(Sr, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
);
function Pr(r) {
  if (!Wt(r) || gr(r))
    return !1;
  var t = hr(r) ? Cr : _r;
  return t.test(br(r));
}
a(Pr, "baseIsNative");
var Ir = Pr;
function xr(r, t) {
  return r?.[t];
}
a(xr, "getValue");
var Rr = xr;
function Nr(r, t) {
  var e = Rr(r, t);
  return Ir(e) ? e : void 0;
}
a(Nr, "getNative");
var zt = Nr;
function jr(r, t) {
  return r === t || r !== r && t !== t;
}
a(jr, "eq");
var Lr = jr, Dr = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, Fr = /^\w*$/;
function Mr(r, t) {
  if (Et(r))
    return !1;
  var e = typeof r;
  return e == "number" || e == "symbol" || e == "boolean" || r == null || mt(r) ? !0 : Fr.test(r) || !Dr.test(r) || t != null && r in Object(
  t);
}
a(Mr, "isKey");
var $r = Mr, Ur = zt(Object, "create"), V = Ur;
function kr() {
  this.__data__ = V ? V(null) : {}, this.size = 0;
}
a(kr, "hashClear");
var Gr = kr;
function Wr(r) {
  var t = this.has(r) && delete this.__data__[r];
  return this.size -= t ? 1 : 0, t;
}
a(Wr, "hashDelete");
var zr = Wr, Hr = "__lodash_hash_undefined__", Br = Object.prototype, qr = Br.hasOwnProperty;
function Vr(r) {
  var t = this.__data__;
  if (V) {
    var e = t[r];
    return e === Hr ? void 0 : e;
  }
  return qr.call(t, r) ? t[r] : void 0;
}
a(Vr, "hashGet");
var Jr = Vr, Kr = Object.prototype, Yr = Kr.hasOwnProperty;
function Xr(r) {
  var t = this.__data__;
  return V ? t[r] !== void 0 : Yr.call(t, r);
}
a(Xr, "hashHas");
var Qr = Xr, Zr = "__lodash_hash_undefined__";
function tn(r, t) {
  var e = this.__data__;
  return this.size += this.has(r) ? 0 : 1, e[r] = V && t === void 0 ? Zr : t, this;
}
a(tn, "hashSet");
var en = tn;
function k(r) {
  var t = -1, e = r == null ? 0 : r.length;
  for (this.clear(); ++t < e; ) {
    var n = r[t];
    this.set(n[0], n[1]);
  }
}
a(k, "Hash");
k.prototype.clear = Gr;
k.prototype.delete = zr;
k.prototype.get = Jr;
k.prototype.has = Qr;
k.prototype.set = en;
var Dt = k;
function rn() {
  this.__data__ = [], this.size = 0;
}
a(rn, "listCacheClear");
var nn = rn;
function on(r, t) {
  for (var e = r.length; e--; )
    if (Lr(r[e][0], t))
      return e;
  return -1;
}
a(on, "assocIndexOf");
var at = on, an = Array.prototype, sn = an.splice;
function ln(r) {
  var t = this.__data__, e = at(t, r);
  if (e < 0)
    return !1;
  var n = t.length - 1;
  return e == n ? t.pop() : sn.call(t, e, 1), --this.size, !0;
}
a(ln, "listCacheDelete");
var cn = ln;
function pn(r) {
  var t = this.__data__, e = at(t, r);
  return e < 0 ? void 0 : t[e][1];
}
a(pn, "listCacheGet");
var un = pn;
function fn(r) {
  return at(this.__data__, r) > -1;
}
a(fn, "listCacheHas");
var hn = fn;
function yn(r, t) {
  var e = this.__data__, n = at(e, r);
  return n < 0 ? (++this.size, e.push([r, t])) : e[n][1] = t, this;
}
a(yn, "listCacheSet");
var dn = yn;
function G(r) {
  var t = -1, e = r == null ? 0 : r.length;
  for (this.clear(); ++t < e; ) {
    var n = r[t];
    this.set(n[0], n[1]);
  }
}
a(G, "ListCache");
G.prototype.clear = nn;
G.prototype.delete = cn;
G.prototype.get = un;
G.prototype.has = hn;
G.prototype.set = dn;
var gn = G, vn = zt(vt, "Map"), mn = vn;
function En() {
  this.size = 0, this.__data__ = {
    hash: new Dt(),
    map: new (mn || gn)(),
    string: new Dt()
  };
}
a(En, "mapCacheClear");
var bn = En;
function Sn(r) {
  var t = typeof r;
  return t == "string" || t == "number" || t == "symbol" || t == "boolean" ? r !== "__proto__" : r === null;
}
a(Sn, "isKeyable");
var _n = Sn;
function Tn(r, t) {
  var e = r.__data__;
  return _n(t) ? e[typeof t == "string" ? "string" : "hash"] : e.map;
}
a(Tn, "getMapData");
var st = Tn;
function An(r) {
  var t = st(this, r).delete(r);
  return this.size -= t ? 1 : 0, t;
}
a(An, "mapCacheDelete");
var wn = An;
function On(r) {
  return st(this, r).get(r);
}
a(On, "mapCacheGet");
var Cn = On;
function Pn(r) {
  return st(this, r).has(r);
}
a(Pn, "mapCacheHas");
var In = Pn;
function xn(r, t) {
  var e = st(this, r), n = e.size;
  return e.set(r, t), this.size += e.size == n ? 0 : 1, this;
}
a(xn, "mapCacheSet");
var Rn = xn;
function W(r) {
  var t = -1, e = r == null ? 0 : r.length;
  for (this.clear(); ++t < e; ) {
    var n = r[t];
    this.set(n[0], n[1]);
  }
}
a(W, "MapCache");
W.prototype.clear = bn;
W.prototype.delete = wn;
W.prototype.get = Cn;
W.prototype.has = In;
W.prototype.set = Rn;
var Ht = W, Nn = "Expected a function";
function bt(r, t) {
  if (typeof r != "function" || t != null && typeof t != "function")
    throw new TypeError(Nn);
  var e = /* @__PURE__ */ a(function() {
    var n = arguments, o = t ? t.apply(this, n) : n[0], s = e.cache;
    if (s.has(o))
      return s.get(o);
    var l = r.apply(this, n);
    return e.cache = s.set(o, l) || s, l;
  }, "memoized");
  return e.cache = new (bt.Cache || Ht)(), e;
}
a(bt, "memoize");
bt.Cache = Ht;
var jn = bt, Ln = 500;
function Dn(r) {
  var t = jn(r, function(n) {
    return e.size === Ln && e.clear(), n;
  }), e = t.cache;
  return t;
}
a(Dn, "memoizeCapped");
var Fn = Dn, Mn = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g, $n = /\\(\\)?/g, Un = Fn(
function(r) {
  var t = [];
  return r.charCodeAt(0) === 46 && t.push(""), r.replace(Mn, function(e, n, o, s) {
    t.push(o ? s.replace($n, "$1") : n || e);
  }), t;
}), kn = Un;
function Gn(r) {
  return r == null ? "" : ar(r);
}
a(Gn, "toString");
var Wn = Gn;
function zn(r, t) {
  return Et(r) ? r : $r(r, t) ? [r] : kn(Wn(r));
}
a(zn, "castPath");
var Hn = zn, Bn = 1 / 0;
function qn(r) {
  if (typeof r == "string" || mt(r))
    return r;
  var t = r + "";
  return t == "0" && 1 / r == -Bn ? "-0" : t;
}
a(qn, "toKey");
var Vn = qn;
function Jn(r, t) {
  t = Hn(t, r);
  for (var e = 0, n = t.length; r != null && e < n; )
    r = r[Vn(t[e++])];
  return e && e == n ? r : void 0;
}
a(Jn, "baseGet");
var Kn = Jn;
function Yn(r, t, e) {
  var n = r == null ? void 0 : Kn(r, t);
  return n === void 0 ? e : n;
}
a(Yn, "get");
var Xn = Yn, it = De, Qn = /* @__PURE__ */ a((r) => {
  let t = null, e = !1, n = !1, o = !1, s = "";
  if (r.indexOf("//") >= 0 || r.indexOf("/*") >= 0)
    for (let l = 0; l < r.length; l += 1)
      !t && !e && !n && !o ? r[l] === '"' || r[l] === "'" || r[l] === "`" ? t = r[l] : r[l] === "/" && r[l + 1] === "*" ? e = !0 : r[l] === "\
/" && r[l + 1] === "/" ? n = !0 : r[l] === "/" && r[l + 1] !== "/" && (o = !0) : (t && (r[l] === t && r[l - 1] !== "\\" || r[l] === `
` && t !== "`") && (t = null), o && (r[l] === "/" && r[l - 1] !== "\\" || r[l] === `
`) && (o = !1), e && r[l - 1] === "/" && r[l - 2] === "*" && (e = !1), n && r[l] === `
` && (n = !1)), !e && !n && (s += r[l]);
  else
    s = r;
  return s;
}, "removeCodeComments"), Zn = (0, Bt.default)(1e4)(
  (r) => Qn(r).replace(/\n\s*/g, "").trim()
), to = /* @__PURE__ */ a(function(t, e) {
  let n = e.slice(0, e.indexOf("{")), o = e.slice(e.indexOf("{"));
  if (n.includes("=>") || n.includes("function"))
    return e;
  let s = n;
  return s = s.replace(t, "function"), s + o;
}, "convertShorthandMethods2"), eo = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/, J = /* @__PURE__ */ a((r) => r.match(/^[\[\{\"\}].*[\]\}\"]$/),
"isJSON");
function qt(r) {
  if (!it(r))
    return r;
  let t = r, e = !1;
  return typeof Event < "u" && r instanceof Event && (t = Pt(t), e = !0), t = Object.keys(t).reduce((n, o) => {
    try {
      t[o] && t[o].toJSON, n[o] = t[o];
    } catch {
      e = !0;
    }
    return n;
  }, {}), e ? t : r;
}
a(qt, "convertUnconventionalData");
var ro = /* @__PURE__ */ a(function(t) {
  let e, n, o, s;
  return /* @__PURE__ */ a(function(c, i) {
    try {
      if (c === "")
        return s = [], e = /* @__PURE__ */ new Map([[i, "[]"]]), n = /* @__PURE__ */ new Map(), o = [], i;
      let g = n.get(this) || this;
      for (; o.length && g !== o[0]; )
        o.shift(), s.pop();
      if (typeof i == "boolean")
        return i;
      if (i === void 0)
        return t.allowUndefined ? "_undefined_" : void 0;
      if (i === null)
        return null;
      if (typeof i == "number")
        return i === -1 / 0 ? "_-Infinity_" : i === 1 / 0 ? "_Infinity_" : Number.isNaN(i) ? "_NaN_" : i;
      if (typeof i == "bigint")
        return `_bigint_${i.toString()}`;
      if (typeof i == "string")
        return eo.test(i) ? t.allowDate ? `_date_${i}` : void 0 : i;
      if ((0, Ne.default)(i))
        return t.allowRegExp ? `_regexp_${i.flags}|${i.source}` : void 0;
      if ((0, je.default)(i)) {
        if (!t.allowFunction)
          return;
        let { name: u } = i, y = i.toString();
        return y.match(
          /(\[native code\]|WEBPACK_IMPORTED_MODULE|__webpack_exports__|__webpack_require__)/
        ) ? `_function_${u}|${(() => {
        }).toString()}` : `_function_${u}|${Zn(to(c, y))}`;
      }
      if ((0, Le.default)(i)) {
        if (!t.allowSymbol)
          return;
        let u = Symbol.keyFor(i);
        return u !== void 0 ? `_gsymbol_${u}` : `_symbol_${i.toString().slice(7, -1)}`;
      }
      if (o.length >= t.maxDepth)
        return Array.isArray(i) ? `[Array(${i.length})]` : "[Object]";
      if (i === this)
        return `_duplicate_${JSON.stringify(s)}`;
      if (i instanceof Error && t.allowError)
        return {
          __isConvertedError__: !0,
          errorProperties: {
            ...i.cause ? { cause: i.cause } : {},
            ...i,
            name: i.name,
            message: i.message,
            stack: i.stack,
            "_constructor-name_": i.constructor.name
          }
        };
      if (i.constructor && i.constructor.name && i.constructor.name !== "Object" && !Array.isArray(i) && !t.allowClass)
        return;
      let p = e.get(i);
      if (!p) {
        let u = Array.isArray(i) ? i : qt(i);
        if (i.constructor && i.constructor.name && i.constructor.name !== "Object" && !Array.isArray(i) && t.allowClass)
          try {
            Object.assign(u, { "_constructor-name_": i.constructor.name });
          } catch {
          }
        return s.push(c), o.unshift(u), e.set(i, JSON.stringify(s)), i !== u && n.set(i, u), u;
      }
      return `_duplicate_${p}`;
    } catch {
      return;
    }
  }, "replace");
}, "replacer2"), no = /* @__PURE__ */ a(function reviver(options) {
  let refs = [], root;
  return /* @__PURE__ */ a(function revive(key, value) {
    if (key === "" && (root = value, refs.forEach(({ target: r, container: t, replacement: e }) => {
      let n = J(e) ? JSON.parse(e) : e.split(".");
      n.length === 0 ? t[r] = root : t[r] = Xn(root, n);
    })), key === "_constructor-name_")
      return value;
    if (it(value) && value.__isConvertedError__) {
      let { message: r, ...t } = value.errorProperties, e = new Error(r);
      return Object.assign(e, t), e;
    }
    if (it(value) && value["_constructor-name_"] && options.allowFunction) {
      let r = value["_constructor-name_"];
      if (r !== "Object") {
        let t = new Function(`return function ${r.replace(/[^a-zA-Z0-9$_]+/g, "")}(){}`)();
        Object.setPrototypeOf(value, new t());
      }
      return delete value["_constructor-name_"], value;
    }
    if (typeof value == "string" && value.startsWith("_function_") && options.allowFunction) {
      let [, name, source] = value.match(/_function_([^|]*)\|(.*)/) || [], sourceSanitized = source.replace(/[(\(\))|\\| |\]|`]*$/, "");
      if (!options.lazyEval)
        return eval(`(${sourceSanitized})`);
      let result = /* @__PURE__ */ a((...args) => {
        let f = eval(`(${sourceSanitized})`);
        return f(...args);
      }, "result");
      return Object.defineProperty(result, "toString", {
        value: /* @__PURE__ */ a(() => sourceSanitized, "value")
      }), Object.defineProperty(result, "name", {
        value: name
      }), result;
    }
    if (typeof value == "string" && value.startsWith("_regexp_") && options.allowRegExp) {
      let [, r, t] = value.match(/_regexp_([^|]*)\|(.*)/) || [];
      return new RegExp(t, r);
    }
    return typeof value == "string" && value.startsWith("_date_") && options.allowDate ? new Date(value.replace("_date_", "")) : typeof value ==
    "string" && value.startsWith("_duplicate_") ? (refs.push({ target: key, container: this, replacement: value.replace(/^_duplicate_/, "") }),
    null) : typeof value == "string" && value.startsWith("_symbol_") && options.allowSymbol ? Symbol(value.replace("_symbol_", "")) : typeof value ==
    "string" && value.startsWith("_gsymbol_") && options.allowSymbol ? Symbol.for(value.replace("_gsymbol_", "")) : typeof value == "string" &&
    value === "_-Infinity_" ? -1 / 0 : typeof value == "string" && value === "_Infinity_" ? 1 / 0 : typeof value == "string" && value === "_\
NaN_" ? NaN : typeof value == "string" && value.startsWith("_bigint_") && typeof BigInt == "function" ? BigInt(value.replace("_bigint_", "")) :
    value;
  }, "revive");
}, "reviver"), Vt = {
  maxDepth: 10,
  space: void 0,
  allowFunction: !0,
  allowRegExp: !0,
  allowDate: !0,
  allowClass: !0,
  allowError: !0,
  allowUndefined: !0,
  allowSymbol: !0,
  lazyEval: !0
}, lt = /* @__PURE__ */ a((r, t = {}) => {
  let e = { ...Vt, ...t };
  return JSON.stringify(qt(r), ro(e), t.space);
}, "stringify"), oo = /* @__PURE__ */ a(() => {
  let r = /* @__PURE__ */ new Map();
  return /* @__PURE__ */ a(function t(e) {
    it(e) && Object.entries(e).forEach(([n, o]) => {
      o === "_undefined_" ? e[n] = void 0 : r.get(o) || (r.set(o, !0), t(o));
    }), Array.isArray(e) && e.forEach((n, o) => {
      n === "_undefined_" ? (r.set(n, !0), e[o] = void 0) : r.get(n) || (r.set(n, !0), t(n));
    });
  }, "mutateUndefined");
}, "mutator"), ct = /* @__PURE__ */ a((r, t = {}) => {
  let e = { ...Vt, ...t }, n = JSON.parse(r, no(e));
  return oo()(n), n;
}, "parse");

// ../node_modules/tiny-invariant/dist/esm/tiny-invariant.js
var io = !1, St = "Invariant failed";
function K(r, t) {
  if (!r) {
    if (io)
      throw new Error(St);
    var e = typeof t == "function" ? t() : t, n = e ? "".concat(St, ": ").concat(e) : St;
    throw new Error(n);
  }
}
a(K, "invariant");

// src/channels/postmessage/getEventSourceUrl.ts
import { logger as ao } from "@storybook/core/client-logger";
var Jt = /* @__PURE__ */ a((r) => {
  let t = Array.from(
    document.querySelectorAll("iframe[data-is-storybook]")
  ), [e, ...n] = t.filter((s) => {
    try {
      return s.contentWindow?.location.origin === r.source.location.origin && s.contentWindow?.location.pathname === r.source.location.pathname;
    } catch {
    }
    try {
      return s.contentWindow === r.source;
    } catch {
    }
    let l = s.getAttribute("src"), c;
    try {
      if (!l)
        return !1;
      ({ origin: c } = new URL(l, document.location.toString()));
    } catch {
      return !1;
    }
    return c === r.origin;
  }), o = e?.getAttribute("src");
  if (o && n.length === 0) {
    let { protocol: s, host: l, pathname: c } = new URL(o, document.location.toString());
    return `${s}//${l}${c}`;
  }
  return n.length > 0 && ao.error("found multiple candidates for event source"), null;
}, "getEventSourceUrl");

// src/channels/postmessage/index.ts
var { document: _t, location: Tt } = S, Xt = "storybook-channel", lo = { allowFunction: !1, maxDepth: 25 }, At = class At {
  constructor(t) {
    this.config = t;
    this.connected = !1;
    if (this.buffer = [], typeof S?.addEventListener == "function" && S.addEventListener("message", this.handleEvent.bind(this), !1), t.page !==
    "manager" && t.page !== "preview")
      throw new Error(`postmsg-channel: "config.page" cannot be "${t.page}"`);
  }
  setHandler(t) {
    this.handler = (...e) => {
      t.apply(this, e), !this.connected && this.getLocalFrame().length && (this.flush(), this.connected = !0);
    };
  }
  /**
   * Sends `event` to the associated window. If the window does not yet exist the event will be
   * stored in a buffer and sent when the window exists.
   *
   * @param event
   */
  send(t, e) {
    let {
      target: n,
      // telejson options
      allowRegExp: o,
      allowFunction: s,
      allowSymbol: l,
      allowDate: c,
      allowError: i,
      allowUndefined: g,
      allowClass: p,
      maxDepth: u,
      space: y,
      lazyEval: v
    } = e || {}, d = Object.fromEntries(
      Object.entries({
        allowRegExp: o,
        allowFunction: s,
        allowSymbol: l,
        allowDate: c,
        allowError: i,
        allowUndefined: g,
        allowClass: p,
        maxDepth: u,
        space: y,
        lazyEval: v
      }).filter(([R, C]) => typeof C < "u")
    ), m = {
      ...lo,
      ...S.CHANNEL_OPTIONS || {},
      ...d
    }, E = this.getFrames(n), I = new URLSearchParams(Tt?.search || ""), T = lt(
      {
        key: Xt,
        event: t,
        refId: I.get("refId")
      },
      m
    );
    return E.length ? (this.buffer.length && this.flush(), E.forEach((R) => {
      try {
        R.postMessage(T, "*");
      } catch {
        Kt.error("sending over postmessage fail");
      }
    }), Promise.resolve(null)) : new Promise((R, C) => {
      this.buffer.push({ event: t, resolve: R, reject: C });
    });
  }
  flush() {
    let { buffer: t } = this;
    this.buffer = [], t.forEach((e) => {
      this.send(e.event).then(e.resolve).catch(e.reject);
    });
  }
  getFrames(t) {
    if (this.config.page === "manager") {
      let n = Array.from(
        _t.querySelectorAll("iframe[data-is-storybook][data-is-loaded]")
      ).flatMap((o) => {
        try {
          return o.contentWindow && o.dataset.isStorybook !== void 0 && o.id === t ? [o.contentWindow] : [];
        } catch {
          return [];
        }
      });
      return n?.length ? n : this.getCurrentFrames();
    }
    return S && S.parent && S.parent !== S.self ? [S.parent] : [];
  }
  getCurrentFrames() {
    return this.config.page === "manager" ? Array.from(
      _t.querySelectorAll('[data-is-storybook="true"]')
    ).flatMap((e) => e.contentWindow ? [e.contentWindow] : []) : S && S.parent ? [S.parent] : [];
  }
  getLocalFrame() {
    return this.config.page === "manager" ? Array.from(
      _t.querySelectorAll("#storybook-preview-iframe")
    ).flatMap((e) => e.contentWindow ? [e.contentWindow] : []) : S && S.parent ? [S.parent] : [];
  }
  handleEvent(t) {
    try {
      let { data: e } = t, { key: n, event: o, refId: s } = typeof e == "string" && J(e) ? ct(e, S.CHANNEL_OPTIONS || {}) : e;
      if (n === Xt) {
        let l = this.config.page === "manager" ? '<span style="color: #37D5D3; background: black"> manager </span>' : '<span style="color: #\
1EA7FD; background: black"> preview </span>', c = Object.values(so).includes(o.type) ? `<span style="color: #FF4785">${o.type}</span>` : `<s\
pan style="color: #FFAE00">${o.type}</span>`;
        if (s && (o.refId = s), o.source = this.config.page === "preview" ? t.origin : Jt(t), !o.source) {
          Yt.error(
            `${l} received ${c} but was unable to determine the source of the event`
          );
          return;
        }
        let i = `${l} received ${c} (${e.length})`;
        Yt.debug(
          Tt.origin !== o.source ? i : `${i} <span style="color: gray">(on ${Tt.origin} from ${o.source})</span>`,
          ...o.args
        ), K(this.handler, "ChannelHandler should be set"), this.handler(o);
      }
    } catch (e) {
      Kt.error(e);
    }
  }
};
a(At, "PostMessageTransport");
var Y = At;

// src/channels/websocket/index.ts
import * as Qt from "@storybook/core/core-events";
var { WebSocket: co } = S, Zt = 15e3, te = 5e3, wt = class wt {
  constructor({ url: t, onError: e, page: n }) {
    this.buffer = [];
    this.isReady = !1;
    this.isClosed = !1;
    this.pingTimeout = 0;
    this.socket = new co(t), this.socket.onopen = () => {
      this.isReady = !0, this.heartbeat(), this.flush();
    }, this.socket.onmessage = ({ data: o }) => {
      let s = typeof o == "string" && J(o) ? ct(o) : o;
      K(this.handler, "WebsocketTransport handler should be set"), this.handler(s), s.type === "ping" && (this.heartbeat(), this.send({ type: "\
pong" }));
    }, this.socket.onerror = (o) => {
      e && e(o);
    }, this.socket.onclose = (o) => {
      K(this.handler, "WebsocketTransport handler should be set"), this.handler({
        type: Qt.CHANNEL_WS_DISCONNECT,
        args: [{ reason: o.reason, code: o.code }],
        from: n || "preview"
      }), this.isClosed = !0, clearTimeout(this.pingTimeout);
    };
  }
  heartbeat() {
    clearTimeout(this.pingTimeout), this.pingTimeout = setTimeout(() => {
      this.socket.close(3008, "timeout");
    }, Zt + te);
  }
  setHandler(t) {
    this.handler = t;
  }
  send(t) {
    this.isClosed || (this.isReady ? this.sendNow(t) : this.sendLater(t));
  }
  sendLater(t) {
    this.buffer.push(t);
  }
  sendNow(t) {
    let e = lt(t, {
      maxDepth: 15,
      allowFunction: !1,
      ...S.CHANNEL_OPTIONS
    });
    this.socket.send(e);
  }
  flush() {
    let { buffer: t } = this;
    this.buffer = [], t.forEach((e) => this.send(e));
  }
};
a(wt, "WebsocketTransport");
var X = wt;

// src/channels/index.ts
var { CONFIG_TYPE: po } = S, Xo = B;
function Qo({ page: r, extraTransports: t = [] }) {
  let e = [new Y({ page: r }), ...t];
  if (po === "DEVELOPMENT") {
    let o = window.location.protocol === "http:" ? "ws" : "wss", { hostname: s, port: l } = window.location, c = `${o}://${s}:${l}/storybook\
-server-channel`;
    e.push(new X({ url: c, onError: /* @__PURE__ */ a(() => {
    }, "onError"), page: r }));
  }
  let n = new B({ transports: e });
  return $.__prepare(
    n,
    r === "manager" ? $.Environment.MANAGER : $.Environment.PREVIEW
  ), n;
}
a(Qo, "createBrowserChannel");
export {
  B as Channel,
  Zt as HEARTBEAT_INTERVAL,
  te as HEARTBEAT_MAX_LATENCY,
  Y as PostMessageTransport,
  X as WebsocketTransport,
  Qo as createBrowserChannel,
  Xo as default
};
